/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authRedirectGuard } from './auth-redirect.guard';

/**
 * Test suite for authRedirectGuard.
 *
 * Covers:
 * - Route activation for unauthenticated users
 * - Redirection to dashboard when user has valid token
 * - Async token retrieval via AuthService.getToken()
 * - Router URL parsing and UrlTree return type
 * - Preventing already-logged-in users from accessing public routes
 */
describe('authRedirectGuard', () => {
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['getToken']);
    routerMock = jasmine.createSpyObj('Router', ['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow access for unauthenticated users', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve(undefined));

    const result = await TestBed.runInInjectionContext(() =>
      authRedirectGuard({} as unknown as never, {} as unknown as never)
    );

    expect(result).toBe(true);
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect to dashboard when user has valid token', async () => {
    const mockUrlTree = { toString: () => '/dashboard' } as UrlTree;
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    routerMock.parseUrl.and.returnValue(mockUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      authRedirectGuard({} as unknown as never, {} as unknown as never)
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/dashboard');
    expect(result).toBe(mockUrlTree);
  });

  it('should allow access when token is empty string', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve(''));

    const result = await TestBed.runInInjectionContext(() =>
      authRedirectGuard({} as unknown as never, {} as unknown as never)
    );

    expect(result).toBe(true);
  });

  it('should call AuthService.getToken', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve(undefined));

    await TestBed.runInInjectionContext(() =>
      authRedirectGuard({} as unknown as never, {} as unknown as never)
    );

    expect(authServiceMock.getToken).toHaveBeenCalled();
  });

  it('should return UrlTree when redirecting authenticated user', async () => {
    const mockUrlTree = { toString: () => '/dashboard' } as UrlTree;
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    routerMock.parseUrl.and.returnValue(mockUrlTree);

    const result = await TestBed.runInInjectionContext(() =>
      authRedirectGuard({} as unknown as never, {} as unknown as never)
    );

    expect(result instanceof Object).toBe(true);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });
});
