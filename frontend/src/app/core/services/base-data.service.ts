import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, shareReplay, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

/**
 * Abstract base class for data services providing generic CRUD operations.
 * Implements client-side caching with TTL, in-flight request deduplication, and RxJS observables.
 * Reduces code duplication across services like SensorDataService, VehicleDetectedService, etc.
 *
 * @abstract
 * @class BaseDataService
 * @template T The entity type managed by the service.
 */
export abstract class BaseDataService<T> {
  /**
   * Subject emitting changes to the data collection.
   * @protected
   */
  protected dataSubject: BehaviorSubject<T[]>;

  /**
   * Public observable stream of data changes for external subscribers.
   */
  public data$: Observable<T[]>;

  /**
   * Subject tracking the latest error from the service.
   * Null when no error has occurred.
   * @protected
   */
  protected errorSubject: BehaviorSubject<string | null>;

  /**
   * Public observable stream of service errors.
   */
  public error$: Observable<string | null>;

  /**
   * Local cache of fetched data.
   * @protected
   */
  protected cacheData: T[] = [];

  /**
   * Timestamp in milliseconds of the last successful data fetch.
   * Used to determine cache validity.
   * @protected
   */
  protected lastFetch: number = 0;

  /**
   * Cache time-to-live duration in milliseconds.
   * Subclasses can override in their constructor for custom cache durations.
   * Default: 5 minutes.
   * @protected
   */
  protected cacheDuration: number = 5 * 60 * 1000;

  /**
   * Shared in-flight observable for getAll() requests.
   * Prevents duplicate HTTP requests when multiple subscribers subscribe simultaneously.
   * @private
   */
  private inFlightGetAll$: Observable<T[]> | null = null;

  /**
   * API endpoint path (without leading slash).
   * Must be overridden by subclasses.
   * @protected
   * @abstract
   */
  protected abstract endpoint: string;

  /**
   * Initializes the service with a reference to the HTTP API layer.
   * @param apiService Base HTTP service for API calls.
   */
  constructor(protected apiService: ApiService) {
    this.dataSubject = new BehaviorSubject<T[]>([]);
    this.data$ = this.dataSubject.asObservable();
    this.errorSubject = new BehaviorSubject<string | null>(null);
    this.error$ = this.errorSubject.asObservable();
  }

  /**
   * Fetches all data with client-side caching and in-flight deduplication.
   * - Returns cached data if valid (within cacheDuration).
   * - Reuses in-flight request if one is already pending.
   * - Otherwise, makes a new HTTP request to the backend.
   *
   * @returns {Observable<T[]>} Observable emitting the data array.
   */
  getAll(): Observable<T[]> {
    const now = Date.now();

    // Caché válido: devolver sin petición HTTP
    if (this.cacheData.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return new Observable((observer) => {
        observer.next(this.cacheData);
        observer.complete();
      });
    }

    // Petición en vuelo: reutilizar para evitar duplicados
    if (this.inFlightGetAll$) {
      return this.inFlightGetAll$;
    }

    // Nueva petición HTTP
    this.inFlightGetAll$ = this.apiService.get<T[]>(`/${this.endpoint}`).pipe(
      tap((data) => {
        this.cacheData = data;
        this.lastFetch = now;
        this.dataSubject.next(this.cacheData);
        this.clearServiceError();
        this.inFlightGetAll$ = null;
      }),
      catchError((error) => {
        this.inFlightGetAll$ = null;
        this.setServiceError(error, `Error al obtener datos de ${this.endpoint}`);
        return throwError(() => error);
      }),
      shareReplay(1),
    );

    return this.inFlightGetAll$;
  }

  /**
   * Obtiene un elemento por ID
   * @param id - ID del elemento
   * @returns Observable<T>
   */
  getById(id: number): Observable<T> {
    return this.apiService.get<T>(`/${this.endpoint}/${id}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, `Error al obtener recurso ${id} en ${this.endpoint}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Crear un nuevo elemento
   * @param data - Datos del elemento
   * @returns Observable<T>
   */
  create(data: T): Observable<T> {
    return this.apiService.post<T>(`/${this.endpoint}`, data).pipe(
      tap(() => {
        this.invalidateCache();
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, `Error al crear recurso en ${this.endpoint}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Actualiza un elemento existente
   * @param data - Datos actualizados
   * @returns Observable<T>
   */
  update(data: T): Observable<T> {
    return this.apiService.put<T>(`/${this.endpoint}`, data).pipe(
      tap(() => {
        this.invalidateCache();
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, `Error al actualizar recurso en ${this.endpoint}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Elimina un elemento por ID
   * @param id - ID del elemento
   * @returns Observable
   */
  delete(id: number): Observable<void> {
    return this.apiService.delete<void>(`/${this.endpoint}/${id}`).pipe(
      tap(() => {
        this.invalidateCache();
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, `Error al eliminar recurso ${id} en ${this.endpoint}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Invalida el caché para forzar nueva petición en próximo getAll()
   * Se llama automáticamente en create/update/delete
   * @protected
   */
  protected invalidateCache(): void {
    this.cacheData = [];
    this.lastFetch = 0;
    this.inFlightGetAll$ = null;
  }

  /**
   * Obtiene caché actual (útil para métodos de estadísticas)
   * @protected
   * @returns Copia del caché
   */
  protected getCachedData(): T[] {
    return [...this.cacheData];
  }

  /**
   * Fuerza un refresh de datos desde el servidor
   * Invalida caché e inmediatamente hace petición nueva
   * @returns Observable<T[]>
   */
  refresh(): Observable<T[]> {
    this.invalidateCache();
    return this.getAll();
  }

  /**
   * Limpia el último error del servicio.
   */
  protected clearServiceError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Registra un error en el stream del servicio con un fallback amigable.
   */
  protected setServiceError(error: unknown, fallbackMessage: string): void {
    const message = this.extractErrorMessage(error, fallbackMessage);
    this.errorSubject.next(message);
  }

  /**
   * Extrae un mensaje de error seguro para UI/log.
   */
  protected extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallbackMessage;
  }
}
