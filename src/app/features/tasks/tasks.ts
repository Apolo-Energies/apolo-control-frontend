import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { Icon } from '../../shared/icons/icon';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { NotificationService } from '../../core/services/notification.service';
import { TareaService } from '../../core/services/tarea.service';
import { AuthService } from '../../core/auth/auth.service';
import { EstadoTarea, Tarea, TareaRequest, PrioridadTarea } from '../../core/models/tarea.model';
import { environment } from '../../../environments/environment';

interface UsuarioSimple { id: string; nombre: string; email: string; }

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, NgClass, PageHeader, TableSkeleton, Icon, FormDialog],
  templateUrl: './tasks.html',
})
export class Tasks implements OnInit {
  private readonly svc    = inject(TareaService);
  private readonly auth   = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly http   = inject(HttpClient);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isAdmin = computed(() =>
    this.auth.role() === 'admin' || this.auth.role() === 'operaciones'
  );
  protected readonly currentEmail = computed(() => this.auth.user()?.email ?? '');

  // ── Filtros ──────────────────────────────────────────────────────────────
  protected readonly desde          = signal(toIso(new Date()));
  protected readonly hasta          = signal(toIso(new Date()));
  protected readonly filtroEmail    = signal('');
  protected readonly filtroEstado   = signal<EstadoTarea | ''>('');
  protected readonly filtroVencidas = signal(false);

  // ── Datos ────────────────────────────────────────────────────────────────
  protected readonly loading  = signal(false);
  protected readonly tareas   = signal<Tarea[]>([]);
  protected readonly usuarios = signal<UsuarioSimple[]>([]);

  protected readonly hoy = toIso(new Date());

  protected readonly rows = computed(() => {
    let items = this.tareas();
    if (this.filtroVencidas()) {
      items = items.filter(t => t.fechaVencimiento < this.hoy && t.estado === 'PENDIENTE');
    } else {
      if (this.filtroEstado()) items = items.filter(t => t.estado === this.filtroEstado());
    }
    return items;
  });

  protected readonly stats = computed(() => {
    const all = this.tareas();
    const vencidas = all.filter(t => t.fechaVencimiento < this.hoy && t.estado === 'PENDIENTE').length;
    return {
      total: all.length,
      pendientes: all.filter(t => t.estado === 'PENDIENTE').length,
      realizadas: all.filter(t => t.estado === 'REALIZADA').length,
      vencidas,
    };
  });

  // ── Formulario crear / editar ─────────────────────────────────────────────
  protected readonly formOpen = signal(false);
  protected readonly saving   = signal(false);
  protected readonly editing  = signal<Tarea | null>(null);
  protected draft: TareaRequest = this.emptyDraft();

  // ── Panel de detalle ──────────────────────────────────────────────────────
  protected readonly detalle = signal<Tarea | null>(null);

