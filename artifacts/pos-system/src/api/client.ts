import {
  getCachedProducts,
  cacheProducts,
  getCachedOrders,
  cacheOrders,
  addCachedOrder,
  removeCachedOrder,
  queueMutation,
  updateCachedProduct as updateLocalProduct,
  getCachedCategories,
  cacheCategories,
} from '../lib/db';

const API_BASE = 'http://localhost:3000/api';

/**
 * Get JWT token from localStorage for authenticated requests.
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('sandyz_pos_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type ApiProduct = {
  id: string;
  name: string;
  price: number;
  section: string;   // Bakery | Fast Food | Snacks & Pastries | Drinks
  category: string;  // Bread | Shawarma | Samosa | Dondos | Soft Drinks | Water | Juices | Energy Drinks
  image: string;
  stock: number;
  unit: string;
};

export type ApiOrder = {
  id: string;
  orderNumber: string;
  timestamp: number;
  items: { productId: string; name: string; qty: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  tableId: string;
  serviceType: string;
};

type ApiRequestOptions = RequestInit & { timeoutMs?: number };

async function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  // Check if we're online before attempting fetch
  if (!navigator.onLine) {
    throw new Error('No network connection');
  }

  const { timeoutMs = 15_000, ...fetchOptions } = options ?? {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...getAuthHeaders(), ...fetchOptions.headers },
      signal: controller.signal,
      ...fetchOptions,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `Request failed: ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeout);
    // Surface a friendly message for timeouts instead of the cryptic
    // "signal aborted without reason" AbortError.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  }
}

// ─── Cache-aware API wrappers ──────────────────────────────────────────────

export const productsApi = {
  /**
   * Fetches products from the server and updates local cache.
   * Falls back to cached data if offline.
   */
  list: async (): Promise<ApiProduct[]> => {
    try {
      const data = await request<ApiProduct[]>('/products');
      // Update cache in background
      cacheProducts(data).catch((err) =>
        console.warn('[Cache] Failed to cache products:', err)
      );
      return data;
    } catch (error) {
      // On failure, try to serve from cache
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        console.log('[API] Serving products from cache');
        return cached;
      }
      throw error;
    }
  },

  create: async (data: Omit<ApiProduct, 'id'>): Promise<ApiProduct> => {
    if (!navigator.onLine) {
      // Queue mutation for later sync
      await queueMutation({
        type: 'CREATE_PRODUCT',
        payload: { data },
      });
      throw new Error('Queued for sync — no network available');
    }
    const result = await request<ApiProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Update cache
    const cached = await getCachedProducts();
    await cacheProducts([...cached, result]);
    return result;
  },

  update: async (id: string, data: Partial<ApiProduct>): Promise<ApiProduct> => {
    if (!navigator.onLine) {
      // Optimistically update local cache
      await updateLocalProduct(id, data as Partial<ApiProduct>);
      // Queue mutation
      await queueMutation({
        type: 'UPDATE_PRODUCT',
        payload: { id, data },
      });
      throw new Error('Queued for sync — no network available');
    }
    const result = await request<ApiProduct>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    // Update cache
    await updateLocalProduct(id, result);
    return result;
  },

  delete: async (id: string): Promise<void> => {
    if (!navigator.onLine) {
      await queueMutation({
        type: 'DELETE_PRODUCT',
        payload: { id },
      });
      throw new Error('Queued for sync — no network available');
    }
    await request<void>(`/products/${id}`, { method: 'DELETE' });
    // Remove from cache
    const cached = await getCachedProducts();
    await cacheProducts(cached.filter((p) => p.id !== id));
  },

  addStock: async (id: string, quantity: number): Promise<ApiProduct> => {
    if (!navigator.onLine) {
      await queueMutation({
        type: 'ADD_STOCK',
        payload: { id, quantity },
      });
      throw new Error('Queued for sync — no network available');
    }
    const result = await request<ApiProduct>(`/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
    // Update cache
    await updateLocalProduct(id, result);
    return result;
  },
};

export const ordersApi = {
  /**
   * Fetches orders from the server and updates local cache.
   * Falls back to cached data if offline.
   */
  list: async (): Promise<ApiOrder[]> => {
    try {
      const data = await request<ApiOrder[]>('/orders');
      // Update cache in background
      cacheOrders(data).catch((err) =>
        console.warn('[Cache] Failed to cache orders:', err)
      );
      return data;
    } catch (error) {
      // On failure, try to serve from cache
      const cached = await getCachedOrders();
      if (cached.length > 0) {
        console.log('[API] Serving orders from cache');
        return cached;
      }
      throw error;
    }
  },

  place: async (data: {
    items: { productId: string; qty: number; name?: string; price?: number }[];
    tableId: string;
    serviceType: string;
    paymentMethod: string;
  }): Promise<ApiOrder> => {
    if (!navigator.onLine) {
      // Build a local order record so it's persisted to the offline database
      // immediately AND queued for sync to the online database later.
      const subtotal = data.items.reduce(
        (sum, item) => sum + item.qty * (item.price ?? 0), 0
      );
      const localOrder: ApiOrder = {
        id: `offline_${Date.now()}`,
        orderNumber: `#OFFLINE_${Date.now()}`,
        timestamp: Date.now(),
        items: data.items.map((item) => ({
          productId: item.productId,
          name: item.name ?? item.productId,
          qty: item.qty,
          price: item.price ?? 0,
        })),
        subtotal,
        tax: subtotal * 0.05,
        total: subtotal * 1.05,
        paymentMethod: data.paymentMethod,
        tableId: data.tableId,
        serviceType: data.serviceType,
      };
      // Save to the offline database
      await addCachedOrder(localOrder);
      // Queue for sync to the online database when connection returns
      await queueMutation({
        type: 'PLACE_ORDER',
        payload: data,
      });
      return localOrder;
    }
    const result = await request<ApiOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
      // Order placement involves multiple server-side DB operations; give it
      // more time than the default 15s so it doesn't get silently aborted.
      timeoutMs: 30_000,
    });
    // Add to local cache
    await addCachedOrder(result);
    return result;
  },
};

