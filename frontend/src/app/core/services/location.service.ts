import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, map, catchError, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { Location, LocationSearchCriteria, LocationStats } from '../models/location.model';
import { VehicleDetectedService } from './vehicle-detected.service';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Servicio para gestionar Ubicaciones de monitoreo
 * Hereda funcionalidad CRUD base de BaseDataService
 * Agrega búsqueda avanzada y cálculo de estadísticas
 *
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root',
})
export class LocationService extends BaseDataService<Location> {
  /**
   * Endpoint del API para ubicaciones
   */
  protected endpoint = 'locations';

  constructor(
    apiService: ApiService,
    private vehicleService: VehicleDetectedService,
  ) {
    super(apiService);
    // Datos de ubicaciones son casi estáticos - TTL largo (1 hora)
    this.cacheDuration = 60 * 60 * 1000;
  }

  /**
   * Obtiene todas las ubicaciones filtrando la provisional (id === 0)
   * Actualiza la caché con los resultados filtrados.
   */
  override getAll(): Observable<Location[]> {
    const now = Date.now();

    if (this.cacheData.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return new Observable((observer) => {
        observer.next(this.cacheData as Location[]);
        observer.complete();
      });
    }

    return this.apiService.get<Location[]>(`/${this.endpoint}`).pipe(
      map((data) => (data || []).filter((loc) => loc.id !== 0)),
      tap((filtered) => {
        this.cacheData = filtered as any;
        this.lastFetch = now;
        this.dataSubject.next(this.cacheData);
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, `Error al obtener datos de ${this.endpoint}`);
        return throwError(() => error);
      }),
      shareReplay(1),
    );
  }

  /**
   * Crea una nueva ubicación.
   * Override porque el backend retorna texto plano en vez de JSON.
   * @param data - Datos de la ubicación
   * @returns Observable<Location> con los datos enviados
   */
  override create(data: Location): Observable<Location> {
    return this.apiService.postText(`/${this.endpoint}`, data).pipe(
      tap((response) => {
        console.log('Ubicación creada:', response);
        this.invalidateCache();
        this.clearServiceError();
      }),
      map(() => data),
      catchError((error) => {
        this.setServiceError(error, 'Error al crear ubicación');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Busca ubicaciones con criterios específicos
   * @param criteria - Criterios de búsqueda
   * @returns Observable<Location[]>
   */
  search(criteria: LocationSearchCriteria): Observable<Location[]> {
    const queryParams = new QueryParamsBuilder()
      .addIfPresent('description', criteria.description)
      .addIfPresent('keyword', criteria.keyword)
      .addIfPresent('latitude', criteria.latitude)
      .addIfPresent('longitude', criteria.longitude)
      .addIfPresent('radiusKm', criteria.radiusKm)
      .build();

    return this.apiService.get<Location[]>(`/${this.endpoint}/search`, queryParams).pipe(
      map((data) => (data || []).filter((loc) => loc.id !== 0)),
      tap((filtered) => {
        this.dataSubject.next(filtered);
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, 'Error al buscar ubicaciones');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Obtiene estadísticas de ubicaciones
   * Incluye conteo de detecciones de vehículos desde VehicleDetectedService
   */
  getStats(): LocationStats {
    const locations = this.getCachedData().filter((l) => (l as any).id !== 0);
    const vehicleStats = this.vehicleService.getStats();

    return {
      total: locations.length,
      activeLocations: locations.length,
      totalVehicleDetections: vehicleStats.total,
      lastUpdated: new Date(),
    };
  }
}
