import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ListStateService {
  private readonly cache = new Map<string, Record<string, unknown>>();

  get<T extends Record<string, unknown>>(key: string): T | null {
    return (this.cache.get(key) as T) ?? null;
  }

  save(key: string, state: Record<string, unknown>): void {
    this.cache.set(key, state);
  }
}
