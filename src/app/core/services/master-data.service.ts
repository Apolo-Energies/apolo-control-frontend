import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MasterDataDbService } from '../db/master-data-db.service';
import { Branch } from '../models/branch.model';
import { Customer } from '../models/customer.model';
import { Group } from '../models/group.model';
import { MasterDataMeta, MasterDataMetadata, MasterDataResponse } from '../models/master-data.model';
import { Supply } from '../models/supply.model';

/**
 * Global master-data cache backed by IndexedDB.
 *
 * Lifecycle
 * ─────────
 * 1. `initialize()` — reads IndexedDB and populates signals immediately (fast, <50 ms).
 *    Called from APP_INITIALIZER when a session already exists.
 *
 * 2. `refresh()` — fetches /v1/master-data from the API, persists to IDB, and
 *    updates signals. Called by the authenticated Layout after routing stabilises.
 *    Concurrent calls collapse into the in-flight request.
 *
 * 3. `invalidate*()` — optimistic local mutations that keep signals consistent
 *    without waiting for the next full refresh.
 */
@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly http = inject(HttpClient);
  private readonly db = inject(MasterDataDbService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly url = `${environment.apiUrl}/v1/master-data`;
  private readonly metadataUrl = `${environment.apiUrl}/v1/master-data/metadata`;

  // ── Private mutable signals ───────────────────────────────────────────────

  private readonly _clientes = signal<Customer[]>([]);
  private readonly _suministros = signal<Supply[]>([]);
  private readonly _grupos = signal<Group[]>([]);
  private readonly _delegaciones = signal<Branch[]>([]);
  private readonly _motivosRechazo = signal<string[]>([]);
  private readonly _lastUpdated = signal<string | null>(null);
  private readonly _version = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Guard against concurrent refresh() calls
  private refreshPromise: Promise<void> | null = null;

  // ── Public readonly signals ───────────────────────────────────────────────

  readonly clientes = this._clientes.asReadonly();
  readonly suministros = this._suministros.asReadonly();
  readonly grupos = this._grupos.asReadonly();
  readonly delegaciones = this._delegaciones.asReadonly();
  readonly motivosRechazo = this._motivosRechazo.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();
  readonly version = this._version.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ── Derived computed signals ──────────────────────────────────────────────

  readonly clientesActivos = computed(() => this._clientes().filter((c) => c.activo));
  readonly suministrosActivos = computed(() => this._suministros().filter((s) => s.activo));
  readonly gruposActivos = computed(() => this._grupos().filter((g) => g.activo));
  readonly delegacionesActivas = computed(() => this._delegaciones().filter((d) => d.activo));

  /** True until the first successful load (IDB or HTTP). */
  readonly isEmpty = computed(
    () =>
      this._clientes().length === 0 &&
      this._grupos().length === 0 &&
      this._delegaciones().length === 0,
  );

  // ── Initialisation ────────────────────────────────────────────────────────

  /**
   * Hydrates signals from the IndexedDB cache.
   * Intended for APP_INITIALIZER — does NOT hit the network.
   * Safe to call when there is no cached data yet (no-op).
   */
  async initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const [clientes, suministros, grupos, delegaciones, meta] = await Promise.all([
        this.db.getAll('clientes'),
        this.db.getAll('suministros'),
        this.db.getAll('grupos'),
        this.db.getAll('delegaciones'),
        this.db.getMeta(),
      ]);

      this._clientes.set(clientes);
      this._suministros.set(suministros);
      this._grupos.set(grupos);
      this._delegaciones.set(delegaciones);

      if (meta) {
        this._motivosRechazo.set(meta.motivosRechazo);
        this._lastUpdated.set(meta.lastUpdated);
        this._version.set(meta.version);
      }
    } catch {
      // IDB unavailable or empty — signals stay at defaults; refresh() will fill them.
    }

    // Re-check metadata whenever the user returns to this tab.
    // refresh() is cheap (only /metadata first) and collapses concurrent calls.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.refresh();
      }
    });
  }

  /**
   * Fetches fresh data from the API, persists it to IndexedDB, and updates all signals.
   * Concurrent calls collapse: if a refresh is already in flight the same promise is returned.
   */
  refresh(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  // ── Optimistic local invalidation ─────────────────────────────────────────

  /** Upserts a cliente in the local signal (call after POST/PUT). */
  upsertCliente(updated: Customer): void {
    this._clientes.update((prev) => upsert(prev, updated));
  }

  /** Removes a cliente from the local signal (call after DELETE). */
  removeCliente(id: string): void {
    this._clientes.update((prev) => prev.filter((c) => c.id !== id));
  }

  /** Upserts a grupo in the local signal (call after POST/PUT). */
  upsertGrupo(updated: Group): void {
    this._grupos.update((prev) => upsert(prev, updated));
  }

  /** Removes a grupo from the local signal (call after DELETE). */
  removeGrupo(id: string): void {
    this._grupos.update((prev) => prev.filter((g) => g.id !== id));
  }

  /** Upserts a delegacion in the local signal (call after POST/PUT). */
  upsertDelegacion(updated: Branch): void {
    this._delegaciones.update((prev) => upsert(prev, updated));
  }

  /** Removes a delegacion from the local signal (call after DELETE). */
  removeDelegacion(id: string): void {
    this._delegaciones.update((prev) => prev.filter((d) => d.id !== id));
  }

  /** Upserts a suministro in the local signal (call after POST/PUT). */
  upsertSuministro(updated: Supply): void {
    this._suministros.update((prev) => upsert(prev, updated));
  }

  /** Removes a suministro from the local signal (call after DELETE). */
  removeSuministro(id: string): void {
    this._suministros.update((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _doRefresh(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // 1. Lightweight metadata check — only ~100 bytes
      const meta = await firstValueFrom(this.http.get<MasterDataMetadata>(this.metadataUrl));

      // 2. Skip full download if the cached version is already up to date
      if (meta.version === this._version()) {
        return;
      }

      // 3. Version changed (or cache was empty) — fetch the full payload
      const data = await firstValueFrom(this.http.get<MasterDataResponse>(this.url));
      await this._persist(data);
      this._applyToSignals(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido al cargar datos maestros';
      this._error.set(message);
      // Leave whatever is in the signals (IDB cache) intact — do not wipe it.
    } finally {
      this._loading.set(false);
    }
  }

  private async _persist(data: MasterDataResponse): Promise<void> {
    const meta: MasterDataMeta = {
      key: 'master-data',
      lastUpdated: data.lastUpdated,
      version: data.version,
      totalRecords: data.totalRecords,
      motivosRechazo: data.motivosRechazo,
    };

    await Promise.all([
      this.db.putAll('clientes', data.clientes),
      this.db.putAll('suministros', data.suministros),
      this.db.putAll('grupos', data.grupos),
      this.db.putAll('delegaciones', data.delegaciones),
      this.db.saveMeta(meta),
    ]);
  }

  private _applyToSignals(data: MasterDataResponse): void {
    this._clientes.set(data.clientes);
    this._suministros.set(data.suministros);
    this._grupos.set(data.grupos);
    this._delegaciones.set(data.delegaciones);
    this._motivosRechazo.set(data.motivosRechazo);
    this._lastUpdated.set(data.lastUpdated);
    this._version.set(data.version);
  }
}

// ── Module-level helper ────────────────────────────────────────────────────

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  return idx >= 0 ? [...list.slice(0, idx), item, ...list.slice(idx + 1)] : [item, ...list];
}
