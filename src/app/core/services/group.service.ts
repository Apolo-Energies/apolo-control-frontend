import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Group, GroupPayload, Page, PageRequest } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/grupos`;

  list(page: PageRequest = {}): Observable<Page<Group>> {
    return this.http.get<Page<Group>>(this.baseUrl, {
      params: buildParams(page),
    });
  }

  getById(id: string): Observable<Group> {
    return this.http.get<Group>(`${this.baseUrl}/${id}`);
  }

  create(body: GroupPayload): Observable<Group> {
    return this.http.post<Group>(this.baseUrl, body);
  }
}
