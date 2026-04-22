import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, shareReplay, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

/**
 * Clase abstracta base para servicios de datos
 * Proporciona CRUD genérico, caché, y manejo de Observables
 * para reducir duplicación entre SensorDataService, VehicleService, etc.
 *
 * @abstract
 * @template T - Tipo de datos que maneja el servicio (ej: SensorData, VehicleDetected)
 */
export abstract class BaseDataService<T> {
  /**
   * Observable que emite cambios en los datos
   * @protected
   */
  protected dataSubject: BehaviorSubject<T[]>;

  /**
   * Observable público para subscribirse a cambios
   */
  public data$: Observable<T[]>;

  /**
   * Último error emitido por el servicio (null cuando no hay error)
   */
  protected errorSubject: BehaviorSubject<string | null>;

  /**
   * Observable público para reaccionar a errores del servicio
   */
  public error$: Observable<string | null>;

  /**
   * Caché local de datos
   * @protected
   */
  protected cacheData: T[] = [];

  /**
   * Timestamp del último fetch del servidor
   * @protected
   */
  protected lastFetch: number = 0;

  /**
   * Duración del caché en milisegundos
   * Subclases pueden cambiar este valor en constructor
   * @protected
   */
  protected cacheDuration: number = 5 * 60 * 1000; // Default: 5 minutos

  /**
   * Observable en vuelo para getAll() — evita N peticiones HTTP paralelas
   * al mismo endpoint cuando múltiples componentes se suscriben simultáneamente.
   * @private
   */
  private inFlightGetAll$: Observable<T[]> | null = null;

  /**
   * Endpoint del API (sin slash inicial)
   * @protected
   * @abstract
   */
  protected abstract endpoint: string;

  /**
   * Constructor debe ser llamado por subclases
   * @param apiService - Inyección de dependencia al servicio HTTP base
   */
  constructor(protected apiService: ApiService) {
    this.dataSubject = new BehaviorSubject<T[]>([]);
    this.data$ = this.dataSubject.asObservable();
    this.errorSubject = new BehaviorSubject<string | null>(null);
    this.error$ = this.errorSubject.asObservable();
  }

  /**
   * Obtiene todos los datos con caché e in-flight deduplication.
   * - Si el caché es válido lo devuelve sin petición HTTP.
   * - Si hay una petición ya en vuelo, reutiliza ese mismo Observable
   *   en lugar de lanzar un segundo request idéntico al backend.
   * @returns Observable<T[]>
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
  delete(id: number): Observable<any> {
    return this.apiService.delete(`/${this.endpoint}/${id}`).pipe(
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
