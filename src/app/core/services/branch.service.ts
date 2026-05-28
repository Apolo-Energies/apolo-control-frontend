import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Branch, BranchPayload, Page, PageRequest } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/delegaciones`;

  list(page: PageRequest = {}): Observable<Page<Branch>> {
    return this.http.get<Page<Branch>>(this.baseUrl, {
      params: buildParams(page),
    });
  }

  getById(id: string): Observable<Branch> {
    return this.http.get<Branch>(`${this.baseUrl}/${id}`);
  }

  create(body: BranchPayload): Observable<Branch> {
    return this.http.post<Branch>(this.baseUrl, body);
  }
}
