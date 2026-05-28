import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ChangeContractStatusPayload,
  Contract,
  ContractFilter,
  ContractPayload,
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
        ...page,
      }),
    });
  }

  getById(id: string): Observable<Contract> {
    return this.http.get<Contract>(`${this.baseUrl}/${id}`);
  }

  create(body: ContractPayload): Observable<Contract> {
    return this.http.post<Contract>(this.baseUrl, body);
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
}
