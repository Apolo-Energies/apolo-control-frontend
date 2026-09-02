import {
  ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { skip } from 'rxjs';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { Icon } from '../../../shared/icons/icon';

import { GestionImpagoService } from '../../../core/services/gestion-impago.service';
import { NotificationService } from '../../../core/services/notification.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import {
  GestionImpago, GestionImpagoPayload, GestionImpagoFilter,
  GestionImpagoCliente,
  GestionImpagoActualizarEstadoPayload,
  GestionImpagoTotales,
  EstadoGestionImpago, PrioridadGestionImpago,
  ESTADO_GESTION_IMPAGO_VALUES, ESTADO_GESTION_IMPAGO_LABEL,
  PRIORIDAD_GESTION_IMPAGO_LABEL, Page,
} from '../../../core/models';
import { GestionImpagoClienteService } from '../../../core/services/gestion-impago-cliente.service';
import { ListStateService } from '../../../core/services/list-state.service';

function extractMessage(err: HttpErrorResponse): string {
  return (err.error as { message?: string })?.message ?? err.message ?? 'Error inesperado';
}

const STEP_ACTIONS: Record<number, string[]> = {
  1: ['llamada', 'whatsapp'],
  2: ['llamada', 'whatsapp', 'email', 'otro'],
  3: ['llamada', 'whatsapp', 'email', 'aviso_corte', 'otro'],
  4: ['aviso_corte', 'llamada', 'promesa'],
  5: ['llamada', 'whatsapp', 'email', 'promesa'],
};

