import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  templateUrl: './status-badge.html',
})
export class StatusBadge {
  readonly tone = input<StatusTone>('neutral');

  protected readonly classes = computed(() => {
    switch (this.tone()) {
      case 'success': return 'bg-success-soft text-success-fg border-success/25';
      case 'warning': return 'bg-warning-soft text-warning-fg border-warning/25';
      case 'danger':  return 'bg-danger-soft text-danger-fg border-danger/25';
      case 'info':    return 'bg-info-soft text-info-fg border-info/25';
      case 'purple':  return 'bg-purple-soft text-purple-fg border-purple/25';
      default:        return 'bg-neutral-soft text-neutral-fg border-neutral/25';
    }
  });

  protected readonly dotClass = computed(() => {
    switch (this.tone()) {
      case 'success': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'danger':  return 'bg-danger';
      case 'info':    return 'bg-info';
      case 'purple':  return 'bg-purple';
      default:        return 'bg-neutral';
    }
  });
}
