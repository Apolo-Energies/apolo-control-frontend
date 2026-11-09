import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VibraAlta, VibraRenovaciones, VibraRenovacionesFilter, VibraRenovacionesPages } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class VibraRenovacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/renovaciones`;

  list(filter: VibraRenovacionesFilter, pages: VibraRenovacionesPages): Observable<VibraRenovaciones> {
    return this.http.get<VibraRenovaciones>(this.baseUrl, {
      params: buildParams({ ...filter, ...pages }),
    });
  }

  exportExcel(filter: VibraRenovacionesFilter): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, {
      params: buildParams(filter),
      responseType: 'blob',
    });
  }

  actualizarComentarios(id: string, comentarios: string | null): Observable<VibraAlta> {
    return this.http.patch<VibraAlta>(`${environment.apiUrl}/vibra/altas/${id}/comentarios`, { comentarios });
  }
}
