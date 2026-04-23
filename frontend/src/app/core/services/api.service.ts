import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Servicio base para todas las comunicaciones HTTP con el backend
 * Centraliza la configuración de URL, manejo de errores y operaciones comunes
 *
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService implements OnInit {
  /**
   * URL base del backend (desde variable de entorno o configuración)
   * En desarrollo: http://localhost:8080
   * En producción: https://api.moveiot.online
   */
  // Prefer runtime-injected value (set by main.ts from /assets/config.json), fall back to localhost
  private readonly apiUrl: string =
    ((window as unknown) as { __API_BASE_URL__?: string }).__API_BASE_URL__ ??
    'http://localhost:8080';

  /** Último error HTTP detectado por el servicio. */
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  /** Stream público de error HTTP para componentes/servicios consumidores. */
  public readonly error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Constructor privado para validar que la URL está disponible
   */
  ngOnInit() {
    console.log(`ApiService inicializado - Backend: ${this.apiUrl}`);
  }

  /**
   * GET genérico
   * @param endpoint - Ruta del endpoint (ej: '/vehicles')
   * @param params - Parámetros de query opcionales
   * @returns Observable con la respuesta del servidor
   */
  get<T>(
    endpoint: string,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<T> {
    return this.http
      .get<T>(`${this.apiUrl}${endpoint}`, { params })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * POST genérico
   * @param endpoint - Ruta del endpoint
   * @param body - Datos a enviar
   * @returns Observable con la respuesta del servidor
   */
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.apiUrl}${endpoint}`, body)
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * POST que espera respuesta en texto plano (no JSON)
   * Útil para endpoints del backend que retornan strings como "Created successfully..."
   * @param endpoint - Ruta del endpoint
   * @param body - Datos a enviar
   * @returns Observable<string> con la respuesta del servidor
   */
  postText(endpoint: string, body: unknown): Observable<string> {
    return this.http
      .post(`${this.apiUrl}${endpoint}`, body, { responseType: 'text' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * GET que espera respuesta en texto plano (no JSON)
   * @param endpoint - Ruta del endpoint
   * @param params - Parámetros de query opcionales
   * @returns Observable<string> con la respuesta del servidor
   */
  getText(
    endpoint: string,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<string> {
    return this.http
      .get(`${this.apiUrl}${endpoint}`, { params, responseType: 'text' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * PUT que espera respuesta en texto plano (no JSON)
   * Útil para endpoints del backend que retornan strings como "Updated successfully..."
   */
  putText(endpoint: string, body: unknown): Observable<string> {
    return this.http
      .put(`${this.apiUrl}${endpoint}`, body, { responseType: 'text' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * PUT genérico
   * @param endpoint - Ruta del endpoint
   * @param body - Datos a actualizar
   * @returns Observable con la respuesta del servidor
   */
  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(`${this.apiUrl}${endpoint}`, body)
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * DELETE genérico
   * @param endpoint - Ruta del endpoint
   * @returns Observable con la respuesta del servidor
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(`${this.apiUrl}${endpoint}`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * DELETE que espera respuesta en texto plano (no JSON)
   * Útil para endpoints del backend que retornan strings como "Deleted successfully..."
   */
  deleteText(endpoint: string): Observable<string> {
    return this.http
      .delete(`${this.apiUrl}${endpoint}`, { responseType: 'text' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Manejo centralizado de errores HTTP
   * @param error - Error capturado por HttpClient
   * @returns Observable que emite el error procesado
   */
  private handleError(error: unknown) {
    let errorMessage = 'Error desconocido';

    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        // Error del cliente o de red
        errorMessage = `Error: ${error.error.message}`;
        console.error('Error en el cliente:', error.error);
      } else {
        // Error del servidor
        errorMessage = `Error ${error.status}: ${error.message || 'Error del servidor'}`;
        console.error('Error del servidor:', error);
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error inesperado:', error);
    } else {
      console.error('Error desconocido:', error);
    }

    console.error('❌ ApiService Error:', errorMessage);
    this.errorSubject.next(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Obtiene la URL base del API (útil para debuggin)
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * GET a una URL absoluta (no concatena `apiUrl`).
   * Útil para servicios externos o microservicios con base distinta.
   */
  getAbsolute<T>(
    fullUrl: string,
    params?: HttpParams | { [key: string]: string | string[] },
  ): Observable<T> {
    return this.http
      .get<T>(fullUrl, { params })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * POST a una URL absoluta (no concatena `apiUrl`).
   * Útil para servicios externos o microservicios con base distinta.
   */
  postAbsolute<T>(fullUrl: string, body: unknown): Observable<T> {
    return this.http.post<T>(fullUrl, body).pipe(catchError((error) => this.handleError(error)));
  }
}
