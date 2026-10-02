import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VibraOcrResult } from '../models';

@Injectable({ providedIn: 'root' })
export class VibraOcrService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/ocr`;

  extractFactura(file: File): Observable<VibraOcrResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<VibraOcrResult>(`${this.baseUrl}/extract-factura`, form);
  }
}
