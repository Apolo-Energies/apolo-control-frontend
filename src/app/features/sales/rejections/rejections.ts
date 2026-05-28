import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlaceholderPage } from '../../../shared/components/placeholder-page/placeholder-page';

@Component({
  selector: 'app-rejections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlaceholderPage],
  templateUrl: './rejections.html',
})
export class Rejections {}
