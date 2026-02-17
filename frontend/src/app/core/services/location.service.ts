import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
  providedIn: 'root'
})
export class LocationService extends BaseDataService<Location> {
  /**
   * Endpoint del API para ubicaciones
   */
  protected endpoint = 'locations';

  constructor(
    apiService: ApiService,
    private vehicleService: VehicleDetectedService
  ) {
    super(apiService);
    // Datos de ubicaciones son casi estáticos - TTL largo (1 hora)
    this.cacheDuration = 60 * 60 * 1000;
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
      tap(data => {
        this.dataSubject.next(data);
      })
    );
  }

  /**
   * Obtiene estadísticas de ubicaciones
   * Incluye conteo de detecciones de vehículos desde VehicleDetectedService
   */
  getStats(): LocationStats {
    const locations = this.getCachedData();
    const vehicleStats = this.vehicleService.getStats();
    
    return {
      total: locations.length,
      activeLocations: locations.length,
      totalVehicleDetections: vehicleStats.total,
      lastUpdated: new Date()
    };
  }
}