  readonly PRIORIDADES: PrioridadTarea[] = ['ALTA', 'NORMAL', 'BAJA'];
  readonly ESTADOS: EstadoTarea[] = ['PENDIENTE', 'REALIZADA'];

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['vencidas'] === 'true') this.filtroVencidas.set(true);
    this.reload(() => {
      const detalleId = params['detalle'];
      if (detalleId) {
        const found = this.tareas().find(t => t.id === detalleId);
        if (found) this.detalle.set(found);
      }
    });
    if (this.isAdmin()) this.loadUsuarios();
  }

  protected reload(cb?: () => void): void {
    this.loading.set(true);
    const email = this.isAdmin() ? (this.filtroEmail() || undefined) : undefined;
    this.svc.findByRango(this.desde(), this.hasta(), email).subscribe({
      next: (list) => { this.tareas.set(list); this.loading.set(false); cb?.(); },
      error: ()    => { this.notify.error('Error al cargar tareas'); this.loading.set(false); },
    });
  }

  private loadUsuarios(): void {
    this.http.get<UsuarioSimple[]>(`${environment.apiUrl}/usuarios/activos`).subscribe({
      next: (list) => this.usuarios.set(list),
      error: () => {},
    });
  }

  protected applyFilter(): void {
    this.filtroVencidas.set(false);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.reload();
  }

  protected toggleVencidas(): void {
    this.filtroVencidas.update(v => !v);
    this.filtroEstado.set('');
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  protected openCreate(): void {
    this.editing.set(null);
    this.draft = this.emptyDraft();
    this.formOpen.set(true);
  }

  protected openEdit(t: Tarea): void {
    this.editing.set(t);
    this.draft = {
      titulo: t.titulo,
      descripcion: t.descripcion,
      fechaVencimiento: t.fechaVencimiento,
      usuarioEmail: t.usuarioEmail,
      prioridad: t.prioridad,
      estado: t.estado,
    };
    this.formOpen.set(true);
  }

  protected closeForm(): void { this.formOpen.set(false); this.editing.set(null); }

  protected save(): void {
    if (!this.draft.titulo?.trim()) return;
    this.saving.set(true);
    const ed = this.editing();
    const op = ed ? this.svc.update(ed.id, this.draft) : this.svc.create(this.draft);
    op.subscribe({
      next: (t) => {
        this.saving.set(false);
        this.closeForm();
        if (ed) {
          this.tareas.update(list => list.map(x => x.id === t.id ? t : x));
          if (this.detalle()?.id === t.id) this.detalle.set(t);
        } else {
          this.tareas.update(list => [...list, t].sort(this.sortFn));
        }
        this.notify.success(ed ? 'Tarea actualizada' : 'Tarea creada');
      },
      error: () => { this.saving.set(false); this.notify.error('Error al guardar'); },
    });
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  protected onEstadoChange(t: Tarea, estado: EstadoTarea): void {
    this.svc.setEstado(t.id, estado).subscribe({
      next: (updated) => {
        this.tareas.update(list => list.map(x => x.id === updated.id ? updated : x));
        if (this.detalle()?.id === updated.id) this.detalle.set(updated);
      },
      error: () => this.notify.error('Error al cambiar estado'),
    });
  }

  // ── Otras acciones ────────────────────────────────────────────────────────

  protected asignar(t: Tarea): void {
    this.svc.asignar(t.id).subscribe({
      next: (updated) => {
        this.tareas.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.notify.success('Tarea asignada a ti');
      },
      error: () => this.notify.error('Error al asignar tarea'),
    });
  }

  protected delete(id: string): void {
    this.svc.delete(id).subscribe({
      next: () => {
        this.tareas.update(list => list.filter(t => t.id !== id));
        if (this.detalle()?.id === id) this.detalle.set(null);
        this.notify.success('Tarea eliminada');
      },
      error: () => this.notify.error('Error al eliminar tarea'),
    });
  }

  protected openDetalle(t: Tarea): void { this.detalle.set(t); }
  protected closeDetalle(): void { this.detalle.set(null); }

  // ── Helpers ────────────────────────────────────────────────────────────────

  protected isVencida(t: Tarea): boolean {
    return t.fechaVencimiento < this.hoy && t.estado === 'PENDIENTE';
  }

  protected prioridadClass(p: PrioridadTarea): string {
    if (p === 'ALTA') return 'bg-danger/15 text-danger-fg';
    if (p === 'BAJA') return 'bg-muted text-muted-foreground';
    return 'bg-accent text-foreground';
  }

  protected estadoClass(estado: EstadoTarea): string {
    return estado === 'REALIZADA'
      ? 'bg-success/15 text-success-fg'
      : 'bg-warning/15 text-warning-fg';
  }

  protected usuarioNombre(email: string | null): string {
    if (!email) return 'General';
    const u = this.usuarios().find(x => x.email === email);
    return u ? u.nombre : email;
  }

  private emptyDraft(): TareaRequest {
    return { titulo: '', descripcion: null, fechaVencimiento: toIso(new Date()), usuarioEmail: null, prioridad: 'NORMAL', estado: 'PENDIENTE' };
  }

  private readonly sortFn = (a: Tarea, b: Tarea) =>
    a.fechaVencimiento.localeCompare(b.fechaVencimiento);
}
