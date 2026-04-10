import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Guard que valida que el usuario tenga al menos uno de los roles requeridos
 * Se usa en rutas pasando `data: { roles: ['ADMIN'] }` o `data: { roles: ['ADMIN','USER'] }`
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  // Si no está autenticado, redirigir al signin (aunque `authGuard` normalmente ya cubre esto)
  if (!auth.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }

  const roles = route?.data?.['roles'];
  if (!roles) return true; // no roles required

  const required: string[] = Array.isArray(roles) ? roles : [roles];
  const allowed = required.some(r => auth.hasRole(r));

  if (allowed) return true;

  // Denegado: mostrar toast y redirigir al dashboard
  try {
    toast.error('No tienes permiso para acceder a esta ruta', 'Acceso denegado');
  } catch {
    // ignore toast failures
  }
  router.navigate(['/dashboard']);
  return false;
};
