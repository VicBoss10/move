import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthToken } from '../models/api.models';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, map, catchError, finalize, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';

/**
 * Authentication service managing OAuth2/Keycloak authentication flow.
 * Handles token acquisition, refresh, storage, and session management.
 * Implements proactive silent refresh to maintain continuous authentication.
 *
 * @class AuthService
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * Keycloak authentication server URL.
   * Injected from window.__AUTH_BASE_URL__ by main.ts from /assets/config.json.
   * @private
   */
  private readonly keycloakUrl: string =
    (window as unknown as { __AUTH_BASE_URL__?: string }).__AUTH_BASE_URL__ ||
    (() => {
      throw new Error('__AUTH_BASE_URL__ not configured in config.json');
    })();
  /**
   * Keycloak realm name for this application.
   * @private
   */
  private readonly realm = 'move';
  /**
   * Keycloak public client ID for the frontend application.
   * @private
   */
  private readonly clientId = 'move-frontend';
  /**
   * Client secret for confidential clients. Empty for public clients.
   * @private
   */
  private readonly clientSecret: string = '';

  /**
   * Currently stored access token in memory.
   * @private
   */
  private accessToken: string | null = null;
  /**
   * Currently stored refresh token in memory.
   * @private
   */
  private refreshToken: string | null = null;
  /**
   * Token expiry timestamp in milliseconds.
   * @private
   */
  private tokenExpiry: number = 0;

  /**
   * Shared refresh observable for single-flight refresh requests.
   * Ensures concurrent callers share one HTTP refresh request.
   * @private
   */
  private refresh$: Observable<string | null> | null = null;

  /**
   * Timer ID for the proactive silent background refresh.
   * @private
   */
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Subject tracking authentication state.
   * @private
   */
  private readonly _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  /**
   * Observable emitting authentication state changes.
   */
  readonly isLoggedIn$: Observable<boolean> = this._isLoggedIn$.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadFromSession();
  }

  /**
   * Constructs the Keycloak token endpoint URL.
   * @private
   */
  private get tokenUrl(): string {
    return `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
  }

  /**
   * Constructs the Keycloak logout endpoint URL.
   * @private
   */
  private get logoutUrl(): string {
    return `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;
  }

  /**
   * Loads authentication tokens and state from localStorage.
   * No automatic refresh scheduled on load.
   * @private
   */
  private loadFromSession(): void {
    this.accessToken = localStorage.getItem('kc_access_token');
    this.refreshToken = localStorage.getItem('kc_refresh_token');
    const expiry = localStorage.getItem('kc_token_expiry');
    this.tokenExpiry = expiry ? parseInt(expiry, 10) : 0;
    const loggedIn = this.isLoggedIn();
    this._isLoggedIn$.next(loggedIn);
  }

  /**
   * Stores authentication tokens in memory and localStorage.
   * No automatic background refresh scheduled.
   * @private
   * @param {AuthToken} response - Token response from Keycloak.
   */
  private storeTokens(response: AuthToken): void {
    const expiresIn = response.expires_in ?? 3600;
    const expiry = Date.now() + expiresIn * 1000;
    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token ?? null;
    this.tokenExpiry = expiry;
    localStorage.setItem('kc_access_token', response.access_token);
    if (response.refresh_token) {
      localStorage.setItem('kc_refresh_token', response.refresh_token);
    }
    localStorage.setItem('kc_token_expiry', String(expiry));
    this._isLoggedIn$.next(true);
  }

  /**
   * Clears authentication tokens from memory and localStorage.
   * @private
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    this.refresh$ = null;
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    localStorage.removeItem('kc_access_token');
    localStorage.removeItem('kc_refresh_token');
    localStorage.removeItem('kc_token_expiry');
    this._isLoggedIn$.next(false);
  }


  /**
   * Authenticates a user with username and password credentials.
   * Stores the returned tokens and schedules background refresh.
   *
   * @param {string} username - User's username.
   * @param {string} password - User's password.
   * @returns {Observable<void>} Completes when authentication succeeds.
   */
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

  /**
   * Logs out the current user and clears session.
   * Notifies Keycloak of the logout and redirects to sign-in page.
   */
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

  /**
   * Checks if the user is currently authenticated with a valid access token.
   *
   * @returns {boolean} True if access token exists and has not expired.
   */
  isLoggedIn(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  /**
   * Returns the current access token.
   * If expired, attempts refresh using refresh token.
   * Multiple concurrent callers share a single refresh request.
   *
   * @returns {Promise<string | undefined>} Promise resolving to the access token or undefined.
   */
  async getToken(): Promise<string | undefined> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    if (this.refreshToken && Date.now() >= this.tokenExpiry) {
      const token = await this.refreshAccessToken().toPromise();
      return token ?? undefined;
    }
    return undefined;
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Implements single-flight pattern: concurrent calls share one HTTP request.
   * Used by auth interceptor and background refresh scheduler.
   *
   * @returns {Observable<string | null>} Observable with the new access token or null if refresh fails.
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
        finalize(() => {
          this.refresh$ = null;
        }),
        shareReplay(1),
      );

    return this.refresh$;
  }

  /**
   * Extracts user information from the stored access token JWT.
   * Decodes the JWT payload and reads user claims and roles.
   *
   * @returns {Object} Object containing username, email, firstName, lastName, and roles array.
   */
  getUserInfo(): {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
  } {
    if (!this.accessToken) return { roles: [] };
    try {
      const base64Url = this.accessToken.split('.')[1] || '';
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const raw = atob(padded);
      const bytes = Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)));
      let payload: unknown;
      const isRecord = (v: unknown): v is Record<string, unknown> =>
        typeof v === 'object' && v !== null;

      try {
        const decoder = new TextDecoder('utf-8');
        payload = JSON.parse(decoder.decode(bytes));
      } catch {
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

  /**
   * Checks if the authenticated user has a specific role.
   *
   * @param {string} role - Role name to check (e.g., 'ROLE_ADMIN').
   * @returns {boolean} True if user has the specified role.
   */
  hasRole(role: string): boolean {
    return this.getUserInfo().roles.includes(role);
  }
}
