import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GestionImpago,
  GestionImpagoActualizarEstadoPayload,
  GestionImpagoFilter,
  GestionImpagoPayload,
  GestionImpagoRegistrarContactoPayload,
  GestionImpagoStats,
  Page,
  PageRequest,
  PagoFraccionadoEntry,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class GestionImpagoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/gestion-impagos`;

  list(filter: GestionImpagoFilter = {}, page: PageRequest = {}): Observable<Page<GestionImpago>> {
    return this.http.get<Page<GestionImpago>>(this.baseUrl, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  stats(): Observable<GestionImpagoStats> {
    return this.http.get<GestionImpagoStats>(`${this.baseUrl}/stats`);
  }

  tareas(q?: string): Observable<GestionImpago[]> {
    return this.http.get<GestionImpago[]>(`${this.baseUrl}/tareas`, {
      params: buildParams({ q }),
    });
  }

  corteList(filter: { q?: string; estado?: string } = {}, page: PageRequest = {}): Observable<Page<GestionImpago>> {
    return this.http.get<Page<GestionImpago>>(`${this.baseUrl}/corte`, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  corteAlertas(): Observable<GestionImpago[]> {
    return this.http.get<GestionImpago[]>(`${this.baseUrl}/corte/alertas`);
  }

  ovc(): Observable<GestionImpago[]> {
    return this.http.get<GestionImpago[]>(`${this.baseUrl}/ovc`);
  }

  demanda(): Observable<GestionImpago[]> {
    return this.http.get<GestionImpago[]>(`${this.baseUrl}/demanda`);
  }

  promesas(): Observable<GestionImpago[]> {
    return this.http.get<GestionImpago[]>(`${this.baseUrl}/promesas`);
  }

  getById(id: string): Observable<GestionImpago> {
    return this.http.get<GestionImpago>(`${this.baseUrl}/${id}`);
  }

  byCliente(clienteId: string, page: PageRequest = {}): Observable<Page<GestionImpago>> {
    return this.http.get<Page<GestionImpago>>(`${this.baseUrl}/por-cliente/${clienteId}`, {
      params: buildParams(page),
    });
  }

  create(payload: GestionImpagoPayload): Observable<GestionImpago> {
    return this.http.post<GestionImpago>(this.baseUrl, payload);
  }

  update(id: string, payload: GestionImpagoPayload): Observable<GestionImpago> {
    return this.http.put<GestionImpago>(`${this.baseUrl}/${id}`, payload);
  }

  actualizarEstado(id: string, payload: GestionImpagoActualizarEstadoPayload): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/estado`, payload);
  }

  marcarOvcEnviado(id: string): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/ovc-enviado`, {});
  }

  registrarContacto(id: string, payload: GestionImpagoRegistrarContactoPayload): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/contacto`, payload);
  }

  actualizarPagosFraccionados(id: string, pagos: PagoFraccionadoEntry[]): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/pagos-fraccionados`, pagos);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