type RangeId = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
interface RangeOption { id: RangeId; label: string; }

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function toIsoWeek(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
function toIsoMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function weekBounds(isoWeek: string): { start: Date; end: Date } {
  const [yearStr, wStr] = isoWeek.split('-W');
  const year = +yearStr, week = +wStr;
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const mondayW1 = new Date(jan4);
  mondayW1.setDate(jan4.getDate() - dow + 1);
  const start = new Date(mondayW1);
  start.setDate(mondayW1.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}
function formatDayMonth(d: Date): string {
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function estadoToneFn(estado: EstadoGestionImpago): StatusTone {
  switch (estado) {
    case 'pagado':          return 'success';
    case 'va_a_pagar':      return 'info';
    case 'aviso_corte':     return 'warning';
    case 'cortado':         return 'danger';
    case 'ovc':             return 'purple';
    case 'demanda':         return 'danger';
    case 'credit_back':     return 'info';
    case 'perdidos':        return 'danger';
    case 'nuevo':           return 'neutral';
    default:                return 'neutral';
  }
}

function prioridadToneFn(prioridad: PrioridadGestionImpago): StatusTone {
  switch (prioridad) {
    case 'urgente': return 'danger';
    case 'alta':    return 'warning';
    case 'media':   return 'info';
    default:        return 'neutral';
  }
}

@Component({
  selector: 'app-unpaid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader, TableSkeleton, StatusBadge, Pagination, FormDialog,
    KpiCard, Icon, FormsModule, ReactiveFormsModule, RouterLink,
  ],
  templateUrl: './unpaid.html',
})
export class Unpaid implements OnDestroy {
  private readonly service        = inject(GestionImpagoService);
  private readonly clienteService = inject(GestionImpagoClienteService);
  private readonly notify         = inject(NotificationService);
  private readonly globalLoading  = inject(GlobalLoadingService);
  private readonly fb             = inject(FormBuilder);
  private readonly listState      = inject(ListStateService);
  private readonly route          = inject(ActivatedRoute);
  protected readonly masterData   = inject(MasterDataService);

  // ── List state ────────────────────────────────────────────────────────────
  protected readonly loading       = signal(false);
  protected readonly result        = signal<Page<GestionImpago> | null>(null);
  protected readonly totalesData   = signal<GestionImpagoTotales | null>(null);
  protected readonly error         = signal<string | null>(null);
  protected readonly page          = signal(0);
  protected readonly size          = signal(20);

  // ── Filters ───────────────────────────────────────────────────────────────
  protected q                   = '';
  protected estadoFilter:        EstadoGestionImpago | '' = '';
  protected clienteActivoFilter: 'activo' | 'baja' | 'cortado' | '' = '';
  protected pagadoFilter:        'pagado' | 'no_pagado' | '' = '';
  protected delegacionFilter                               = '';
  protected pagoFraccionadoFilter: boolean | null          = null;
  protected soloVencidosFilter: boolean | null             = null;

  // ── Date range filter ─────────────────────────────────────────────────────
  protected readonly range         = signal<RangeId>('all');
  protected readonly selectedWeek  = signal(toIsoWeek(new Date()));
  protected readonly selectedMonth = signal(toIsoMonth(new Date()));
  protected readonly selectedYear  = signal(new Date().getFullYear());
  protected readonly customStart   = signal<string>('');
  protected readonly customEnd     = signal<string>('');
  protected readonly availableYears = Array.from(
    { length: new Date().getFullYear() - 2020 + 1 },
    (_, i) => new Date().getFullYear() - i,
  );
  protected readonly weekRangeLabel = computed(() => {
    const { start, end } = weekBounds(this.selectedWeek());
    return `${formatDayMonth(start)} – ${formatDayMonth(end)} ${start.getFullYear()}`;
  });
  protected readonly ranges: RangeOption[] = [
    { id: 'today',  label: 'Hoy' },
    { id: 'week',   label: 'Semana' },
    { id: 'month',  label: 'Mes' },
    { id: 'year',   label: 'Año' },
    { id: 'all',    label: 'Histórico' },
    { id: 'custom', label: 'Personalizado' },
  ];

  protected setRange(id: RangeId): void {
    if (this.range() === id) return;
    this.range.set(id);
    const now = new Date();
    if (id === 'week')  this.selectedWeek.set(toIsoWeek(now));
    if (id === 'month') this.selectedMonth.set(toIsoMonth(now));
    if (id === 'year')  this.selectedYear.set(now.getFullYear());
    this.reload(0);
  }

  protected onWeekChange(e: Event): void {
    this.selectedWeek.set((e.target as HTMLInputElement).value);
    this.reload(0);
  }

  protected onMonthChange(e: Event): void {
    this.selectedMonth.set((e.target as HTMLInputElement).value);
    this.reload(0);
  }

  protected onYearChange(e: Event): void {
    this.selectedYear.set(+(e.target as HTMLSelectElement).value);
    this.reload(0);
  }

  protected onCustomStartChange(e: Event): void {
    this.customStart.set((e.target as HTMLInputElement).value);
  }

  protected onCustomEndChange(e: Event): void {
    this.customEnd.set((e.target as HTMLInputElement).value);
  }

  protected applyCustomRange(): void {
    this.reload(0);
  }

  private buildDateFilter(): { startDate?: string; endDate?: string } {
    const r = this.range();
    if (r === 'all') return {};
    const today = new Date();
    switch (r) {
      case 'today': {
        const d = toIsoDate(today);
        return { startDate: d, endDate: d };
      }
      case 'week': {
        const { start, end } = weekBounds(this.selectedWeek());
        return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
      }
      case 'month': {
        const [y, mo] = this.selectedMonth().split('-').map(Number);
        return { startDate: `${this.selectedMonth()}-01`, endDate: toIsoDate(new Date(y, mo, 0)) };
      }
      case 'year': {
        const y = this.selectedYear();
        return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
      }
      case 'custom': {
        const s = this.customStart(), e = this.customEnd();
        return { ...(s ? { startDate: s } : {}), ...(e ? { endDate: e } : {}) };
      }
    }
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  protected sortField = signal('fechaDevolucion');
  protected sortDir   = signal<'asc' | 'desc'>('desc');

  protected setSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.reload(0);
  }

  // ── Constants ─────────────────────────────────────────────────────────────
  protected readonly estadoValues    = ESTADO_GESTION_IMPAGO_VALUES;
  protected readonly estadoLabel     = ESTADO_GESTION_IMPAGO_LABEL;
  protected readonly prioridadLabel  = PRIORIDAD_GESTION_IMPAGO_LABEL;
  protected readonly prioridadValues: PrioridadGestionImpago[] = ['baja', 'media', 'alta', 'urgente'];

  protected readonly rows          = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages    = computed(() => this.result()?.totalPages ?? 0);

  // ── Dialog state ──────────────────────────────────────────────────────────
  protected readonly dialogOpen  = signal(false);
  protected readonly editing     = signal<GestionImpago | null>(null);
  protected readonly submitting  = signal(false);
  protected readonly formError   = signal<string | null>(null);

  // ── Cliente autocomplete ──────────────────────────────────────────────────
  protected clienteQuery              = '';
  protected readonly clienteResults   = signal<GestionImpagoCliente[]>([]);
  protected readonly clienteLoading   = signal(false);
  protected readonly clienteDropdown  = signal(false);
  protected readonly clienteNombre    = signal<string | null>(null);
  protected readonly creandoCliente   = signal(false);
  protected readonly savingCliente    = signal(false);
  protected readonly clienteFormError = signal<string | null>(null);

  protected readonly nuevoClienteForm = this.fb.group({
    nombre:   ['', Validators.required],
    empresa:  [''],
    nif:      [''],
    telefono: [''],
    email:    [''],
  });

  protected readonly form = this.fb.group({
    clienteId:        ['', Validators.required],
    numeroFactura:    [''],
    importe:          [0],
    parcialPagado:    [0],
    fechaVencimiento: [''],
    fechaDevolucion:  [''],
    estado:           ['nuevo'],
    prioridad:        ['media'],
    colaborador:      [''],
    motivoDevolucion: [''],
    observaciones:    [''],
  });

  constructor() {
    // Leer query params en la carga inicial
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('pagoFraccionado') === 'true') this.pagoFraccionadoFilter = true;
    if (qp.get('soloVencidos')    === 'true') this.soloVencidosFilter    = true;

    // Reaccionar a cambios de query params sin reconstruir el componente
    // (cuando el usuario navega desde la notificación estando ya en esta página)
    this.route.queryParamMap.pipe(skip(1), takeUntilDestroyed()).subscribe(params => {
      this.pagoFraccionadoFilter = params.get('pagoFraccionado') === 'true' ? true : null;
      this.soloVencidosFilter    = params.get('soloVencidos')    === 'true' ? true : null;
      this.reload(0);
    });

    const s = this.listState.get<{
      q: string; estadoFilter: EstadoGestionImpago | ''; clienteActivoFilter: 'activo' | 'baja' | 'cortado' | '';
      pagadoFilter: 'pagado' | 'no_pagado' | ''; delegacionFilter: string; page: number; size: number;
      sortField: string; sortDir: 'asc' | 'desc'; range: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
      selectedWeek: string; selectedMonth: string; selectedYear: number;
      customStart: string; customEnd: string;
    }>('unpaid');
    if (s) {
      this.q                   = s.q;
      this.estadoFilter        = s.estadoFilter;
      this.clienteActivoFilter = s.clienteActivoFilter;
      this.pagadoFilter        = s.pagadoFilter;
      this.delegacionFilter    = s.delegacionFilter ?? '';
      this.size.set(s.size);
      this.sortField.set(s.sortField);
      this.sortDir.set(s.sortDir);
      this.range.set(s.range);
      this.selectedWeek.set(s.selectedWeek);
      this.selectedMonth.set(s.selectedMonth);
      this.selectedYear.set(s.selectedYear);
      this.customStart.set(s.customStart);
      this.customEnd.set(s.customEnd);
      this.reload(s.page);
    } else {
      this.reload(0);
    }
  }

  ngOnDestroy(): void {
    this.listState.save('unpaid', {
      q:                   this.q,
      estadoFilter:        this.estadoFilter,
      clienteActivoFilter: this.clienteActivoFilter,
      pagadoFilter:        this.pagadoFilter,
      delegacionFilter:    this.delegacionFilter,
      page:                this.page(),
      size:                this.size(),
      sortField:           this.sortField(),
      sortDir:             this.sortDir(),
      range:               this.range(),
      selectedWeek:        this.selectedWeek(),
      selectedMonth:       this.selectedMonth(),
      selectedYear:        this.selectedYear(),
      customStart:         this.customStart(),
      customEnd:           this.customEnd(),
    });
  }

  // ── List ──────────────────────────────────────────────────────────────────
  protected reload(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    const filter: GestionImpagoFilter = {
      q:               this.q || undefined,
      estado:          this.estadoFilter        || undefined,
      clienteActivo:   this.clienteActivoFilter || undefined,
      pagadoFilter:    this.pagadoFilter        || undefined,
      delegacionId:    this.delegacionFilter    || undefined,
      pagoFraccionado: this.pagoFraccionadoFilter ?? undefined,
      soloVencidos:    this.soloVencidosFilter    ?? undefined,
      ...this.buildDateFilter(),
    };
    this.service.list(filter, { page: p, size: this.size(), sort: `${this.sortField()},${this.sortDir()}` }).subscribe({
      next:  (res) => { this.result.set(res); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(extractMessage(err)); this.loading.set(false); },
    });
    this.service.totales(filter).subscribe({
      next:  (t) => { console.log('[totales]', t); this.totalesData.set(t); },
      error: (err) => console.error('[totales] error', err),
    });
  }

  protected onSizeChange(size: number): void { this.size.set(size); this.reload(0); }
  protected applyFilters(): void { this.reload(0); }
  protected clearFilters(): void {
    this.q = ''; this.estadoFilter = ''; this.clienteActivoFilter = ''; this.pagadoFilter = '';
    this.delegacionFilter = ''; this.pagoFraccionadoFilter = null; this.soloVencidosFilter = null;
    this.range.set('all');
    this.customStart.set('');
    this.customEnd.set('');
    this.reload(0);
  }

  // ── Create / Edit ─────────────────────────────────────────────────────────
  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ estado: 'nuevo', prioridad: 'media', importe: 0 });
    this.clienteNombre.set(null);
    this.clienteQuery = '';
    this.clienteResults.set([]);
    this.clienteDropdown.set(false);
    this.creandoCliente.set(false);
    this.buscarClientes();
    this.dialogOpen.set(true);
  }

  protected openEdit(r: GestionImpago): void {
    this.editing.set(r);
    this.formError.set(null);
    this.form.patchValue({
      clienteId:        r.clienteId,
      numeroFactura:    r.numeroFactura ?? '',
      importe:          r.importe,
      parcialPagado:    r.parcialPagado,
      fechaVencimiento: r.fechaVencimiento ?? '',
      fechaDevolucion:  r.fechaDevolucion ?? '',
      estado:           r.estado,
      prioridad:        r.prioridad,
      colaborador:      r.colaborador ?? '',
      motivoDevolucion: r.motivoDevolucion ?? '',
      observaciones:    r.observaciones ?? '',
    });
    this.clienteNombre.set(r.clienteNombre ?? r.clienteId);
    this.clienteQuery = '';
    this.clienteDropdown.set(false);
    this.creandoCliente.set(false);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); this.editing.set(null); }

  // ── Cliente autocomplete methods ──────────────────────────────────────────
  protected buscarClientes(): void {
    this.clienteLoading.set(true);
    this.clienteDropdown.set(true);
    this.clienteService.list({ q: this.clienteQuery || undefined }, { size: 8, sort: 'nombre' }).subscribe({
      next:  (page) => { this.clienteResults.set(page.content); this.clienteLoading.set(false); },
      error: ()     => { this.clienteLoading.set(false); },
    });
  }

  protected selectCliente(c: GestionImpagoCliente): void {
    this.form.patchValue({ clienteId: c.id });
    this.clienteNombre.set(c.nombre + (c.empresa ? ` (${c.empresa})` : ''));
    this.clienteDropdown.set(false);
    this.creandoCliente.set(false);
  }

  protected clearCliente(): void {
    this.form.patchValue({ clienteId: '' });
    this.clienteNombre.set(null);
    this.clienteQuery = '';
    this.clienteDropdown.set(false);
    this.creandoCliente.set(false);
  }

  protected onClienteBlur(): void {
    setTimeout(() => this.clienteDropdown.set(false), 150);
  }

  protected toggleCrearCliente(): void {
    this.creandoCliente.update(v => !v);
    if (this.creandoCliente()) {
      this.nuevoClienteForm.reset();
      this.clienteFormError.set(null);
      this.clienteDropdown.set(false);
    }
  }

  protected crearYSeleccionarCliente(): void {
    if (this.nuevoClienteForm.invalid) { this.nuevoClienteForm.markAllAsTouched(); return; }
    const v = this.nuevoClienteForm.getRawValue();
    this.savingCliente.set(true);
    this.clienteFormError.set(null);
    this.clienteService.create({
      nombre:   v.nombre!,
      empresa:  v.empresa   || null,
      nif:      v.nif       || null,
      telefono: v.telefono  || null,
      email:    v.email     || null,
    }).subscribe({
      next: (c) => {
        this.savingCliente.set(false);
        this.selectCliente(c);
        this.creandoCliente.set(false);
        this.notify.success('Cliente creado y seleccionado');
      },
      error: (err: HttpErrorResponse) => {
        this.savingCliente.set(false);
        this.clienteFormError.set(extractMessage(err));
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload: GestionImpagoPayload = {
      clienteId:        v.clienteId!,
      numeroFactura:    v.numeroFactura   || null,
      importe:          v.importe         ?? 0,
      parcialPagado:    v.parcialPagado   ?? 0,
      fechaVencimiento: v.fechaVencimiento || null,
      fechaDevolucion:  v.fechaDevolucion  || null,
      estado:           (v.estado    as EstadoGestionImpago)     || 'nuevo',
      prioridad:        (v.prioridad as PrioridadGestionImpago)  || 'media',
      colaborador:      v.colaborador      || null,
      motivoDevolucion: v.motivoDevolucion || null,
      observaciones:    v.observaciones    || null,
    };
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando', 'Procesando impago…');

    const r   = this.editing();
    const obs = r ? this.service.update(r.id, payload) : this.service.create(payload);
    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.closeDialog();
        this.notify.success(r ? 'Actualizado correctamente' : 'Creado correctamente');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.globalLoading.stop();
        this.formError.set(extractMessage(err));
      },
    });
  }

  // ── Contacto form (inline expand) ─────────────────────────────────────────
  protected readonly expandedContactoId  = signal<string | null>(null);
  protected readonly updatingContactoId  = signal<string | null>(null);
  protected contactoForms: Record<string, {
    actionKey: string; notes: string; promesaFecha: string; promesaImporte: string; targetStep: number;
  }> = {};
  protected readonly contactoActions = [
    { key: 'llamada',     label: 'Llamada',     icon: 'phone'           as const },
    { key: 'email',       label: 'Email',       icon: 'mail'            as const },
    { key: 'whatsapp',    label: 'WhatsApp',    icon: 'message-square'  as const },
    { key: 'aviso_corte', label: 'Aviso corte', icon: 'scissors'        as const },
    { key: 'promesa',     label: 'Promesa',     icon: 'calendar-check'  as const },
    { key: 'otro',        label: 'Otro',        icon: 'more-horizontal' as const },
  ];

  protected stepContactoActions(rowId: string): typeof this.contactoActions {
    const step = this.contactoForms[rowId]?.targetStep ?? 1;
    const keys = STEP_ACTIONS[step] ?? ['llamada'];
    return this.contactoActions.filter(a => keys.includes(a.key));
  }

  protected setContactoAction(rowId: string, key: string): void {
    if (this.contactoForms[rowId]) {
      this.contactoForms[rowId].actionKey = key;
    }
  }

  protected toggleContactoForm(r: GestionImpago, step: number): void {
    if (this.expandedContactoId() === r.id && this.contactoForms[r.id]?.targetStep === step) {
      this.expandedContactoId.set(null);
    } else {
      const keys = STEP_ACTIONS[step] ?? ['llamada'];
      this.expandedContactoId.set(r.id);
      this.contactoForms[r.id] = { actionKey: keys[0], notes: '', promesaFecha: '', promesaImporte: '', targetStep: step };
    }
  }

  protected registrarContacto(r: GestionImpago): void {
    const form = this.contactoForms[r.id];
    if (!form?.actionKey) return;
    this.updatingContactoId.set(r.id);
    this.service.registrarContacto(r.id, {
      actionKey:      form.actionKey,
      notes:          form.notes          || null,
      promesaFecha:   form.promesaFecha   || null,
      promesaImporte: form.promesaImporte ? parseFloat(form.promesaImporte) : null,
    }).subscribe({
      next: (updated) => {
        const page = this.result();
        if (page) {
          const content = page.content.map(x =>
            x.id === r.id
              ? { ...x, contactoStep: updated.contactoStep, lastActionDate: updated.lastActionDate, promesaFecha: updated.promesaFecha }
              : x
          );
          this.result.set({ ...page, content });
        }
        this.updatingContactoId.set(null);
        this.expandedContactoId.set(null);
        this.notify.success('Contacto registrado');
      },
      error: (err: HttpErrorResponse) => {
        this.updatingContactoId.set(null);
        this.notify.error(extractMessage(err));
      },
    });
  }

  protected fmtShort(v: string | null): string {
    if (!v) return '—';
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  protected contactoLabel(step: number, lastDate?: string | null): string {
    if (step <= 0) return '';
    const ordinals = ['', '1er', '2do', '3er', '4to', '5to'];
    const ord = ordinals[step] ?? `${step}º`;
    const datePart = lastDate ? ` (${this.fmtShort(lastDate)})` : '';
    return `${ord} Contacto${datePart}`;
  }

  protected lastContactoDate(r: GestionImpago): string | null {
    const contacts = r.contactoHistory?.filter(h => h.step > 0) ?? [];
    return contacts.length ? contacts[contacts.length - 1].date : null;
  }

  protected delegacionNombre(id: string | null): string {
    if (!id) return '—';
    return this.masterData.delegaciones().find(d => d.id === id)?.nombre ?? id;
  }

  // ── Inline estado change ──────────────────────────────────────────────────
  protected readonly savingEstadoId = signal<string | null>(null);

  // Modal pagado / cortado
  protected readonly pagadoModal = signal<{ row: GestionImpago; newEstado: EstadoGestionImpago } | null>(null);
  protected pagadoFecha   = '';
  protected pagadoNotas   = '';
  protected pagadoImporte = 0;

  private readonly ESTADO_CON_MODAL: ReadonlySet<string> = new Set(['pagado', 'cortado', 'va_a_pagar']);
  protected readonly ESTADO_CON_PAGO_PARCIAL: ReadonlySet<string> = new Set(['va_a_pagar']);

  protected changeEstado(r: GestionImpago, newEstado: string): void {
    if (newEstado === r.estado || this.savingEstadoId()) return;
    if (this.ESTADO_CON_MODAL.has(newEstado)) {
      this.pagadoFecha   = new Date().toISOString().slice(0, 10);
      this.pagadoNotas   = '';
      this.pagadoImporte = this.ESTADO_CON_PAGO_PARCIAL.has(newEstado)
        ? (r.importePendiente ?? r.importe)
        : 0;
      this.pagadoModal.set({ row: r, newEstado: newEstado as EstadoGestionImpago });
      return;
    }
    this.doActualizarEstado(r, { estado: newEstado as EstadoGestionImpago });
  }

  protected confirmarPago(): void {
    const modal = this.pagadoModal();
    if (!modal || !this.pagadoFecha) return;
    this.pagadoModal.set(null);

    const esParcial = this.ESTADO_CON_PAGO_PARCIAL.has(modal.newEstado);

    // Cambiar el estado
    this.doActualizarEstado(modal.row, {
      estado:      modal.newEstado,
      fechaEstado: this.pagadoFecha,
      notas:       this.pagadoNotas || null,
    });

    // Para acuerdos, si pusieron importe, registrar también el pago parcial
    if (esParcial && this.pagadoImporte > 0) {
      this.service.registrarPago(modal.row.id, {
        fecha:   this.pagadoFecha,
        importe: this.pagadoImporte,
        notas:   this.pagadoNotas || null,
      }).subscribe({
        next: (updated) => {
          const page = this.result();
          if (page) {
            const content = page.content.map(x =>
              x.id === modal.row.id
                ? { ...x, parcialPagado: updated.parcialPagado, importePendiente: updated.importePendiente }
                : x
            );
            this.result.set({ ...page, content });
          }
        },
        error: (err: HttpErrorResponse) => this.notify.error(extractMessage(err)),
      });
    }
  }

  protected cancelarPago(): void {
    this.pagadoModal.set(null);
    // El navegador ya mutó el <select> a "pagado" en el DOM antes de que interceptáramos.
    // Forzar un nuevo array en la señal hace que OnPush re-renderice y el [value]="r.estado"
    // vuelva al valor original sin haber llamado a la API.
    const page = this.result();
    if (page) this.result.set({ ...page, content: [...page.content] });
  }

  private doActualizarEstado(r: GestionImpago, payload: GestionImpagoActualizarEstadoPayload): void {
    this.savingEstadoId.set(r.id);
    this.service.actualizarEstado(r.id, payload).subscribe({
      next: (updated) => {
        const page = this.result();
        if (page) {
          const content = page.content.map(x => x.id === r.id ? { ...x, estado: updated.estado } : x);
          this.result.set({ ...page, content });
        }
        this.savingEstadoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(extractMessage(err));
        this.savingEstadoId.set(null);
      },
    });
  }

  protected estadoSelectClass(estado: EstadoGestionImpago): string {
    const base = 'h-7 px-2 rounded-full text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors disabled:opacity-60';
    const map: Record<string, string> = {
      pagado:             'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-50',
      va_a_pagar:         'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-50',
      aviso_corte:        'bg-amber-100 text-amber-800 dark:bg-amber-600 dark:text-amber-50',
      cortado:            'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-50',
      ovc:                'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-50',
      predemanda:         'bg-orange-100 text-orange-800 dark:bg-orange-600 dark:text-orange-50',
      demanda:            'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-50',
      juicio:             'bg-red-300 text-red-900 dark:bg-red-900 dark:text-red-50',
      remesar_nuevamente: 'bg-amber-100 text-amber-900 dark:bg-amber-700 dark:text-amber-50',
      credit_back:        'bg-cyan-100 text-cyan-800 dark:bg-cyan-700 dark:text-cyan-50',
      perdidos:           'bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-50',
      otros:              'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
      nuevo:              'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100',
    };
    return `${base} ${map[estado] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100'}`;
  }

  // ── Toggle cliente activo/baja ────────────────────────────────────────────
  protected readonly togglingClienteActivoId = signal<string | null>(null);

  protected changeClienteActivo(r: GestionImpago, valor: string): void {
    if (valor === r.clienteActivo || this.togglingClienteActivoId()) return;
    this.togglingClienteActivoId.set(r.id);
    this.service.actualizarClienteActivo(r.id, valor as 'activo' | 'baja' | 'cortado').subscribe({
      next: (updated) => {
        const page = this.result();
        if (page) {
          const content = page.content.map(x => x.id === r.id ? { ...x, clienteActivo: updated.clienteActivo } : x);
          this.result.set({ ...page, content });
        }
        this.togglingClienteActivoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(extractMessage(err));
        this.togglingClienteActivoId.set(null);
        // Forzar re-render para resetear el select al valor original
        const page = this.result();
        if (page) this.result.set({ ...page, content: [...page.content] });
      },
    });
  }

  protected clienteActivoSelectClass(valor: string): string {
    const base = 'h-7 px-2 rounded-full text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors disabled:opacity-60';
    if (valor === 'activo')  return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-50`;
    if (valor === 'cortado') return `${base} bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-50`;
    return `${base} bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100`;
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  protected readonly exporting = signal(false);

  protected exportCsv(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    const filter: GestionImpagoFilter = {
      q:             this.q || undefined,
      estado:        this.estadoFilter        || undefined,
      clienteActivo: this.clienteActivoFilter || undefined,
      pagadoFilter:  this.pagadoFilter        || undefined,
    };
    this.service.exportCsv(filter).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `impagos_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.notify.error('Error al exportar CSV');
        this.exporting.set(false);
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  protected confirmDelete(r: GestionImpago): void {
    if (!confirm(`¿Eliminar el impago "${r.numeroFactura ?? r.id}"?`)) return;
    this.globalLoading.start('Eliminando', '');
    this.service.delete(r.id).subscribe({
      next:  () => { this.globalLoading.stop(); this.notify.success('Eliminado'); this.reload(this.page()); },
      error: (err: HttpErrorResponse) => { this.globalLoading.stop(); this.notify.error(extractMessage(err)); },
    });
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  protected estadoTone(estado: EstadoGestionImpago): StatusTone     { return estadoToneFn(estado); }
  protected prioridadTone(p: PrioridadGestionImpago): StatusTone    { return prioridadToneFn(p); }
  protected formatEur(v: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }
  protected fmt(v: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-ES') : '—';
  }
}
