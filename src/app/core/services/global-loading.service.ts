import { Injectable, computed, signal } from '@angular/core';

/**
 * Servicio global para mostrar/ocultar el `BrandLoader` fullscreen.
 * Usar `start()` y `stop()` rodeando acciones largas (login, migración, exportación).
 * Es un contador, así que se pueden anidar múltiples llamadas concurrentes.
 */
@Injectable({ providedIn: 'root' })
export class GlobalLoadingService {
  private readonly counter = signal(0);
  private readonly titleSignal = signal<string | null>(null);
  private readonly descriptionSignal = signal<string | null>(null);

  readonly loading = computed(() => this.counter() > 0);
  readonly title = computed(() => this.titleSignal());
  readonly description = computed(() => this.descriptionSignal());

  start(title?: string, description?: string | null): void {
    if (title !== undefined) this.titleSignal.set(title);
    if (description !== undefined) this.descriptionSignal.set(description);
    this.counter.update((n) => n + 1);
  }

  stop(): void {
    this.counter.update((n) => Math.max(0, n - 1));
    if (this.counter() === 0) {
      this.titleSignal.set(null);
      this.descriptionSignal.set(null);
    }
  }

  reset(): void {
    this.counter.set(0);
    this.titleSignal.set(null);
    this.descriptionSignal.set(null);
  }
}
