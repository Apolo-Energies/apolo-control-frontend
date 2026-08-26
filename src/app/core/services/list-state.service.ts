import { Injectable, inject } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';

@Injectable({ providedIn: 'root' })
export class ListStateService {
  private readonly prefs = inject(UserPreferencesService);
  private readonly cache = new Map<string, Record<string, unknown>>();

  get<T extends Record<string, unknown>>(key: string): T | null {
    if (!this.prefs.mantenerFiltros()) return null;
    return (this.cache.get(key) as T) ?? null;
  }

  save(key: string, state: Record<string, unknown>): void {
    if (!this.prefs.mantenerFiltros()) return;
    this.cache.set(key, state);
  }
}
