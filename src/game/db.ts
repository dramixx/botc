// Tiny IndexedDB wrapper: game history + undo stacks.

const DB_NAME = 'botc-grimoire';
const VERSION = 1;
export const STORES = { games: 'games', kv: 'kv' } as const;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.games)) db.createObjectStore(STORES.games, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.kv)) db.createObjectStore(STORES.kv);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | undefined): Promise<T | undefined> {
  return open().then((db) => new Promise<T | undefined>((resolve) => {
    if (!db) return resolve(undefined);
    try {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }));
}

export const idbGet = <T>(store: string, key: IDBValidKey) => run<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>);
export const idbPut = (store: string, value: unknown, key?: IDBValidKey) => run(store, 'readwrite', (s) => { s.put(value, key); });
export const idbDelete = (store: string, key: IDBValidKey) => run(store, 'readwrite', (s) => { s.delete(key); });
export const idbAll = <T>(store: string) => run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
