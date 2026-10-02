import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, PageRequest, VibraLiquidacion, VibraLiquidacionFilter } from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class VibraLiquidacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/liquidaciones`;

  list(filter: VibraLiquidacionFilter = {}, page: PageRequest = {}):
    Observable<Page<VibraLiquidacion>> {
    return this.http.get<Page<VibraLiquidacion>>(this.baseUrl, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  exportExcel(filter: VibraLiquidacionFilter = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export.xlsx`, {
      params: buildParams(filter),
      responseType: 'blob',
    });
  }
}
