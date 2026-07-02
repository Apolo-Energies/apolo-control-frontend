import {
  ChangeDetectionStrategy, Component, inject, signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { Icon } from '../../shared/icons/icon';
import { NotificationService } from '../../core/services/notification.service';
import {
  ContratosServiciosImportService,
  ImportResult,
} from '../../core/services/contratos-servicios-import.service';

type Tab = 'contratos' | 'ventas' | 'rechazos';

@Component({
  selector: 'app-import',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, Icon, NgTemplateOutlet],
  templateUrl: './import.html',
})
export class Import {
  private readonly importService = inject(ContratosServiciosImportService);
  private readonly notify = inject(NotificationService);

  protected readonly activeTab = signal<Tab>('contratos');

  // ── ContratosServicios (Excel) ──────────────────────────────────
  protected readonly contratoFile    = signal<File | null>(null);
  protected readonly contratoLoading = signal(false);
  protected readonly contratoResult  = signal<ImportResult | null>(null);

  protected onContratoFileChange(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.contratoFile.set(f); this.contratoResult.set(null);
  }
  protected onContratoDrop(event: DragEvent): void {
    event.preventDefault();
    const f = event.dataTransfer?.files?.[0] ?? null;
    if (f) { this.contratoFile.set(f); this.contratoResult.set(null); }
  }
  protected clearContratoFile(): void { this.contratoFile.set(null); this.contratoResult.set(null); }
  protected previewContrato(): void { this.runContrato(true); }
  protected importarContrato(): void { this.runContrato(false); }

  private runContrato(dryRun: boolean): void {
    const f = this.contratoFile();
    if (!f) return;
    this.contratoLoading.set(true);
    this.contratoResult.set(null);
    this.importService.importar(f, dryRun).subscribe({
      next: (r) => {
        this.contratoLoading.set(false);
        this.contratoResult.set(r);
        if (!dryRun && r.errors === 0)
          this.notify.success(`Importación completada: ${r.created} creados, ${r.updated} actualizados`);
      },
      error: (err: HttpErrorResponse) => {
        this.contratoLoading.set(false);
        this.notify.error((err.error as { message?: string })?.message ?? 'Error en la importación');
      },
    });
  }

  // ── Ventas (CSV) ────────────────────────────────────────────────
  protected readonly ventaFile    = signal<File | null>(null);
  protected readonly ventaLoading = signal(false);
  protected readonly ventaResult  = signal<ImportResult | null>(null);

  protected onVentaFileChange(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.ventaFile.set(f); this.ventaResult.set(null);
  }
  protected onVentaDrop(event: DragEvent): void {
    event.preventDefault();
    const f = event.dataTransfer?.files?.[0] ?? null;
    if (f) { this.ventaFile.set(f); this.ventaResult.set(null); }
  }
  protected clearVentaFile(): void { this.ventaFile.set(null); this.ventaResult.set(null); }
  protected previewVenta(): void { this.runVenta(true); }
  protected importarVenta(): void { this.runVenta(false); }

  private runVenta(dryRun: boolean): void {
    const f = this.ventaFile();
    if (!f) return;
    this.ventaLoading.set(true);
    this.ventaResult.set(null);
    this.importService.importarVentas(f, dryRun).subscribe({
      next: (r) => {
        this.ventaLoading.set(false);
        this.ventaResult.set(r);
        if (!dryRun && r.errors === 0)
          this.notify.success(`Ventas importadas: ${r.created} clientes nuevos, ${r.updated} actualizados`);
      },
      error: (err: HttpErrorResponse) => {
        this.ventaLoading.set(false);
        this.notify.error((err.error as { message?: string })?.message ?? 'Error en la importación');
      },
    });
  }

  // ── Rechazos / Incidencias (CSV) ────────────────────────────────
  protected readonly rechazoFile    = signal<File | null>(null);
  protected readonly rechazoLoading = signal(false);
  protected readonly rechazoResult  = signal<ImportResult | null>(null);

  protected onRechazoFileChange(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.rechazoFile.set(f); this.rechazoResult.set(null);
  }
  protected onRechazoDrop(event: DragEvent): void {
    event.preventDefault();
    const f = event.dataTransfer?.files?.[0] ?? null;
    if (f) { this.rechazoFile.set(f); this.rechazoResult.set(null); }
  }
  protected clearRechazoFile(): void { this.rechazoFile.set(null); this.rechazoResult.set(null); }
  protected previewRechazo(): void { this.runRechazo(true); }
  protected importarRechazo(): void { this.runRechazo(false); }

  private runRechazo(dryRun: boolean): void {
    const f = this.rechazoFile();
    if (!f) return;
    this.rechazoLoading.set(true);
    this.rechazoResult.set(null);
    this.importService.importarRechazos(f, dryRun).subscribe({
      next: (r) => {
        this.rechazoLoading.set(false);
        this.rechazoResult.set(r);
        if (!dryRun && r.errors === 0)
          this.notify.success(`Rechazos importados: ${r.created} creados, ${r.skipped} ya existían`);
      },
      error: (err: HttpErrorResponse) => {
        this.rechazoLoading.set(false);
        this.notify.error((err.error as { message?: string })?.message ?? 'Error en la importación');
      },
    });
  }

  // ── Utilities ───────────────────────────────────────────────────
  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}
