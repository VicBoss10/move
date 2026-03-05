import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Servicio base para todas las comunicaciones HTTP con el backend
 * Centraliza la configuración de URL, manejo de errores y operaciones comunes
 * 
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  /**
   * URL base del backend (desde variable de entorno o configuración)
   * En desarrollo: http://localhost:8080
   * En producción: https://api.moveiot.online
   */
  private readonly apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  /**
   * Constructor privado para validar que la URL está disponible
   */
  ngOnInit() {
    console.log(`🔌 ApiService inicializado - Backend: ${this.apiUrl}`);
  }

  /**
   * GET genérico
   * @param endpoint - Ruta del endpoint (ej: '/vehicles')
   * @param params - Parámetros de query opcionales
   * @returns Observable con la respuesta del servidor
   */
  get<T>(endpoint: string, params?: HttpParams | { [key: string]: string | string[] }): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${endpoint}`, { params }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * POST genérico
   * @param endpoint - Ruta del endpoint
   * @param body - Datos a enviar
   * @returns Observable con la respuesta del servidor
   */
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, body).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * POST que espera respuesta en texto plano (no JSON)
   * Útil para endpoints del backend que retornan strings como "Created successfully..."
   * @param endpoint - Ruta del endpoint
   * @param body - Datos a enviar
   * @returns Observable<string> con la respuesta del servidor
   */
  postText(endpoint: string, body: any): Observable<string> {
    return this.http.post(`${this.apiUrl}${endpoint}`, body, { responseType: 'text' }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * PUT genérico
   * @param endpoint - Ruta del endpoint
   * @param body - Datos a actualizar
   * @returns Observable con la respuesta del servidor
   */
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${endpoint}`, body).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * DELETE genérico
   * @param endpoint - Ruta del endpoint
   * @returns Observable con la respuesta del servidor
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Manejo centralizado de errores HTTP
   * @param error - Error capturado por HttpClient
   * @returns Observable que emite el error procesado
   */
  private handleError(error: any) {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente o de red
      errorMessage = `Error: ${error.error.message}`;
      console.error('Error en el cliente:', error.error);
    } else {
      // Error del servidor
      errorMessage = `Error ${error.status}: ${error.message || 'Error del servidor'}`;
      console.error('Error del servidor:', error);
    }

    console.error('❌ ApiService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Obtiene la URL base del API (útil para debuggin)
   */
  getApiUrl(): string {
    return this.apiUrl;
  }
}
