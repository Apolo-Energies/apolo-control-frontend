import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthSession,
  AuthenticatedUser,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserRole,
} from '../models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly sessionSignal = signal<AuthSession | null>(this.storage.read());

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed<AuthenticatedUser | null>(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly role = computed<UserRole | null>(() => this.sessionSignal()?.user.rol ?? null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((response) => this.persistFromLogin(response)),
    );
  }

  refresh(): Observable<RefreshTokenResponse> {
    const current = this.sessionSignal();
    if (!current) {
      throw new Error('No active session to refresh');
    }
    const body: RefreshTokenRequest = { refreshToken: current.refreshToken };
    return this.http.post<RefreshTokenResponse>(`${this.baseUrl}/refresh`, body).pipe(
      tap((response) => this.persistFromRefresh(response)),
    );
  }

  logout(): void {
    this.storage.clear();
    this.sessionSignal.set(null);
  }

  token(): string | null {
    return this.sessionSignal()?.token ?? null;
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  isTokenExpired(): boolean {
    const token = this.token();
    return token === null || this.storage.isTokenExpired(token);
  }

  private persistFromLogin(response: LoginResponse): void {
    const session: AuthSession = {
      token: response.token,
      refreshToken: response.refreshToken,
      user: {
        id: response.id,
        nombre: response.nombre,
        email: response.email,
        rol: response.rol,
      },
    };
    this.storage.write(session);
    this.sessionSignal.set(session);
  }

  private persistFromRefresh(response: RefreshTokenResponse): void {
    const current = this.sessionSignal();
    if (!current) {
      return;
    }
    const session: AuthSession = {
      ...current,
      token: response.token,
      refreshToken: response.refreshToken,
    };
    this.storage.write(session);
    this.sessionSignal.set(session);
  }
}
