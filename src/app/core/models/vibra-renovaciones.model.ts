import { Page } from './page.model';
import { VibraAlta } from './vibra-alta.model';

/** Altas ACTIVO con la renovación vencida o en los próximos `diasAnticipacion` días. */
export interface VibraRenovaciones {
  vencidos: Page<VibraAlta>;
  porVencer: Page<VibraAlta>;
  diasAnticipacion: number;
}

export interface VibraRenovacionesFilter {
  q?: string;
  colaborador?: string;
  comercializadora?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  sort?: string;
}

export interface VibraRenovacionesPages {
  vPage: number;
  vSize: number;
  pvPage: number;
  pvSize: number;
}
