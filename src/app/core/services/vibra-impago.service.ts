import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CambiarEstadoVibraImpagoPayload,
  Page,
  PageRequest,
  VibraDevolucionAplicarPayload,
  VibraDevolucionLeida,
  VibraDevolucionLote,
  VibraImpago,
  VibraImpagoAviso,
  VibraImpagoFilter,
  VibraImpagoGestion,
  VibraImpagoGestionPayload,
  VibraImpagoPayload,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class VibraImpagoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/impagos`;

  list(filter: VibraImpagoFilter = {}, page: PageRequest = {}): Observable<Page<VibraImpago>> {
    return this.http.get<Page<VibraImpago>>(this.baseUrl, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  getById(id: string): Observable<VibraImpago> {
    return this.http.get<VibraImpago>(`${this.baseUrl}/${id}`);
  }

  clientes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/clientes`);
  }

  create(payload: VibraImpagoPayload): Observable<VibraImpago> {
    return this.http.post<VibraImpago>(this.baseUrl, payload);
  }

  update(id: string, payload: VibraImpagoPayload): Observable<VibraImpago> {
    return this.http.put<VibraImpago>(`${this.baseUrl}/${id}`, payload);
  }

  cambiarEstado(id: string, payload: CambiarEstadoVibraImpagoPayload): Observable<VibraImpago> {
    return this.http.patch<VibraImpago>(`${this.baseUrl}/${id}/estado`, payload);
  }

  gestiones(id: string): Observable<VibraImpagoGestion[]> {
    return this.http.get<VibraImpagoGestion[]>(`${this.baseUrl}/${id}/gestiones`);
  }

  addGestion(id: string, payload: VibraImpagoGestionPayload): Observable<VibraImpagoGestion> {
    return this.http.post<VibraImpagoGestion>(`${this.baseUrl}/${id}/gestiones`, payload);
  }

  /** Aviso por correo al cliente; sin email no falla (enviado=false con el motivo). */
  avisar(id: string): Observable<VibraImpagoAviso> {
    return this.http.post<VibraImpagoAviso>(`${this.baseUrl}/${id}/avisar`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  exportExcel(filter: VibraImpagoFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, {
      params: buildParams(filter),
      responseType: 'blob',
    });
  }

  // ── Devoluciones del banco ─────────────────────────────────────────────────

  /** Vista previa del PDF del banco (no marca nada). */
  leerDevoluciones(pdf: File): Observable<VibraDevolucionLeida> {
    const fd = new FormData();
    fd.append('pdf', pdf);
    return this.http.post<VibraDevolucionLeida>(`${this.baseUrl}/devoluciones/leer`, fd);
  }

  aplicarDevoluciones(payload: VibraDevolucionAplicarPayload): Observable<VibraDevolucionLote> {
    return this.http.post<VibraDevolucionLote>(`${this.baseUrl}/devoluciones/aplicar`, payload);
  }

  devoluciones(): Observable<VibraDevolucionLote[]> {
    return this.http.get<VibraDevolucionLote[]>(`${this.baseUrl}/devoluciones`);
  }

  devolucion(id: string): Observable<VibraDevolucionLote> {
    return this.http.get<VibraDevolucionLote>(`${this.baseUrl}/devoluciones/${id}`);
  }
}
