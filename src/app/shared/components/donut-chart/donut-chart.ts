import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { formatNumber } from '../../utils/format';

export interface DonutChartItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  pct: number;
  pathD: string;
  midAngle: number;
}

const CENTER = 100;
const OUTER_RADIUS = 90;
const INNER_RADIUS = 55;

@Component({
  selector: 'app-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './donut-chart.html',
})
export class DonutChart {
  readonly data = input.required<readonly DonutChartItem[]>();
  readonly centerLabel = input<string>('Total');
  readonly emptyLabel = input<string>('Sin datos');
  readonly showLegend = input<boolean>(true);

  readonly segmentClick = output<string>();

  protected readonly hoveredId = signal<string | null>(null);

  protected readonly total = computed(() =>
    this.data().reduce((acc, item) => acc + item.value, 0),
  );

  protected readonly segments = computed<DonutSegment[]>(() => {
    const total = this.total();
    if (total === 0) {
      return [];
    }
    const items = this.data();
    let cursor = 0;
    return items.map((item) => {
      const pct = item.value / total;
      const startAngle = cursor * 2 * Math.PI;
      const endAngle = (cursor + pct) * 2 * Math.PI;
      const midAngle = (startAngle + endAngle) / 2;
      cursor += pct;
      return {
        id: item.id,
        label: item.label,
        value: item.value,
        color: item.color,
        pct: Math.round(pct * 1000) / 10,
        pathD: ringSegmentPath(startAngle, endAngle),
        midAngle,
      };
    });
  });

  protected readonly hoveredSegment = computed(() => {
    const id = this.hoveredId();
    if (!id) return null;
    return this.segments().find((s) => s.id === id) ?? null;
  });

  protected onEnter(id: string): void {
    this.hoveredId.set(id);
  }

  protected onLeave(): void {
    this.hoveredId.set(null);
  }

  protected onClick(id: string): void {
    this.segmentClick.emit(id);
  }

  protected isHovered(id: string): boolean {
    return this.hoveredId() === id;
  }

  protected isDimmed(id: string): boolean {
    const h = this.hoveredId();
    return h !== null && h !== id;
  }

  protected formatValue(n: number): string {
    return formatNumber(n);
  }
}

function ringSegmentPath(startAngle: number, endAngle: number): string {
  // Convert polar (angle from -90° = top) to cartesian
  const polar = (radius: number, angle: number): [number, number] => {
    const a = angle - Math.PI / 2;
    return [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)];
  };

  // If full circle, draw two arcs
  if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
    return [
      `M ${CENTER - OUTER_RADIUS} ${CENTER}`,
      `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 1 1 ${CENTER + OUTER_RADIUS} ${CENTER}`,
      `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 1 1 ${CENTER - OUTER_RADIUS} ${CENTER}`,
      `Z`,
    ].join(' ');
  }

  const [x1Out, y1Out] = polar(OUTER_RADIUS, startAngle);
  const [x2Out, y2Out] = polar(OUTER_RADIUS, endAngle);
  const [x1In, y1In] = polar(INNER_RADIUS, endAngle);
  const [x2In, y2In] = polar(INNER_RADIUS, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${x1Out} ${y1Out}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${x2Out} ${y2Out}`,
    `L ${x1In} ${y1In}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${x2In} ${y2In}`,
    `Z`,
  ].join(' ');
}
