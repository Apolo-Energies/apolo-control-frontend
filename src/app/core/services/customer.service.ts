import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Customer, CustomerFilter, CustomerPayload, Page, PageRequest } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientes`;

  list(filter: CustomerFilter = {}, page: PageRequest = {}): Observable<Page<Customer>> {
    return this.http.get<Page<Customer>>(this.baseUrl, {
      params: buildParams({
        q: filter.q,
        soloActivos: filter.activeOnly,
        ...page,
      }),
    });
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  getByNif(nif: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/nif/${nif}`);
  }

  create(body: CustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listByBranch(branchId: string, page: PageRequest = {}): Observable<Page<Customer>> {
    return this.http.get<Page<Customer>>(`${this.baseUrl}/por-delegacion/${branchId}`, {
      params: buildParams(page),
    });
  }

  listByGroup(groupId: string, page: PageRequest = {}): Observable<Page<Customer>> {
    return this.http.get<Page<Customer>>(`${this.baseUrl}/por-grupo/${groupId}`, {
      params: buildParams(page),
    });
  }
}
