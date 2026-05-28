import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../../icons/icon';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './empty-state.html',
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input<IconName>('info');
}
