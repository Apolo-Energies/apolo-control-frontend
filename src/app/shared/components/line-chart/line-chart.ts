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
  readonly series     = input.required<readonly LineChartSeries[]>();
  readonly labels     = input.required<readonly string[]>();
  readonly height     = input<number>(220);
  readonly emptyLabel = input<string>('Sin datos');

  protected readonly hoveredIndex = signal<number | null>(null);

  private readonly W   = 560;
  private readonly PAD = { top: 24, right: 20, bottom: 36, left: 56 };

  protected readonly H       = computed(() => this.height());
  protected readonly viewBox = computed(() => `0 0 ${this.W} ${this.H()}`);
  protected readonly plotW   = computed(() => this.W - this.PAD.left - this.PAD.right);
  protected readonly plotH   = computed(() => this.H() - this.PAD.top - this.PAD.bottom);
  protected readonly bottom  = computed(() => this.PAD.top + this.plotH());

  protected readonly maxVal = computed(() => {
    const all = this.series().flatMap(s => s.values);
    return Math.max(...all, 0) * 1.15 || 1;
  });

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

  protected readonly gradientIds = computed(() =>
    this.series().map((_, i) => `lcg-${i}`)
  );

  protected yPos(value: number): number {
    return this.PAD.top + this.plotH() * (1 - value / this.maxVal());
  }

  // Catmull-Rom → Cubic Bezier smooth path
  protected smoothPath(values: number[]): string {
    const xs = this.xPositions();
    const n  = values.length;
    if (n === 0) return '';
    if (n === 1) return `M ${xs[0]},${this.yPos(values[0])}`;

    let d = `M ${xs[0]},${this.yPos(values[0])}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = { x: xs[Math.max(0, i - 1)],     y: this.yPos(values[Math.max(0, i - 1)]) };
      const p1 = { x: xs[i],                        y: this.yPos(values[i]) };
      const p2 = { x: xs[i + 1],                    y: this.yPos(values[i + 1]) };
      const p3 = { x: xs[Math.min(n - 1, i + 2)],  y: this.yPos(values[Math.min(n - 1, i + 2)]) };
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x},${p2.y.toFixed(2)}`;
    }
    return d;
  }

  protected smoothArea(values: number[]): string {
    const xs   = this.xPositions();
    const line = this.smoothPath(values);
    if (!line) return '';
    const bot  = this.bottom();
    return `${line} L ${xs[xs.length - 1]},${bot} L ${xs[0]},${bot} Z`;
  }

  protected formatY(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
    if (v >= 1_000)     return `${Math.round(v / 1_000)}k€`;
    return `${v}€`;
  }

  protected onHover(i: number): void { this.hoveredIndex.set(i); }
  protected onLeave(): void          { this.hoveredIndex.set(null); }

  protected tooltipX(i: number): number {
    const x = this.xPositions()[i] ?? 0;
    return x + 140 > this.W ? x - 148 : x + 8;
  }
}
