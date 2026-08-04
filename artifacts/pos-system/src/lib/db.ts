/**
 * Lightweight IndexedDB wrapper for local persistent storage.
 * Stores products, orders, and a pending mutation queue for offline support.
 */

import type { ApiProduct, ApiOrder, Category } from '../api/client';

const DB_NAME = 'sandyz-pos-cache';
const DB_VERSION = 2;

export type PendingMutation = {
  id: string;
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'ADD_STOCK' | 'PLACE_ORDER';
  payload: unknown;
  createdAt: number;
  retries?: number;
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

export async function removeCachedOrder(id: string): Promise<void> {
  await deleteItem('orders', id);
}

// ─── Pending Mutations Queue ─────────────────────────────────────────────────

export async function getPendingMutations(): Promise<PendingMutation[]> {
  return getAll<PendingMutation>('pendingMutations');
}

export async function queueMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt'>): Promise<void> {
  const item: PendingMutation = {
    ...mutation,
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  await putItem('pendingMutations', item);
}

export async function removeMutation(id: string): Promise<void> {
  await deleteItem('pendingMutations', id);
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

