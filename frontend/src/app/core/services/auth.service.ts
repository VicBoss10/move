import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthToken } from '../models/api.models';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, map, catchError, finalize, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';

// Use shared `AuthToken` model for token responses

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Prefer runtime-injected value from /assets/config.json (set by main.ts before bootstrap)
  private readonly keycloakUrl: string =
    (window as unknown as { __AUTH_BASE_URL__?: string }).__AUTH_BASE_URL__ ??
    'http://localhost:8081';
  private readonly realm = 'move';
  private readonly clientId = 'move-frontend';
  // If your Keycloak client is confidential, set the secret here or
  // provide it via a safer runtime mechanism. Leave empty for public clients.
  private readonly clientSecret: string = '';

  /** Seconds before expiry to proactively refresh the access token in the background. */
  private readonly REFRESH_THRESHOLD_SECONDS = 60;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  /** Single-flight: shared observable so concurrent callers share one HTTP refresh request. */
  private refresh$: Observable<string | null> | null = null;

  /** Timer ID for the proactive silent background refresh. */
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  private readonly _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  readonly isLoggedIn$: Observable<boolean> = this._isLoggedIn$.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadFromSession();
  }

  private get tokenUrl(): string {
    return `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
  }

  private get logoutUrl(): string {
    return `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;
  }

  private loadFromSession(): void {
    this.accessToken = sessionStorage.getItem('kc_access_token');
    this.refreshToken = sessionStorage.getItem('kc_refresh_token');
    const expiry = sessionStorage.getItem('kc_token_expiry');
    this.tokenExpiry = expiry ? parseInt(expiry, 10) : 0;
    const loggedIn = this.isLoggedIn();
    this._isLoggedIn$.next(loggedIn);
    // Resume background refresh if we have a valid session
    if (loggedIn && this.refreshToken) {
      this.scheduleSilentRefresh();
    }
  }

  private storeTokens(response: AuthToken): void {
    const expiresIn = response.expires_in ?? 3600;
    const expiry = Date.now() + expiresIn * 1000;
    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token ?? null;
    this.tokenExpiry = expiry;
    sessionStorage.setItem('kc_access_token', response.access_token);
    if (response.refresh_token) {
      sessionStorage.setItem('kc_refresh_token', response.refresh_token);
    }
    sessionStorage.setItem('kc_token_expiry', String(expiry));
    this._isLoggedIn$.next(true);
    // Schedule next proactive refresh using the reported expires_in value
    this.scheduleSilentRefresh(expiresIn);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    this.refresh$ = null;
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    sessionStorage.removeItem('kc_access_token');
    sessionStorage.removeItem('kc_refresh_token');
    sessionStorage.removeItem('kc_token_expiry');
    this._isLoggedIn$.next(false);
  }

  /**
   * Schedules a proactive silent refresh REFRESH_THRESHOLD_SECONDS before the token expires.
   * @param expiresIn seconds until token expiry (from Keycloak response). If omitted,
   *                  calculates remaining time from the stored tokenExpiry timestamp.
   */
  private scheduleSilentRefresh(expiresIn?: number): void {
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    const msUntilExpiry =
      expiresIn !== undefined ? expiresIn * 1000 : this.tokenExpiry - Date.now();
    // Refresh REFRESH_THRESHOLD_SECONDS before expiry; minimum 1 s to avoid re-entrant calls
    const delay = Math.max(msUntilExpiry - this.REFRESH_THRESHOLD_SECONDS * 1000, 1000);
    this.refreshTimerId = setTimeout(() => {
      this.refreshTimerId = null;
      this.refreshAccessToken().subscribe();
    }, delay);
  }

  login(username: string, password: string): Observable<void> {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', this.clientId)
      .set('username', username)
      .set('password', password)
      .set('scope', 'openid');
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const finalBody = this.clientSecret ? body.set('client_secret', this.clientSecret) : body;

    return this.http.post<AuthToken>(this.tokenUrl, finalBody.toString(), { headers }).pipe(
      tap((response) => this.storeTokens(response)),
      map(() => undefined),
    );
  }

  logout(): void {
    const token = this.refreshToken;
    this.clearTokens();
    if (token) {
      const body = new HttpParams().set('client_id', this.clientId).set('refresh_token', token);
      this.http
        .post(this.logoutUrl, body)
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.router.navigate(['/signin']);
  }

  isLoggedIn(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  /**
   * Returns the current access token, refreshing proactively if within the threshold window
   * or if already expired. Multiple concurrent callers share a single refresh request.
   */
  async getToken(): Promise<string | undefined> {
    // Token is valid and not yet within the refresh threshold — return immediately
    if (this.accessToken && Date.now() < this.tokenExpiry - this.REFRESH_THRESHOLD_SECONDS * 1000) {
      return this.accessToken;
    }
    // Token is expired or inside the threshold window — refresh (single-flight)
    if (this.refreshToken) {
      const token = await this.refreshAccessToken().toPromise();
      return token ?? undefined;
    }
    return undefined;
  }

  /**
   * Performs a token refresh using the stored refresh token.
   * Implements single-flight: concurrent calls share the same in-flight HTTP request.
   * Used by the interceptor to retry 401 responses and by the background timer.
   */
  refreshAccessToken(): Observable<string | null> {
    if (this.refresh$) {
      return this.refresh$;
    }
    if (!this.refreshToken) {
      this.clearTokens();
      return of(null);
    }
    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('client_id', this.clientId)
      .set('refresh_token', this.refreshToken);
    const finalBody = this.clientSecret ? body.set('client_secret', this.clientSecret) : body;
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    this.refresh$ = this.http
      .post<AuthToken>(this.tokenUrl, finalBody.toString(), { headers })
      .pipe(
        tap((response) => this.storeTokens(response)),
        map((response) => response.access_token),
        catchError(() => {
          this.clearTokens();
          return of(null);
        }),
        // Clear the shared observable once the source completes so future calls create a fresh request
        finalize(() => {
          this.refresh$ = null;
        }),
        // Replay the result to any callers that subscribe after the HTTP response arrives
        shareReplay(1),
      );

    return this.refresh$;
  }

  getUserInfo(): {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
  } {
    if (!this.accessToken) return { roles: [] };
    try {
      // Properly decode base64url JWT payload and interpret as UTF-8
      const base64Url = this.accessToken.split('.')[1] || '';
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const raw = atob(padded);
      const bytes = Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)));
      let payload: unknown;
      const isRecord = (v: unknown): v is Record<string, unknown> =>
        typeof v === 'object' && v !== null;

      try {
        // Use TextDecoder when available to correctly decode UTF-8
        const decoder = new TextDecoder('utf-8');
        payload = JSON.parse(decoder.decode(bytes));
      } catch {
        // Fallback: percent-encoding trick
        const escaped = raw
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('');
        payload = JSON.parse(decodeURIComponent(escaped));
      }
      if (!isRecord(payload)) return { roles: [] };

      const getString = (obj: Record<string, unknown>, key: string) =>
        typeof obj[key] === 'string' ? (obj[key] as string) : undefined;

      const username = getString(payload, 'preferred_username');
      const email = getString(payload, 'email');
      const firstName = getString(payload, 'given_name');
      const lastName = getString(payload, 'family_name');

      let roles: string[] = [];
      const realmAccess = payload['realm_access'];
      if (isRecord(realmAccess)) {
        const maybeRoles = realmAccess['roles'];
        if (Array.isArray(maybeRoles)) {
          roles = maybeRoles.filter((r) => typeof r === 'string') as string[];
        }
      }

      return { username, email, firstName, lastName, roles };
    } catch {
      return { roles: [] };
    }
  }

  hasRole(role: string): boolean {
    return this.getUserInfo().roles.includes(role);
  }
}
