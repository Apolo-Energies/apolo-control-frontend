import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VibraColaborador, VibraComisionHistorial } from '../models';
import { buildParams } from '../http/http-params.util';

/** Equipo Vibra: colaboradores y su comisión por alta. */
@Injectable({ providedIn: 'root' })
export class VibraColaboradorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/colaboradores`;

  list(q?: string): Observable<VibraColaborador[]> {
    return this.http.get<VibraColaborador[]>(this.baseUrl, { params: buildParams({ q }) });
  }

  cambiarComision(clave: string, comisionAlta: number): Observable<VibraColaborador> {
    return this.http.put<VibraColaborador>(`${this.baseUrl}/comision`, { clave, comisionAlta });
  }

  historial(clave: string): Observable<VibraComisionHistorial[]> {
    return this.http.get<VibraComisionHistorial[]>(`${this.baseUrl}/comision/historial`, {
      params: buildParams({ clave }),
    });
  }
}
