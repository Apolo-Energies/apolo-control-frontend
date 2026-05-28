import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, PageRequest, User, UserPayload } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuarios`;

  list(page: PageRequest = {}): Observable<Page<User>> {
    return this.http.get<Page<User>>(this.baseUrl, {
      params: buildParams(page),
    });
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  create(body: UserPayload): Observable<User> {
    return this.http.post<User>(this.baseUrl, body);
  }

  update(id: string, body: UserPayload): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
