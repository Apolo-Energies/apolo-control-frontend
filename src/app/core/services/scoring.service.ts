import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerScoring } from '../models';

export interface ScoringPayload {
  clienteId: string;
  puntuacion: number;
  comentarios?: string | null;
  vigilancia: boolean;
  fechaActivacionVigilancia?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ScoringService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scoring-clientes`;

  create(payload: ScoringPayload): Observable<CustomerScoring> {
    return this.http.post<CustomerScoring>(this.baseUrl, payload);
  }

  update(id: string, payload: ScoringPayload): Observable<CustomerScoring> {
    return this.http.patch<CustomerScoring>(`${this.baseUrl}/${id}`, payload);
  }
}
