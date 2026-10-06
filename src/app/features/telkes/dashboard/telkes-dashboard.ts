import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Icon } from '../../../shared/icons/icon';
import { TelkesAltaService } from '../../../core/services/telkes-alta.service';
import { TelkesDashboardStats } from '../../../core/models';

@Component({
  selector: 'app-telkes-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, Icon],
  templateUrl: './telkes-dashboard.html',
})
export class TelkesDashboard {
  private readonly service = inject(TelkesAltaService);

  protected readonly stats = signal<TelkesDashboardStats | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.service.dashboardStats().subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected fmtNumber(n: number | null | undefined): string {
    if (n == null) return '0';
    return new Intl.NumberFormat('es-ES').format(n);
  }
}
