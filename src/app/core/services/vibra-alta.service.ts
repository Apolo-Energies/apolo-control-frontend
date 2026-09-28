import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CambiarEstadoVibraAltaPayload,
  GestionadoPayload,
  LiquidadoPayload,
  Page,
  PageRequest,
  RotacionElegiblesResponse,
  RotacionSemestralPayload,
  RotacionSemestralResponse,
  VibraAlta,
  VibraAltaFilter,
  VibraAltaPayload,
  VibraImportResult,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class VibraAltaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/altas`;

  list(filter: VibraAltaFilter = {}, page: PageRequest = {}): Observable<Page<VibraAlta>> {
    return this.http.get<Page<VibraAlta>>(this.baseUrl, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  tramitacion(): Observable<VibraAlta[]> {
    return this.http.get<VibraAlta[]>(`${this.baseUrl}/tramitacion`);
  }

  getById(id: string): Observable<VibraAlta> {
    return this.http.get<VibraAlta>(`${this.baseUrl}/${id}`);
  }

  create(payload: VibraAltaPayload): Observable<VibraAlta> {
    return this.http.post<VibraAlta>(this.baseUrl, payload);
  }

  update(id: string, payload: VibraAltaPayload): Observable<VibraAlta> {
    return this.http.put<VibraAlta>(`${this.baseUrl}/${id}`, payload);
  }

  cambiarEstado(id: string, payload: CambiarEstadoVibraAltaPayload): Observable<VibraAlta> {
    return this.http.patch<VibraAlta>(`${this.baseUrl}/${id}/estado`, payload);
  }

  marcarGestionado(id: string, payload: GestionadoPayload): Observable<VibraAlta> {
    return this.http.patch<VibraAlta>(`${this.baseUrl}/${id}/gestionado`, payload);
  }

  marcarLiquidado(id: string, payload: LiquidadoPayload): Observable<VibraAlta> {
    return this.http.patch<VibraAlta>(`${this.baseUrl}/${id}/liquidado`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  exportExcel(filter: VibraAltaFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, {
      params: buildParams(filter),
      responseType: 'blob',
    });
  }

  importExcel(file: File, dryRun = false): Observable<VibraImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<VibraImportResult>(`${this.baseUrl}/import-excel`, form, {
      params: buildParams({ dryRun }),
    });
  }

  rotacionElegibles(): Observable<RotacionElegiblesResponse> {
    return this.http.get<RotacionElegiblesResponse>(`${this.baseUrl}/rotacion-semestral/elegibles`);
  }

  rotacionSemestral(payload: RotacionSemestralPayload, dryRun = false):
    Observable<RotacionSemestralResponse> {
    return this.http.post<RotacionSemestralResponse>(
      `${this.baseUrl}/rotacion-semestral`,
      payload,
      { params: buildParams({ dryRun }) },
    );
  }
}
