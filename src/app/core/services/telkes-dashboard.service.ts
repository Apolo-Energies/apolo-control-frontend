import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TelkesDashboard } from '../models';

@Injectable({ providedIn: 'root' })
export class TelkesDashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/telkes/dashboard`;

  get(): Observable<TelkesDashboard> {
    return this.http.get<TelkesDashboard>(this.baseUrl);
  }
}
