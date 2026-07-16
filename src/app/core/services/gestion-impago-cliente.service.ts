import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GestionImpagoCliente,
  GestionImpagoClienteFilter,
  GestionImpagoClientePayload,
  Page,
  PageRequest,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class GestionImpagoClienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/gestion-impagos/clientes`;

  list(filter: GestionImpagoClienteFilter = {}, page: PageRequest = {}): Observable<Page<GestionImpagoCliente>> {
    return this.http.get<Page<GestionImpagoCliente>>(this.baseUrl, {
      params: buildParams({ q: filter.q, ...page }),
    });
  }

  getById(id: string): Observable<GestionImpagoCliente> {
    return this.http.get<GestionImpagoCliente>(`${this.baseUrl}/${id}`);
  }

  create(payload: GestionImpagoClientePayload): Observable<GestionImpagoCliente> {
    return this.http.post<GestionImpagoCliente>(this.baseUrl, payload);
  }

  update(id: string, payload: GestionImpagoClientePayload): Observable<GestionImpagoCliente> {
    return this.http.put<GestionImpagoCliente>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
