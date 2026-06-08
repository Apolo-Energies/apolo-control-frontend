import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { Branch } from '../models/branch.model';
import { Customer } from '../models/customer.model';
import { Group } from '../models/group.model';
import { MasterDataMeta } from '../models/master-data.model';
import { Supply } from '../models/supply.model';

const DB_NAME = 'apolo-control-db';
const DB_VERSION = 1;

type EntityStore = 'clientes' | 'suministros' | 'grupos' | 'delegaciones';
type AnyStore = EntityStore | 'meta';

type StoreType<S extends AnyStore> = S extends 'clientes'
  ? Customer
  : S extends 'suministros'
    ? Supply
    : S extends 'grupos'
      ? Group
      : S extends 'delegaciones'
        ? Branch
        : MasterDataMeta;

/**
 * Thin Promise-based wrapper around the browser's IndexedDB API.
 *
 * Database schema (version 1):
 *  - clientes      keyPath: id
 *  - suministros   keyPath: id
 *  - grupos        keyPath: id
 *  - delegaciones  keyPath: id
 *  - meta          keyPath: key  (singleton: key = 'master-data')
 */
@Injectable({ providedIn: 'root' })
export class MasterDataDbService {
  private readonly platformId = inject(PLATFORM_ID);
  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase> | null = null;

  // ── Public API ────────────────────────────────────────────────────────────

  /** Returns all records from an entity store. */
  getAll<S extends EntityStore>(store: S): Promise<StoreType<S>[]> {
    return this.transaction(store, 'readonly', (s) => s.getAll()) as Promise<StoreType<S>[]>;
  }

  /**
   * Replaces ALL records in an entity store with the supplied array.
   * Uses a single readwrite transaction for atomicity.
   */
  putAll<S extends EntityStore>(store: S, records: StoreType<S>[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.open().then((db) => {
        const tx = db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);

        const clearReq = os.clear();
        clearReq.onsuccess = () => {
          for (const record of records) {
            os.put(record);
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }, reject);
    });
  }

  /** Reads the singleton master-data metadata record. */
  getMeta(): Promise<MasterDataMeta | null> {
    return this.transaction('meta', 'readonly', (s) => s.get('master-data')) as Promise<MasterDataMeta | null>;
  }

  /** Writes (upserts) the singleton master-data metadata record. */
  saveMeta(meta: MasterDataMeta): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.open().then((db) => {
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put(meta);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }, reject);
    });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private open(): Promise<IDBDatabase> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('IndexedDB is only available in the browser'));
    }

    // Reuse an in-flight open request
    if (this.openPromise) return this.openPromise;

    // Reuse an already-open connection
    if (this.db) return Promise.resolve(this.db);

    this.openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const entityStores: EntityStore[] = ['clientes', 'suministros', 'grupos', 'delegaciones'];

        for (const name of entityStores) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        }

        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.openPromise = null;
        resolve(this.db);
      };

      request.onerror = () => {
        this.openPromise = null;
        reject(request.error);
      };

      request.onblocked = () => {
        this.openPromise = null;
        reject(new Error('IndexedDB upgrade blocked by an open tab'));
      };
    });

    return this.openPromise;
  }

  private transaction<T>(
    store: AnyStore,
    mode: IDBTransactionMode,
    operation: (objectStore: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.open().then((db) => {
        const tx = db.transaction(store, mode);
        const req = operation(tx.objectStore(store));

        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }, reject);
    });
  }
}
