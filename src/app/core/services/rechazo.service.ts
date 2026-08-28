import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Rechazo, RechazoPayload } from '../models/rechazo.model';
import { Page } from '../models';
import { buildParams } from '../http/http-params.util';

export interface RechazoFilter {
  q?: string;
  estado?: string;
  resultado?: string;
  plataforma?: string;
}

@Injectable({ providedIn: 'root' })
export class RechazoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rechazos`;

  list(filter: RechazoFilter = {}, page = 0, size = 20): Observable<Page<Rechazo>> {
    return this.http.get<Page<Rechazo>>(this.baseUrl, {
      params: buildParams({ q: filter.q, estado: filter.estado, resultado: filter.resultado, plataforma: filter.plataforma, page, size }),
    });
  }

  getById(id: string): Observable<Rechazo> {
    return this.http.get<Rechazo>(`${this.baseUrl}/${id}`);
  }

  create(payload: RechazoPayload, files: File[] = []): Observable<Rechazo> {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    files.forEach(f => form.append('archivos', f, f.name));
    return this.http.post<Rechazo>(this.baseUrl, form);
  }

  update(id: string, payload: RechazoPayload, files: File[] = []): Observable<Rechazo> {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    files.forEach(f => form.append('archivos', f, f.name));
    return this.http.put<Rechazo>(`${this.baseUrl}/${id}`, form);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addComentario(id: string, texto: string, autor: string): Observable<Rechazo> {
    return this.http.post<Rechazo>(`${this.baseUrl}/${id}/comentarios`, null, {
      params: { texto, autor },
    });
  }

  deleteAnexo(id: string, anexoId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/anexos/${anexoId}`);
  }

  downloadAnexoUrl(id: string, anexoId: string): string {
    return `${this.baseUrl}/${id}/anexos/${anexoId}`;
  }
}
