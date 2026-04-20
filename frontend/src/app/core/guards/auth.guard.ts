import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
