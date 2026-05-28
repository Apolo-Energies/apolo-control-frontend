import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, PageRequest, Supply, SupplyFilter, SupplyPayload } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class SupplyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/suministros`;

  list(filter: SupplyFilter = {}, page: PageRequest = {}): Observable<Page<Supply>> {
    return this.http.get<Page<Supply>>(this.baseUrl, {
      params: buildParams({
        cups: filter.cups,
        soloActivos: filter.activeOnly,
        ...page,
      }),
    });
  }

  getById(id: string): Observable<Supply> {
    return this.http.get<Supply>(`${this.baseUrl}/${id}`);
  }

  create(body: SupplyPayload): Observable<Supply> {
    return this.http.post<Supply>(this.baseUrl, body);
  }

  listByCustomer(customerId: string, page: PageRequest = {}): Observable<Page<Supply>> {
    return this.http.get<Page<Supply>>(`${this.baseUrl}/por-cliente/${customerId}`, {
      params: buildParams(page),
    });
  }
}
