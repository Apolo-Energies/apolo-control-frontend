import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CambiarEstadoTelkesImpagoPayload,
  Page,
  PageRequest,
  TelkesImpago,
  TelkesImpagoFilter,
  TelkesImpagoPayload,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class TelkesImpagoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/telkes/impagos`;

  list(filter: TelkesImpagoFilter = {}, page: PageRequest = {}): Observable<Page<TelkesImpago>> {
    return this.http.get<Page<TelkesImpago>>(this.baseUrl, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  getById(id: string): Observable<TelkesImpago> {
    return this.http.get<TelkesImpago>(`${this.baseUrl}/${id}`);
  }

  clientes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/clientes`);
  }

  create(payload: TelkesImpagoPayload): Observable<TelkesImpago> {
    return this.http.post<TelkesImpago>(this.baseUrl, payload);
  }

  update(id: string, payload: TelkesImpagoPayload): Observable<TelkesImpago> {
    return this.http.put<TelkesImpago>(`${this.baseUrl}/${id}`, payload);
  }

  cambiarEstado(id: string, payload: CambiarEstadoTelkesImpagoPayload): Observable<TelkesImpago> {
    return this.http.patch<TelkesImpago>(`${this.baseUrl}/${id}/estado`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