// ─── Auth API ──────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier' | 'manager';
  createdAt?: number;
  updatedAt?: number;
};

export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Login failed');
    }
    return res.json();
  },

  register: async (data: { email: string; password: string; name: string; role?: string }): Promise<{ token: string; user: AuthUser }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Registration failed');
    }
    return res.json();
  },

  logout: async (): Promise<void> => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  },

  me: async (): Promise<{ user: AuthUser }> => {
    return request('/auth/me');
  },
};

// ─── Users API (admin only) ────────────────────────────────────────────────

export const usersApi = {
  list: async (): Promise<AuthUser[]> => {
    return request<AuthUser[]>('/users');
  },

  get: async (id: string): Promise<AuthUser> => {
    return request<AuthUser>(`/users/${id}`);
  },

  create: async (data: { email: string; password: string; name: string; role?: string }): Promise<AuthUser> => {
    return request<AuthUser>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { email?: string; name?: string; role?: string; currentPassword?: string; newPassword?: string }): Promise<AuthUser> => {
    return request<AuthUser>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request<void>(`/users/${id}`, { method: 'DELETE' });
  },
};

// ─── Reports API ───────────────────────────────────────────────────────────

export type SalesReport = {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
    averageOrderValue: number;
  };
  paymentBreakdown: Record<string, number>;
  dailySales: { date: string; orders: number; revenue: number }[];
  topProducts: { id: string; name: string; qty: number; revenue: number }[];
};

