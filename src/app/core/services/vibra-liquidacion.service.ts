import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, PageRequest, VibraLiquidacion, VibraLiquidacionFilter, VibraLiquidacionMensual } from '../models';
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

  // ── Liquidación mensual por colaborador ──

  mensual(clave: string, mes: string): Observable<VibraLiquidacionMensual> {
    return this.http.get<VibraLiquidacionMensual>(`${this.baseUrl}/mensual`, {
      params: buildParams({ clave, mes }),
    });
  }

  guardarMensual(clave: string, mes: string): Observable<VibraLiquidacionMensual> {
    return this.http.post<VibraLiquidacionMensual>(`${this.baseUrl}/mensual`, { clave, mes });
  }

  pagarMensual(id: string, fechaPago: string): Observable<VibraLiquidacionMensual> {
    return this.http.patch<VibraLiquidacionMensual>(`${this.baseUrl}/mensual/${id}/pagar`, { fechaPago });
  }

  borrarMensual(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/mensual/${id}`);
  }

  exportMensual(clave: string, mes: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/mensual/export.xlsx`, {
      params: buildParams({ clave, mes }),
      responseType: 'blob',
    });
  }
}
