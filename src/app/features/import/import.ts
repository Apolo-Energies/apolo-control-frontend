import {
  ChangeDetectionStrategy, Component, inject, signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { Icon } from '../../shared/icons/icon';
import { NotificationService } from '../../core/services/notification.service';
import {
  ContratosServiciosImportService,
  ImportResult,
} from '../../core/services/contratos-servicios-import.service';
import { environment } from '../../../environments/environment';

type Tab = 'contratos' | 'ventas' | 'rechazos' | 'pagos' | 'facturas' | 'cambios' | 'impagos';

interface MigrationResult {
  entityName: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  durationMs: number;
  status: string;
  errorMessage?: string;
  clientesCreados?: string[];
}

@Component({
  selector: 'app-import',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, Icon, NgTemplateOutlet],
  templateUrl: './import.html',
})
export class Import {
  private readonly importService = inject(ContratosServiciosImportService);
  private readonly http          = inject(HttpClient);
  private readonly notify        = inject(NotificationService);

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

  // ── Pagos / Liquidaciones (CSV) ─────────────────────────────────
  protected readonly pagoFile    = signal<File | null>(null);
  protected readonly pagoLoading = signal(false);
  protected readonly pagoResult  = signal<ImportResult | null>(null);

  protected onPagoFileChange(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.pagoFile.set(f); this.pagoResult.set(null);
  }
  protected onPagoDrop(event: DragEvent): void {
    event.preventDefault();
    const f = event.dataTransfer?.files?.[0] ?? null;
    if (f) { this.pagoFile.set(f); this.pagoResult.set(null); }
  }
  protected clearPagoFile(): void { this.pagoFile.set(null); this.pagoResult.set(null); }
  protected previewPago(): void { this.runPago(true); }
  protected importarPago(): void { this.runPago(false); }

  private runPago(dryRun: boolean): void {
    const f = this.pagoFile();
    if (!f) return;
    this.pagoLoading.set(true);
    this.pagoResult.set(null);
    this.importService.importarPagos(f, dryRun).subscribe({
      next: (r) => {
        this.pagoLoading.set(false);
        this.pagoResult.set(r);
        if (!dryRun && r.errors === 0)
          this.notify.success(`Pagos importados: ${r.created} creados, ${r.skipped} ya existían`);
      },
      error: (err: HttpErrorResponse) => {
        this.pagoLoading.set(false);
        this.notify.error((err.error as { message?: string })?.message ?? 'Error en la importación');
      },
    });
  }

  // ── Facturas Contabilidad (CSV) ─────────────────────────────────
  protected readonly facturaFile    = signal<File | null>(null);
  protected readonly facturaLoading = signal(false);
  protected readonly facturaResult  = signal<ImportResult | null>(null);

  protected onFacturaFileChange(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.facturaFile.set(f); this.facturaResult.set(null);
  }
  protected onFacturaDrop(event: DragEvent): void {
    event.preventDefault();
    const f = event.dataTransfer?.files?.[0] ?? null;
    if (f) { this.facturaFile.set(f); this.facturaResult.set(null); }
  }
  protected clearFacturaFile(): void { this.facturaFile.set(null); this.facturaResult.set(null); }
  protected previewFactura(): void { this.runFactura(true); }
  protected importarFactura(): void { this.runFactura(false); }

  private runFactura(dryRun: boolean): void {
    const f = this.facturaFile();
    if (!f) return;
    this.facturaLoading.set(true);
    this.facturaResult.set(null);
    this.importService.importarFacturas(f, dryRun).subscribe({
      next: (r) => {
        this.facturaLoading.set(false);
        this.facturaResult.set(r);
        if (!dryRun && r.errors === 0)
          this.notify.success(`Facturas importadas: ${r.created} creadas, ${r.skipped} ya existían`);
      },
      error: (err: HttpErrorResponse) => {
        this.facturaLoading.set(false);
        this.notify.error((err.error as { message?: string })?.message ?? 'Error en la importación');
      },
    });
  }

