import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VibraDashboard } from '../models';

@Injectable({ providedIn: 'root' })
export class VibraDashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vibra/dashboard`;

  get(): Observable<VibraDashboard> {
    return this.http.get<VibraDashboard>(this.baseUrl);
  }
}
