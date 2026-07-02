import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  dryRun: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContratosServiciosImportService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contratos-servicios`;

  importar(file: File, dryRun: boolean): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportResult>(
      `${this.base}/importar?dryRun=${dryRun}`,
      form,
    );
  }

  importarVentas(file: File, dryRun: boolean): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportResult>(
      `${this.base}/ventas?dryRun=${dryRun}`,
      form,
    );
  }
}
