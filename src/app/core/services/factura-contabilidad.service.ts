import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  FacturaContabilidad,
  FacturaContabilidadFilter,
  FacturaContabilidadPayload,
  FacturaContabilidadResponse,
  PageRequest,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class FacturaContabilidadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/facturas-contabilidad`;

  list(
    filter: FacturaContabilidadFilter = {},
    page: PageRequest = {},
  ): Observable<FacturaContabilidadResponse> {
    return this.http.get<FacturaContabilidadResponse>(this.baseUrl, {
      params: buildParams({
        delegacionId: filter.delegacionId,
        estado: filter.estado,
        startDate: filter.startDate,
        endDate: filter.endDate,
        q: filter.q,
        ...page,
      }),
    });
  }

  create(payload: FacturaContabilidadPayload): Observable<FacturaContabilidad> {
    return this.http.post<FacturaContabilidad>(this.baseUrl, payload);
  }

  update(id: string, payload: FacturaContabilidadPayload): Observable<FacturaContabilidad> {
    return this.http.put<FacturaContabilidad>(`${this.baseUrl}/${id}`, payload);
  }
}
