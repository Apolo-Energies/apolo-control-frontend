import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface BarChartItem {
  label: string;
  value: number;
  formattedValue: string;
  hint?: string;
  tooltip?: string;
}

@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar-chart.html',
})
export class BarChart {
  readonly data = input.required<readonly BarChartItem[]>();
  readonly color = input<string>('#10b981');
  readonly colors = input<readonly string[]>([]);
  readonly height = input<number>(220);
  readonly emptyLabel = input<string>('Sin datos');

  protected readonly hoveredIndex = signal<number | null>(null);

  protected readonly max = computed(() => {
    const values = this.data().map((d) => d.value);
    return values.length > 0 ? Math.max(1, ...values) : 1;
  });

  protected readonly avg = computed(() => {
    const values = this.data().map((d) => d.value);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  protected readonly avgPct = computed(() => Math.round((this.avg() / this.max()) * 100));

  protected readonly chartHeightPx = computed(() => this.height());

  protected pct(value: number): number {
    return Math.max(2, Math.round((value / this.max()) * 100));
  }

  protected onEnter(index: number): void {
    this.hoveredIndex.set(index);
  }

  protected barColor(index: number): string {
    return this.colors()[index] ?? this.color();
  }

  protected onLeave(): void {
    this.hoveredIndex.set(null);
  }

  protected isHovered(index: number): boolean {
    return this.hoveredIndex() === index;
  }

  protected isDimmed(index: number): boolean {
    const h = this.hoveredIndex();
    return h !== null && h !== index;
  }
}
