import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SysConfig } from '../models/config.models';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly _config = signal<SysConfig | null>(null);

  readonly config = this._config.asReadonly();

  loadSession() {
    return this.http.get<SysConfig>(`${environment.apiUrl}/api/config/session`).pipe(
      tap(config => this._config.set(config))
    );
  }

  getPrintHeader() {
    return this.http.get<SysConfig>(`${environment.apiUrl}/api/config/print-header`);
  }

  getPrintFooter() {
    return this.http.get<SysConfig>(`${environment.apiUrl}/api/config/print-footer`);
  }

  // Loads operative config from the selected billing counter (Counters table)
  loadCounterConfig(billingLocationId: number) {
    return this.http.get<SysConfig>(
      `${environment.apiUrl}/api/config/counter`, { params: { billingLocationId } }
    ).pipe(tap(config => this._config.set(config)));
  }
}
