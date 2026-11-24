import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EstadoFacturaVibra, Page, PageRequest, ResultadoCompraVibra, VibraFactura, VibraFacturaConteos,
  VibraFacturaFilter, VibraFacturaLineaPayload, VibraFacturaListItem,
} from '../models';
import { buildParams } from '../http/http-params.util';

/** Facturas de venta de Vibra. */
@Injectable({ providedIn: 'root' })
export class VibraFacturaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/facturas`;

  list(filter: VibraFacturaFilter = {}, page: PageRequest = {}): Observable<Page<VibraFacturaListItem>> {
    return this.http.get<Page<VibraFacturaListItem>>(this.baseUrl, { params: buildParams({ ...filter, ...page }) });
  }

  conteos(filter: VibraFacturaFilter = {}): Observable<VibraFacturaConteos> {
    const { estado: _e, envio: _v, ...resto } = filter;
    return this.http.get<VibraFacturaConteos>(`${this.baseUrl}/conteos`, { params: buildParams(resto) });
  }

  exportExcel(filter: VibraFacturaFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, { params: buildParams(filter), responseType: 'blob' });
  }

  get(id: string): Observable<VibraFactura> {
    return this.http.get<VibraFactura>(`${this.baseUrl}/${id}`);
  }

  /** Un PDF de compra → borrador (o motivo del error). */
  generar(file: File): Observable<ResultadoCompraVibra[]> {
    const fd = new FormData();
    fd.append('files', file);
    return this.http.post<ResultadoCompraVibra[]>(`${this.baseUrl}/compras`, fd);
  }

  /** Sube la compra (con archivo) o vuelve a leer la guardada (sin archivo). */
  releer(id: string, file?: File): Observable<VibraFactura> {
    const fd = new FormData();
    if (file) fd.append('file', file);
    return this.http.post<VibraFactura>(`${this.baseUrl}/${id}/compra`, fd);
  }

  addLinea(id: string, payload: VibraFacturaLineaPayload): Observable<VibraFactura> {
    return this.http.post<VibraFactura>(`${this.baseUrl}/${id}/lineas`, payload);
  }

  updateLinea(id: string, lineaId: string, payload: VibraFacturaLineaPayload): Observable<VibraFactura> {
    return this.http.put<VibraFactura>(`${this.baseUrl}/${id}/lineas/${lineaId}`, payload);
  }

  deleteLinea(id: string, lineaId: string): Observable<VibraFactura> {
    return this.http.delete<VibraFactura>(`${this.baseUrl}/${id}/lineas/${lineaId}`);
  }

  emitir(id: string): Observable<VibraFactura> {
    return this.http.post<VibraFactura>(`${this.baseUrl}/${id}/emitir`, {});
  }

  cambiarEstado(id: string, estado: EstadoFacturaVibra, fecha?: string, motivo?: string): Observable<VibraFactura> {
    return this.http.post<VibraFactura>(`${this.baseUrl}/${id}/estado`, { estado, fecha, motivo });
  }

  enviar(id: string): Observable<VibraFactura> {
    return this.http.post<VibraFactura>(`${this.baseUrl}/${id}/enviar`, {});
  }

  borrar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  compraPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/compra.pdf`, { responseType: 'blob' });
  }
}
