import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Icon } from '../../../shared/icons/icon';

@Component({
  selector: 'app-vibra-contrato-servicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, Icon],
  templateUrl: './vibra-contrato-servicio.html',
})
export class VibraContratoServicio {
  constructor(private readonly router: Router) {}

  protected goManual(): void {
    this.router.navigate(['/vibra/altas'], { queryParams: { new: 1 } });
  }
}
