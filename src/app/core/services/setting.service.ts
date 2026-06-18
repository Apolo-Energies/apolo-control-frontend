import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppSetting, AppSettingRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/settings`;

  /** Devuelve todos los settings agrupados por categoría. */
  listGrouped(): Observable<Record<string, AppSetting[]>> {
    return this.http.get<Record<string, AppSetting[]>>(this.base);
  }

  getById(id: string): Observable<AppSetting> {
    return this.http.get<AppSetting>(`${this.base}/${id}`);
  }

  create(req: AppSettingRequest): Observable<AppSetting> {
    return this.http.post<AppSetting>(this.base, req);
  }

  update(id: string, req: AppSettingRequest): Observable<AppSetting> {
    return this.http.put<AppSetting>(`${this.base}/${id}`, req);
  }

  /** Actualiza solo el valor de un setting por su clave. */
  setValue(clave: string, valor: string | null): Observable<AppSetting> {
    return this.http.patch<AppSetting>(`${this.base}/clave/${clave}`, { valor });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
