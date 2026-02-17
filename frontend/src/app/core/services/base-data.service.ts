import { BehaviorSubject, Observable } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
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
  }

  /**
   * Obtiene todos los datos con caché
   * Verifica caché antes de hacer petición HTTP
   * @returns Observable<T[]>
   */
  getAll(): Observable<T[]> {
    const now = Date.now();

    // Si caché es válido, devolverlo sin petición HTTP
    if (this.cacheData.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return new Observable(observer => {
        observer.next(this.cacheData);
        observer.complete();
      });
    }

    // Si no, hacer petición HTTP
    return this.apiService.get<T[]>(`/${this.endpoint}`).pipe(
      tap(data => {
        this.cacheData = data;
        this.lastFetch = now;
        this.dataSubject.next(this.cacheData);
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtiene un elemento por ID
   * @param id - ID del elemento
   * @returns Observable<T>
   */
  getById(id: number): Observable<T> {
    return this.apiService.get<T>(`/${this.endpoint}/${id}`);
  }

  /**
   * Crear un nuevo elemento
   * @param data - Datos del elemento
   * @returns Observable<T>
   */
  create(data: T): Observable<T> {
    return this.apiService.post<T>(`/${this.endpoint}`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  /**
   * Actualiza un elemento existente
   * @param data - Datos actualizados
   * @returns Observable<T>
   */
  update(data: T): Observable<T> {
    return this.apiService.put<T>(`/${this.endpoint}`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  /**
   * Elimina un elemento por ID
   * @param id - ID del elemento
   * @returns Observable
   */
  delete(id: number): Observable<any> {
    return this.apiService.delete(`/${this.endpoint}/${id}`).pipe(
      tap(() => this.invalidateCache())
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
}
