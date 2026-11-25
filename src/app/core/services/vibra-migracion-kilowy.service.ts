import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EmpresaMigracionKilowy, EstadoMigracionKilowy, RemesasMigracionKilowy, TrabajoMigracionKilowy,
} from '../models';

/** Migración única de Vibra desde Kilowy (solo admin). */
@Injectable({ providedIn: 'root' })
export class VibraMigracionKilowyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/migracion-kilowy`;

  estado(): Observable<EstadoMigracionKilowy> {
    return this.http.get<EstadoMigracionKilowy>(this.baseUrl);
  }

  clientes(): Observable<TrabajoMigracionKilowy> {
    return this.http.post<TrabajoMigracionKilowy>(`${this.baseUrl}/clientes`, {});
  }

  pdfs(): Observable<TrabajoMigracionKilowy> {
    return this.http.post<TrabajoMigracionKilowy>(`${this.baseUrl}/pdfs`, {});
  }

  remesas(): Observable<RemesasMigracionKilowy> {
    return this.http.post<RemesasMigracionKilowy>(`${this.baseUrl}/remesas`, {});
  }

  empresa(): Observable<EmpresaMigracionKilowy> {
    return this.http.post<EmpresaMigracionKilowy>(`${this.baseUrl}/empresa`, {});
  }

  /** Fichas de contrato (precios y servicios) de Kilowy. */
  fichas(): Observable<unknown> {
    return this.http.post<unknown>(`${environment.apiUrl}/vibra/altas/importar-kilowy-fichas`, {});
  }
}