  // ── Cambios (CSV) ───────────────────────────────────────────────────────
  protected readonly cambioFile    = signal<File | null>(null);
  protected readonly cambioLoading = signal(false);
  protected readonly cambioResult  = signal<ImportResult | null>(null);

  protected onCambioFileChange(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.cambioFile.set(f); this.cambioResult.set(null);
  }
  protected onCambioDrop(event: DragEvent): void {
    event.preventDefault();
    const f = event.dataTransfer?.files?.[0] ?? null;
    if (f) { this.cambioFile.set(f); this.cambioResult.set(null); }
  }
  protected clearCambioFile(): void { this.cambioFile.set(null); this.cambioResult.set(null); }
  protected previewCambio(): void { this.runCambio(true); }
  protected importarCambio(): void { this.runCambio(false); }

  private runCambio(dryRun: boolean): void {
    const f = this.cambioFile();
    if (!f) return;
    this.cambioLoading.set(true);
    this.cambioResult.set(null);
    this.importService.importarCambios(f, dryRun).subscribe({
      next: (r: ImportResult) => {
        this.cambioLoading.set(false);
        this.cambioResult.set(r);
        if (!dryRun && r.errors === 0)
          this.notify.success(`Cambios importados: ${r.created} creados, ${r.skipped} ya existían`);
      },
      error: (err: HttpErrorResponse) => {
        this.cambioLoading.set(false);
        this.notify.error((err.error as { message?: string })?.message ?? 'Error en la importación');
      },
    });
  }

  // ── Impagos Base44 (multipart) ───────────────────────────────────
  protected readonly clientesFile   = signal<File | null>(null);
  protected readonly impagoFile     = signal<File | null>(null);
  protected readonly accionesFile   = signal<File | null>(null);
  protected readonly impagosLoading = signal(false);
  protected readonly impagosResults = signal<MigrationResult[] | null>(null);
  protected readonly impagosError   = signal<string | null>(null);

  protected onClientesFileChange(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.clientesFile.set(f); this.impagosResults.set(null);
  }
  protected onImpagoFileChange(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.impagoFile.set(f); this.impagosResults.set(null);
  }
  protected onAccionesFileChange(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.accionesFile.set(f); this.impagosResults.set(null);
  }

  protected onClientesDrop(e: DragEvent): void {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] ?? null;
    if (f) { this.clientesFile.set(f); this.impagosResults.set(null); }
  }
  protected onImpagoDrop(e: DragEvent): void {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] ?? null;
    if (f) { this.impagoFile.set(f); this.impagosResults.set(null); }
  }
  protected onAccionesDrop(e: DragEvent): void {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] ?? null;
    if (f) { this.accionesFile.set(f); this.impagosResults.set(null); }
  }

  protected ejecutarImportImpagos(): void {
    const c = this.clientesFile(), imp = this.impagoFile(), acc = this.accionesFile();
    if (!c || !imp || !acc) return;
    this.impagosLoading.set(true);
    this.impagosResults.set(null);
    this.impagosError.set(null);
    const fd = new FormData();
    fd.append('clientes', c);
    fd.append('impagos', imp);
    fd.append('acciones', acc);
    this.http.post<MigrationResult[]>(`${environment.apiUrl}/admin/migration/execute-gestion-impago-base44`, fd).subscribe({
      next: (results) => {
        this.impagosLoading.set(false);
        this.impagosResults.set(results);
        const total = results.reduce((s, r) => s + r.successCount, 0);
        const errs  = results.reduce((s, r) => s + r.errorCount, 0);
        if (errs === 0) this.notify.success(`Importación completada: ${total} registros importados`);
        else this.notify.error(`Importación con errores: ${errs} fallos, ${total} importados`);
      },
      error: (err: HttpErrorResponse) => {
        this.impagosLoading.set(false);
        this.impagosError.set((err.error as { message?: string })?.message ?? 'Error en la importación');
        this.notify.error('Error al importar datos de impagos');
      },
    });
  }

  protected impagosStatusClass(status: string): string {
    return status === 'SUCCESS' ? 'text-success' : status === 'PARTIAL' ? 'text-warning' : 'text-destructive';
  }

  // ── Utilities ───────────────────────────────────────────────────
  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}
