import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Asignacion {
  id: string;
  viewerId: string;
  viewerNombre: string | null;
  targetId: string;
  targetNombre: string | null;
}

@Injectable({ providedIn: 'root' })
export class AsignacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/asignaciones`;

  list(): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(this.baseUrl);
  }

  create(viewerId: string, targetId: string): Observable<Asignacion> {
    return this.http.post<Asignacion>(this.baseUrl, { viewerId, targetId });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
