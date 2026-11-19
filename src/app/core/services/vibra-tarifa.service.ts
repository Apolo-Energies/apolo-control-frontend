import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VibraTarifa, VibraTarifaFilter, VibraTarifaPayload } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class VibraTarifaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/tarifas`;

  list(filter: VibraTarifaFilter = {}): Observable<VibraTarifa[]> {
    return this.http.get<VibraTarifa[]>(this.baseUrl, {
      params: buildParams(filter),
    });
  }

  getById(id: string): Observable<VibraTarifa> {
    return this.http.get<VibraTarifa>(`${this.baseUrl}/${id}`);
  }

  create(payload: VibraTarifaPayload): Observable<VibraTarifa> {
    return this.http.post<VibraTarifa>(this.baseUrl, payload);
  }

  update(id: string, payload: VibraTarifaPayload): Observable<VibraTarifa> {
    return this.http.put<VibraTarifa>(`${this.baseUrl}/${id}`, payload);
  }

  /** Interruptor Activa/Inactiva de la lista (solo admin). */
  cambiarActiva(id: string, activa: boolean): Observable<VibraTarifa> {
    return this.http.patch<VibraTarifa>(`${this.baseUrl}/${id}/activa`, { activa });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
