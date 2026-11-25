import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, takeWhile, tap, timer } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../../shared/icons/icon';
import { ActionsMenu, ActionsMenuItem } from '../../../shared/components/actions-menu/actions-menu';

import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { VibraTarifaService } from '../../../core/services/vibra-tarifa.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  COMERCIALIZADORA_PTE_TRAMITAR,
  COMERCIALIZADORA_VIBRA_VALUES,
  ESTADO_VIBRA_ALTA_VALUES,
  KilowyFichasEstado,
  MODO_SERVICIO_LABEL,
  ModoServicioVibra,
  Page,
  VibraAlta,
  VibraAltaFilter,
  VibraAltaPayload,
  VibraAltaPreciosPayload,
  VibraAltaServicio,
  VibraTarifa,
  ZonaServicioVibra,
} from '../../../core/models';
import { fechaProximaDotClass, formatDate, formatDateTime } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';
import { estadoAltaLabel, estadoAltaTone } from './vibra-alta-ui';
import { CellTail } from '../../../shared/components/cell-tail/cell-tail';
import { ariaSort } from '../../../shared/utils/sort';

/** Columnas que se pueden mostrar u ocultar (las demás van siempre). */
type ColumnaOpcional = 'direccion' | 'poblacion' | 'provincia' | 'potencia' | 'fechaFirma' | 'fechaCambio'
  | 'fechaRenovacion' | 'fechaActivacion' | 'fechaBaja' | 'comision' | 'consumo' | 'liquidado' | 'historial' | 'comentarios';

/** ancho en rem: suma al mínimo de la tabla para el scroll interno. */
const COLUMNAS_OPCIONALES: { id: ColumnaOpcional; label: string; ancho: number }[] = [
  { id: 'direccion', label: 'Dirección', ancho: 14 },
  { id: 'poblacion', label: 'Población', ancho: 9 },
  { id: 'provincia', label: 'Provincia', ancho: 8 },
  { id: 'potencia', label: 'Potencia', ancho: 9 },
  { id: 'fechaFirma', label: 'Fecha firma', ancho: 7.5 },
  { id: 'fechaCambio', label: 'Fecha cambio', ancho: 8.5 },
  { id: 'fechaRenovacion', label: 'Fecha renovación', ancho: 7.5 },
  { id: 'fechaActivacion', label: 'Fecha activación', ancho: 7.5 },
  { id: 'fechaBaja', label: 'Fecha baja', ancho: 7.5 },
  { id: 'comision', label: 'Comisión comer.', ancho: 7 },
  { id: 'consumo', label: 'Consumo', ancho: 7 },
  { id: 'liquidado', label: 'Liq. Energaze', ancho: 7 },
  { id: 'historial', label: 'Historial liquidación', ancho: 12 },
  { id: 'comentarios', label: 'Comentarios', ancho: 14 },
];

/** Columnas que siempre se ven y su ancho mínimo total (rem): deben cuadrar con la plantilla. */
const COLUMNAS_FIJAS = 8;
const ANCHO_BASE = 65;
const COLUMNAS_KEY = 'vibra-altas-columnas';

function leerColumnas(): Set<ColumnaOpcional> {
  try {
    const v = JSON.parse(localStorage.getItem(COLUMNAS_KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x) => COLUMNAS_OPCIONALES.some((c) => c.id === x)) : []);
  } catch {
    return new Set();
  }
}

/** Menús de una fila. */
interface MenusFila { acciones: ActionsMenuItem[]; estados: ActionsMenuItem[]; comercializadoras: ActionsMenuItem[] }

