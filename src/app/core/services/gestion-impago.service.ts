import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GestionEstadisticas,
  GestionImpago,
  GestionImpagoActualizarEstadoPayload,
  GestionImpagoFilter,
  GestionImpagoPayload,
  GestionImpagoRegistrarContactoPayload,
  GestionImpagoStats,
  GestionImpagoTotales,
  HistorialEstadoImpago,
  Page,
  PageRequest,
  PagoFraccionadoEntry,
  RegistrarPagoPayload,
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

  stats(filter: { startDate?: string; endDate?: string } = {}): Observable<GestionImpagoStats> {
    return this.http.get<GestionImpagoStats>(`${this.baseUrl}/stats`, {
      params: buildParams(filter),
    });
  }

  totales(filter: GestionImpagoFilter = {}): Observable<GestionImpagoTotales> {
    return this.http.get<GestionImpagoTotales>(`${this.baseUrl}/totales`, {
      params: buildParams(filter),
    });
  }

  estadisticas(): Observable<GestionEstadisticas> {
    return this.http.get<GestionEstadisticas>(`${this.baseUrl}/estadisticas`);
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

  demandasJudicial(): Observable<GestionImpago[]> {
    return this.http.get<GestionImpago[]>(`${this.baseUrl}/demandas-judicial`);
  }

  actualizarDemandaInfo(id: string, payload: {
    fechaEnvioDemanda?: string | null;
    cantidadDemandada?: number | null;
    abogadoResponsable?: string | null;
  }): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/demanda-info`, payload);
  }

  uploadDocumento(id: string, file: File): Observable<GestionImpago> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<GestionImpago>(`${this.baseUrl}/${id}/documentos`, form);
  }

  deleteDocumento(id: string, filename: string): Observable<GestionImpago> {
    return this.http.delete<GestionImpago>(`${this.baseUrl}/${id}/documentos/${filename}`);
  }

  downloadDocumento(id: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/documentos/${filename}`, { responseType: 'blob' });
  }

  agregarNota(id: string, contenido: string): Observable<GestionImpago> {
    return this.http.post<GestionImpago>(`${this.baseUrl}/${id}/notas`, { contenido });
  }

  promesas(): Observable<GestionImpago[]> {
    return this.http.get<GestionImpago[]>(`${this.baseUrl}/promesas`);
  }

  promesasList(q: string | undefined, page: PageRequest = {}): Observable<Page<GestionImpago>> {
    return this.http.get<Page<GestionImpago>>(`${this.baseUrl}/promesas/page`, {
      params: buildParams({ q, ...page }),
    });
  }

  getById(id: string): Observable<GestionImpago> {
    return this.http.get<GestionImpago>(`${this.baseUrl}/${id}`);
  }

  getHistorial(id: string): Observable<HistorialEstadoImpago[]> {
    return this.http.get<HistorialEstadoImpago[]>(`${this.baseUrl}/${id}/historial`);
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

  registrarPago(id: string, payload: RegistrarPagoPayload): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/registrar-pago`, payload);
  }

  actualizarClienteActivo(id: string, valor: 'activo' | 'baja'): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/cliente-activo`, null, { params: { valor } });
  }

  marcarNoPago(id: string): Observable<GestionImpago> {
    return this.http.patch<GestionImpago>(`${this.baseUrl}/${id}/no-pago`, {});
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

  exportCsv(filter: GestionImpagoFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/csv`, {
      params: buildParams(filter),
      responseType: 'blob',
    });
  }
}
