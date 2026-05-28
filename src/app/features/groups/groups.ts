import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { Icon } from '../../shared/icons/icon';
import { GroupService } from '../../core/services/group.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { NotificationService } from '../../core/services/notification.service';
import { ApiErrorResponse, Group, Page } from '../../core/models';
import { formatDate, safeText } from '../../shared/utils/format';

@Component({
  selector: 'app-groups',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    Pagination,
    TableSkeleton,
    LoadingOverlay,
    FormDialog,
    Icon,
  ],
  templateUrl: './groups.html',
})
export class Groups {
  private readonly service = inject(GroupService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Group> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly modalOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    activo: [true],
  });

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  constructor() {
    this.reload(0);
  }

  protected reload(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.list({ page, size: this.size(), sort: 'nombre,asc' }).subscribe({
      next: (response) => {
        this.result.set(response);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extractMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected openCreate(): void {
    this.formError.set(null);
    this.form.reset({ nombre: '', descripcion: '', activo: true });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.globalLoading.start('Guardando grupo', 'Registrando el nuevo grupo comercial.');

    this.service
      .create({
        nombre: value.nombre,
        descripcion: value.descripcion || null,
        activo: value.activo,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeModal();
          this.notify.success('Grupo creado');
          this.reload(0);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
  }

  protected text(value: string | null): string {
    return safeText(value);
  }

  protected date(value: string | null): string {
    return formatDate(value);
  }
}

function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiErrorResponse | undefined;
  if (body?.message) {
    return body.message;
  }
  if (error.status === 0) {
    return 'No se puede conectar con el servidor';
  }
  return error.message || 'Error al cargar los grupos';
}
