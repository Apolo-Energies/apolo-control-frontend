import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface GroupedBarSeries {
  label: string;
  color: string;
  values: number[];
}

@Component({
  selector: 'app-grouped-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grouped-bar-chart.html',
})
export class GroupedBarChart {
  readonly series     = input.required<readonly GroupedBarSeries[]>();
  readonly labels     = input.required<readonly string[]>();
  readonly height     = input<number>(200);
  readonly emptyLabel = input<string>('Sin datos');

  protected readonly hovered = signal<{ group: number; serie: number } | null>(null);

  private readonly W   = 460;
  private readonly PAD = { top: 12, right: 16, bottom: 28, left: 56 };

  protected readonly plotW = computed(() => this.W - this.PAD.left - this.PAD.right);
  protected readonly plotH = computed(() => this.height() - this.PAD.top - this.PAD.bottom);
  protected readonly viewBox = computed(() => `0 0 ${this.W} ${this.height()}`);

  protected readonly maxVal = computed(() => {
    const all = this.series().flatMap(s => s.values);
    return Math.max(...all, 1) * 1.15;
  });

  protected readonly yTicks = computed<number[]>(() => {
    const max = this.maxVal();
    return [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));
  });

  protected readonly groupWidth = computed(() =>
    this.labels().length > 0 ? this.plotW() / this.labels().length : this.plotW()
  );

  protected readonly barWidth = computed(() => {
    const n = this.series().length || 1;
    return Math.max(4, (this.groupWidth() * 0.7) / n);
  });

  protected groupX(g: number): number {
    return this.PAD.left + g * this.groupWidth() + this.groupWidth() / 2;
  }

  protected barX(g: number, s: number): number {
    const n   = this.series().length;
    const bw  = this.barWidth();
    const gap = bw * 0.2;
    const total = n * bw + (n - 1) * gap;
    return this.groupX(g) - total / 2 + s * (bw + gap);
  }

  protected barY(value: number): number {
    return this.PAD.top + this.plotH() * (1 - value / this.maxVal());
  }

  protected barH(value: number): number {
    return Math.max(2, this.plotH() * (value / this.maxVal()));
  }

  protected formatY(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
    if (v >= 1_000)     return `${Math.round(v / 1_000)}k€`;
    return `${Math.round(v)}€`;
  }

  protected tooltipX(g: number): number {
    const x = this.groupX(g);
    return x + 70 > this.W ? x - 140 : x + 8;
  }

  protected setHover(group: number, serie: number): void { this.hovered.set({ group, serie }); }
  protected clearHover(): void { this.hovered.set(null); }
}
