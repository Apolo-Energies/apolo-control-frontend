import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MaintenanceService } from '../../../core/services/maintenance.service';

@Component({
  selector: 'app-maintenance-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (maintenance.active()) {
      <div class="maintenance-banner">
        <span class="maintenance-icon">⚙️</span>
        <span class="maintenance-text">
          El sistema se está actualizando, por favor espera unos minutos.
        </span>
        <button class="maintenance-close" (click)="maintenance.set(false)" aria-label="Cerrar">✕</button>
      </div>
    }
  `,
  styles: [`
    .maintenance-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: #f59e0b;
      color: #1c1917;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .maintenance-icon { font-size: 16px; flex-shrink: 0; }
    .maintenance-text { flex: 1; }
    .maintenance-close {
      flex-shrink: 0;
      background: none;
      border: none;
      font-size: 14px;
      cursor: pointer;
      color: inherit;
      opacity: .7;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
    }
    .maintenance-close:hover { opacity: 1; background: rgba(0,0,0,.1); }
  `],
})
export class MaintenanceBanner {
  protected readonly maintenance = inject(MaintenanceService);
}
