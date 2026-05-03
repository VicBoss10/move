import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * HTTP interceptor for JWT authentication token injection and refresh.
 * Automatically attaches the access token to all outgoing API requests.
 * Handles 401 responses by attempting a single token refresh and request retry.
 * Skips Keycloak endpoints to prevent infinite refresh loops.
 *
 * Behavior:
 * - Injects Bearer token from AuthService into Authorization header
 * - On 401 response, attempts to refresh the token and retry the request
 * - On refresh failure, triggers logout and propagates the original error
 * - Skips token injection for Keycloak /openid-connect/ endpoints
 *
 * @constant authInterceptor
 * @type {HttpInterceptorFn}
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.includes('/openid-connect/')) {
    return next(req);
  }

  return from(auth.getToken()).pipe(
    switchMap((token) => {
      const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 && token) {
            return auth.refreshAccessToken().pipe(
              switchMap((newToken) => {
                if (newToken) {
                  const retryReq = req.clone({
                    setHeaders: { Authorization: `Bearer ${newToken}` },
                  });
                  return next(retryReq);
                }
                auth.logout();
                return throwError(() => error);
              }),
            );
          }
          return throwError(() => error);
        }),
      );
    }),
  );
};
