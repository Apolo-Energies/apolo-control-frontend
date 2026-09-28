import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CambiarEstadoVibraImpagoPayload,
  Page,
  PageRequest,
  VibraImpago,
  VibraImpagoFilter,
  VibraImpagoPayload,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class VibraImpagoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/impagos`;

  list(filter: VibraImpagoFilter = {}, page: PageRequest = {}): Observable<Page<VibraImpago>> {
    return this.http.get<Page<VibraImpago>>(this.baseUrl, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  getById(id: string): Observable<VibraImpago> {
    return this.http.get<VibraImpago>(`${this.baseUrl}/${id}`);
  }

  create(payload: VibraImpagoPayload): Observable<VibraImpago> {
    return this.http.post<VibraImpago>(this.baseUrl, payload);
  }

  update(id: string, payload: VibraImpagoPayload): Observable<VibraImpago> {
    return this.http.put<VibraImpago>(`${this.baseUrl}/${id}`, payload);
  }

  cambiarEstado(id: string, payload: CambiarEstadoVibraImpagoPayload): Observable<VibraImpago> {
    return this.http.patch<VibraImpago>(`${this.baseUrl}/${id}/estado`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  exportExcel(filter: VibraImpagoFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, {
      params: buildParams(filter),
      responseType: 'blob',
    });
  }
}
