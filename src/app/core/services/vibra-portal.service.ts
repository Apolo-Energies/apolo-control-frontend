import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Page,
  PageRequest,
  PortalContrato,
  PortalContratoRequest,
  PortalLiquidacion,
  PortalPerfil,
  PortalProducto,
} from '../models';
import { buildParams } from '../http/http-params.util';

/** Portal del colaborador Vibra: solo lo suyo (el servidor filtra por el usuario autenticado). */
@Injectable({ providedIn: 'root' })
export class VibraPortalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/portal`;

  perfil(): Observable<PortalPerfil> {
    return this.http.get<PortalPerfil>(`${this.baseUrl}/me`);
  }

  contratos(filtro: { q?: string; estado?: string }, page: PageRequest = {}): Observable<Page<PortalContrato>> {
    return this.http.get<Page<PortalContrato>>(`${this.baseUrl}/contratos`, {
      params: buildParams({ ...filtro, ...page }),
    });
  }

  contrato(id: string): Observable<PortalContrato> {
    return this.http.get<PortalContrato>(`${this.baseUrl}/contratos/${id}`);
  }

  cargarContrato(req: PortalContratoRequest): Observable<PortalContrato> {
    return this.http.post<PortalContrato>(`${this.baseUrl}/contratos`, req);
  }

  productos(): Observable<PortalProducto[]> {
    return this.http.get<PortalProducto[]>(`${this.baseUrl}/productos`);
  }

  liquidaciones(): Observable<PortalLiquidacion[]> {
    return this.http.get<PortalLiquidacion[]>(`${this.baseUrl}/liquidaciones`);
  }

  autofactura(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/liquidaciones/${id}/autofactura.pdf`, { responseType: 'blob' });
  }
}
