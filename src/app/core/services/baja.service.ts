import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BajaPayload, Contract, DelegacionBajaStats, Page } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class BajaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/bajas`;

  listBajas(
    filter: { q?: string; startDate?: string; endDate?: string; idOferta?: string } = {},
    page: number = 0,
    size: number = 20,
  ): Observable<Page<Contract>> {
    return this.http.get<Page<Contract>>(this.baseUrl, {
      params: buildParams({ ...filter, page, size }),
    });
  }

  registrar(payload: BajaPayload): Observable<Contract> {
    return this.http.post<Contract>(this.baseUrl, payload);
  }

  topDelegaciones(
    params: { limit?: number; startDate?: string; endDate?: string } = {},
  ): Observable<DelegacionBajaStats[]> {
    return this.http.get<DelegacionBajaStats[]>(`${this.baseUrl}/top-delegaciones`, {
      params: buildParams({ limit: params.limit ?? 100, startDate: params.startDate, endDate: params.endDate }),
    });
  }
}
