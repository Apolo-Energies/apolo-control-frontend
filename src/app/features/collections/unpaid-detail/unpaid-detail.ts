import {
  ChangeDetectionStrategy, Component, computed, inject, signal, OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PageHeader }    from '../../../shared/components/page-header/page-header';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { FormDialog }    from '../../../shared/components/form-dialog/form-dialog';
import { Icon }          from '../../../shared/icons/icon';

import { GestionImpagoService }         from '../../../core/services/gestion-impago.service';
import { GestionAccionCobranzaService } from '../../../core/services/gestion-accion-cobranza.service';
import { NotificationService }          from '../../../core/services/notification.service';
import { GlobalLoadingService }         from '../../../core/services/global-loading.service';
import {
  GestionImpago, GestionAccionCobranza,
  EstadoGestionImpago, ESTADO_GESTION_IMPAGO_VALUES, ESTADO_GESTION_IMPAGO_LABEL,
  TipoAccionCobranza, ResultadoAccionCobranza,
  TIPO_ACCION_LABEL, RESULTADO_ACCION_LABEL, DemandaDocumento,
} from '../../../core/models';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

function estadoToneFn(estado: EstadoGestionImpago): StatusTone {
  switch (estado) {
    case 'pagado':       return 'success';
    case 'va_a_pagar':   return 'info';
    case 'acuerdo_pago': return 'info';
    case 'aviso_corte':  return 'warning';
    case 'cortado':      return 'danger';
    case 'ovc':          return 'purple';
    case 'predemanda':   return 'warning';
    case 'demanda':      return 'danger';
    case 'juicio':       return 'danger';
    default:             return 'neutral';
  }
}

@Component({
  selector: 'app-unpaid-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader, StatusBadge, FormDialog, Icon,
    FormsModule, ReactiveFormsModule, RouterLink,
  ],
  templateUrl: './unpaid-detail.html',
})
export class UnpaidDetail implements OnInit {
  private readonly route          = inject(ActivatedRoute);
  private readonly service        = inject(GestionImpagoService);
  private readonly accionService  = inject(GestionAccionCobranzaService);
  private readonly notify         = inject(NotificationService);
  private readonly globalLoading  = inject(GlobalLoadingService);
  private readonly fb             = inject(FormBuilder);

  protected readonly loading      = signal(true);
  protected readonly impago       = signal<GestionImpago | null>(null);
  protected readonly acciones     = signal<GestionAccionCobranza[]>([]);
  protected readonly error        = signal<string | null>(null);

  // ── Bitácora de notas ─────────────────────────────────────────────────────
  protected readonly notaTexto     = signal('');
  protected readonly notaSaving    = signal(false);

  // ── Estado dialog ─────────────────────────────────────────────────────────
  protected readonly estadoDialogOpen  = signal(false);
  protected readonly estadoSubmitting  = signal(false);
  protected readonly estadoError       = signal<string | null>(null);
  protected readonly estadoForm = this.fb.group({
    estado: ['', Validators.required],
    notas: [''],
  });

  // ── Registrar contacto dialog ─────────────────────────────────────────────
  protected readonly contactoDialogOpen  = signal(false);
  protected readonly contactoSubmitting  = signal(false);
  protected readonly contactoError       = signal<string | null>(null);
  protected readonly contactoForm = this.fb.group({
    actionKey: ['llamada', Validators.required],
    notes: [''],
    promesaFecha: [''],
    promesaImporte: [null as number | null],
  });

  // ── Acción cobranza dialog ─────────────────────────────────────────────────
  protected readonly accionDialogOpen  = signal(false);
  protected readonly accionSubmitting  = signal(false);
  protected readonly accionError       = signal<string | null>(null);
  protected readonly accionForm = this.fb.group({
    tipoAccion: ['llamada', Validators.required],
    resultado: ['' as ResultadoAccionCobranza | ''],
    importeCobrado: [null as number | null],
    notas: [''],
    nextActionDate: [''],
  });

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoValues    = ESTADO_GESTION_IMPAGO_VALUES;
  protected readonly estadoLabel     = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly tipoAccionLabel = TIPO_ACCION_LABEL;
  protected readonly resultadoLabel  = RESULTADO_ACCION_LABEL;
  protected readonly tipoAccionValues: TipoAccionCobranza[] = [
    'llamada', 'email', 'whatsapp', 'aviso_legal', 'acuerdo_pago', 'otro',
  ];
  protected readonly resultadoValues: ResultadoAccionCobranza[] = [
    'no_contesta', 'promesa_pago', 'rechazado', 'pago_parcial', 'pago_total', 'negociando', 'escalado',
  ];

