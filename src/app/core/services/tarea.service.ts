import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoTarea, Tarea, TareaRequest, TareaStats } from '../models/tarea.model';

@Injectable({ providedIn: 'root' })
export class TareaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tareas`;

  getHoy(): Observable<TareaStats> {
    return this.http.get<TareaStats>(`${this.base}/hoy`);
  }

  findByRango(desde: string, hasta: string, email?: string): Observable<Tarea[]> {
    let params = new HttpParams().set('desde', desde).set('hasta', hasta);
    if (email) params = params.set('email', email);
    return this.http.get<Tarea[]>(this.base, { params });
  }

  create(req: TareaRequest): Observable<Tarea> {
    return this.http.post<Tarea>(this.base, req);
  }

  update(id: string, req: TareaRequest): Observable<Tarea> {
    return this.http.put<Tarea>(`${this.base}/${id}`, req);
  }

  getVencidas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.base}/vencidas`);
  }

  setEstado(id: string, estado: EstadoTarea): Observable<Tarea> {
    return this.http.patch<Tarea>(`${this.base}/${id}/estado`, null, { params: { estado } });
  }

  asignar(id: string): Observable<Tarea> {
    return this.http.patch<Tarea>(`${this.base}/${id}/asignar`, {});
  }

  toggleCompletar(id: string): Observable<Tarea> {
    return this.http.patch<Tarea>(`${this.base}/${id}/completar`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
