import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VibraImportResult } from '../models';
import { buildParams } from '../http/http-params.util';

/**
 * Importaciones ADMIN de los CSVs originales de Base44.
 * Endpoints en /api/admin/migration/execute-vibra-*
 */
@Injectable({ providedIn: 'root' })
export class VibraMigrationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/migration`;

  importarAltas(file: File, dryRun = false): Observable<VibraImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<VibraImportResult>(`${this.baseUrl}/execute-vibra-altas`, form, {
      params: buildParams({ dryRun }),
    });
  }

  importarImpagos(file: File, dryRun = false): Observable<VibraImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<VibraImportResult>(`${this.baseUrl}/execute-vibra-impagos`, form, {
      params: buildParams({ dryRun }),
    });
  }

  importarTarifas(file: File, dryRun = false): Observable<VibraImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<VibraImportResult>(`${this.baseUrl}/execute-vibra-tarifas`, form, {
      params: buildParams({ dryRun }),
    });
  }
}
