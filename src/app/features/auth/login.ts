import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/auth/auth.service';
import { ApiErrorResponse } from '../../core/models';
import { Icon } from '../../shared/icons/icon';
import { GlobalLoadingService } from '../../core/services/global-loading.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  host: { class: 'block min-h-screen bg-background' },
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly globalLoading = inject(GlobalLoadingService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly canSubmit = computed(() => !this.loading());

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.globalLoading.start('Iniciando sesión', 'Validando tus credenciales con Apolo.');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.globalLoading.stop();
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.globalLoading.stop();
        this.errorMessage.set(extractMessage(err));
      },
    });
  }

  protected showError(controlName: 'email' | 'password', errorKey: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(errorKey);
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
  return error.message || 'Error al iniciar sesión';
}
