import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Skip Keycloak auth endpoints to prevent infinite refresh loops
  if (req.url.includes('/openid-connect/')) {
    return next(req);
  }

  return from(auth.getToken()).pipe(
    switchMap((token) => {
      const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // On 401, attempt a single token refresh and retry the original request once
          if (error.status === 401 && token) {
            return auth.refreshAccessToken().pipe(
              switchMap((newToken) => {
                if (newToken) {
                  const retryReq = req.clone({
                    setHeaders: { Authorization: `Bearer ${newToken}` },
                  });
                  return next(retryReq);
                }
                // Refresh token expired or invalid — force logout
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
