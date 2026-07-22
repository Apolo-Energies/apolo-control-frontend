import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  TarifaPenalizacion,
  TarifaPenalizacionPayload,
  CalculoPenalizacionRequest,
  CalculoPenalizacionResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TarifaPenalizacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tarifas-penalizacion`;

  list(soloActivas = false): Observable<TarifaPenalizacion[]> {
    return this.http.get<TarifaPenalizacion[]>(this.base, {
      params: soloActivas ? { soloActivas: 'true' } : {},
    });
  }

  create(payload: TarifaPenalizacionPayload): Observable<TarifaPenalizacion> {
    return this.http.post<TarifaPenalizacion>(this.base, payload);
  }

  update(id: string, payload: TarifaPenalizacionPayload): Observable<TarifaPenalizacion> {
    return this.http.put<TarifaPenalizacion>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  calcular(req: CalculoPenalizacionRequest): Observable<CalculoPenalizacionResponse> {
    return this.http.post<CalculoPenalizacionResponse>(`${this.base}/calcular`, req);
  }
}
