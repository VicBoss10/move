import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that requires the user to be authenticated.
 * Checks for a valid access token and redirects to sign-in if not authenticated.
 * Supports proactive token refresh to maintain seamless authentication.
 *
 * @constant authGuard
 * @type {CanActivateFn}
 * @example
 * const routes: Routes = [
 *   { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }
 * ];
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = await auth.getToken();
  if (token) {
    return true;
  }

  router.navigate(['/signin']);
  return false;
};
