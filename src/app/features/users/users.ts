import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { PrimeTemplate } from 'primeng/api';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge, StatusTone } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { Icon } from '../../shared/icons/icon';
import { UserService } from '../../core/services/user.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import {
  ApiErrorResponse,
  Page,
  USER_ROLE_LABEL,
  USER_ROLE_VALUES,
  User,
  UserPayload,
  UserRole,
} from '../../core/models';
import { formatDate } from '../../shared/utils/format';

const ROLE_TONE: Record<UserRole, StatusTone> = {
  admin: 'danger',
  operaciones: 'warning',
  comercial: 'info',
  contabilidad: 'purple',
};

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    Pagination,
    Icon,
    LoadingOverlay,
    TableSkeleton,
    Dialog,
    PrimeTemplate,
  ],
  templateUrl: './users.html',
})
export class Users {
  private readonly service = inject(UserService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly roles = USER_ROLE_VALUES;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<User> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<User | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    rol: ['comercial' as UserRole, [Validators.required]],
    activo: [true],
  });

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  protected readonly canCreate = computed(() => this.auth.hasRole('admin'));
  protected readonly canEdit = computed(() => this.auth.hasRole('admin'));
  protected readonly canDelete = computed(() => this.auth.hasRole('admin'));

  constructor() {
    this.reload(0);
  }

  protected reload(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.list({ page, size: this.size(), sort: 'createdAt,desc' }).subscribe({
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
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ nombre: '', email: '', password: '', rol: 'comercial', activo: true });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.modalOpen.set(true);
  }

  protected openEdit(user: User): void {
    this.editing.set(user);
    this.formError.set(null);
    this.form.reset({
      nombre: user.nombre,
      email: user.email,
      password: '',
      rol: user.rol,
      activo: user.activo,
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.editing.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: UserPayload = {
      nombre: value.nombre,
      email: value.email,
      rol: value.rol,
      activo: value.activo,
    };
    if (value.password) {
      body.password = value.password;
    }

    this.submitting.set(true);
    this.formError.set(null);
    const editing = this.editing();
    const obs$ = editing ? this.service.update(editing.id, body) : this.service.create(body);
    obs$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.notify.success(editing ? 'Usuario actualizado' : 'Usuario creado');
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formError.set(extractMessage(err));
      },
    });
  }

  protected async confirmDelete(user: User): Promise<void> {
    const ok = await this.confirm.ask({
      header: 'Eliminar usuario',
      message: `Esta acción eliminará permanentemente a <b>${escapeHtml(user.nombre)}</b>. ¿Quieres continuar?`,
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.service.delete(user.id).subscribe({
      next: () => {
        this.notify.success(`Usuario "${user.nombre}" eliminado`);
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        const msg = extractMessage(err);
        this.errorMessage.set(msg);
        this.notify.error(msg);
      },
    });
  }

  protected roleLabel(role: UserRole): string {
    return USER_ROLE_LABEL[role];
  }

  protected roleTone(role: UserRole): StatusTone {
    return ROLE_TONE[role];
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
  return error.message || 'Error al gestionar usuarios';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
