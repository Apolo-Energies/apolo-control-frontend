import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../shared/components/placeholder-page/placeholder-page';

@Component({
  selector: 'app-changes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlaceholderPage],
  templateUrl: './changes.html',
})
export class Changes {}
