import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';

import { BrandLoader } from './shared/components/brand-loader/brand-loader';
import { MaintenanceBanner } from './shared/components/maintenance-banner/maintenance-banner';
import { GlobalLoadingService } from './core/services/global-loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ConfirmDialog, BrandLoader, MaintenanceBanner],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly globalLoading = inject(GlobalLoadingService);
  private readonly router = inject(Router);

  protected onToastClick(event: Event): void {
    const msg = (event as any)?.message;
    const route: string | undefined = msg?.data?.route;
    if (route) void this.router.navigateByUrl(route);
  }
}