@Component({
  selector: 'app-vibra-altas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, NgTemplateOutlet,
    PageHeader, FormDialog, ConfirmDialog, StatusBadge, Pagination, TableSkeleton, Icon, ActionsMenu, CellTail,
  ],
  templateUrl: './vibra-altas.html',
})
export class VibraAltas {
  private readonly service = inject(VibraAltaService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly tarifaService = inject(VibraTarifaService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected readonly result = signal<Page<VibraAlta> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected q = '';
  protected estadoFilter = '';
  protected colaboradorFilter = '';
  protected comercializadoraFilter = '';
  protected tramitadoFilter: '' | 'si' | 'no' = '';
  protected fechaDesdeFilter = '';
  protected fechaHastaFilter = '';

  protected readonly sortField = signal<string>('fecha');
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');

  protected setSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
    this.page.set(0);
    this.load();
  }

  protected ariaSort(field: string): 'ascending' | 'descending' | null {
    return ariaSort(this.sortField() === field, this.sortDir());
  }

  protected readonly estadoValues = ESTADO_VIBRA_ALTA_VALUES;
  protected readonly comercializadoraValues = COMERCIALIZADORA_VIBRA_VALUES;
  protected readonly comercializadorasRotacion = COMERCIALIZADORA_VIBRA_VALUES.filter((c) => c !== COMERCIALIZADORA_PTE_TRAMITAR);

  protected readonly rows = computed(() => this.result()?.content ?? []);

  // Columnas visibles (preferencia del navegador)
  protected readonly columnasOpcionales = COLUMNAS_OPCIONALES;
  protected readonly columnas = signal(leerColumnas());
  protected readonly vtableMin = computed(() =>
    `${ANCHO_BASE + COLUMNAS_OPCIONALES.filter((c) => this.columnas().has(c.id)).reduce((s, c) => s + c.ancho, 0)}rem`);
  protected readonly numColumnas = computed(() => COLUMNAS_FIJAS + this.columnas().size);

  protected ver(id: ColumnaOpcional): boolean { return this.columnas().has(id); }

  protected toggleColumna(id: ColumnaOpcional, on: boolean): void {
    const s = new Set(this.columnas());
    if (on) s.add(id); else s.delete(id);
    this.columnas.set(s);
    try { localStorage.setItem(COLUMNAS_KEY, JSON.stringify([...s])); } catch { /* sin almacenamiento */ }
  }

  /** Menús por fila: acciones, estado y comercializadora (sustituyen a los <select>). */
  protected readonly menus = computed(() => new Map<string, MenusFila>(this.rows().map((r) => [r.id, this.menusFila(r)])));

  private menusFila(r: VibraAlta): MenusFila {
    const acciones: ActionsMenuItem[] = [
      { label: 'Ver detalle', icon: 'eye', action: () => this.verDetalle(r.id) },
      { label: 'Ver contrato (PDF)', icon: 'file-text', action: () => this.verContrato(r) },
      ...(this.puedeAdministrar()
        ? [{ label: r.contratoEnviadoAt ? 'Reenviar contrato' : 'Enviar contrato', icon: 'mail', action: () => this.askEnviarContrato(r) } satisfies ActionsMenuItem]
        : []),
      { label: 'Editar', icon: 'edit', action: () => this.openEdit(r) },
      { label: r.tramitado ? 'Marcar como no tramitado' : 'Marcar como tramitado', icon: 'check',
        action: () => this.changeTramitado(r, !r.tramitado) },
      { label: 'Eliminar', icon: 'trash', danger: true, separatorBefore: true, action: () => this.askDelete(r) },
    ];
    const estados = this.estadoValues.map((e): ActionsMenuItem => ({
      label: this.estadoLabel(e), checked: r.estado === e, action: () => { if (r.estado !== e) this.changeEstado(r, e); },
    }));
    const comercializadoras = this.comercializadoraValues.map((c): ActionsMenuItem => ({
      label: c, checked: r.comercializadora === c,
      action: () => { if (r.comercializadora !== c) this.changeComercializadora(r, c); },
    }));
    return { acciones, estados, comercializadoras };
  }

  /** Acciones poco frecuentes de la cabecera. */
  protected readonly masAcciones = computed<ActionsMenuItem[]>(() => {
    const items: ActionsMenuItem[] = [];
    if (this.puedeAdministrar()) {
      items.push({ label: this.kilowySyncing() ? 'Sincronizando Kilowy…' : 'Sincronizar Kilowy (también cada día)', icon: 'refresh-cw',
        disabled: this.kilowySyncing(), action: () => this.syncKilowy() });
    }
    if (this.esAdmin()) {
      const enCurso = !!this.fichasEstado()?.enCurso;
      items.push({ label: enCurso ? 'Importando fichas…' : 'Importar fichas Kilowy (migración única)', icon: 'download',
        disabled: enCurso, action: () => this.importarFichas() });
    }
    items.push(
      { label: 'Exportar Excel', icon: 'download', separatorBefore: items.length > 0, action: () => this.exportExcel() },
      { label: 'Importar Excel', icon: 'upload', action: () => this.triggerImportExcel() },
    );
    if (this.puedeAdministrar()) {
      items.push({ label: 'Rotación semestral', icon: 'refresh-cw', separatorBefore: true, action: () => this.openRotacion() });
    }
    return items;
  });
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  // Dialog CRUD
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<VibraAlta | null>(null);
  protected readonly submitting = signal(false);

  // Confirm delete
  protected readonly confirmOpen = signal(false);
  protected readonly pendingDelete = signal<VibraAlta | null>(null);
  protected readonly deleting = signal(false);

  // Detail modal
  protected readonly detailOpen = signal(false);
  protected readonly detailData = signal<VibraAlta | null>(null);
  protected readonly detailLoading = signal(false);

  // Dialog Rotacion Semestral
  protected readonly rotacionDialogOpen = signal(false);
  protected readonly rotacionElegibles = signal(0);
  protected readonly rotacionCutoff = signal('');
  protected readonly rotacionRunning = signal(false);
  protected readonly kilowySyncing = signal(false);
  protected readonly puedeAdministrar = computed(() => this.auth.hasRole('admin', 'operaciones'));
  protected nuevaComercializadora = '';

  // Contrato: productos, PDF y envío
  protected readonly tarifas = signal<VibraTarifa[]>([]);
  protected readonly confirmEnvioOpen = signal(false);
  protected readonly pendingEnvio = signal<VibraAlta | null>(null);
  protected readonly enviando = signal(false);
  protected readonly potencias = [1, 2, 3, 4, 5, 6] as const;

  protected readonly form = this.fb.group({
    titular: ['', Validators.required],
    cups: [''],
    nifCif: [''],
    direccionSuministro: [''],
    poblacion: [''],
    provincia: [''],
    telefono: [''],
    email: [''],
    cuentaBancaria: [''],
    comercializadora: [''],
    estado: ['PENDIENTE_FIRMA'],
    consumo: [null as number | null],
    fecha: [null as string | null],
    fechaFirma: [null as string | null],
    fechaCambioComercializadora: [null as string | null],
    fechaRenovacion: [null as string | null],
    fechaActivacionContrato: [null as string | null],
    fechaBaja: [null as string | null],
    colaborador: [''],
    mesLiquidacion: [''],
    potenciaOriginal: [''],
    tramitado: [false],
    liquidado: [''],
    comisionComercializadora: [null as number | null],
    historialLiquidaciones: [''],
    comentarios: [''],
    tarifaId: [null as string | null],
    enviarContrato: [true],
    potenciaP1: [null as number | null],
    potenciaP2: [null as number | null],
    potenciaP3: [null as number | null],
    potenciaP4: [null as number | null],
    potenciaP5: [null as number | null],
    potenciaP6: [null as number | null],
  });

  // Precios del contrato y servicios (ADMIN y OPERACIONES)
  protected readonly modosServicio = Object.keys(MODO_SERVICIO_LABEL) as ModoServicioVibra[];
  protected readonly modoServicioLabel = MODO_SERVICIO_LABEL;
  protected readonly ivasServicio = [21, 10, 5, 0] as const;
  protected readonly tarifasAcceso = ['2.0TD', '3.0TD', '3.0TDVE', '6.1TD', '6.1TDVE', '6.2TD', '6.3TD', '6.4TD'] as const;
  protected readonly preciosCargando = signal(false);
  protected readonly preciosForm = this.fb.group({
    modo: ['producto' as 'producto' | 'propios'],
    tarifaAcceso: [null as string | null],
    energia: this.fb.array(this.potencias.map(() => new FormControl<number | null>(null, [Validators.min(0), Validators.max(9999.999999)]))),
    potencia: this.fb.array(this.potencias.map(() => new FormControl<number | null>(null, [Validators.min(0), Validators.max(9999.999999)]))),
    servicios: this.fb.array<FormGroup>([]),
  });

  protected get serviciosForm(): FormArray<FormGroup> {
    return this.preciosForm.controls.servicios;
  }

  // Importación única de fichas de Kilowy (ADMIN)
  protected readonly esAdmin = computed(() => this.auth.hasRole('admin'));
  protected readonly fichasEstado = signal<KilowyFichasEstado | null>(null);
  protected readonly fichasResumenOpen = signal(false);

  constructor() {
    this.load();
    if (this.esAdmin()) {
      this.service.estadoImportacionKilowyFichas().subscribe({
        next: (e) => { this.fichasEstado.set(e); if (e.enCurso) this.seguirImportacionFichas(); },
        error: () => this.fichasEstado.set(null),
      });
    }
    this.tarifaService.list().subscribe({ next: (t) => this.tarifas.set(t), error: () => this.tarifas.set([]) });
  }

  /** Productos activos para el selector; si el alta tiene uno inactivo, también ese. */
  protected productosSeleccionables(): VibraTarifa[] {
    const actual = this.form.controls.tarifaId.value;
    return this.tarifas().filter((t) => t.activa || t.id === actual);
  }

  protected nombreProducto(id: string | null): string {
    if (!id) return '—';
    return this.tarifas().find((t) => t.id === id)?.nombre ?? '—';
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(
      this.currentFilter(),
      { page: this.page(), size: this.size(), sort: `${this.sortField()},${this.sortDir()}` },
    ).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? err.message ?? 'Error al cargar');
        this.loading.set(false);
      },
    });
  }

  protected limpiarFiltros(): void {
    this.q = '';
    this.estadoFilter = '';
    this.colaboradorFilter = '';
    this.comercializadoraFilter = '';
    this.tramitadoFilter = '';
    this.fechaDesdeFilter = '';
    this.fechaHastaFilter = '';
    this.applyFilters();
  }

  protected onPage(p: number): void { this.page.set(p); this.load(); }
  protected onPageSize(s: number): void { this.size.set(s); this.page.set(0); this.load(); }
  protected applyFilters(): void { this.page.set(0); this.load(); }

  protected changeEstado(r: VibraAlta, estado: string): void {
    this.service.cambiarEstado(r.id, { estado }).subscribe({
      next: () => { this.notify.success('Estado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected changeComercializadora(r: VibraAlta, comercializadora: string): void {
    const payload: VibraAltaPayload = { ...this.altaToPayload(r), comercializadora };
    this.service.update(r.id, payload).subscribe({
      next: () => { this.notify.success('Comercializadora actualizada'); this.load(); },
      // Recargar para que el desplegable vuelva al valor guardado
      error: (err: HttpErrorResponse) => { this.notify.error(err.error?.message ?? 'Error'); this.load(); },
    });
  }

  protected changeTramitado(r: VibraAlta, tramitado: boolean): void {
    this.service.marcarTramitado(r.id, { tramitado }).subscribe({
      next: () => { this.notify.success('Tramitado actualizado'); this.load(); },
      error: (err: HttpErrorResponse) => { this.notify.error(err.error?.message ?? 'Error'); this.load(); },
    });
  }

  /** Filtros activos; los usan el listado y el export Excel. */
  private currentFilter(): VibraAltaFilter {
    return {
      q: this.q,
      estado: this.estadoFilter || undefined,
      colaborador: this.colaboradorFilter || undefined,
      comercializadora: this.comercializadoraFilter || undefined,
      tramitado: this.tramitadoFilter === '' ? undefined : this.tramitadoFilter === 'si',
      fechaDesde: this.fechaDesdeFilter || undefined,
      fechaHasta: this.fechaHastaFilter || undefined,
    };
  }

  private altaToPayload(a: VibraAlta): VibraAltaPayload {
    return {
      titular: a.titular ?? '', cups: a.cups, nifCif: a.nifCif,
      direccionSuministro: a.direccionSuministro, poblacion: a.poblacion, provincia: a.provincia,
      telefono: a.telefono, email: a.email, cuentaBancaria: a.cuentaBancaria,
      comercializadora: a.comercializadora, estado: a.estado, consumo: a.consumo,
      fecha: a.fecha, fechaTramitacion: a.fechaTramitacion, fechaRenovacion: a.fechaRenovacion,
      fechaFirma: a.fechaFirma, fechaCambioComercializadora: a.fechaCambioComercializadora,
      fechaActivacionContrato: a.fechaActivacionContrato,
      fechaBaja: a.fechaBaja, colaborador: a.colaborador,
      mesLiquidacion: a.mesLiquidacion, potenciaOriginal: a.potenciaOriginal,
      potenciaP1: a.potenciaP1, potenciaP2: a.potenciaP2, potenciaP3: a.potenciaP3,
      potenciaP4: a.potenciaP4, potenciaP5: a.potenciaP5, potenciaP6: a.potenciaP6,
      tramitado: a.tramitado, liquidado: a.liquidado,
      liquidacionColaborador: a.liquidacionColaborador,
      comisionComercializadora: a.comisionComercializadora,
      historialLiquidaciones: a.historialLiquidaciones, comentarios: a.comentarios,
      tarifaId: a.tarifaId,
    };
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ estado: 'PENDIENTE_FIRMA', enviarContrato: true });
    this.resetPrecios(null);
    this.dialogOpen.set(true);
  }

  // ── Precios del contrato y servicios ───────────────────
  private resetPrecios(a: VibraAlta | null): void {
    const energia = a?.precioEnergia ?? [];
    const potencia = a?.precioPotencia ?? [];
    const propios = [...energia, ...potencia].some((v) => v != null);
    this.preciosForm.reset({
      modo: propios ? 'propios' : 'producto',
      tarifaAcceso: a?.tarifaAcceso ?? null,
      energia: this.potencias.map((_, i) => energia[i] ?? null),
      potencia: this.potencias.map((_, i) => potencia[i] ?? null),
    });
    this.serviciosForm.clear();
    (a?.servicios ?? []).forEach((s) => this.serviciosForm.push(this.servicioGroup(s)));
  }

  private servicioGroup(s?: VibraAltaServicio): FormGroup {
    return this.fb.group({
      concepto: [s?.concepto ?? '', [Validators.required, Validators.maxLength(120)]],
      modo: [s?.modo ?? ('PCT_COMPRA' as ModoServicioVibra), Validators.required],
      valor: [s?.valor ?? (null as number | null), Validators.required],
      // '' = no sujeto
      ivaPct: [s ? (s.ivaPct == null ? '' : String(s.ivaPct)) : '21'],
      zona: [s?.zona ?? ('DESPUES' as ZonaServicioVibra)],
    });
  }

  protected addServicio(): void {
    this.serviciosForm.push(this.servicioGroup());
    this.preciosForm.markAsDirty();
  }

  protected removeServicio(i: number): void {
    this.serviciosForm.removeAt(i);
    this.preciosForm.markAsDirty();
  }

  /** Al pasar a personalizados con todo vacío, parte de los precios del producto elegido. */
  protected onModoPrecios(): void {
    const v = this.preciosForm.getRawValue();
    if (v.modo !== 'propios' || [...v.energia, ...v.potencia].some((x) => x != null)) return;
    const t = this.tarifas().find((x) => x.id === this.form.controls.tarifaId.value);
    if (!t) return;
    const r = t as unknown as Record<string, number | null>;
    this.preciosForm.patchValue({
      energia: this.potencias.map((p) => r[`p${p}Energia`] ?? null),
      potencia: this.potencias.map((p) => r[`p${p}Potencia`] ?? null),
    });
  }

  private preciosPayload(): VibraAltaPreciosPayload {
    const v = this.preciosForm.getRawValue();
    const propios = v.modo === 'propios';
    return {
      energia: v.energia.map((x) => (propios ? x : null)),
      potencia: v.potencia.map((x) => (propios ? x : null)),
      tarifaAcceso: v.tarifaAcceso || null,
      servicios: this.serviciosForm.getRawValue().map((s) => ({
        concepto: s['concepto'], modo: s['modo'], valor: s['valor'], zona: s['zona'],
        ivaPct: s['zona'] === 'ANTES' || s['ivaPct'] === '' ? null : Number(s['ivaPct']),
      })),
    };
  }

  /** Guarda precios y servicios tras el alta si se tocaron. */
  private guardarPrecios(alta: VibraAlta): Observable<VibraAlta> {
    if (!this.puedeAdministrar() || !this.preciosForm.dirty) return of(alta);
    return this.service.actualizarPrecios(alta.id, this.preciosPayload());
  }

  protected modoServicio(i: number): ModoServicioVibra {
    return this.serviciosForm.at(i).controls['modo'].value as ModoServicioVibra;
  }

  protected zonaServicio(i: number): ZonaServicioVibra {
    return this.serviciosForm.at(i).controls['zona'].value as ZonaServicioVibra;
  }

  protected tienePreciosPropios(a: VibraAlta): boolean {
    return [...(a.precioEnergia ?? []), ...(a.precioPotencia ?? [])].some((v) => v != null);
  }

  /** Precio del periodo para el detalle: propio o del producto. */
  protected precioDetalle(a: VibraAlta, tipo: 'Energia' | 'Potencia', p: number): number | null {
    const propio = (tipo === 'Energia' ? a.precioEnergia : a.precioPotencia)?.[p - 1];
    if (propio != null) return propio;
    const t = this.tarifas().find((x) => x.id === a.tarifaId) as unknown as Record<string, number | null> | undefined;
    return t?.[`p${p}${tipo}`] ?? null;
  }

  protected servicioTexto(s: VibraAltaServicio): string {
    const valor = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 }).format(s.valor);
    const cobro = s.modo === 'PCT_COMPRA' ? `${valor} % de la compra`
      : s.modo === 'IMPORTE_MES' ? `${valor} €/mes`
      : s.modo === 'IMPORTE_DIA' ? `${valor} €/día` : `${valor} € por factura`;
    const iva = s.zona === 'ANTES' ? 'en la base del impuesto eléctrico' : s.ivaPct == null ? 'sin IVA' : `IVA ${s.ivaPct} %`;
    return `${cobro} · ${iva}`;
  }

  // ── Importación de fichas de Kilowy ────────────────────
  protected importarFichas(): void {
    this.service.importarKilowyFichas().subscribe({
      next: (e) => {
        this.fichasEstado.set(e);
        this.notify.success('Importación de fichas de Kilowy iniciada: tarda unos minutos');
        this.seguirImportacionFichas();
      },
      error: (err: HttpErrorResponse) => this.notify.error(mensajeError(err, 'No se pudo iniciar la importación de fichas')),
    });
  }

  /** Consulta el estado cada 5 s hasta que termina. */
  private seguirImportacionFichas(): void {
    timer(5000, 5000).pipe(
      switchMap(() => this.service.estadoImportacionKilowyFichas()),
      takeWhile((e) => e.enCurso, true),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((e) => {
      this.fichasEstado.set(e);
      if (e.enCurso) return;
      if (e.error) this.notify.error(e.error);
      else {
        this.notify.success(`Fichas de Kilowy: ${e.resultado?.completadas ?? 0} altas completadas`);
        this.fichasResumenOpen.set(true);
        this.load();
      }
    });
  }

  protected rellenados(): { campo: string; altas: number }[] {
    const r = this.fichasEstado()?.resultado?.rellenados ?? {};
    return Object.entries(r).map(([campo, altas]) => ({ campo, altas }));
  }

  protected openEdit(r: VibraAlta): void {
    this.editing.set(r);
    this.resetPrecios(r);
    if (this.puedeAdministrar()) {
      // Los servicios solo vienen en el detalle
      this.preciosCargando.set(true);
      this.service.getById(r.id).subscribe({
        next: (d) => { if (this.editing()?.id === d.id) this.resetPrecios(d); this.preciosCargando.set(false); },
        error: () => this.preciosCargando.set(false),
      });
    }
    this.form.reset({
      titular: r.titular ?? '', cups: r.cups ?? '', nifCif: r.nifCif ?? '',
      direccionSuministro: r.direccionSuministro ?? '', poblacion: r.poblacion ?? '',
      provincia: r.provincia ?? '', telefono: r.telefono ?? '', email: r.email ?? '',
      cuentaBancaria: r.cuentaBancaria ?? '', comercializadora: r.comercializadora ?? '',
      estado: r.estado ?? 'PENDIENTE_FIRMA', consumo: r.consumo, fecha: r.fecha,
      fechaFirma: r.fechaFirma, fechaCambioComercializadora: r.fechaCambioComercializadora,
      fechaRenovacion: r.fechaRenovacion, fechaActivacionContrato: r.fechaActivacionContrato,
      fechaBaja: r.fechaBaja,
      colaborador: r.colaborador ?? '', mesLiquidacion: r.mesLiquidacion ?? '',
      potenciaOriginal: r.potenciaOriginal ?? '',
      tramitado: r.tramitado ?? false, liquidado: r.liquidado ?? '',
      comisionComercializadora: r.comisionComercializadora,
      historialLiquidaciones: r.historialLiquidaciones ?? '',
      comentarios: r.comentarios ?? '',
      tarifaId: r.tarifaId, enviarContrato: false,
      potenciaP1: r.potenciaP1, potenciaP2: r.potenciaP2, potenciaP3: r.potenciaP3,
      potenciaP4: r.potenciaP4, potenciaP5: r.potenciaP5, potenciaP6: r.potenciaP6,
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void { this.dialogOpen.set(false); }

  protected submit(): void {
    if (this.form.invalid || this.preciosForm.invalid) return;
    this.submitting.set(true);
    const r = this.editing();
    // Base de la fila: conserva los campos que no están en el formulario
    const { enviarContrato, ...valores } = this.form.getRawValue();
    const payload = { ...(r ? this.altaToPayload(r) : {}), ...valores } as VibraAltaPayload;
    if (!r) payload.enviarContrato = !!enviarContrato && this.puedeAdministrar();
    // Con precios o servicios nuevos el contrato se envía después de guardarlos, para que salgan en el PDF
    const enviarDespues = !r && !!payload.enviarContrato && this.preciosForm.dirty;
    if (enviarDespues) payload.enviarContrato = false;
    const obs = (r ? this.service.update(r.id, payload) : this.service.create(payload)).pipe(
      // Ya creada: si falla lo siguiente, reintentar la edita en vez de duplicarla
      tap((alta) => { if (!r) this.editing.set(alta); }),
      switchMap((alta) => this.guardarPrecios(alta).pipe(
        // El aviso del contrato viene en la respuesta de crear
        map((conPrecios) => ({ ...conPrecios, avisoContrato: alta.avisoContrato, contratoEnviadoAt: alta.contratoEnviadoAt })))),
      switchMap((alta) => !enviarDespues ? of(alta) : this.service.enviarContrato(alta.id).pipe(
        catchError((err: HttpErrorResponse) => of({ ...alta, avisoContrato: `No se envió el contrato: ${mensajeError(err, 'error al enviarlo')}` })))),
    );
    obs.subscribe({
      next: (alta) => {
        this.submitting.set(false);
        if (r) this.notify.success('Alta actualizada');
        else if (alta.avisoContrato) this.notify.warn(`Alta creada. ${alta.avisoContrato}`);
        else this.notify.success(alta.contratoEnviadoAt ? `Alta creada y contrato enviado a ${alta.email}` : 'Alta creada');
        this.closeDialog();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.notify.error(mensajeError(err, 'Error al guardar'));
      },
    });
  }

  protected askDelete(r: VibraAlta): void {
    this.pendingDelete.set(r);
    this.confirmOpen.set(true);
  }

  protected cancelDelete(): void {
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  protected doDelete(): void {
    const r = this.pendingDelete();
    if (!r) return;
    this.deleting.set(true);
    this.service.delete(r.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.notify.success('Alta eliminada');
        this.cancelDelete();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.notify.error(err.error?.message ?? 'Error');
      },
    });
  }

  // ── Contrato ───────────────────────────────────────────
  /** Abre el PDF en otra pestaña (la ventana se abre antes de la petición para que no la bloquee el navegador). */
  protected verContrato(r: VibraAlta): void {
    const ventana = window.open('', '_blank');
    this.service.contratoPdf(r.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (ventana) ventana.location.href = url;
        else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        ventana?.close();
        this.notify.error('No se pudo generar el contrato');
      },
    });
  }

  protected askEnviarContrato(r: VibraAlta): void {
    this.pendingEnvio.set(r);
    this.confirmEnvioOpen.set(true);
  }

  protected cancelEnviarContrato(): void {
    this.confirmEnvioOpen.set(false);
    this.pendingEnvio.set(null);
  }

  protected doEnviarContrato(): void {
    const r = this.pendingEnvio();
    if (!r) return;
    this.enviando.set(true);
    this.service.enviarContrato(r.id).subscribe({
      next: (alta) => {
        this.enviando.set(false);
        this.notify.success(`Contrato enviado a ${alta.email}`);
        this.cancelEnviarContrato();
        if (this.detailData()?.id === alta.id) this.detailData.set(alta);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.notify.error(mensajeError(err, 'No se pudo enviar el contrato'));
      },
    });
  }

  protected readonly fmtDateTime = formatDateTime;

  // ── Rotacion Semestral ─────────────────────────────────
  protected openRotacion(): void {
    this.nuevaComercializadora = '';
    this.service.rotacionElegibles().subscribe({
      next: (r) => {
        this.rotacionElegibles.set(r.elegibles);
        this.rotacionCutoff.set(r.cutoff);
        this.rotacionDialogOpen.set(true);
      },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.message ?? 'Error'),
    });
  }

  protected closeRotacion(): void { this.rotacionDialogOpen.set(false); }

  protected ejecutarRotacion(): void {
    if (!this.nuevaComercializadora) return;
    this.rotacionRunning.set(true);
    this.service.rotacionSemestral({ comercializadora: this.nuevaComercializadora }).subscribe({
      next: (r) => {
        this.rotacionRunning.set(false);
        this.notify.success(`Rotación ejecutada: ${r.actualizados} contratos actualizados`);
        this.closeRotacion();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.rotacionRunning.set(false);
        this.notify.error(err.error?.message ?? 'Error');
      },
    });
  }

  // ── Excel Export / Import ──────────────────────────────
  protected exportExcel(): void {
    this.service.exportExcel(this.currentFilter()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibra-altas.xlsx';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar Excel'),
    });
  }

  protected triggerImportExcel(): void {
    this.fileInput.nativeElement.click();
  }

  protected onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.service.importExcel(file).subscribe({
      next: (r) => {
        this.notify.success(`Importadas ${r.created} nuevas, ${r.updated} actualizadas, ${r.errors} errores`);
        this.load();
        input.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(err.error?.message ?? 'Error al importar');
        input.value = '';
      },
    });
  }

  protected verDetalle(id: string): void {
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.detailData.set(null);
    this.service.getById(id).subscribe({
      next: (d) => { this.detailData.set(d); this.detailLoading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.detailLoading.set(false);
        this.notify.error(err.error?.message ?? 'Error al cargar detalle');
        this.detailOpen.set(false);
      },
    });
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.detailData.set(null);
  }

  protected syncKilowy(): void {
    this.kilowySyncing.set(true);
    this.service.syncKilowy().subscribe({
      next: (r) => {
        this.kilowySyncing.set(false);
        const msg = `Kilowy: ${r.creadas} nuevas, ${r.actualizadas} actualizadas`;
        if (r.errores > 0) this.notify.error(`${msg}, ${r.errores} errores`);
        else this.notify.success(msg);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.kilowySyncing.set(false);
        this.notify.error(err.error?.message ?? 'Error al sincronizar con Kilowy');
      },
    });
  }

  protected readonly estadoLabel = estadoAltaLabel;

  protected fmtNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-ES').format(n);
  }

  protected readonly cambioDot = fechaProximaDotClass;
  protected readonly estadoTone = estadoAltaTone;
  protected readonly fmtDate = formatDate;

  /** Texto del punto de color de la fecha de cambio (no solo color). */
  protected cambioAviso(iso: string | null): string {
    const c = fechaProximaDotClass(iso);
    return c === 'bg-danger' ? 'Cambio vencido' : c === 'bg-warning' ? 'Cambio próximo' : 'Cambio';
  }

  /** Fechas con valor, para el detalle. */
  protected fechasDetalle(a: VibraAlta): { label: string; v: string }[] {
    const f: [string, string | null][] = [
      ['Alta', a.fecha], ['Firma', a.fechaFirma], ['Tramitación', a.fechaTramitacion],
      ['Activación', a.fechaActivacionContrato], ['Cambio comercializadora', a.fechaCambioComercializadora],
      ['Renovación', a.fechaRenovacion], ['Baja', a.fechaBaja],
    ];
    return f.filter(([, v]) => !!v).map(([label, v]) => ({ label, v: formatDate(v) }));
  }
}
