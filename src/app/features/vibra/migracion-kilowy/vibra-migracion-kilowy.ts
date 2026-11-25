import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { StatusBadge, StatusTone } from '../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../shared/icons/icon';
import { formatDateTime } from '../../../shared/utils/format';
import { mensajeError } from '../../../shared/utils/http-error';

import { VibraMigracionKilowyService } from '../../../core/services/vibra-migracion-kilowy.service';
import { VibraAltaService } from '../../../core/services/vibra-alta.service';
import { VibraFacturaService } from '../../../core/services/vibra-factura.service';
import { EstadoMigracionKilowy, TrabajoMigracionKilowy } from '../../../core/models';

type Paso = 'altas' | 'fichas' | 'clientes' | 'facturas' | 'pdfs' | 'remesas' | 'empresa';

const AJUSTE_LABEL: Record<string, string> = {
  'vibra.empresa.razon_social': 'Razón social',
  'vibra.empresa.cif': 'CIF',
  'vibra.empresa.direccion': 'Dirección',
  'vibra.empresa.email': 'Email',
  'vibra.empresa.telefono': 'Teléfono',
  'vibra.empresa.registro_idae': 'Registro IDAE',
  'vibra.empresa.email_reclamaciones': 'Email de reclamaciones',
  'vibra.sepa.acreedor_id': 'Identificador de acreedor SEPA',
};

const POLL_MS = 3000;

/** Migración única desde Kilowy: pasos en orden con su estado y botón. */
@Component({
  selector: 'app-vibra-migracion-kilowy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, PageHeader, ConfirmDialog, StatusBadge, Icon],
  templateUrl: './vibra-migracion-kilowy.html',
})
export class VibraMigracionKilowy {
  private readonly service = inject(VibraMigracionKilowyService);
  private readonly altas = inject(VibraAltaService);
  private readonly facturas = inject(VibraFacturaService);

  protected readonly estado = signal<EstadoMigracionKilowy | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly ocupado = signal<Paso | null>(null);
  /** Último resultado de cada paso, en texto. */
  protected readonly resultados = signal<Partial<Record<Paso, string>>>({});
  /** Último error al lanzar cada paso. */
  protected readonly errores = signal<Partial<Record<Paso, string>>>({});
  protected readonly remesasOpen = signal(false);
  protected readonly fechaHora = formatDateTime;

  protected readonly enSegundoPlano = computed(() => {
    const e = this.estado();
    return !!e && (e.clientesCalle.enCurso || e.pdfs.enCurso);
  });
  protected readonly empresaVacios = computed(() => this.estado()?.empresaVacios.map((c) => this.ajuste(c)).join(', ') ?? '');
  protected readonly bloqueado = computed(() => !!this.ocupado() || this.enSegundoPlano() || !this.estado()?.kilowyConfigurado);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private destruido = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.pararSondeo();
    });
    this.cargar();
  }

  protected ajuste(clave: string): string {
    return AJUSTE_LABEL[clave] ?? clave;
  }

  protected errorDe(paso: Paso): string | null {
    return this.errores()[paso] ?? null;
  }

  protected etiqueta(t: TrabajoMigracionKilowy): string {
    if (t.enCurso) return 'En curso';
    if (t.error) return 'Error';
    return t.fin ? 'Terminado' : 'Pendiente';
  }

  protected tono(t: TrabajoMigracionKilowy): StatusTone {
    if (t.enCurso) return 'info';
    if (t.error) return 'danger';
    if (t.fin) return t.errores > 0 ? 'warning' : 'success';
    return 'neutral';
  }

  protected textoTrabajo(t: TrabajoMigracionKilowy): string {
    if (t.enCurso) return t.total ? `En curso: ${t.hechos} de ${t.total}` : 'En curso: leyendo listados de Kilowy…';
    if (t.error) return `Error: ${t.error}`;
    if (t.fin) return `${t.mensaje ?? 'Terminado'}${t.errores ? ` · ${t.errores} con error` : ''}`;
    return 'Sin ejecutar en esta sesión del servidor';
  }

  protected cargar(): void {
    this.service.estado().subscribe({
      next: (e) => {
        this.estado.set(e);
        this.error.set(null);
        if (e.clientesCalle.enCurso || e.pdfs.enCurso) this.sondear();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err, 'No se pudo cargar el estado de la migración'));
        // Si había un paso en marcha se sigue preguntando
        if (this.enSegundoPlano()) this.sondear();
      },
    });
  }

  protected sincronizarAltas(): void {
    this.ejecutar('altas', this.altas.syncKilowy(), (r) => `${r.creadas} nuevas, ${r.actualizadas} actualizadas`);
  }

  protected importarFichas(): void {
    this.ejecutar('fichas', this.service.fichas(), () => 'Fichas de contrato importadas');
  }

  protected importarClientes(): void {
    this.ejecutar('clientes', this.service.clientes(), () => 'Lanzado en segundo plano');
  }

  protected importarFacturas(): void {
    this.ejecutar('facturas', this.facturas.importarKilowy(),
      (r) => `${r.creadas} nuevas, ${r.actualizadas} actualizadas, ${r.omitidas} omitidas`);
  }

  protected descargarPdfs(): void {
    this.ejecutar('pdfs', this.service.pdfs(), () => 'Lanzado en segundo plano');
  }

  protected avanzarRemesas(): void {
    this.remesasOpen.set(false);
    this.ejecutar('remesas', this.service.remesas(),
      (r) => `Última de Kilowy: ${r.ultimaKilowy}. La siguiente remesa de Control será la ${r.ultimaControl + 1}`);
  }

  protected importarEmpresa(): void {
    this.ejecutar('empresa', this.service.empresa(), (r) => {
      const partes = [`Rellenados: ${r.rellenados.map((c) => this.ajuste(c)).join(', ') || 'ninguno'}`];
      if (r.yaConValor.length) partes.push(`ya tenían valor (no se tocan): ${r.yaConValor.map((c) => this.ajuste(c)).join(', ')}`);
      if (r.sinDatoEnKilowy.length) partes.push(`sin dato en Kilowy: ${r.sinDatoEnKilowy.map((c) => this.ajuste(c)).join(', ')}`);
      return partes.join(' · ');
    });
  }

  private ejecutar<T>(paso: Paso, peticion: Observable<T>, texto: (r: T) => string): void {
    this.ocupado.set(paso);
    peticion.subscribe({
      next: (r) => {
        this.ocupado.set(null);
        this.resultados.update((m) => ({ ...m, [paso]: texto(r) }));
        this.errores.update((m) => ({ ...m, [paso]: undefined }));
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.resultados.update((m) => ({ ...m, [paso]: undefined }));
        this.errores.update((m) => ({ ...m, [paso]: `Error: ${mensajeError(err, 'No se pudo completar el paso')}` }));
        this.cargar();
      },
    });
  }

  private sondear(): void {
    this.pararSondeo();
    if (!this.destruido) this.timer = setTimeout(() => this.cargar(), POLL_MS);
  }

  private pararSondeo(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
