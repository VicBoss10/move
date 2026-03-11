import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly keycloakUrl = 'http://localhost:8081';
  private readonly realm = 'move';
  private readonly clientId = 'move-frontend';
  // If your Keycloak client is confidential, set the secret here or
  // provide it via a safer runtime mechanism. Leave empty for public clients.
  private readonly clientSecret: string = '';

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  private readonly _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  readonly isLoggedIn$: Observable<boolean> = this._isLoggedIn$.asObservable();

  constructor(private http: HttpClient, private router: Router) {
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
    this._isLoggedIn$.next(this.isLoggedIn());
  }

  private storeTokens(response: TokenResponse): void {
    const expiry = Date.now() + response.expires_in * 1000;
    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token;
    this.tokenExpiry = expiry;
    sessionStorage.setItem('kc_access_token', response.access_token);
    sessionStorage.setItem('kc_refresh_token', response.refresh_token);
    sessionStorage.setItem('kc_token_expiry', String(expiry));
    this._isLoggedIn$.next(true);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    sessionStorage.removeItem('kc_access_token');
    sessionStorage.removeItem('kc_refresh_token');
    sessionStorage.removeItem('kc_token_expiry');
    this._isLoggedIn$.next(false);
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

    return this.http.post<TokenResponse>(this.tokenUrl, finalBody.toString(), { headers }).pipe(
      tap(response => this.storeTokens(response)),
      map(() => undefined)
    );
  }

  logout(): void {
    const token = this.refreshToken;
    this.clearTokens();
    if (token) {
      const body = new HttpParams()
        .set('client_id', this.clientId)
        .set('refresh_token', token);
      this.http.post(this.logoutUrl, body).pipe(catchError(() => of(null))).subscribe();
    }
    this.router.navigate(['/signin']);
  }

  isLoggedIn(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  async getToken(): Promise<string | undefined> {
    if (this.isLoggedIn()) {
      return this.accessToken ?? undefined;
    }
    if (this.refreshToken) {
      return this.refreshAccessToken().toPromise().then(t => t ?? undefined);
    }
    return undefined;
  }

  private refreshAccessToken(): Observable<string | null> {
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

    return this.http.post<TokenResponse>(this.tokenUrl, finalBody.toString(), { headers }).pipe(
      tap(response => this.storeTokens(response)),
      map(response => response.access_token),
      catchError(() => {
        this.clearTokens();
        return of(null);
      })
    );
  }

  getUserInfo(): { username?: string; email?: string; firstName?: string; lastName?: string; roles: string[] } {
    if (!this.accessToken) return { roles: [] };
    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      return {
        username: payload['preferred_username'],
        email: payload['email'],
        firstName: payload['given_name'],
        lastName: payload['family_name'],
        roles: payload['realm_access']?.['roles'] ?? [],
      };
    } catch {
      return { roles: [] };
    }
  }

  hasRole(role: string): boolean {
    return this.getUserInfo().roles.includes(role);
  }
}
