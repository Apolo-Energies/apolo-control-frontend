import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoSolicitud, TipoSolicitudRequest } from '../models/tipo-solicitud.model';

@Injectable({ providedIn: 'root' })
export class TipoSolicitudService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tipos-solicitud`;

  findAll(soloActivos = false): Observable<TipoSolicitud[]> {
    const params = new HttpParams().set('soloActivos', String(soloActivos));
    return this.http.get<TipoSolicitud[]>(this.base, { params });
  }

  create(req: TipoSolicitudRequest): Observable<TipoSolicitud> {
    return this.http.post<TipoSolicitud>(this.base, req);
  }

  update(id: string, req: TipoSolicitudRequest): Observable<TipoSolicitud> {
    return this.http.put<TipoSolicitud>(`${this.base}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
