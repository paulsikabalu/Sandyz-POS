import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiProduct, ApiOrder, productsApi, ordersApi } from '../api/client';
import { getCachedProducts, getCachedOrders } from '../lib/db';
import { syncService } from '../lib/sync';

export type { ApiProduct as Product };

export type CartItem = {
  product: ApiProduct;
  quantity: number;
};

export type Table = {
  id: string;
  number: number;
  customerName: string;
  itemCount: number;
  status: 'active' | 'processing';
};

export type { ApiOrder as Order };

export const DEMO_TABLES: Table[] = [
  { id: 't1', number: 1, customerName: 'Till 1', itemCount: 0, status: 'active' },
  { id: 't2', number: 2, customerName: 'Till 2', itemCount: 0, status: 'active' },
  { id: 't3', number: 3, customerName: 'Till 3', itemCount: 0, status: 'active' },
  { id: 't4', number: 4, customerName: 'Till 4', itemCount: 0, status: 'active' },
];

// Top-level sections
export const SECTIONS = ['All', 'Bakery', 'Fast Food', 'Snacks & Pastries', 'Drinks'] as const;

// Section → subcategories mapping
export const SECTION_CATEGORIES: Record<string, string[]> = {
  Bakery:              ['Bread'],
  'Fast Food':         ['Shawarma'],
  'Snacks & Pastries': ['Samosa', 'Dondos'],
  Drinks:              ['Soft Drinks', 'Water', 'Juices', 'Energy Drinks'],
};

// All subcategories (for stock management)
export const ALL_CATEGORIES = Object.values(SECTION_CATEGORIES).flat();

export type SyncStatusType = 'idle' | 'syncing' | 'error' | 'offline';

export function usePosStore() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [activeTableId, setActiveTableId] = useState<string>('t1');
  const [serviceType, setServiceType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('idle');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const initialLoadDone = useRef(false);

  // ─── Load from cache first, then background refresh ──────────────────────

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const data = await productsApi.list();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const data = await ordersApi.list();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  }, []);

  // ─── Initial load: cache-first ──────────────────────────────────────────

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    let cancelled = false;

    const init = async () => {
      // Step 1: Load from cache immediately for instant display
      try {
        const [cachedProducts, cachedOrders] = await Promise.all([
          getCachedProducts(),
          getCachedOrders(),
        ]);

        if (!cancelled) {
          if (cachedProducts.length > 0) {
            setProducts(cachedProducts);
            setProductsLoading(false);
          }
          if (cachedOrders.length > 0) {
            setOrders(cachedOrders);
          }
        }
      } catch (err) {
        console.warn('[Store] Failed to read cache:', err);
      }

      // Step 2: Fetch fresh data from server (will use cache fallback if offline)
      try {
        const [freshProducts, freshOrders] = await Promise.all([
          productsApi.list(),
          ordersApi.list(),
        ]);

        if (!cancelled) {
          setProducts(freshProducts);
          setOrders(freshOrders);
          setProductsLoading(false);
        }
      } catch (err) {
        console.warn('[Store] Background refresh failed:', err);
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Network status tracking ────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Sync on network restore ────────────────────────────────────────────

  useEffect(() => {
    if (!isOnline) return;

    const doSync = async () => {
      setSyncStatus('syncing');
      try {
        await syncService.sync();
        // Refresh data after sync
        await Promise.all([loadProducts(), loadOrders()]);
        setSyncStatus('idle');
      } catch {
        setSyncStatus('error');
      }
    };

    doSync();
  }, [isOnline, loadProducts, loadOrders]);

  // ─── Cart operations ────────────────────────────────────────────────────

  const getCart = (tableId: string) => carts[tableId] || [];

  const addToCart = (tableId: string, product: ApiProduct) => {
    const tableCart = carts[tableId] || [];
    const currentQty = tableCart.find(i => i.product.id === product.id)?.quantity ?? 0;
    if (currentQty >= product.stock) return;

    setCarts(prev => {
      const existing = (prev[tableId] || []).find(i => i.product.id === product.id);
      const newTableCart = existing
        ? (prev[tableId] || []).map(i =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...(prev[tableId] || []), { product, quantity: 1 }];
      return { ...prev, [tableId]: newTableCart };
    });
  };

  const updateQuantity = (tableId: string, productId: string, delta: number) => {
    setCarts(prev => {
      const newTableCart = (prev[tableId] || [])
        .map(item => {
          if (item.product.id !== productId) return item;
          return { ...item, quantity: Math.min(item.quantity + delta, item.product.stock) };
        })
        .filter(item => item.quantity > 0);
      return { ...prev, [tableId]: newTableCart };
    });
  };

  const clearCart = (tableId: string) => {
    setCarts(prev => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  };

  const completeOrder = async (tableId: string, paymentMethod: string): Promise<ApiOrder | null> => {
    const cart = getCart(tableId);
    if (cart.length === 0) return null;

    try {
      const order = await ordersApi.place({
        items: cart.map(i => ({
          productId: i.product.id,
          qty: i.quantity,
          name: i.product.name,
          price: i.product.price,
        })),
        tableId,
        serviceType,
        paymentMethod,
      });

      // Refresh products (stock levels may have changed) and orders
      await Promise.all([loadProducts(), loadOrders()]);
      clearCart(tableId);
      return order;
    } catch (err) {
      // If the order placement failed (e.g. real network/API error), surface it.
      throw err;
    }
  };

  // ─── Derived tables with live itemCount ───────────────────────────────

  const tables: Table[] = DEMO_TABLES.map(t => ({
    ...t,
    itemCount: (carts[t.id] || []).reduce((sum, item) => sum + item.quantity, 0),
  }));

  const activeCart = getCart(activeTableId);
  const subtotal = activeCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return {
    products,
    productsLoading,
    loadProducts,
    carts,
    tables,
    orders,
    activeTableId,
    setActiveTableId,
    serviceType,
    setServiceType,
    getCart,
    addToCart,
    updateQuantity,
    clearCart,
    completeOrder,
    subtotal,
    tax,
    total,
    activeCart,
    // New: sync/network status
    syncStatus,
    isOnline,
  };
}
