import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeader } from '../../shared/components/page-header/page-header';
import { Icon } from '../../shared/icons/icon';
import { PerfilService } from '../../core/services/perfil.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserPreferencesService } from '../../core/services/user-preferences.service';
import { PerfilResponse, USER_ROLE_LABEL } from '../../core/models';

@Component({
  selector: 'app-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, Icon, ReactiveFormsModule],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit {
  private readonly service = inject(PerfilService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly prefs = inject(UserPreferencesService);
  protected mantenerFiltros(): boolean { return this.prefs.mantenerFiltros(); }
  protected toggleMantenerFiltros(): void { this.prefs.set('mantenerFiltros', !this.prefs.mantenerFiltros()); }

  protected readonly perfil = signal<PerfilResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploadingFirma = signal(false);
  protected readonly firmaDataUrl = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    telefono: [''],
    cargo: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.getPerfil().subscribe({
      next: (data) => {
        this.perfil.set(data);
        this.form.patchValue({
          nombre: data.nombre,
          telefono: data.telefono ?? '',
          cargo: data.cargo ?? '',
        });
        this.loading.set(false);
        if (data.hasFirma) this.loadFirmaBlob();
      },
      error: () => {
        this.notify.error('No se pudo cargar el perfil');
        this.loading.set(false);
      },
    });
  }

  private loadFirmaBlob(): void {
    this.service.getFirmaBlob().subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => this.firmaDataUrl.set(reader.result as string);
        reader.readAsDataURL(blob);
      },
      error: () => this.firmaDataUrl.set(null),
    });
  }

  protected initials(nombre: string): string {
    return nombre
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  protected rolLabel(rol: string): string {
    return USER_ROLE_LABEL[rol as keyof typeof USER_ROLE_LABEL] ?? rol;
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .updatePerfil({
        nombre: v.nombre!,
        telefono: v.telefono || null,
        cargo: v.cargo || null,
      })
      .subscribe({
        next: (data) => {
          this.perfil.set(data);
          this.saving.set(false);
          this.notify.success('Perfil actualizado');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.notify.error(err.error?.message ?? 'Error al guardar');
        },
      });
  }

  protected onFirmaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.notify.error('Solo se permiten imágenes (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notify.error('La imagen no puede superar 2 MB');
      return;
    }
    this.uploadingFirma.set(true);
    this.service.uploadFirma(file).subscribe({
      next: () => {
        this.uploadingFirma.set(false);
        const current = this.perfil();
        if (current) this.perfil.set({ ...current, hasFirma: true });
        this.loadFirmaBlob();
        this.notify.success('Firma guardada correctamente');
        input.value = '';
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingFirma.set(false);
        this.notify.error(err.error?.message ?? 'Error al subir la firma');
      },
    });
  }
}
