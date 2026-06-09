import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { Pagination } from '../../shared/components/pagination/pagination';
import { TableSkeleton } from '../../shared/components/table-skeleton/table-skeleton';
import { LoadingOverlay } from '../../shared/components/loading-overlay/loading-overlay';
import { FormDialog } from '../../shared/components/form-dialog/form-dialog';
import { Icon } from '../../shared/icons/icon';
import { CustomerService } from '../../core/services/customer.service';
import { BranchService } from '../../core/services/branch.service';
import { GroupService } from '../../core/services/group.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { GlobalLoadingService } from '../../core/services/global-loading.service';
import { NotificationService } from '../../core/services/notification.service';
import { ScoringService } from '../../core/services/scoring.service';
import { ApiErrorResponse, Branch, Customer, Group, Page } from '../../core/models';
import { formatDate, safeText } from '../../shared/utils/format';

@Component({
  selector: 'app-customers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    Pagination,
    TableSkeleton,
    LoadingOverlay,
    FormDialog,
    Icon,
  ],
  templateUrl: './customers.html',
})
export class Customers {
  private readonly service = inject(CustomerService);
  private readonly branchService = inject(BranchService);
  private readonly groupService = inject(GroupService);
  private readonly confirm = inject(ConfirmService);
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notify = inject(NotificationService);
  private readonly scoringService = inject(ScoringService);
  private readonly fb = inject(FormBuilder);

  protected search = '';
  protected activeOnly = false;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly result = signal<Page<Customer> | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);

  protected readonly modalOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly groups = signal<Group[]>([]);

  protected readonly scoringModalOpen = signal(false);
  protected readonly scoringSubmitting = signal(false);
  protected readonly scoringFormError = signal<string | null>(null);
  private _scoringTarget: Customer | null = null;

  protected readonly scoringForm = this.fb.nonNullable.group({
    puntuacion: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    comentarios: [''],
    vigilancia: [false],
    fechaActivacionVigilancia: [''],
  });

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    nif: [''],
    delegacionId: [''],
    grupoId: [''],
    contacto: [''],
    telefono: [''],
    email: ['', [Validators.email]],
    comercial: [''],
    activo: [true],
  });

  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly totalElements = computed(() => this.result()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.reload(0);
  }

  protected reload(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service
      .list(
        {
          q: this.search.trim() || undefined,
          activeOnly: this.activeOnly || undefined,
        },
        { page, size: this.size(), sort: 'nombre,asc' },
      )
      .subscribe({
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

  protected onSearchChange(): void {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => this.reload(0), 300);
  }

  protected onSizeChange(size: number): void {
    this.size.set(size);
    this.reload(0);
  }

  protected openCreate(): void {
    this.formError.set(null);
    this.form.reset({
      nombre: '',
      nif: '',
      delegacionId: '',
      grupoId: '',
      contacto: '',
      telefono: '',
      email: '',
      comercial: '',
      activo: true,
    });
    this.loadSelectsIfNeeded();
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
    this.globalLoading.start('Guardando cliente', 'Registrando el nuevo cliente.');

    this.service
      .create({
        nombre: value.nombre,
        nif: value.nif || null,
        delegacionId: value.delegacionId || null,
        grupoId: value.grupoId || null,
        contacto: value.contacto || null,
        telefono: value.telefono || null,
        email: value.email || null,
        comercial: value.comercial || null,
        activo: value.activo,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.closeModal();
          this.notify.success('Cliente creado');
          this.reload(0);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.globalLoading.stop();
          this.formError.set(extractMessage(err));
        },
      });
  }

  protected async confirmDelete(customer: Customer): Promise<void> {
    const ok = await this.confirm.ask({
      header: 'Dar de baja cliente',
      message: `Se dará de baja a <b>${escapeHtml(customer.nombre)}</b> (pasará a inactivo). ¿Continuar?`,
      acceptLabel: 'Sí, dar de baja',
      rejectLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.globalLoading.start('Dando de baja', 'Actualizando el estado del cliente.');
    this.service.delete(customer.id).subscribe({
      next: () => {
        this.globalLoading.stop();
        this.notify.success(`Cliente "${customer.nombre}" dado de baja`);
        this.reload(this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.globalLoading.stop();
        const msg = extractMessage(err);
        this.errorMessage.set(msg);
        this.notify.error(msg);
      },
    });
  }

  private loadSelectsIfNeeded(): void {
    if (this.branches().length === 0) {
      this.branchService
        .list({ size: 100, sort: 'nombre,asc' })
        .subscribe({ next: (res) => this.branches.set(res.content) });
    }
    if (this.groups().length === 0) {
      this.groupService
        .list({ size: 100, sort: 'nombre,asc' })
        .subscribe({ next: (res) => this.groups.set(res.content) });
    }
  }

  protected get isEditingScoring(): boolean {
    return !!this._scoringTarget?.scoring;
  }

  protected get scoringCustomerName(): string {
    return this._scoringTarget?.nombre ?? '';
  }

  protected openScoringCreate(customer: Customer): void {
    this._scoringTarget = customer;
    this.scoringFormError.set(null);
    this.scoringForm.reset({ puntuacion: 1, comentarios: '', vigilancia: false, fechaActivacionVigilancia: '' });
    this.scoringModalOpen.set(true);
  }

  protected openScoringEdit(customer: Customer): void {
    const s = customer.scoring!;
    this._scoringTarget = customer;
    this.scoringFormError.set(null);
    this.scoringForm.reset({
      puntuacion: s.puntuacion,
      comentarios: s.comentarios ?? '',
      vigilancia: s.vigilancia,
      fechaActivacionVigilancia: s.fechaActivacionVigilancia ?? '',
    });
    this.scoringModalOpen.set(true);
  }

  protected closeScoringModal(): void {
    this.scoringModalOpen.set(false);
  }

  protected submitScoring(): void {
    if (this.scoringForm.invalid) {
      this.scoringForm.markAllAsTouched();
      return;
    }
    const customer = this._scoringTarget!;
    const value = this.scoringForm.getRawValue();
    const payload = {
      clienteId: customer.id,
      puntuacion: value.puntuacion,
      comentarios: value.comentarios || null,
      vigilancia: value.vigilancia,
      fechaActivacionVigilancia: value.fechaActivacionVigilancia || null,
    };

    this.scoringSubmitting.set(true);
    this.scoringFormError.set(null);

    const obs$ = customer.scoring
      ? this.scoringService.update(customer.scoring.id, payload)
      : this.scoringService.create(payload);

    obs$.subscribe({
      next: (scoring) => {
        this.scoringSubmitting.set(false);
        this.closeScoringModal();
        this.notify.success(customer.scoring ? 'Scoring actualizado' : 'Scoring creado');
        const current = this.result();
        if (current) {
          const updatedContent = current.content.map((c) =>
            c.id === customer.id ? { ...c, scoring } : c,
          );
          this.result.set({ ...current, content: updatedContent });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.scoringSubmitting.set(false);
        this.scoringFormError.set(extractMessage(err));
      },
    });
  }

  protected scoringTone(score: number): 'success' | 'warning' | 'danger' {
    if (score <= 3) return 'success';
    if (score <= 6) return 'warning';
    return 'danger';
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
  return error.message || 'Error al cargar los clientes';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
