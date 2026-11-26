import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DatosFiscalesColaborador, VibraColaborador, VibraComisionHistorial } from '../models';
import { buildParams } from '../http/http-params.util';

/** Equipo Vibra: colaboradores, su comisión por alta, datos fiscales y acceso al portal. */
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

  cambiarDatosFiscales(clave: string, datos: DatosFiscalesColaborador): Observable<VibraColaborador> {
    return this.http.put<VibraColaborador>(`${this.baseUrl}/datos-fiscales`, { clave, ...datos });
  }

  darAcceso(clave: string, email: string, password: string): Observable<VibraColaborador> {
    return this.http.post<VibraColaborador>(`${this.baseUrl}/acceso`, { clave, email, password });
  }

  cambiarAcceso(clave: string, activo: boolean): Observable<VibraColaborador> {
    return this.http.put<VibraColaborador>(`${this.baseUrl}/acceso/activo`, { clave, activo });
  }
}
