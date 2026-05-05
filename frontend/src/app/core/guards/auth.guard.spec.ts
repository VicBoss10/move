/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

/**
 * Test suite for authGuard.
 *
 * Covers:
 * - Route activation when user has valid token
 * - Redirection to signin when user has no token
 * - Async token retrieval via AuthService.getToken()
 * - Router navigation on unauthorized access
 */
describe('authGuard', () => {
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['getToken']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow access when user has valid token', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as unknown as never, {} as unknown as never)
    );

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to signin when user has no token', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve(undefined));

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as unknown as never, {} as unknown as never)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/signin']);
  });

  it('should deny access and redirect to signin when token is empty string', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve(''));

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as unknown as never, {} as unknown as never)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/signin']);
  });

  it('should call AuthService.getToken', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));

    await TestBed.runInInjectionContext(() =>
      authGuard({} as unknown as never, {} as unknown as never)
    );

    expect(authServiceMock.getToken).toHaveBeenCalled();
  });
});
