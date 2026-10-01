import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Icon } from '../../../shared/icons/icon';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { BrandLoader } from '../../../shared/components/brand-loader/brand-loader';

import { VibraOcrService } from '../../../core/services/vibra-ocr.service';
import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { VibraTarifaService } from '../../../core/services/vibra-tarifa.service';
import { NotificationService } from '../../../core/services/notification.service';
import type { PdfOferta } from '../../../core/services/contrato-pdf.service';
import { VibraContratoPdfService, PdfContratoData } from '../../../core/services/vibra-contrato-pdf.service';
import { VibraOcrResult, VibraAltaPayload, VibraTarifa } from '../../../core/models';

@Component({
  selector: 'app-vibra-contrato-servicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon, PageHeader, BrandLoader],
  templateUrl: './vibra-contrato-servicio.html',
})
export class VibraContratoServicio {
  private readonly ocrService = inject(VibraOcrService);
  private readonly altaService = inject(VibraAltaService);
  private readonly tarifaService = inject(VibraTarifaService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly pdfService = inject(VibraContratoPdfService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly requiredLabels: Record<string, string> = {
    nombre: 'Nombre / Razón Social',
    documentoNum: 'Nº de documento',
    cups: 'CUPS electricidad',
    email: 'Correo electrónico (formato)',
  };

  protected readonly file = signal<File | null>(null);
  protected readonly ocrDone = signal(false);
  protected readonly ocrLoading = signal(false);
  protected readonly saving = signal(false);
  protected readonly generatingPdf = signal(false);

  protected readonly tarifas = signal<VibraTarifa[]>([]);
  protected readonly tipoTarifaSelec = signal<string>('');
  protected readonly productoSelec = signal<VibraTarifa | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    documentoNum: ['', Validators.required],
    tipoDocumento: ['DNI'],
    cups: ['', Validators.required],
    tarifaAcceso: [''],
    direccion: [''],
    numero: [''],
    pisoPuerta: [''],
    poblacion: [''],
    provincia: [''],
    codigoPostal: [''],
    p1: [''], p2: [''], p3: [''], p4: [''], p5: [''], p6: [''],
    consumoAnual: [''],
    fechaInicio: [''],
    iban: [''],
    email: ['', Validators.email],
    telefono: [''],
    duracion: ['12 meses'],
  });

  protected readonly productos = computed<VibraTarifa[]>(() => {
    const tipo = this.tipoTarifaSelec();
    if (!tipo) return [];
    return this.tarifas().filter(t => t.tipo === tipo);
  });

  constructor() {
    this.tarifaService.list({ activa: true }).subscribe({
      next: (list) => this.tarifas.set(list),
      error: () => {},
    });
  }

