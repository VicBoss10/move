/**
 * Modelos genéricos para la capa de comunicación HTTP (ApiService).
 */

/**
 * Error normalizado retornado por el backend.
 * Se construye en `ApiService.handleError` para estandarizar mensajes.
 */
export interface ApiError {
  /** Código de estado HTTP (e.g. 400, 404, 500). */
  status: number;
  /** Mensaje legible para mostrar al usuario. */
  message: string;
  /** Cuerpo crudo del error retornado por el servidor, si lo hay. */
  details?: unknown;
}

/**
 * Envoltorio genérico para respuestas paginadas del backend.
 * Usar cuando el endpoint retorne una página de resultados.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/**
 * Respuesta de token OAuth2 / Keycloak.
 * Usar en `AuthService` para tipar el intercambio de credenciales.
 */
export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}
