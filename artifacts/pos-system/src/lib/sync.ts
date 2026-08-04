/**
 * Background Sync Service
 *
 * Manages the sync lifecycle:
 * - Processes pending mutations queue when online
 * - Fetches fresh data from server to keep cache up-to-date
 * - Exposes sync status for UI indicators
 */

import { productsApi, ordersApi } from '../api/client';
import {
  getCachedProducts,
  cacheProducts,
  getCachedOrders,
  cacheOrders,
  getPendingMutations,
  removeCachedOrder,
  addCachedOrder,
  removeMutation,
  setLastSyncedAt,
  isCacheStale,
} from './db';
import type { PendingMutation } from './db';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';
type SyncListener = (status: SyncStatus, message?: string) => void;

class SyncService {
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncListener> = new Set();
  private syncInProgress = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  // ─── Status management ─────────────────────────────────────────────────

  getStatus(): SyncStatus {
    return this.status;
  }

  private setStatus(status: SyncStatus, message?: string) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status, message));
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ─── Main sync orchestration ───────────────────────────────────────────

  /**
   * Full sync: processes pending mutations first, then refreshes cached data.
   * Returns true if sync was completed successfully.
   */
  async sync(): Promise<boolean> {
    if (this.syncInProgress) return false;
    if (!navigator.onLine) {
      this.setStatus('offline', 'No network connection');
      return false;
    }

    this.syncInProgress = true;
    this.setStatus('syncing', 'Syncing data…');

    try {
      // Step 1: Process pending mutations (offline queue)
      await this.processMutations();

      // Step 2: Refresh cached data from server
      await this.refreshCache();

      // Step 3: Update sync timestamp
      await setLastSyncedAt(Date.now());

      this.setStatus('idle', 'All data up-to-date');
      this.syncInProgress = false;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      console.error('[SyncService] Sync failed:', error);
      this.setStatus('error', message);
      this.syncInProgress = false;

      // Schedule retry in 30 seconds
      this.scheduleRetry();
      return false;
    }
  }

  // ─── Mutation processing ───────────────────────────────────────────────

  private async processMutations(): Promise<void> {
    const mutations = await getPendingMutations();
    if (mutations.length === 0) return;

    console.log(`[SyncService] Processing ${mutations.length} pending mutation(s)`);

    for (const mutation of mutations) {
      try {
        await this.executeMutation(mutation);
        await removeMutation(mutation.id);
        console.log(`[SyncService] Mutation ${mutation.id} (${mutation.type}) processed`);
      } catch (error) {
        console.error(`[SyncService] Mutation ${mutation.id} failed:`, error);
        // Re-throw for outer catch to handle - will trigger retry
        throw error;
      }
    }
  }

  private async executeMutation(mutation: PendingMutation): Promise<void> {
    switch (mutation.type) {
      case 'CREATE_PRODUCT': {
        const payload = mutation.payload as { data: Record<string, unknown> };
        await productsApi.create(payload.data as any);
        break;
      }

      case 'UPDATE_PRODUCT': {
        const payload = mutation.payload as { id: string; data: Record<string, unknown> };
        await productsApi.update(payload.id, payload.data);
        break;
      }

      case 'DELETE_PRODUCT': {
        const payload = mutation.payload as { id: string };
        await productsApi.delete(payload.id);
        break;
      }

      case 'ADD_STOCK': {
        const payload = mutation.payload as { id: string; quantity: number };
        await productsApi.addStock(payload.id, payload.quantity);
        break;
      }

      case 'PLACE_ORDER': {
        const payload = mutation.payload as {
          items: { productId: string; qty: number }[];
          tableId: string;
          serviceType: string;
          paymentMethod: string;
        };
        // Place the order online (also adds it to the local cache via ordersApi.place).
        const placed = await ordersApi.place(payload);
        // Remove the offline placeholder record (which was stored with an
        // `offline_` id) so we don't end up with a duplicate in the cache.
        const cached = await getCachedOrders();
        const offlinePlaceholder = cached.find(
          (o) =>
            o.id.startsWith('offline_') &&
            o.tableId === payload.tableId &&
            o.paymentMethod === payload.paymentMethod &&
            o.items.length === payload.items.length &&
            o.items.every((it, idx) =>
              it.productId === (payload.items as any)[idx]?.productId &&
              it.qty === (payload.items as any)[idx]?.qty
            )
        );
        if (offlinePlaceholder) {
          await removeCachedOrder(offlinePlaceholder.id);
        }
        // Keep the server-returned order in the cache.
        await addCachedOrder(placed);
        break;
      }

      default:
        console.warn(`[SyncService] Unknown mutation type: ${(mutation as any).type}`);
    }
  }

  // ─── Cache refresh ─────────────────────────────────────────────────────

  async refreshCache(): Promise<void> {
    // Check if cache is stale (older than 5 minutes) before refreshing
    const stale = await isCacheStale();
    if (!stale) {
      console.log('[SyncService] Cache is fresh, skipping refresh');
      return;
    }

    console.log('[SyncService] Refreshing cached data…');

    // Fetch products and orders in parallel
    const [products, orders] = await Promise.all([
      productsApi.list(),
      ordersApi.list(),
    ]);

    await Promise.all([
      cacheProducts(products),
      cacheOrders(orders),
    ]);

    console.log(`[SyncService] Cached ${products.length} products and ${orders.length} orders`);
  }

  // ─── Retry scheduling ──────────────────────────────────────────────────

  private scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, 30_000); // Retry every 30 seconds
  }

  cancelRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  destroy() {
    this.cancelRetry();
    this.listeners.clear();
    this.syncInProgress = false;
  }
}

// Singleton instance
export const syncService = new SyncService();

// ─── React hook for consuming sync status ────────────────────────────────────

import { useState, useEffect } from 'react';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    const unsubscribe = syncService.subscribe((s, msg) => {
      setStatus(s);
      setMessage(msg);
    });
    return unsubscribe;
  }, []);

  return { status, message, sync: () => syncService.sync() };
}
