import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../shared/components/placeholder-page/placeholder-page';

@Component({
  selector: 'app-payments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlaceholderPage],
  templateUrl: './payments.html',
})
export class Payments {}