export type StockReport = {
  summary: {
    totalProducts: number;
    totalStock: number;
    outOfStock: number;
    lowStock: number;
    stockHealthPercentage: number;
  };
  sectionBreakdown: Record<string, { count: number; totalStock: number; outOfStock: number; lowStock: number }>;
  lowStockItems: ApiProduct[];
  outOfStockItems: ApiProduct[];
};

export type PaginatedOrders = {
  orders: ApiOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export const reportsApi = {
  sales: async (startDate?: number, endDate?: number): Promise<SalesReport> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', String(startDate));
    if (endDate) params.set('endDate', String(endDate));
    const qs = params.toString();
    return request<SalesReport>(`/reports/sales${qs ? `?${qs}` : ''}`);
  },

  stock: async (): Promise<StockReport> => {
    return request<StockReport>('/reports/stock');
  },

  orders: async (page?: number, limit?: number, startDate?: number, endDate?: number): Promise<PaginatedOrders> => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (startDate) params.set('startDate', String(startDate));
    if (endDate) params.set('endDate', String(endDate));
    const qs = params.toString();
    try {
      return await request<PaginatedOrders>(`/reports/orders${qs ? `?${qs}` : ''}`);
    } catch (error) {
      // Offline fallback: paginate locally from the cached orders that were
      // populated by ordersApi.list(). Lets Orders Management work offline.
      const cached = await getCachedOrders();
      if (cached.length > 0) {
        console.log('[API] Serving orders report from cache');
        const safePage = Math.max(1, page ?? 1);
        const safeLimit = Math.min(100, Math.max(1, limit ?? 20));
        const sorted = [...cached].sort((a, b) => b.timestamp - a.timestamp);
        const filtered = sorted.filter(
          (o) =>
            o.timestamp >= (startDate ?? 0) &&
            o.timestamp <= (endDate ?? Date.now())
        );
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / safeLimit));
        const start = (safePage - 1) * safeLimit;
        return {
          orders: filtered.slice(start, start + safeLimit),
          pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages,
            hasNext: safePage < totalPages,
            hasPrev: safePage > 1,
          },
        };
      }
      throw error;
    }
  },
};

// ─── Settings API ─────────────────────────────────────────────────────────

export const settingsApi = {
  list: async (): Promise<Record<string, string>> => {
    return request<Record<string, string>>('/settings');
  },

  get: async (key: string): Promise<{ key: string; value: string }> => {
    return request<{ key: string; value: string }>(`/settings/${key}`);
  },

  update: async (key: string, value: string): Promise<{ key: string; value: string }> => {
    return request<{ key: string; value: string }>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },
};

// ─── Categories API ──────────────────────────────────────────────────────

export type Category = {
  id: string;
  section: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export const categoriesApi = {
  /**
   * Fetches categories from the server and updates local cache.
   * Falls back to cached data if offline.
   */
  list: async (): Promise<Category[]> => {
    try {
      const data = await request<Category[]>('/categories');
      // Update cache in background
      cacheCategories(data).catch((err) =>
        console.warn('[Cache] Failed to cache categories:', err)
      );
      return data;
    } catch (error) {
      // On failure, try to serve from cache
      const cached = await getCachedCategories();
      if (cached.length > 0) {
        console.log('[API] Serving categories from cache');
        return cached;
      }
      throw error;
    }
  },

  create: async (data: { section: string; name: string; description?: string; sortOrder?: number }): Promise<Category> => {
    const result = await request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Update cache
    const cached = await getCachedCategories();
    await cacheCategories([...cached, result]);
    return result;
  },

  update: async (id: string, data: { section?: string; name?: string; description?: string; sortOrder?: number }): Promise<Category> => {
    const result = await request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    // Update cache
    const cached = await getCachedCategories();
    await cacheCategories(cached.map((c) => (c.id === id ? result : c)));
    return result;
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/categories/${id}`, { method: 'DELETE' });
    // Remove from cache
    const cached = await getCachedCategories();
    await cacheCategories(cached.filter((c) => c.id !== id));
  },
};
