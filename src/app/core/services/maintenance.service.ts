import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  readonly active = signal(false);

  set(value: boolean): void { this.active.set(value); }
}
