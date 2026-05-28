import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { Icon, IconName } from '../../icons/icon';

export type KpiTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple';

@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgClass],
  templateUrl: './kpi-card.html',
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly sublabel = input<string | null>(null);
  readonly icon = input<IconName | null>(null);
  readonly tone = input<KpiTone>('info');
  readonly delta = input<string | null>(null);
  readonly deltaTrend = input<'up' | 'down' | 'flat'>('flat');
  readonly deltaLabel = input<string | null>(null);

  protected readonly iconBgClass = computed(() => {
    switch (this.tone()) {
      case 'success': return 'bg-success-soft text-success-fg ring-1 ring-success/20';
      case 'warning': return 'bg-warning-soft text-warning-fg ring-1 ring-warning/20';
      case 'danger':  return 'bg-danger-soft text-danger-fg ring-1 ring-danger/20';
      case 'purple':  return 'bg-purple-soft text-purple-fg ring-1 ring-purple/20';
      case 'neutral': return 'bg-neutral-soft text-neutral-fg ring-1 ring-neutral/20';
      default:        return 'bg-info-soft text-info-fg ring-1 ring-info/20';
    }
  });

  protected readonly deltaClass = computed(() => {
    switch (this.deltaTrend()) {
      case 'up':   return 'text-success-fg';
      case 'down': return 'text-danger-fg';
      default:     return 'text-muted-foreground';
    }
  });

  protected readonly deltaIcon = computed<IconName>(() => {
    switch (this.deltaTrend()) {
      case 'up':   return 'arrow-up';
      case 'down': return 'arrow-down';
      default:     return 'arrow-up-right';
    }
  });
}
