import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TelkesOcrResult } from '../models';

@Injectable({ providedIn: 'root' })
export class TelkesOcrService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/telkes/ocr`;

  extractFactura(file: File): Observable<TelkesOcrResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<TelkesOcrResult>(`${this.baseUrl}/extract-factura`, form);
  }
}
