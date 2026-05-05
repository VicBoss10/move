/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { roleGuard } from './role.guard';

/**
 * Test suite for roleGuard.
 *
 * Covers:
 * - Route activation for users with required roles
 * - Route denial for users without required roles
 * - Redirection to signin when user is not authenticated
 * - Redirection to dashboard when user lacks permissions
 * - Role validation with single and multiple required roles
 * - Route data access for roles configuration
 * - Error toast notification on access denial
 * - Graceful handling when no roles are specified
 */
describe('roleGuard', () => {
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['getToken', 'hasRole']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    toastServiceMock = jasmine.createSpyObj('ToastService', ['error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  });

  it('should allow access when user has required role', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    authServiceMock.hasRole.and.returnValue(true);

    const route = {
      data: { roles: ['ROLE_ADMIN'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to dashboard when user lacks role', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    authServiceMock.hasRole.and.returnValue(false);

    const route = {
      data: { roles: ['ROLE_ADMIN'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error toast when denying access', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    authServiceMock.hasRole.and.returnValue(false);

    const route = {
      data: { roles: ['ROLE_ADMIN'] },
    } as unknown as ActivatedRouteSnapshot;

    await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'You do not have permission to access this route',
      'Access denied'
    );
  });

  it('should redirect to signin when user has no token', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve(undefined));

    const route = {
      data: { roles: ['ROLE_ADMIN'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/signin']);
  });

  it('should allow access when no roles are specified', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));

    const route = {
      data: {},
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(result).toBe(true);
    expect(authServiceMock.hasRole).not.toHaveBeenCalled();
  });

  it('should support single role as string', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    authServiceMock.hasRole.and.returnValue(true);

    const route = {
      data: { roles: 'ROLE_USER' },
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(result).toBe(true);
    expect(authServiceMock.hasRole).toHaveBeenCalledWith('ROLE_USER');
  });

  it('should check multiple roles with some() logic', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    authServiceMock.hasRole.and.callFake((role: string) => role === 'ROLE_USER');

    const route = {
      data: { roles: ['ROLE_ADMIN', 'ROLE_USER'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(result).toBe(true);
  });

  it('should handle toast service error gracefully', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));
    authServiceMock.hasRole.and.returnValue(false);
    toastServiceMock.error.and.throwError('Toast error');

    const route = {
      data: { roles: ['ROLE_ADMIN'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should call AuthService.getToken', async () => {
    authServiceMock.getToken.and.returnValue(Promise.resolve('valid-token'));

    const route = {
      data: {},
    } as unknown as ActivatedRouteSnapshot;

    await TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as unknown as never)
    );

    expect(authServiceMock.getToken).toHaveBeenCalled();
  });
});
