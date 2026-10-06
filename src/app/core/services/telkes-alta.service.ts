import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Page,
  PageRequest,
  TelkesAlta,
  TelkesAltaFilter,
  TelkesAltaPayload,
  TelkesDashboardStats,
  VibraImportResult,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class TelkesAltaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/telkes/altas`;
  private readonly dashUrl = `${environment.apiUrl}/telkes/dashboard`;
  private readonly tarifaImportUrl = `${environment.apiUrl}/telkes/tarifas/import-csv`;

  list(filter: TelkesAltaFilter = {}, page: PageRequest = {}): Observable<Page<TelkesAlta>> {
    return this.http.get<Page<TelkesAlta>>(this.baseUrl, {
      params: buildParams({ ...filter, ...page }),
    });
  }

  getById(id: string): Observable<TelkesAlta> {
    return this.http.get<TelkesAlta>(`${this.baseUrl}/${id}`);
  }

  create(payload: TelkesAltaPayload): Observable<TelkesAlta> {
    return this.http.post<TelkesAlta>(this.baseUrl, payload);
  }

  update(id: string, payload: TelkesAltaPayload): Observable<TelkesAlta> {
    return this.http.put<TelkesAlta>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  importAltasCsv(file: File, dryRun = false): Observable<VibraImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<VibraImportResult>(`${this.baseUrl}/import-csv`, form, {
      params: buildParams({ dryRun }),
    });
  }

  importTarifasCsv(file: File, dryRun = false): Observable<VibraImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<VibraImportResult>(this.tarifaImportUrl, form, {
      params: buildParams({ dryRun }),
    });
  }

  dashboardStats(): Observable<TelkesDashboardStats> {
    return this.http.get<TelkesDashboardStats>(`${this.dashUrl}/stats`);
  }
}
