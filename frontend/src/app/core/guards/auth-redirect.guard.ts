import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Redirects users away from the signin page when already authenticated.
 */
export const authRedirectGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = await auth.getToken();
  if (token) {
    return router.parseUrl('/dashboard');
  }

  return true;
};
