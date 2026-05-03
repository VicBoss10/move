import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that redirects authenticated users away from public routes.
 * Prevents already-logged-in users from accessing the sign-in page.
 * Redirects to the dashboard if the user has a valid authentication token.
 *
 * @constant authRedirectGuard
 * @type {CanActivateFn}
 * @example
 * const routes: Routes = [
 *   { path: 'signin', component: SignInComponent, canActivate: [authRedirectGuard] }
 * ];
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
