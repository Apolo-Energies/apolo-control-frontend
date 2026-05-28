import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageHeader } from '../page-header/page-header';
import { Icon, IconName } from '../../icons/icon';

export interface PlaceholderHighlight {
  label: string;
  value: string | number;
  hint?: string;
}

@Component({
  selector: 'app-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, Icon],
  templateUrl: './placeholder-page.html',
})
export class PlaceholderPage {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly icon = input<IconName>('sparkles');
  readonly highlights = input<PlaceholderHighlight[]>([]);
  readonly capabilities = input<string[]>([]);
}
