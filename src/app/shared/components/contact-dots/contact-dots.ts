import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-contact-dots',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  templateUrl: './contact-dots.html',
})
export class ContactDots {
  readonly current = input<number>(0);
  readonly total = input<number>(5);

  protected readonly dots = computed(() => {
    const current = this.current();
    return Array.from({ length: this.total() }).map((_, i) => {
      const reached = i < current;
      return {
        classes: reached
          ? CONTACT_TONES[i] ?? 'bg-accent text-foreground'
          : 'bg-muted text-muted-foreground/60',
        title: `Contacto ${i + 1}${reached ? ' · realizado' : ''}`,
      };
    });
  });

  protected readonly ariaLabel = computed(
    () => `${this.current()} de ${this.total()} contactos realizados`,
  );
}

const CONTACT_TONES = [
  'bg-blue-500/90  text-white',
  'bg-amber-500/90 text-white',
  'bg-orange-500/90 text-white',
  'bg-red-500/90   text-white',
  'bg-violet-500/90 text-white',
];
