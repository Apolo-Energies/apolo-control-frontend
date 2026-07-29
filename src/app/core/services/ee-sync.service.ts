import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobEjecucion } from '../models';

@Injectable({ providedIn: 'root' })
export class EeSyncService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/jobs/ee-sync`;

  ejecutar(): Observable<{ resultado: string }> {
    return this.http.post<{ resultado: string }>(`${this.base}/ejecutar`, {});
  }

  historial(): Observable<JobEjecucion[]> {
    return this.http.get<JobEjecucion[]>(`${this.base}/historial`);
  }
}
