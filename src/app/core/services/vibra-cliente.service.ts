import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ImportacionClientes, Page, PageRequest, VibraClienteFicha, VibraClienteFilter, VibraClienteListItem,
  VibraClientePayload, VibraSuministroPayload,
} from '../models';
import { buildParams } from '../http/http-params.util';

/** Clientes y puntos de suministro de Vibra. */
@Injectable({ providedIn: 'root' })
export class VibraClienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/clientes`;

  list(filter: VibraClienteFilter = {}, page: PageRequest = {}): Observable<Page<VibraClienteListItem>> {
    return this.http.get<Page<VibraClienteListItem>>(this.baseUrl, { params: buildParams({ ...filter, ...page }) });
  }

  exportExcel(filter: VibraClienteFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, { params: buildParams(filter), responseType: 'blob' });
  }

  ficha(id: string): Observable<VibraClienteFicha> {
    return this.http.get<VibraClienteFicha>(`${this.baseUrl}/${id}`);
  }

  create(payload: VibraClientePayload): Observable<VibraClienteFicha> {
    return this.http.post<VibraClienteFicha>(this.baseUrl, payload);
  }

  update(id: string, payload: VibraClientePayload): Observable<VibraClienteFicha> {
    return this.http.put<VibraClienteFicha>(`${this.baseUrl}/${id}`, payload);
  }

  createSuministro(clienteId: string, payload: VibraSuministroPayload): Observable<VibraClienteFicha> {
    return this.http.post<VibraClienteFicha>(`${this.baseUrl}/${clienteId}/suministros`, payload);
  }

  updateSuministro(id: string, payload: VibraSuministroPayload): Observable<VibraClienteFicha> {
    return this.http.put<VibraClienteFicha>(`${this.baseUrl}/suministros/${id}`, payload);
  }

  importarKilowy(): Observable<ImportacionClientes> {
    return this.http.post<ImportacionClientes>(`${this.baseUrl}/importar-kilowy`, {});
  }
}
