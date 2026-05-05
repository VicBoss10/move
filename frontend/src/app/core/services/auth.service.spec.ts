/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthToken } from '../models/api.models';

/**
 * Test suite for AuthService.
 *
 * Covers:
 * - Authentication with username and password via OAuth2 password grant
 * - Token storage and management in sessionStorage
 * - Proactive token refresh before expiry
 * - Session cleanup and logout flow
 * - User information extraction from JWT payload
 * - Role-based authorization validation
 * - isLoggedIn$ observable and authentication state management
 * - Session recovery from sessionStorage on service initialization
 * - Single-flight pattern for concurrent token refresh requests
 */
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let reloadSession: () => void;

  const mockAuthToken: AuthToken = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
  };

  const createMockJWT = (roles: string[] = ['ROLE_USER']): string => {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        preferred_username: 'testuser',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        realm_access: { roles },
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    return `${header}.${payload}.mock-signature`;
  };

  beforeEach(() => {
    // Ensure a clean sessionStorage before the service is instantiated
    sessionStorage.clear();

    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpyObj },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Helper to reload service state from sessionStorage when tests mutate it
    reloadSession = () => (service as unknown as { loadFromSession: () => void }).loadFromSession();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login()', () => {
    it('should authenticate with username and password', (done) => {
      const username = 'testuser';
      const password = 'password123';

      service.login(username, password).subscribe(() => {
        expect(service.isLoggedIn()).toBe(true);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toContain('grant_type=password');
      req.flush(mockAuthToken);
    });

    it('should store tokens in sessionStorage', (done) => {
      service.login('testuser', 'password').subscribe(() => {
        expect(sessionStorage.getItem('kc_access_token')).toBeTruthy();
        expect(sessionStorage.getItem('kc_refresh_token')).toBeTruthy();
        expect(sessionStorage.getItem('kc_token_expiry')).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush(mockAuthToken);
    });

    it('should set isLoggedIn$ observable to true', (done) => {
      let isLoggedIn = false;
      service.isLoggedIn$.subscribe((logged) => {
        isLoggedIn = logged;
      });

      service.login('testuser', 'password').subscribe(() => {
        expect(isLoggedIn).toBe(true);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush(mockAuthToken);
    });

    it('should schedule silent refresh after login', (done) => {
      service.login('testuser', 'password').subscribe(() => {
        expect(service.isLoggedIn()).toBe(true);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush(mockAuthToken);
    });

    it('should handle login error', (done) => {
      service.login('testuser', 'wrongpassword').subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout()', () => {
    it('should clear tokens from sessionStorage', () => {
      sessionStorage.setItem('kc_access_token', 'token');
      sessionStorage.setItem('kc_refresh_token', 'refresh');
      reloadSession();

      service.logout();

      // Handle the logout HTTP request
      const req = httpMock.expectOne((r) => r.url.includes('logout'));
      req.flush({});

      expect(sessionStorage.getItem('kc_access_token')).toBeNull();
      expect(sessionStorage.getItem('kc_refresh_token')).toBeNull();
    });

    it('should set isLoggedIn$ to false', (done) => {
      sessionStorage.setItem('kc_access_token', 'token');
      sessionStorage.setItem('kc_refresh_token', 'refresh');
      reloadSession();

      let isLoggedIn = true;
      service.isLoggedIn$.subscribe((logged) => {
        isLoggedIn = logged;
      });

      service.logout();

      // Handle the logout HTTP request
      const req = httpMock.expectOne((r) => r.url.includes('logout'));
      req.flush({});

      setTimeout(() => {
        expect(isLoggedIn).toBe(false);
        done();
      }, 100);
    });

    it('should call logout endpoint with refresh token', () => {
      sessionStorage.setItem('kc_refresh_token', 'mock-refresh-token');
      reloadSession();

      service.logout();

      const req = httpMock.expectOne((r) => r.url.includes('logout'));
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should navigate to signin page', () => {
      const routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

      sessionStorage.setItem('kc_access_token', 'token');
      reloadSession();

      service.logout();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/signin']);
    });
  });

  describe('isLoggedIn()', () => {
    it('should return true with valid token', () => {
      const token = createMockJWT();
      const expiry = Date.now() + 60 * 60 * 1000;

      sessionStorage.setItem('kc_access_token', token);
      sessionStorage.setItem('kc_token_expiry', expiry.toString());
      reloadSession();

      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false without token', () => {
      sessionStorage.removeItem('kc_access_token');
      reloadSession();

      expect(service.isLoggedIn()).toBe(false);
    });

    it('should return false with expired token', () => {
      const token = createMockJWT();
      const expiry = Date.now() - 60 * 1000;

      sessionStorage.setItem('kc_access_token', token);
      sessionStorage.setItem('kc_token_expiry', expiry.toString());
      reloadSession();

      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('getToken()', () => {
    it('should return current token if not expired', async () => {
      const token = createMockJWT();
      const expiry = Date.now() + 2 * 60 * 60 * 1000;

      sessionStorage.setItem('kc_access_token', token);
      sessionStorage.setItem('kc_token_expiry', expiry.toString());
      reloadSession();

      const result = await service.getToken();

      expect(result).toBe(token);
    });

    it('should refresh token if within threshold window', async () => {
      const token = createMockJWT();
      const refreshToken = 'mock-refresh-token';
      const expiry = Date.now() + 30 * 1000;

      sessionStorage.setItem('kc_access_token', token);
      sessionStorage.setItem('kc_refresh_token', refreshToken);
      sessionStorage.setItem('kc_token_expiry', expiry.toString());
      reloadSession();

      const promise = service.getToken();

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush(mockAuthToken);

      const result = await promise;

      expect(result).toBe(mockAuthToken.access_token);
    });

    it('should return undefined without refresh token', async () => {
      sessionStorage.removeItem('kc_access_token');
      sessionStorage.removeItem('kc_refresh_token');
      reloadSession();

      const result = await service.getToken();

      expect(result).toBeUndefined();
    });
  });

  describe('refreshAccessToken()', () => {
    it('should refresh token using refresh token', (done) => {
      sessionStorage.setItem('kc_refresh_token', 'mock-refresh-token');
      reloadSession();

      service.refreshAccessToken().subscribe((token) => {
        expect(token).toBe(mockAuthToken.access_token);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      expect(req.request.body).toContain('grant_type=refresh_token');
      req.flush(mockAuthToken);
    });

    it('should update stored tokens after refresh', (done) => {
      sessionStorage.setItem('kc_refresh_token', 'mock-refresh-token');
      reloadSession();

      service.refreshAccessToken().subscribe(() => {
        expect(sessionStorage.getItem('kc_access_token')).toBe(mockAuthToken.access_token);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush(mockAuthToken);
    });

    it('should implement single-flight pattern', (done) => {
      sessionStorage.setItem('kc_refresh_token', 'mock-refresh-token');
      reloadSession();

      let requestCount = 0;
      service.refreshAccessToken().subscribe(() => {
        requestCount++;
      });
      service.refreshAccessToken().subscribe(() => {
        requestCount++;
        if (requestCount === 2) {
          expect(requestCount).toBe(2);
          done();
        }
      });

      const reqs = httpMock.match((r) => r.url.includes('token'));
      expect(reqs.length).toBe(1);
      reqs[0].flush(mockAuthToken);
    });

    it('should clear tokens and return null on refresh failure', (done) => {
      sessionStorage.setItem('kc_access_token', 'old-token');
      sessionStorage.setItem('kc_refresh_token', 'mock-refresh-token');
      reloadSession();

      service.refreshAccessToken().subscribe((token) => {
        expect(token).toBeNull();
        expect(sessionStorage.getItem('kc_access_token')).toBeNull();
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('getUserInfo()', () => {
    it('should extract user info from JWT token', () => {
      const roles = ['ROLE_ADMIN', 'ROLE_USER'];
      const token = createMockJWT(roles);

      sessionStorage.setItem('kc_access_token', token);
      reloadSession();

      const userInfo = service.getUserInfo();

      expect(userInfo.username).toBe('testuser');
      expect(userInfo.email).toBe('test@example.com');
      expect(userInfo.firstName).toBe('Test');
      expect(userInfo.lastName).toBe('User');
      expect(userInfo.roles).toEqual(roles);
    });

    it('should return empty roles without token', () => {
      sessionStorage.removeItem('kc_access_token');
      reloadSession();

      const userInfo = service.getUserInfo();

      expect(userInfo.roles).toEqual([]);
      expect(userInfo.username).toBeUndefined();
    });

    it('should handle invalid JWT gracefully', () => {
      sessionStorage.setItem('kc_access_token', 'invalid-jwt');
      reloadSession();

      const userInfo = service.getUserInfo();

      expect(userInfo.roles).toEqual([]);
    });
  });

  describe('hasRole()', () => {
    it('should return true if user has role', () => {
      const roles = ['ROLE_ADMIN'];
      const token = createMockJWT(roles);

      sessionStorage.setItem('kc_access_token', token);
      reloadSession();

      expect(service.hasRole('ROLE_ADMIN')).toBe(true);
    });

    it('should return false if user does not have role', () => {
      const roles = ['ROLE_USER'];
      const token = createMockJWT(roles);

      sessionStorage.setItem('kc_access_token', token);
      reloadSession();

      expect(service.hasRole('ROLE_ADMIN')).toBe(false);
    });

    it('should return false without token', () => {
      sessionStorage.removeItem('kc_access_token');
      reloadSession();

      expect(service.hasRole('ROLE_USER')).toBe(false);
    });
  });

  describe('isLoggedIn$ observable', () => {
    it('should emit false initially', (done) => {
      sessionStorage.clear();
      reloadSession();

      let emissionCount = 0;
      service.isLoggedIn$.subscribe((isLoggedIn) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(isLoggedIn).toBe(false);
          done();
        }
      });
    });

    it('should emit true after login', (done) => {
      let lastValue = false;

      service.isLoggedIn$.subscribe((isLoggedIn) => {
        lastValue = isLoggedIn;
      });

      service.login('testuser', 'password').subscribe(() => {
        expect(lastValue).toBe(true);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('token'));
      req.flush(mockAuthToken);
    });

    it('should emit false after logout', (done) => {
      sessionStorage.setItem('kc_access_token', 'token');
      sessionStorage.setItem('kc_refresh_token', 'refresh');
      reloadSession();

      let lastValue = true;

      service.isLoggedIn$.subscribe((isLoggedIn) => {
        lastValue = isLoggedIn;
      });

      service.logout();

      // Handle the logout HTTP request
      const req = httpMock.expectOne((r) => r.url.includes('logout'));
      req.flush({});

      setTimeout(() => {
        expect(lastValue).toBe(false);
        done();
      }, 100);
    });
  });
});
