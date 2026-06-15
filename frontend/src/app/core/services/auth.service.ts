import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SignInRequest, SignInResponse, CashierSession, TerminalConfig } from '../models/auth.models';

const SESSION_KEY = 'rp_session';
const TERMINAL_KEY = 'rp_terminal';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _session = signal<CashierSession | null>(this.loadSession());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly cashierName = computed(() => this._session()?.name ?? '');
  readonly locationId = computed(() => this._session()?.locationId ?? 0);
  readonly unitNo = computed(() => this._session()?.unitNo ?? 0);

  private loadSession(): CashierSession | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this._session()?.token ?? null;
  }

  getTerminalConfig(): TerminalConfig | null {
    try {
      const stored = localStorage.getItem(TERMINAL_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  saveTerminalConfig(config: TerminalConfig): void {
    localStorage.setItem(TERMINAL_KEY, JSON.stringify(config));
  }

  signIn(request: SignInRequest) {
    return this.http.post<SignInResponse>(`${environment.apiUrl}/api/auth/signin`, request).pipe(
      tap(response => {
        const session: CashierSession = { ...response };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        this._session.set(session);
      })
    );
  }

  signOut(): void {
    localStorage.removeItem(SESSION_KEY);
    this._session.set(null);
    this.router.navigate(['/login']);
  }
}
