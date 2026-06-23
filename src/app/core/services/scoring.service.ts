import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerScoring, Page, PageRequest } from '../models';
import { buildParams } from '../http/http-params.util';

export interface ScoringPayload {
  clienteId: string;
  puntuacion: number;
  comentarios?: string | null;
  vigilancia: boolean;
  fechaActivacionVigilancia?: string | null;
}

export interface ScoringFilter {
  clienteId?: string;
  busqueda?: string;
  minPuntuacion?: number;
  maxPuntuacion?: number;
  fechaInicioVigilancia?: string;
  fechaFinVigilancia?: string;
  vigilanciaActiva?: boolean;
  historico?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScoringService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scoring-clientes`;

  list(filter: ScoringFilter = {}, page: PageRequest = {}): Observable<Page<CustomerScoring>> {
    return this.http.get<Page<CustomerScoring>>(this.baseUrl, {
      params: buildParams({
        historico: filter.historico ?? false,
        clienteId: filter.clienteId,
        busqueda: filter.busqueda,
        minPuntuacion: filter.minPuntuacion,
        maxPuntuacion: filter.maxPuntuacion,
        fechaInicioVigilancia: filter.fechaInicioVigilancia,
        fechaFinVigilancia: filter.fechaFinVigilancia,
        vigilanciaActiva: filter.vigilanciaActiva,
        ...page,
      }),
    });
  }

  create(payload: ScoringPayload): Observable<CustomerScoring> {
    return this.http.post<CustomerScoring>(this.baseUrl, payload);
  }

  update(id: string, payload: ScoringPayload): Observable<CustomerScoring> {
    return this.http.patch<CustomerScoring>(`${this.baseUrl}/${id}`, payload);
  }
}
