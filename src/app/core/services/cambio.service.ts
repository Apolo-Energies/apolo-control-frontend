import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from '../models';
import { Cambio, CambioRequest, ResultadoCambio, TipoCambio } from '../models/cambio.model';

export interface CambioFilters {
  tipoSolicitud?: TipoCambio;
  resultado?: ResultadoCambio;
  gestionado?: boolean;
  startDate?: string;
  endDate?: string;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class CambioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cambios`;

  list(filters: CambioFilters = {}): Observable<Page<Cambio>> {
    let params = new HttpParams();
    if (filters.tipoSolicitud)    params = params.set('tipoSolicitud', filters.tipoSolicitud);
    if (filters.resultado)         params = params.set('resultado', filters.resultado);
    if (filters.gestionado != null) params = params.set('gestionado', String(filters.gestionado));
    if (filters.startDate)         params = params.set('startDate', filters.startDate);
    if (filters.endDate)           params = params.set('endDate', filters.endDate);
    if (filters.q)                 params = params.set('q', filters.q);
    if (filters.page != null)      params = params.set('page', String(filters.page));
    if (filters.size != null)      params = params.set('size', String(filters.size));
    if (filters.sort)              params = params.set('sort', filters.sort);
    return this.http.get<Page<Cambio>>(this.base, { params });
  }

  getById(id: string): Observable<Cambio> {
    return this.http.get<Cambio>(`${this.base}/${id}`);
  }

  create(req: CambioRequest): Observable<Cambio> {
    return this.http.post<Cambio>(this.base, req);
  }

  update(id: string, req: CambioRequest): Observable<Cambio> {
    return this.http.put<Cambio>(`${this.base}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
