import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../../shared/components/table-skeleton/table-skeleton';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { FormDialog } from '../../../shared/components/form-dialog/form-dialog';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Icon } from '../../../shared/icons/icon';

import { AuthService } from '../../../core/auth';
import { VibraClienteService } from '../../../core/services/vibra-cliente.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ImportacionClientes, Page, TIPO_CLIENTE_VIBRA_LABEL, TipoClienteVibra, VibraClienteFicha, VibraClienteListItem,
} from '../../../core/models';
import { VibraClienteForm } from './vibra-cliente-form';

/** Clientes Vibra (como Contratos → Clientes de Kilowy). */
@Component({
  selector: 'app-vibra-clientes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, PageHeader, Pagination, TableSkeleton, ConfirmDialog, FormDialog,
    StatusBadge, Icon, VibraClienteForm],
  templateUrl: './vibra-clientes.html',
})
export class VibraClientes {
  private readonly service = inject(VibraClienteService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly puedeEditar = computed(() => this.auth.hasRole('admin', 'operaciones'));
  protected readonly esAdmin = computed(() => this.auth.hasRole('admin'));

  protected readonly result = signal<Page<VibraClienteListItem> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected q = '';
  protected tipo: TipoClienteVibra | '' = '';

  protected readonly formOpen = signal(false);
  protected readonly importOpen = signal(false);
  protected readonly importando = signal(false);
  protected readonly importResult = signal<ImportacionClientes | null>(null);

  protected readonly tipoCliente = TIPO_CLIENTE_VIBRA_LABEL;
  protected readonly filasImport = computed(() => {
    const r = this.importResult();
    return r ? [{ label: 'Clientes', c: r.clientes }, { label: 'Suministros', c: r.suministros }] : [];
  });

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly total = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(this.filtro(), { page: this.page(), size: this.size(), sort: 'nombre,asc' }).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'Error al cargar los clientes');
        this.loading.set(false);
      },
    });
  }

  protected buscar(): void { this.page.set(0); this.load(); }
  protected onPage(p: number): void { this.page.set(p); this.load(); }
  protected onPageSize(s: number): void { this.size.set(s); this.page.set(0); this.load(); }

  protected creado(c: VibraClienteFicha): void {
    this.formOpen.set(false);
    this.notify.success(`Cliente ${c.nombre} creado`);
    void this.router.navigate(['/vibra/clientes', c.id]);
  }

  protected importar(): void {
    this.importando.set(true);
    this.service.importarKilowy().subscribe({
      next: (r) => {
        this.importando.set(false);
        this.importOpen.set(false);
        this.importResult.set(r);
        this.buscar();
      },
      error: (err: HttpErrorResponse) => {
        this.importando.set(false);
        this.importOpen.set(false);
        this.notify.error(err.error?.message ?? 'No se pudo importar desde Kilowy');
      },
    });
  }

  protected exportExcel(): void {
    this.service.exportExcel(this.filtro()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibra_clientes.xlsx';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Error al descargar Excel'),
    });
  }

  private filtro() {
    return { q: this.q || undefined, tipo: this.tipo || undefined };
  }
}
