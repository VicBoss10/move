import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Route guard that validates user roles for protected routes.
 * Checks if the authenticated user has at least one of the required roles.
 * Denies access with an error toast and redirects to dashboard if roles don't match.
 *
 * @constant roleGuard
 * @type {CanActivateFn}
 * @example
 * const routes: Routes = [
 *   {
 *     path: 'admin',
 *     component: AdminComponent,
 *     canActivate: [authGuard, roleGuard],
 *     data: { roles: ['ROLE_ADMIN'] }
 *   },
 *   {
 *     path: 'sensitive',
 *     component: SensitiveComponent,
 *     canActivate: [authGuard, roleGuard],
 *     data: { roles: ['ROLE_ADMIN', 'ROLE_USER'] }
 *   }
 * ];
 */
export const roleGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const token = await auth.getToken();
  if (!token) {
    router.navigate(['/signin']);
    return false;
  }

  const roles = route?.data?.['roles'];
  if (!roles) return true;

  const required: string[] = Array.isArray(roles) ? roles : [roles];
  const allowed = required.some((r) => auth.hasRole(r));

  if (allowed) return true;

  try {
    toast.error('You do not have permission to access this route', 'Access denied');
  } catch {}
  router.navigate(['/dashboard']);
  return false;
};