  // ── Computed display ──────────────────────────────────────────────────────
  protected readonly estadoTone   = computed(() => estadoToneFn(this.impago()?.estado ?? 'nuevo'));
  protected readonly pendiente    = computed(() => this.impago()?.importePendiente ?? 0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('ID no encontrado'); this.loading.set(false); return; }
    this.loadData(id);
  }

  private loadData(id: string): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (imp) => {
        this.impago.set(imp);
        this.loading.set(false);
        this.accionService.list(id).subscribe({
          next: (acc) => this.acciones.set(acc),
          error: () => {},
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(extractMessage(err));
        this.loading.set(false);
      },
    });
  }

  // ── Estado update ─────────────────────────────────────────────────────────
  protected openEstadoDialog(): void {
    const imp = this.impago();
    if (!imp) return;
    this.estadoForm.patchValue({ estado: imp.estado, notas: '' });
    this.estadoError.set(null);
    this.estadoDialogOpen.set(true);
  }

  protected submitEstado(): void {
    if (this.estadoForm.invalid) { this.estadoForm.markAllAsTouched(); return; }
    const imp = this.impago();
    if (!imp) return;
    const v = this.estadoForm.getRawValue();
    this.estadoSubmitting.set(true);
    this.estadoError.set(null);
    this.service.actualizarEstado(imp.id, {
      estado: v.estado as EstadoGestionImpago,
      notas: v.notas || null,
    }).subscribe({
      next: (updated) => {
        this.impago.set(updated);
        this.estadoSubmitting.set(false);
        this.estadoDialogOpen.set(false);
        this.notify.success('Estado actualizado');
      },
      error: (err: HttpErrorResponse) => {
        this.estadoSubmitting.set(false);
        this.estadoError.set(extractMessage(err));
      },
    });
  }

  // ── Registrar contacto ────────────────────────────────────────────────────
  protected openContactoDialog(): void {
    this.contactoForm.reset({ actionKey: 'llamada' });
    this.contactoError.set(null);
    this.contactoDialogOpen.set(true);
  }

  protected submitContacto(): void {
    if (this.contactoForm.invalid) { this.contactoForm.markAllAsTouched(); return; }
    const imp = this.impago();
    if (!imp) return;
    const v = this.contactoForm.getRawValue();
    this.contactoSubmitting.set(true);
    this.contactoError.set(null);
    this.service.registrarContacto(imp.id, {
      actionKey: v.actionKey!,
      notes: v.notes || null,
      promesaFecha: v.promesaFecha || null,
      promesaImporte: v.promesaImporte ?? null,
    }).subscribe({
      next: (updated) => {
        this.impago.set(updated);
        this.contactoSubmitting.set(false);
        this.contactoDialogOpen.set(false);
        this.notify.success('Contacto registrado');
      },
      error: (err: HttpErrorResponse) => {
        this.contactoSubmitting.set(false);
        this.contactoError.set(extractMessage(err));
      },
    });
  }

  // ── Registrar acción cobranza ─────────────────────────────────────────────
  protected openAccionDialog(): void {
    this.accionForm.reset({ tipoAccion: 'llamada' });
    this.accionError.set(null);
    this.accionDialogOpen.set(true);
  }

  protected submitAccion(): void {
    if (this.accionForm.invalid) { this.accionForm.markAllAsTouched(); return; }
    const imp = this.impago();
    if (!imp) return;
    const v = this.accionForm.getRawValue();
    this.accionSubmitting.set(true);
    this.accionError.set(null);
    this.accionService.create(imp.id, {
      tipoAccion: v.tipoAccion as TipoAccionCobranza,
      resultado: (v.resultado as ResultadoAccionCobranza) || null,
      importeCobrado: v.importeCobrado ?? null,
      notas: v.notas || null,
      nextActionDate: v.nextActionDate || null,
    }).subscribe({
      next: (acc) => {
        this.acciones.update(list => [acc, ...list]);
        this.accionSubmitting.set(false);
        this.accionDialogOpen.set(false);
        this.notify.success('Acción registrada');
      },
      error: (err: HttpErrorResponse) => {
        this.accionSubmitting.set(false);
        this.accionError.set(extractMessage(err));
      },
    });
  }

  // ── Bitácora ─────────────────────────────────────────────────────────────
  protected agregarNota(): void {
    const texto = this.notaTexto().trim();
    if (!texto) return;
    const imp = this.impago();
    if (!imp) return;
    this.notaSaving.set(true);
    this.service.agregarNota(imp.id, texto).subscribe({
      next: (updated) => {
        this.impago.set(updated);
        this.notaTexto.set('');
        this.notaSaving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notaSaving.set(false);
        this.notify.error(extractMessage(err));
      },
    });
  }

  // ── Document download ─────────────────────────────────────────────────────
  protected downloadDoc(doc: DemandaDocumento): void {
    const imp      = this.impago();
    if (!imp) return;
    const filename = doc.url.split('/').pop() ?? doc.nombre;
    this.service.downloadDocumento(imp.id, filename).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = doc.nombre;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar el documento'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  protected estadoToneFn(e: EstadoGestionImpago): StatusTone { return estadoToneFn(e); }
  protected fmt(v: string | null): string { return v ? new Date(v).toLocaleDateString('es-ES') : '—'; }
  protected fmtDateTime(v: string | null | undefined): string {
    if (!v) return '—';
    const d = new Date(v);
    return d.toLocaleDateString('es-ES') + ' · ' +
           d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  protected formatEur(v: number | null): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
  }
  protected formatBytes(bytes: number | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
