import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { environment } from '../../../environments/environment';
import { AuthSession, AuthenticatedUser } from '../models';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = environment.tokenStorageKey;

  read(): AuthSession | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  write(user: AuthenticatedUser, tokenExpiresAt: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const session: AuthSession = { user, tokenExpiresAt };
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  updateExpiry(tokenExpiresAt: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const session = this.read();
    if (!session) return;
    localStorage.setItem(this.storageKey, JSON.stringify({ ...session, tokenExpiresAt }));
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(this.storageKey);
  }

  isTokenExpired(marginSeconds = 30): boolean {
    const session = this.read();
    if (!session) return true;
    return Date.now() + marginSeconds * 1000 >= session.tokenExpiresAt;
  }
}
