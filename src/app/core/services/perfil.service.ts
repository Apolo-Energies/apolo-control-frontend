import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PerfilResponse, PerfilUpdateRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/usuarios/me`;

  getPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(this.base);
  }

  updatePerfil(request: PerfilUpdateRequest): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(this.base, request);
  }

  uploadFirma(file: File): Observable<void> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<void>(`${this.base}/firma`, form);
  }

  getFirmaBlob(): Observable<Blob> {
    return this.http.get(`${this.base}/firma`, { responseType: 'blob' });
  }
}
