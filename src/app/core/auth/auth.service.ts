import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthSession,
  AuthenticatedUser,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  UserRole,
} from '../models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http    = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly sessionSignal = signal<AuthSession | null>(this.storage.read());

  readonly session         = this.sessionSignal.asReadonly();
  readonly user            = computed<AuthenticatedUser | null>(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly role            = computed<UserRole | null>(() => this.sessionSignal()?.user.rol ?? null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, credentials, { withCredentials: true })
      .pipe(tap((r) => this.persistFromLogin(r)));
  }

  refresh(): Observable<RefreshTokenResponse> {
    if (!this.sessionSignal()) throw new Error('No active session to refresh');
    return this.http
      .post<RefreshTokenResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(tap((r) => this.persistFromRefresh(r)));
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe();
    this.storage.clear();
    this.sessionSignal.set(null);
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  isTokenExpired(): boolean {
    return this.storage.isTokenExpired();
  }

  private persistFromLogin(response: LoginResponse): void {
    const user: AuthenticatedUser = {
      id:     response.id,
      nombre: response.nombre,
      email:  response.email,
      rol:    response.rol,
    };
    this.storage.write(user, response.expiresAt);
    this.sessionSignal.set({ user, tokenExpiresAt: response.expiresAt });
  }

  private persistFromRefresh(response: RefreshTokenResponse): void {
    const current = this.sessionSignal();
    if (!current) return;
    this.storage.updateExpiry(response.expiresAt);
    this.sessionSignal.set({ ...current, tokenExpiresAt: response.expiresAt });
  }
}
