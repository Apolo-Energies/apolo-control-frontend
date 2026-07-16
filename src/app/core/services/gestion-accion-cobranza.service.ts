import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GestionAccionCobranza, GestionAccionCobranzaPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class GestionAccionCobranzaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = (impagoId: string) =>
    `${environment.apiUrl}/gestion-impagos/${impagoId}/acciones`;

  list(impagoId: string): Observable<GestionAccionCobranza[]> {
    return this.http.get<GestionAccionCobranza[]>(this.baseUrl(impagoId));
  }

  create(impagoId: string, payload: GestionAccionCobranzaPayload): Observable<GestionAccionCobranza> {
    return this.http.post<GestionAccionCobranza>(this.baseUrl(impagoId), payload);
  }
}
