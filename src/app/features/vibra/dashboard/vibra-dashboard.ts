import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-vibra-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `<div class="p-6"><h1 class="text-2xl font-bold">Vibra Dashboard (WIP)</h1></div>`,
})
export class VibraDashboard {}
