import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GenerarRemesaPayload, VibraRemesa, VibraRemesaListItem, VibraRemesaPendientes,
} from '../models';

/** Remesas SEPA de Vibra. */
@Injectable({ providedIn: 'root' })
export class VibraRemesaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/remesas`;

  pendientes(): Observable<VibraRemesaPendientes> {
    return this.http.get<VibraRemesaPendientes>(`${this.baseUrl}/pendientes`);
  }

  regirables(): Observable<VibraRemesaPendientes> {
    return this.http.get<VibraRemesaPendientes>(`${this.baseUrl}/regirables`);
  }

  list(): Observable<VibraRemesaListItem[]> {
    return this.http.get<VibraRemesaListItem[]>(this.baseUrl);
  }

  get(id: string): Observable<VibraRemesa> {
    return this.http.get<VibraRemesa>(`${this.baseUrl}/${id}`);
  }

  generar(payload: GenerarRemesaPayload): Observable<VibraRemesa> {
    return this.http.post<VibraRemesa>(this.baseUrl, payload);
  }

  xml(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/xml`, { responseType: 'blob' });
  }

  anular(id: string): Observable<VibraRemesa> {
    return this.http.post<VibraRemesa>(`${this.baseUrl}/${id}/anular`, {});
  }

  cobrada(id: string): Observable<VibraRemesa> {
    return this.http.post<VibraRemesa>(`${this.baseUrl}/${id}/cobrada`, {});
  }
}
