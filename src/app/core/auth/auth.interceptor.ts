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

const AUTH_FREE_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Todas las peticiones al API llevan credentials para que el navegador envíe las cookies
  const credReq = req.clone({ withCredentials: true });

  const isAuthFree = AUTH_FREE_PATHS.some((path) => credReq.url.includes(path));

  return next(credReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const tokenExpired  = auth.isTokenExpired();
      const shouldRefresh =
        !isAuthFree &&
        auth.session() !== null &&
        (error.status === 401 || (error.status === 403 && tokenExpired));

      if (!shouldRefresh) {
        if (!isAuthFree && (error.status === 401 || error.status === 403)) {
          auth.logout();
          void router.navigate(['/login']);
        }
        return throwError(() => error);
      }
      return refreshAndRetry(auth, router, credReq, next);
    }),
  );
};

function refreshAndRetry(
  auth:        AuthService,
  router:      Router,
  originalReq: HttpRequest<unknown>,
  next:        HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  return auth.refresh().pipe(
    switchMap(() => next(originalReq)),
    catchError((refreshError) => {
      auth.logout();
      void router.navigate(['/login']);
      return throwError(() => refreshError);
    }),
  );
}
