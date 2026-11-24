import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { UserRole } from '../models';
import { AuthService } from './auth.service';

/** Aplicación interna: el colaborador Vibra no entra (su API daría 403 y cerraría la sesión). */
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.esColaborador()) {
    return router.createUrlTree(['/colaborador']);
  }

  const requiredRoles = route.data?.['roles'] as UserRole[] | undefined;
  if (requiredRoles?.length && !auth.hasRole(...requiredRoles)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

/** Portal del colaborador Vibra: solo rol colaborador. */
export const colaboradorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return auth.esColaborador() ? true : router.createUrlTree(['/dashboard']);
};

export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return router.createUrlTree([auth.homeUrl()]);
  }
  return true;
};
