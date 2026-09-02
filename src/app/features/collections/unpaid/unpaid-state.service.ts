import { Injectable } from '@angular/core';
import { EstadoGestionImpago } from '../../../core/models';

type RangeId = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface UnpaidListState {
  q: string;
  estadoFilter: EstadoGestionImpago | '';
  clienteActivoFilter: 'activo' | 'baja' | 'cortado' | '';
  pagadoFilter: 'pagado' | 'no_pagado' | '';
  page: number;
  size: number;
  sortField: string;
  sortDir: 'asc' | 'desc';
  range: RangeId;
  selectedWeek: string;
  selectedMonth: string;
  selectedYear: number;
  customStart: string;
  customEnd: string;
}

@Injectable({ providedIn: 'root' })
export class UnpaidStateService {
  snapshot: UnpaidListState | null = null;
}
