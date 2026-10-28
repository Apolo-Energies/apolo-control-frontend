import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Informe de CUPS, NIF/CIF e IBAN inválidos o duplicados (solo admin). */
@Injectable({ providedIn: 'root' })
export class CalidadDatosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/calidad-datos`;

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.base}/informe/export/csv`, { responseType: 'blob' });
  }
}
