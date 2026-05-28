import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Contract,
  DashboardFilter,
  DashboardSummary,
  Page,
  PageRequest,
} from '../models';
import { buildParams } from '../http/http-params.util';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  summary(filter: DashboardFilter = {}): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.baseUrl, {
      params: buildParams(filter),
    });
  }

  currentMonthSales(page: PageRequest = {}): Observable<Page<Contract>> {
    return this.http.get<Page<Contract>>(`${this.baseUrl}/ventas-mes`, {
      params: buildParams(page),
    });
  }
}
