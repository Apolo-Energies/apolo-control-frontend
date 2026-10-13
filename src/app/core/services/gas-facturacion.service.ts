import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GasConfig, GasDato, GasEmailLog, GasFactura, GasMovimiento, PageResponse } from '../models/gas-facturacion.model';

@Injectable({ providedIn: 'root' })
export class GasFacturacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/gas-facturacion`;

  getConfig(): Observable<GasConfig> {
    return this.http.get<GasConfig>(`${this.base}/config`);
  }

  updateConfig(config: Partial<GasConfig>): Observable<GasConfig> {
    return this.http.put<GasConfig>(`${this.base}/config`, config);
  }

  getDatos(desde: string, hasta: string): Observable<GasDato[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<GasDato[]>(`${this.base}/datos`, { params });
  }

  getDatosMes(year: number, month: number): Observable<GasDato[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<GasDato[]>(`${this.base}/datos/mes`, { params });
  }

  getHistorial(page = 0, size = 25): Observable<PageResponse<GasEmailLog>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<GasEmailLog>>(`${this.base}/historial`, { params });
  }

  getFacturas(desde: string, hasta: string): Observable<GasFactura[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<GasFactura[]>(`${this.base}/facturas`, { params });
  }

  getMovimientos(desde: string, hasta: string): Observable<GasMovimiento[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<GasMovimiento[]>(`${this.base}/movimientos`, { params });
  }

  enviar(desde: string, hasta: string): Observable<GasEmailLog> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.post<GasEmailLog>(`${this.base}/enviar`, null, { params });
  }
}