  protected triggerFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  protected onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.uploadAndExtract(f);
    input.value = '';
  }

  protected onDrop(ev: DragEvent): void {
    ev.preventDefault();
    const f = ev.dataTransfer?.files?.[0];
    if (f) this.uploadAndExtract(f);
  }

  protected onDragOver(ev: DragEvent): void { ev.preventDefault(); }

  private uploadAndExtract(f: File): void {
    this.file.set(f);
    this.ocrLoading.set(true);
    this.ocrService.extractFactura(f).subscribe({
      next: (r) => {
        this.applyOcrToForm(r);
        this.ocrLoading.set(false);
        this.ocrDone.set(true);
        this.notify.success('Datos extraídos de la factura');
      },
      error: (err: HttpErrorResponse) => {
        this.ocrLoading.set(false);
        this.notify.error(err.error?.message ?? err.message ?? 'Error al procesar la factura');
      },
    });
  }

  private applyOcrToForm(r: VibraOcrResult): void {
    this.form.patchValue({
      nombre: r.nombre ?? '',
      documentoNum: r.documentoNum ?? '',
      tipoDocumento: r.tipoDocumento ?? 'DNI',
      cups: r.cups ?? '',
      tarifaAcceso: r.tarifaAcceso ?? '',
      direccion: r.direccion ?? '',
      numero: r.numero ?? '',
      pisoPuerta: r.pisoPuerta ?? '',
      poblacion: r.poblacion ?? '',
      provincia: r.provincia ?? '',
      codigoPostal: r.codigoPostal ?? '',
      p1: r.p1 ?? '', p2: r.p2 ?? '', p3: r.p3 ?? '',
      p4: r.p4 ?? '', p5: r.p5 ?? '', p6: r.p6 ?? '',
    });
    if (r.tarifaAcceso === '2.0TD' || r.tarifaAcceso === '3.0TD') {
      this.tipoTarifaSelec.set(r.tarifaAcceso);
    }
  }

  protected changeFactura(): void {
    this.file.set(null);
    this.ocrDone.set(false);
    this.form.reset({ tipoDocumento: 'DNI', duracion: '12 meses' });
    this.tipoTarifaSelec.set('');
    this.productoSelec.set(null);
  }

  protected setTipoTarifa(tipo: string): void {
    this.tipoTarifaSelec.set(tipo);
    this.productoSelec.set(null);
  }

  protected selectProducto(t: VibraTarifa): void {
    this.productoSelec.set(t);
  }

  protected getEnergiaPeriodo(t: VibraTarifa, p: number): number | null {
    return (t as unknown as Record<string, number | null>)['p' + p + 'Energia'] ?? null;
  }

  protected getPotenciaPeriodo(t: VibraTarifa, p: number): number | null {
    return (t as unknown as Record<string, number | null>)['p' + p + 'Potencia'] ?? null;
  }

  protected fmt(n: number | null | undefined): string {
    if (n == null) return '—';
    return Number(n).toFixed(6);
  }

  protected showError(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  protected errorMsg(name: string): string {
    const c = this.form.get(name);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Este campo es obligatorio';
    if (c.errors['email']) return 'Email no válido';
    return 'Valor no válido';
  }

  protected crearAlta(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing = this.firstMissingLabel();
      this.notify.error(missing ? `Falta: ${missing}` : 'Faltan campos obligatorios');
      this.scrollToFirstInvalid();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const potenciaResumen = (['p1','p2','p3','p4','p5','p6'] as const)
      .filter(k => v[k] != null && v[k] !== '')
      .map((k, i) => `P${i + 1}: ${v[k]}`)
      .join(' | ');
    const producto = this.productoSelec();
    const payload: VibraAltaPayload = {
      titular: v.nombre!,
      cups: v.cups ?? null,
      nifCif: v.documentoNum ?? null,
      direccionSuministro: [v.direccion, v.numero, v.pisoPuerta].filter(Boolean).join(', ') || null,
      poblacion: v.poblacion ?? null,
      provincia: v.provincia ?? null,
      email: v.email ?? null,
      telefono: v.telefono ?? null,
      cuentaBancaria: v.iban ?? null,
      estado: 'Pendiente',
      fecha: v.fechaInicio || new Date().toISOString().substring(0, 10),
      potenciaOriginal: potenciaResumen || null,
      consumo: v.consumoAnual ? Number(v.consumoAnual) : null,
      comercializadora: producto?.nombre ?? null,
    };
    this.altaService.create(payload).subscribe({
      next: async (alta) => {
        try {
          await this.pdfService.generarPdf(this.buildPdfData());
        } catch (e) {
          console.error('Error generando PDF', e);
          this.notify.warn('Alta creada pero el PDF no pudo generarse');
        }
        this.saving.set(false);
        this.notify.success('Alta creada correctamente');
        this.router.navigate(['/vibra/altas'], { queryParams: { highlight: alta.id } });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(err.error?.message ?? 'Error al crear el alta');
      },
    });
  }

  private firstMissingLabel(): string | null {
    for (const [key, label] of Object.entries(this.requiredLabels)) {
      if (this.form.get(key)?.invalid) return label;
    }
    return null;
  }

  private scrollToFirstInvalid(): void {
    setTimeout(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(
        '.ng-invalid.ng-touched, .ng-invalid[formControlName]',
      );
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLInputElement).focus?.();
    }, 30);
  }

  protected async descargarPdf(): Promise<void> {
    this.generatingPdf.set(true);
    try {
      await this.pdfService.generarPdf(this.buildPdfData());
      this.notify.success('PDF descargado');
    } catch (e) {
      console.error('Error generando PDF', e);
      this.notify.error('No se pudo generar el PDF');
    } finally {
      this.generatingPdf.set(false);
    }
  }

  private buildPdfData(): PdfContratoData {
    const v = this.form.getRawValue();
    const producto = this.productoSelec();
    const numeroToFloat = (s: string | null | undefined): number | null => {
      if (s == null || s === '') return null;
      const n = Number(String(s).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const oferta: PdfOferta | null = producto ? {
      nombre_producto: producto.nombre,
      tipo_oferta: 'FIJO',
      tarifas: {
        [producto.tipo ?? '2.0TD']: {
          energia_p1: this.getEnergiaPeriodo(producto, 1),
          energia_p2: this.getEnergiaPeriodo(producto, 2),
          energia_p3: this.getEnergiaPeriodo(producto, 3),
          energia_p4: this.getEnergiaPeriodo(producto, 4),
          energia_p5: this.getEnergiaPeriodo(producto, 5),
          energia_p6: this.getEnergiaPeriodo(producto, 6),
          potencia_p1: this.getPotenciaPeriodo(producto, 1),
          potencia_p2: this.getPotenciaPeriodo(producto, 2),
          potencia_p3: this.getPotenciaPeriodo(producto, 3),
          potencia_p4: this.getPotenciaPeriodo(producto, 4),
          potencia_p5: this.getPotenciaPeriodo(producto, 5),
          potencia_p6: this.getPotenciaPeriodo(producto, 6),
        },
      },
    } : null;
    return {
      fecha_contrato: v.fechaInicio || new Date().toISOString().substring(0, 10),
      ciudad: v.poblacion ?? '',
      nombre_cliente: v.nombre ?? '',
      cif: v.documentoNum ?? '',
      tipo_documento: v.tipoDocumento ?? 'DNI',
      telefono: v.telefono ?? '',
      correo: v.email ?? '',
      direccion_fiscal: [v.direccion, v.numero, v.pisoPuerta].filter(Boolean).join(', '),
      municipio_fiscal: v.poblacion ?? '',
      provincia_fiscal: v.provincia ?? '',
      cp_fiscal: v.codigoPostal ?? '',
      cups: v.cups ? [v.cups] : [],
      tarifa: v.tarifaAcceso ?? '',
      direccion_suministro: [v.direccion, v.numero, v.pisoPuerta].filter(Boolean).join(', '),
      numero: v.numero ?? '',
      piso_puerta: v.pisoPuerta ?? '',
      duracion: v.duracion ?? '12 meses',
      municipio: v.poblacion ?? '',
      provincia: v.provincia ?? '',
      cp: v.codigoPostal ?? '',
      potencia_p1: numeroToFloat(v.p1),
      potencia_p2: numeroToFloat(v.p2),
      potencia_p3: numeroToFloat(v.p3),
      potencia_p4: numeroToFloat(v.p4),
      potencia_p5: numeroToFloat(v.p5),
      potencia_p6: numeroToFloat(v.p6),
      consumo_p1: v.consumoAnual ? Number(v.consumoAnual) : null,
      numero_cuenta_bancaria: v.iban ?? '',
      ofertas: oferta ? [oferta] : [],
    };
  }

  protected goManual(): void {
    this.ocrDone.set(true);
    this.file.set(null);
  }
}
