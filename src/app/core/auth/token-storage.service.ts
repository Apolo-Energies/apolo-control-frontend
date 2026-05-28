import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { jwtDecode } from 'jwt-decode';

import { environment } from '../../../environments/environment';
import { AuthSession } from '../models';

interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
}

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = environment.tokenStorageKey;

  read(): AuthSession | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  write(session: AuthSession): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(this.storageKey);
  }

  isTokenExpired(token: string, marginSeconds = 30): boolean {
    try {
      const payload = jwtDecode<JwtPayload>(token);
      if (!payload.exp) {
        return false;
      }
      const expMs = payload.exp * 1000;
      return Date.now() + marginSeconds * 1000 >= expMs;
    } catch {
      return true;
    }
  }
}
