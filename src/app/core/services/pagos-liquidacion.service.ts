import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  PagoLiquidacion,
  PagoLiquidacionFilter,
  PagoLiquidacionPayload,
  PagoLiquidacionTotales,
  Page,
  PageRequest,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class PagosLiquidacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pagos-liquidacion`;

  list(filter: PagoLiquidacionFilter = {}, page: PageRequest = {}): Observable<Page<PagoLiquidacion>> {
    return this.http.get<Page<PagoLiquidacion>>(this.baseUrl, {
      params: buildParams({ ...filterParams(filter), ...page }),
    });
  }

  totales(filter: PagoLiquidacionFilter = {}): Observable<PagoLiquidacionTotales> {
    return this.http.get<PagoLiquidacionTotales>(`${this.baseUrl}/totales`, {
      params: buildParams(filterParams(filter)),
    });
  }

  getById(id: string): Observable<PagoLiquidacion> {
    return this.http.get<PagoLiquidacion>(`${this.baseUrl}/${id}`);
  }

  create(payload: PagoLiquidacionPayload): Observable<PagoLiquidacion> {
    return this.http.post<PagoLiquidacion>(this.baseUrl, payload);
  }

  update(id: string, payload: PagoLiquidacionPayload): Observable<PagoLiquidacion> {
    return this.http.put<PagoLiquidacion>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  exportCsv(filter: PagoLiquidacionFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/csv`, {
      params: buildParams(filterParams(filter)),
      responseType: 'blob',
    });
  }
}

function filterParams(filter: PagoLiquidacionFilter) {
  return {
    delegacionId: filter.delegacionId,
    estado: filter.estado,
    tipo: filter.tipo,
    startDate: filter.startDate,
    endDate: filter.endDate,
    q: filter.q,
  };
}
