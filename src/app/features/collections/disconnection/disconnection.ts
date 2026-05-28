import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../shared/components/placeholder-page/placeholder-page';

@Component({
  selector: 'app-disconnection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlaceholderPage],
  templateUrl: './disconnection.html',
})
export class Disconnection {}
