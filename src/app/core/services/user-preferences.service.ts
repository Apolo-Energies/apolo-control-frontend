import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';

interface UserPrefs {
  mantenerFiltros: boolean;
}

const DEFAULTS: UserPrefs = { mantenerFiltros: true };

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly auth = inject(AuthService);
  private readonly prefs = signal<UserPrefs>(DEFAULTS);

  constructor() {
    const userId = this.auth.user()?.id;
    if (userId) {
      try {
        const raw = localStorage.getItem(`prefs_${userId}`);
        if (raw) this.prefs.set({ ...DEFAULTS, ...JSON.parse(raw) as Partial<UserPrefs> });
      } catch {}
    }
  }

  readonly mantenerFiltros = computed(() => this.prefs().mantenerFiltros);

  set<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]): void {
    const next = { ...this.prefs(), [key]: value };
    this.prefs.set(next);
    const userId = this.auth.user()?.id;
    if (!userId) return;
    try { localStorage.setItem(`prefs_${userId}`, JSON.stringify(next)); } catch {}
  }
}
