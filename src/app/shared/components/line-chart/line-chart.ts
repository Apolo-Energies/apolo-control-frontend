import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface LineChartSeries {
  label: string;
  color: string;
  values: number[];
}

@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.html',
})
export class LineChart {
  readonly series  = input.required<readonly LineChartSeries[]>();
  readonly labels  = input.required<readonly string[]>();
  readonly height  = input<number>(200);
  readonly emptyLabel = input<string>('Sin datos');

  protected readonly hoveredIndex = signal<number | null>(null);

  private readonly W = 460;
  private readonly H = computed(() => this.height());
  private readonly PAD = { top: 20, right: 16, bottom: 32, left: 52 };

  protected readonly viewBox = computed(() => `0 0 ${this.W} ${this.H()}`);

  protected readonly plotW = computed(() => this.W - this.PAD.left - this.PAD.right);
  protected readonly plotH = computed(() => this.H() - this.PAD.top - this.PAD.bottom);

  protected readonly maxVal = computed(() => {
    const all = this.series().flatMap(s => s.values);
    return all.length ? Math.max(...all) * 1.1 : 1;
  });

  // Tick values for y-axis (4 lines)
  protected readonly yTicks = computed<number[]>(() => {
    const max = this.maxVal();
    return [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));
  });

  protected readonly xPositions = computed<number[]>(() => {
    const n = this.labels().length;
    if (n <= 1) return [this.PAD.left + this.plotW() / 2];
    return this.labels().map((_, i) =>
      this.PAD.left + (i / (n - 1)) * this.plotW()
    );
  });

  protected yPos(value: number): number {
    return this.PAD.top + this.plotH() * (1 - value / this.maxVal());
  }

  protected buildPolyline(values: number[]): string {
    const xs = this.xPositions();
    return values.map((v, i) => `${xs[i]},${this.yPos(v)}`).join(' ');
  }

  protected buildArea(values: number[]): string {
    const xs = this.xPositions();
    const bottom = this.PAD.top + this.plotH();
    const pts = values.map((v, i) => `${xs[i]},${this.yPos(v)}`).join(' ');
    const first = `${xs[0]},${bottom}`;
    const last  = `${xs[xs.length - 1]},${bottom}`;
    return `M ${first} L ${pts} L ${last} Z`;
  }

  protected formatY(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
    if (v >= 1_000)     return `${Math.round(v / 1_000)}k€`;
    return `${Math.round(v)}€`;
  }

  protected onHover(i: number): void { this.hoveredIndex.set(i); }
  protected onLeave(): void { this.hoveredIndex.set(null); }

  protected getTooltipX(i: number): number {
    const x = this.xPositions()[i] ?? 0;
    const tipW = 110;
    return x + tipW > this.W ? x - tipW - 8 : x + 8;
  }
}
