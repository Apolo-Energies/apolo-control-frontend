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
  } = { vPage: 0, vSize: 10, pvPage: 0, pvSize: 10, rPage: 0, rSize: 10 }): Observable<ContractRenovaciones> {
    return this.http.get<ContractRenovaciones>(`${this.baseUrl}/renovaciones`, {
      params: {
        vPage: params.vPage.toString(), vSize: params.vSize.toString(),
        pvPage: params.pvPage.toString(), pvSize: params.pvSize.toString(),
        rPage: params.rPage.toString(), rSize: params.rSize.toString(),
      },
    });
  }

  renovar(id: string): Observable<Contract> {
    return this.http.post<Contract>(`${this.baseUrl}/${id}/renovar`, {});
  }
}
