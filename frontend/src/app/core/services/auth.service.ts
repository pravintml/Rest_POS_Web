import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SignInRequest, SignInResponse, CashierSession, TerminalConfig } from '../models/auth.models';

const SESSION_KEY = 'rp_session';
const TERMINAL_KEY = 'rp_terminal';

const AUTH_BASE = `${environment.apiUrl}/api/auth`;

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

  /**
   * Returns true when the cashier has the given permission function (e.g. "DISCOUNT",
   * "DISCOUNTPER", "DISCREM", "DISC_LEVEL"). Returns false when the permission is
   * explicitly denied. Returns true if the permission entry is not found (fail-open —
   * the SP itself is the ultimate guard). Mirrors CommonService.IsAccess().
   */
  hasPermission(functName: string): boolean {
    const perms = this._session()?.permissions;
    if (!perms) return true;
    return perms[functName] ?? true;
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

  /**
   * Sign in, then immediately fetch the cashier's permission map and store both in session.
   * Mirrors legacy flow: login → permission table loaded before the POS screen opens.
   */
  signIn(request: SignInRequest) {
    return this.http.post<SignInResponse>(`${AUTH_BASE}/signin`, request).pipe(
      switchMap(response => {
        // Temporarily store the raw response so the JWT interceptor can attach the
        // token when we fetch permissions in the very next request.
        const partial: CashierSession = { ...response, permissions: {} };
        localStorage.setItem(SESSION_KEY, JSON.stringify(partial));
        this._session.set(partial);

        return this.http.get<Record<string, boolean>>(`${AUTH_BASE}/permissions`).pipe(
          tap(permissions => {
            const session: CashierSession = { ...response, permissions };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            this._session.set(session);
          })
        );
      })
    );
  }

  signOut(): void {
    localStorage.removeItem(SESSION_KEY);
    this._session.set(null);
    this.router.navigate(['/login']);
  }
}
