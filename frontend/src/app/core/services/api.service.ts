import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Base HTTP communication service for all backend API requests.
 * Centralizes URL configuration, error handling, and common HTTP operations.
 * Manages error state and provides debugging utilities.
 *
 * @class ApiService
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService implements OnInit {
  /**
   * Backend API base URL loaded from runtime configuration or environment.
   * Injected from window.__API_BASE_URL__ by main.ts from /assets/config.json.
   * @private
   */
  private readonly apiUrl: string =
    (window as unknown as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
    (() => {
      throw new Error('__API_BASE_URL__ not configured');
    })();

  /**
   * Subject for tracking HTTP errors across the application.
   * @private
   */
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  /**
   * Observable stream of HTTP errors for consumption by components and services.
   */
  public readonly error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Logs the API service initialization with the configured backend URL.
   */
  ngOnInit() {
    console.log(`ApiService initialized - Backend: ${this.apiUrl}`);
  }

  /**
   * Performs a generic GET request to the backend API.
   *
   * @template T The type of the response data.
   * @param {string} endpoint - API endpoint path (e.g., '/vehicles').
   * @param {HttpParams | Object} [params] - Optional query parameters.
   * @returns {Observable<T>} Observable with the server response.
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
   * Performs a generic POST request to the backend API.
   *
   * @template T The type of the response data.
   * @param {string} endpoint - API endpoint path.
   * @param {unknown} body - Request body to send to the server.
   * @returns {Observable<T>} Observable with the server response.
   */
  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.apiUrl}${endpoint}`, body)
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Performs a POST request expecting plain text response.
   * Used for endpoints that return plain text strings instead of JSON.
   *
   * @param {string} endpoint - API endpoint path.
   * @param {unknown} body - Request body to send to the server.
   * @returns {Observable<string>} Observable with the plain text response.
   */
  postText(endpoint: string, body: unknown): Observable<string> {
    return this.http
      .post(`${this.apiUrl}${endpoint}`, body, { responseType: 'text' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Performs a GET request expecting plain text response.
   * Used for endpoints that return plain text strings instead of JSON.
   *
   * @param {string} endpoint - API endpoint path.
   * @param {HttpParams | Object} [params] - Optional query parameters.
   * @returns {Observable<string>} Observable with the plain text response.
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
   * Performs a PUT request expecting plain text response.
   * Used for endpoints that return plain text strings instead of JSON.
   *
   * @param {string} endpoint - API endpoint path.
   * @param {unknown} body - Request body with updated data.
   * @returns {Observable<string>} Observable with the plain text response.
   */
  putText(endpoint: string, body: unknown): Observable<string> {
    return this.http
      .put(`${this.apiUrl}${endpoint}`, body, { responseType: 'text' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Performs a generic PUT request to the backend API.
   *
   * @template T The type of the response data.
   * @param {string} endpoint - API endpoint path.
   * @param {unknown} body - Request body with data to update.
   * @returns {Observable<T>} Observable with the server response.
   */
  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(`${this.apiUrl}${endpoint}`, body)
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Performs a generic DELETE request to the backend API.
   *
   * @template T The type of the response data.
   * @param {string} endpoint - API endpoint path.
   * @returns {Observable<T>} Observable with the server response.
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(`${this.apiUrl}${endpoint}`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Performs a DELETE request expecting plain text response.
   * Used for endpoints that return plain text strings instead of JSON.
   *
   * @param {string} endpoint - API endpoint path.
   * @returns {Observable<string>} Observable with the plain text response.
   */
  deleteText(endpoint: string): Observable<string> {
    return this.http
      .delete(`${this.apiUrl}${endpoint}`, { responseType: 'text' })
      .pipe(catchError((error) => this.handleError(error)));
  }

  /**
   * Centralized HTTP error handling.
   * Normalizes various error types and emits them through the error$ observable.
   *
   * @private
   * @param {unknown} error - Error caught by HttpClient.
   * @returns {Observable<never>} Observable that emits the processed error.
   */
  private handleError(error: unknown) {
    let errorMessage = 'Unknown error';
    let errorStatus: number | undefined;
    let errorDetails: unknown;

    if (error instanceof HttpErrorResponse) {
      errorStatus = error.status;
      errorDetails = error.error;
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Error: ${error.error.message}`;
        console.error('Client error:', error.error);
      } else {
        errorMessage = `Error ${error.status}: ${error.message || 'Server error'}`;
        console.error('Server error:', error);
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Unexpected error:', error);
    } else {
      console.error('Unknown error:', error);
    }

    console.error('❌ ApiService Error:', errorMessage);
    this.errorSubject.next(errorMessage);

    const propagatedError = new Error(errorMessage) as Error & {
      status?: number;
      details?: unknown;
    };
    propagatedError.status = errorStatus;
    propagatedError.details = errorDetails;

    return throwError(() => propagatedError);
  }

  /**
   * Returns the configured API base URL for debugging purposes.
   *
   * @returns {string} The API base URL.
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Performs a GET request to an absolute URL without prepending the API base URL.
   * Useful for calling external services or microservices with different base URLs.
   *
   * @template T The type of the response data.
   * @param {string} fullUrl - Complete URL to fetch from.
   * @param {HttpParams | Object} [params] - Optional query parameters.
   * @returns {Observable<T>} Observable with the server response.
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
   * Performs a POST request to an absolute URL without prepending the API base URL.
   * Useful for calling external services or microservices with different base URLs.
   *
   * @template T The type of the response data.
   * @param {string} fullUrl - Complete URL to post to.
   * @param {unknown} body - Request body to send to the server.
   * @returns {Observable<T>} Observable with the server response.
   */
  postAbsolute<T>(fullUrl: string, body: unknown): Observable<T> {
    return this.http.post<T>(fullUrl, body).pipe(catchError((error) => this.handleError(error)));
  }
}
