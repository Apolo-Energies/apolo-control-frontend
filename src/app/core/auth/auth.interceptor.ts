import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const AUTH_FREE_PATHS = ['/auth/login', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthFree = AUTH_FREE_PATHS.some((path) => req.url.includes(path));
  const token = auth.token();

  const authReq = !isAuthFree && token ? withBearer(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Refrescamos el token cuando:
      //  - 401 (no autorizado), o
      //  - 403 con el token ya expirado localmente (el backend devuelve 403 en
      //    vez de 401 cuando el JWT caduca).
      // Un 403 con token aún válido es falta de permisos: se propaga tal cual.
      const tokenExpired = auth.isTokenExpired();
      const shouldRefresh =
        !isAuthFree &&
        auth.session() !== null &&
        (error.status === 401 || (error.status === 403 && tokenExpired));

      if (!shouldRefresh) {
        return throwError(() => error);
      }
      return refreshAndRetry(auth, router, req, next);
    }),
  );
};

function withBearer<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function refreshAndRetry(
  auth: AuthService,
  router: Router,
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  return auth.refresh().pipe(
    switchMap(() => {
      const newToken = auth.token();
      const retried = newToken ? withBearer(originalReq, newToken) : originalReq;
      return next(retried);
    }),
    catchError((refreshError) => {
      auth.logout();
      void router.navigate(['/login']);
      return throwError(() => refreshError);
    }),
  );
}
