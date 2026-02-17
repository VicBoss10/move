import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { VehicleDetected, VehicleSearchCriteria, VehicleStats } from '../models/vehicle.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Servicio para gestionar Vehículos Detectados
 * Hereda funcionalidad CRUD base de BaseDataService
 * Agrega búsqueda avanzada y cálculo de estadísticas
 * 
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDetectedService extends BaseDataService<VehicleDetected> {
  /**
   * Endpoint del API para vehículos
   */
  protected endpoint = 'vehicles';

  constructor(apiService: ApiService) {
    super(apiService);
    // Datos de vehículos son medianamente dinámicos - TTL de 5 minutos
    this.cacheDuration = 5 * 60 * 1000;
  }

  /**
   * Busca vehículos con criterios específicos
   * @param criteria - Criterios de búsqueda
   * @returns Observable<VehicleDetected[]>
   */
  search(criteria: VehicleSearchCriteria): Observable<VehicleDetected[]> {
    const queryParams = new QueryParamsBuilder()
      .addIfPresent('type', criteria.type)
      .addIfPresent('locationId', criteria.locationId)
      .addDateRange(criteria.start, criteria.end)
      .build();

    return this.apiService.get<VehicleDetected[]>(`/${this.endpoint}/search`, queryParams).pipe(
      tap(data => {
        this.dataSubject.next(data);
      })
    );
  }

  /**
   * Obtiene estadísticas de vehículos desde los datos actual
   */
  getStats(): VehicleStats {
    const vehicles = this.getCachedData();
    return {
      total: vehicles.length,
      byType: {
        car: vehicles.filter(v => v.vehicleType === 'CAR').length,
        truck: vehicles.filter(v => v.vehicleType === 'TRUCK').length,
        bus: vehicles.filter(v => v.vehicleType === 'BUS').length,
        motorcycle: vehicles.filter(v => v.vehicleType === 'MOTORCYCLE').length,
      },
      todayDetections: vehicles.filter(v => {
        const today = new Date();
        const vDate = new Date(v.timestamp);
        return vDate.toDateString() === today.toDateString();
      }).length,
      lastUpdated: new Date()
    };
  }
}
