/**
 * Lightweight IndexedDB wrapper for local persistent storage.
 * Stores products, orders, and a pending mutation queue for offline support.
 */

import type { ApiProduct, ApiOrder, Category } from '../api/client';

const DB_NAME = 'sandyz-pos-cache';
const DB_VERSION = 2;

export type PendingMutation = {
  id: string;
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'ADD_STOCK' | 'PLACE_ORDER' | 'UPDATE_ORDER' | 'DELETE_ORDER';
  payload: unknown;
  createdAt: number;
  retries: number;
  /** Set when the mutation has permanently failed (retries exhausted or non-retryable error). */
  failedAt?: number;
  /** Human-readable message from the last failure. */
  errorMessage?: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', { keyPath: 'id' });
        store.createIndex('section', 'section', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }

      // Orders store
      if (!db.objectStoreNames.contains('orders')) {
        const store = db.createObjectStore('orders', { keyPath: 'id' });
        store.createIndex('orderNumber', 'orderNumber', { unique: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const store = db.createObjectStore('categories', { keyPath: 'id' });
        store.createIndex('section', 'section', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }

      // Pending mutations queue
      if (!db.objectStoreNames.contains('pendingMutations')) {
        const store = db.createObjectStore('pendingMutations', { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Sync metadata
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

function getStore(db: IDBDatabase, storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = getStore(db, storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = getStore(db, storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = getStore(db, storeName, 'readwrite');
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = getStore(db, storeName, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = getStore(db, storeName, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getCachedProducts(): Promise<ApiProduct[]> {
  return getAll<ApiProduct>('products');
}

export async function cacheProducts(products: ApiProduct[]): Promise<void> {
  await clearStore('products');
  const db = await openDb();
  const store = getStore(db, 'products', 'readwrite');
  for (const product of products) {
    store.put(product);
  }
}

export async function updateCachedProduct(id: string, updates: Partial<ApiProduct>): Promise<void> {
  const existing = await getById<ApiProduct>('products', id);
  if (existing) {
    await putItem('products', { ...existing, ...updates });
  }
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCachedCategories(): Promise<Category[]> {
  return getAll<Category>('categories');
}

export async function cacheCategories(categories: Category[]): Promise<void> {
  await clearStore('categories');
  const db = await openDb();
  const store = getStore(db, 'categories', 'readwrite');
  for (const category of categories) {
    store.put(category);
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function getCachedOrders(): Promise<ApiOrder[]> {
  return getAll<ApiOrder>('orders');
}

export async function cacheOrders(orders: ApiOrder[]): Promise<void> {
  await clearStore('orders');
  const db = await openDb();
  const store = getStore(db, 'orders', 'readwrite');
  for (const order of orders) {
    store.put(order);
  }
}

export async function addCachedOrder(order: ApiOrder): Promise<void> {
  await putItem('orders', order);
}

export async function updateCachedOrder(id: string, updates: Partial<ApiOrder>): Promise<void> {
  const existing = await getById<ApiOrder>('orders', id);
  if (existing) {
    await putItem('orders', { ...existing, ...updates });
  }
}

export async function removeCachedOrder(id: string): Promise<void> {
  await deleteItem('orders', id);
}

/**
 * Merge server orders into the cache without wiping offline (offline_*) orders.
 * Use this instead of cacheOrders() when online data arrives so that pending
 * offline orders are preserved until they are synced.
 */
export async function mergeServerOrders(serverOrders: ApiOrder[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readwrite');
    const store = tx.objectStore('orders');

    // Collect all existing offline orders first
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const existing = (getAllReq.result as ApiOrder[]).filter((o) =>
        o.id.startsWith('offline_')
      );

      // Clear the store and re-insert: server orders + preserved offline orders
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        const toWrite = [...serverOrders, ...existing];
        for (const order of toWrite) {
          store.put(order);
        }
      };
      clearReq.onerror = () => reject(clearReq.error);
    };
    getAllReq.onerror = () => reject(getAllReq.error);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Pending Mutations Queue ─────────────────────────────────────────────────

export async function getPendingMutations(): Promise<PendingMutation[]> {
  return getAll<PendingMutation>('pendingMutations');
}

export async function queueMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const item: PendingMutation = {
    ...mutation,
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    retries: 0,
  };
  await putItem('pendingMutations', item);
}

export async function removeMutation(id: string): Promise<void> {
  await deleteItem('pendingMutations', id);
}

export async function updateMutation(id: string, updates: Partial<PendingMutation>): Promise<void> {
  const existing = await getById<PendingMutation>('pendingMutations', id);
  if (existing) {
    await putItem('pendingMutations', { ...existing, ...updates });
  }
}

/** Returns all mutations that have a failedAt timestamp (permanent failures). */
export async function getFailedMutations(): Promise<PendingMutation[]> {
  const all = await getAll<PendingMutation>('pendingMutations');
  return all.filter(m => m.failedAt !== undefined);
}

/**
 * After a PLACE_ORDER mutation is synced and we learn the real server-assigned
 * order ID, scan the remaining pending mutations and rewrite any UPDATE_ORDER /
 * DELETE_ORDER entries that still reference the old offline placeholder ID.
 *
 * This prevents those mutations from targeting a non-existent order when they
 * are executed later in the same sync pass.
 */
export async function rewriteOrderMutationId(
  offlineId: string,
  serverId: string
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingMutations', 'readwrite');
    const store = tx.objectStore('pendingMutations');

    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const mutations = getAllReq.result as PendingMutation[];
      for (const mut of mutations) {
        if (
          (mut.type === 'UPDATE_ORDER' || mut.type === 'DELETE_ORDER') &&
          (mut.payload as { id?: string }).id === offlineId
        ) {
          const rewritten: PendingMutation = {
            ...mut,
            payload: { ...(mut.payload as Record<string, unknown>), id: serverId },
          };
          store.put(rewritten);
        }
      }
    };
    getAllReq.onerror = () => reject(getAllReq.error);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearMutations(): Promise<void> {
  await clearStore('pendingMutations');
}

// ─── Sync Metadata ───────────────────────────────────────────────────────────

export async function getLastSyncedAt(): Promise<number | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'meta');
    const request = store.get('lastSyncedAt');
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function setLastSyncedAt(timestamp: number): Promise<void> {
  await putItem('meta', { key: 'lastSyncedAt', value: timestamp });
}

// ─── Cache freshness ─────────────────────────────────────────────────────────

export async function isCacheStale(maxAgeMs: number = 5 * 60 * 1000): Promise<boolean> {
  const lastSynced = await getLastSyncedAt();
  if (!lastSynced) return true;
  return Date.now() - lastSynced > maxAgeMs;
}

