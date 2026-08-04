/**
 * Background Sync Service
 *
 * Manages the sync lifecycle:
 * - Processes pending mutations queue when online
 * - Per-mutation error isolation: a failing mutation is marked failed and
 *   execution continues — one bad order can't block all others
 * - Exposes failed mutations for UI display with retry/discard controls
 * - Fetches fresh data from server to keep cache up-to-date
 */

import { productsApi, ordersApi } from '../api/client';
import {
  getCachedOrders,
  getPendingMutations,
  getFailedMutations,
  removeCachedOrder,
  addCachedOrder,
  updateCachedOrder,
  rewriteOrderMutationId,
  removeMutation,
  updateMutation,
  setLastSyncedAt,
  isCacheStale,
} from './db';
import type { PendingMutation } from './db';

export type { PendingMutation };

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';
type SyncListener = (status: SyncStatus, message?: string) => void;

/** After this many consecutive failures a mutation is considered permanently failed. */
const MAX_AUTO_RETRIES = 3;

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
    this.listeners.forEach(l => l(status, message));
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  // ─── Main sync orchestration ───────────────────────────────────────────

  async sync(): Promise<boolean> {
    if (this.syncInProgress) return false;
    if (!navigator.onLine) {
      this.setStatus('offline', 'No network connection');
      return false;
    }

    this.syncInProgress = true;
    this.setStatus('syncing', 'Syncing data…');

    try {
      await this.processMutations();
      await this.refreshCache();
      await setLastSyncedAt(Date.now());

      // After sync, check whether any mutations are still permanently failed
      const failed = await getFailedMutations();
      if (failed.length > 0) {
        this.setStatus(
          'error',
          `${failed.length} operation${failed.length > 1 ? 's' : ''} need attention`
        );
      } else {
        this.setStatus('idle', 'All data up-to-date');
      }

      this.syncInProgress = false;
      return failed.length === 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      console.error('[SyncService] Sync failed:', error);
      this.setStatus('error', message);
      this.syncInProgress = false;
      this.scheduleRetry();
      return false;
    }
  }

  // ─── Mutation processing ───────────────────────────────────────────────

  /**
   * Processes all pending mutations that haven't yet exceeded the retry cap.
   * Failures are recorded per-mutation instead of aborting the whole queue —
   * a network blip on one order won't block the rest.
   */
  private async processMutations(): Promise<void> {
    const mutations = await getPendingMutations();
    // Only attempt mutations that haven't been permanently failed
    const retryable = mutations.filter(m => (m.retries ?? 0) < MAX_AUTO_RETRIES && !m.failedAt);
    if (retryable.length === 0) return;

    console.log(`[SyncService] Processing ${retryable.length} pending mutation(s)`);

    for (const mutation of retryable) {
      try {
        await this.executeMutation(mutation);
        await removeMutation(mutation.id);
        console.log(`[SyncService] ✓ ${mutation.type} (${mutation.id})`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const retries = (mutation.retries ?? 0) + 1;
        const isPermanentlyFailed = retries >= MAX_AUTO_RETRIES;

        await updateMutation(mutation.id, {
          retries,
          errorMessage,
          // Only mark failedAt when we've given up auto-retrying
          failedAt: isPermanentlyFailed ? Date.now() : undefined,
        });

        console.error(
          `[SyncService] ✗ ${mutation.type} (${mutation.id}) — attempt ${retries}/${MAX_AUTO_RETRIES}: ${errorMessage}`
        );

        if (!isPermanentlyFailed) {
          // Schedule a retry pass
          this.scheduleRetry();
        }
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
        const placed = await ordersApi.place(payload);
        const cached = await getCachedOrders();
        const placeholder = cached.find(
          o =>
            o.id.startsWith('offline_') &&
            o.tableId === payload.tableId &&
            o.paymentMethod === payload.paymentMethod &&
            o.items.length === payload.items.length &&
            o.items.every((it, idx) =>
              it.productId === (payload.items as any)[idx]?.productId &&
              it.qty === (payload.items as any)[idx]?.qty
            )
        );
        if (placeholder) {
          await removeCachedOrder(placeholder.id);
          await rewriteOrderMutationId(placeholder.id, placed.id);
        }
        await addCachedOrder(placed);
        break;
      }
      case 'UPDATE_ORDER': {
        const payload = mutation.payload as {
          id: string;
          data: { paymentMethod?: string; tableId?: string; serviceType?: string };
        };
        const updated = await ordersApi.update(payload.id, payload.data);
        await updateCachedOrder(payload.id, updated);
        break;
      }
      case 'DELETE_ORDER': {
        const payload = mutation.payload as { id: string };
        try {
          await ordersApi.delete(payload.id);
        } catch (err: any) {
          if (!err?.message?.includes('404') && !err?.message?.includes('not found')) throw err;
          console.warn(`[SyncService] DELETE_ORDER: order ${payload.id} already gone`);
        }
        await removeCachedOrder(payload.id);
        break;
      }
      default:
        console.warn(`[SyncService] Unknown mutation type: ${(mutation as any).type}`);
    }
  }

  // ─── Manual retry / discard ────────────────────────────────────────────

  /** Reset a permanently-failed mutation and trigger a fresh sync pass. */
  async retryMutation(id: string): Promise<void> {
    await updateMutation(id, { failedAt: undefined, errorMessage: undefined, retries: 0 });
    await this.sync();
  }

  /** Permanently remove a failed mutation from the queue. */
  async discardMutation(id: string): Promise<void> {
    await removeMutation(id);
    const remaining = await getFailedMutations();
    if (remaining.length === 0 && this.status === 'error') {
      this.setStatus('idle');
    } else {
      // Re-announce current count
      this.setStatus('error', `${remaining.length} operation${remaining.length !== 1 ? 's' : ''} need attention`);
    }
  }

  /** Reset ALL permanently-failed mutations and re-sync. */
  async retryAllFailed(): Promise<void> {
    const failed = await getFailedMutations();
    for (const m of failed) {
      await updateMutation(m.id, { failedAt: undefined, errorMessage: undefined, retries: 0 });
    }
    await this.sync();
  }

  /** Permanently discard ALL failed mutations. */
  async discardAllFailed(): Promise<void> {
    const failed = await getFailedMutations();
    for (const m of failed) await removeMutation(m.id);
    this.setStatus('idle');
  }

  // ─── Cache refresh ─────────────────────────────────────────────────────

  async refreshCache(): Promise<void> {
    const stale = await isCacheStale();
    if (!stale) {
      console.log('[SyncService] Cache is fresh, skipping refresh');
      return;
    }
    console.log('[SyncService] Refreshing cached data…');
    const [products, orders] = await Promise.all([
      productsApi.list(),
      ordersApi.list(),
    ]);
    console.log(`[SyncService] Refreshed ${products.length} products and ${orders.length} orders`);
  }

  // ─── Retry scheduling ──────────────────────────────────────────────────

  private scheduleRetry() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine) this.sync();
    }, 30_000);
  }

  cancelRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  destroy() {
    this.cancelRetry();
    this.listeners.clear();
    this.syncInProgress = false;
  }
}

export const syncService = new SyncService();

// ─── React hook ───────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getFailedMutations as loadFailedMutations } from './db';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
  const [message, setMessage] = useState<string | undefined>();
  const [failedMutations, setFailedMutations] = useState<PendingMutation[]>([]);

  const refreshFailed = useCallback(async () => {
    setFailedMutations(await loadFailedMutations());
  }, []);

  useEffect(() => {
    // Initial load
    refreshFailed();

    const unsubscribe = syncService.subscribe(async (s, msg) => {
      setStatus(s);
      setMessage(msg);
      await refreshFailed();
    });
    return unsubscribe;
  }, [refreshFailed]);

  return {
    status,
    message,
    failedMutations,
    sync: () => syncService.sync(),
    retryMutation: (id: string) => syncService.retryMutation(id).then(refreshFailed),
    discardMutation: (id: string) => syncService.discardMutation(id).then(refreshFailed),
    retryAll: () => syncService.retryAllFailed().then(refreshFailed),
    discardAll: () => syncService.discardAllFailed().then(refreshFailed),
  };
}
