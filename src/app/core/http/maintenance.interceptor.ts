import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { MaintenanceService } from '../services/maintenance.service';

export const maintenanceInterceptor: HttpInterceptorFn = (req, next) => {
  const maintenance = inject(MaintenanceService);
  return next(req).pipe(
    tap({
      next:  ()  => maintenance.set(false),
      error: (e) => { if (e?.status === 502) maintenance.set(true); },
    }),
  );
};
