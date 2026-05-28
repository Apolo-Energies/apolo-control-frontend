import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../shared/components/placeholder-page/placeholder-page';

@Component({
  selector: 'app-cancellations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlaceholderPage],
  templateUrl: './cancellations.html',
})
export class Cancellations {}
