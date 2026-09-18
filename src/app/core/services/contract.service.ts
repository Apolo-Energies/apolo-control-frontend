import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ChangeContractStatusPayload,
  Contract,
  ContractFilter,
  ContractPayload,
  ContractRenovaciones,
  ContratosPageData,
  ContratoAnexo,
  ContratoIncidencia,
  Page,
  PageRequest,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/contratos`;

  list(filter: ContractFilter = {}, page: PageRequest = {}): Observable<Page<Contract>> {
    return this.http.get<Page<Contract>>(this.baseUrl, {
      params: buildParams({
        estado: filter.status,
        q: filter.q,
        startDate: filter.startDate,
        endDate: filter.endDate,
        motivoRechazo: filter.motivoRechazo,
        ...page,
      }),
    });
  }

  getById(id: string): Observable<Contract> {
    return this.http.get<Contract>(`${this.baseUrl}/${id}`);
  }

  create(body: ContractPayload, files: File[] = []): Observable<Contract> {
    const form = new FormData();
    form.append('contrato', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    files.forEach(f => form.append('anexos', f, f.name));
    return this.http.post<Contract>(this.baseUrl, form);
  }

  update(id: string, body: ContractPayload): Observable<Contract> {
    return this.http.put<Contract>(`${this.baseUrl}/${id}`, body);
  }

  changeStatus(id: string, body: ChangeContractStatusPayload): Observable<Contract> {
    return this.http.patch<Contract>(`${this.baseUrl}/${id}/estado`, body);
  }

  getByExternalId(externalId: string): Observable<Contract> {
    return this.http.get<Contract>(`${this.baseUrl}/externo/${externalId}`);
  }

  listByCustomer(customerId: string, page: PageRequest = {}): Observable<Page<Contract>> {
    return this.http.get<Page<Contract>>(`${this.baseUrl}/por-cliente/${customerId}`, {
      params: buildParams(page),
    });
  }

  getRenovaciones(params: {
    vPage: number; vSize: number;
    pvPage: number; pvSize: number;
    rPage: number; rSize: number;
    q?: string; fechaDesde?: string; fechaHasta?: string;
  } = { vPage: 0, vSize: 10, pvPage: 0, pvSize: 10, rPage: 0, rSize: 10 }): Observable<ContractRenovaciones> {
    const p: Record<string, string> = {
      vPage: params.vPage.toString(), vSize: params.vSize.toString(),
      pvPage: params.pvPage.toString(), pvSize: params.pvSize.toString(),
      rPage: params.rPage.toString(), rSize: params.rSize.toString(),
    };
    if (params.q?.trim()) p['q'] = params.q.trim();
    if (params.fechaDesde) p['fechaDesde'] = params.fechaDesde;
    if (params.fechaHasta) p['fechaHasta'] = params.fechaHasta;
    return this.http.get<ContractRenovaciones>(`${this.baseUrl}/renovaciones`, { params: p });
  }

  renovar(id: string): Observable<Contract> {
    return this.http.post<Contract>(`${this.baseUrl}/${id}/renovar`, {});
  }

  toggleValidado(id: string): Observable<Contract> {
    return this.http.patch<Contract>(`${this.baseUrl}/${id}/validado`, {});
  }

  init(filter: ContractFilter = {}, page: PageRequest = {}): Observable<ContratosPageData> {
    return this.http.get<ContratosPageData>(`${this.baseUrl}/init`, {
      params: buildParams({
        estado: filter.status,
        q: filter.q,
        startDate: filter.startDate,
        endDate: filter.endDate,
        motivoRechazo: filter.motivoRechazo,
        ...page,
      }),
    });
  }

  getIncidencias(): Observable<ContratoIncidencia[]> {
    return this.http.get<ContratoIncidencia[]>(`${this.baseUrl}/incidencias`);
  }

  getAnexos(contratoId: string): Observable<ContratoAnexo[]> {
    return this.http.get<ContratoAnexo[]>(`${this.baseUrl}/${contratoId}/anexos`);
  }

  uploadAnexo(contratoId: string, file: File, descripcion?: string): Observable<ContratoAnexo> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (descripcion) form.append('descripcion', descripcion);
    return this.http.post<ContratoAnexo>(`${this.baseUrl}/${contratoId}/anexos`, form);
  }

  deleteAnexo(contratoId: string, anexoId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${contratoId}/anexos/${anexoId}`);
  }

  downloadAnexo(contratoId: string, anexoId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${contratoId}/anexos/${anexoId}/descargar`, { responseType: 'blob' });
  }

  verificarCampoCliente(clienteId: string, campo: string): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/clientes/${clienteId}/verificar-campo`,
      null,
      { params: { campo } },
    );
  }

  marcarCampoPendienteCliente(clienteId: string, campo: string): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/clientes/${clienteId}/marcar-pendiente`,
      null,
      { params: { campo } },
    );
  }
}
