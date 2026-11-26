import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, PageRequest, VibraBuzonCorreo, VibraBuzonEstado } from '../models';
import { buildParams } from '../http/http-params.util';

/** Buzón de facturas de compra de Vibra. */
@Injectable({ providedIn: 'root' })
export class VibraBuzonService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/buzon`;

  estado(): Observable<VibraBuzonEstado> {
    return this.http.get<VibraBuzonEstado>(`${this.baseUrl}/estado`);
  }

  /** pendientes = solo no procesados y con error. */
  list(pendientes: boolean, page: PageRequest = {}): Observable<Page<VibraBuzonCorreo>> {
    return this.http.get<Page<VibraBuzonCorreo>>(this.baseUrl, { params: buildParams({ pendientes, ...page }) });
  }

  /** Arranca la lectura en segundo plano (202); el resultado sale en estado(). */
  leer(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/leer`, {});
  }

  /** Arranca la sincronización con el portal de Endesa en segundo plano (202); el resultado sale en estado(). */
  traerEndesa(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/endesa/sincronizar`, {});
  }

  reintentar(id: string): Observable<VibraBuzonCorreo> {
    return this.http.post<VibraBuzonCorreo>(`${this.baseUrl}/${id}/reintentar`, {});
  }

  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
