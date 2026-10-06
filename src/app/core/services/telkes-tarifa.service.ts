import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TelkesTarifa, TelkesTarifaFilter, TelkesTarifaPayload } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class TelkesTarifaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/telkes/tarifas`;

  list(filter: TelkesTarifaFilter = {}): Observable<TelkesTarifa[]> {
    return this.http.get<TelkesTarifa[]>(this.baseUrl, { params: buildParams(filter) });
  }

  getById(id: string): Observable<TelkesTarifa> {
    return this.http.get<TelkesTarifa>(`${this.baseUrl}/${id}`);
  }

  create(payload: TelkesTarifaPayload): Observable<TelkesTarifa> {
    return this.http.post<TelkesTarifa>(this.baseUrl, payload);
  }

  update(id: string, payload: TelkesTarifaPayload): Observable<TelkesTarifa> {
    return this.http.put<TelkesTarifa>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
