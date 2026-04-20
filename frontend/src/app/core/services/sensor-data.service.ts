import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, shareReplay, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { SensorData, SensorDataSearchCriteria, SensorStats } from '../models/sensor-data.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Servicio para gestionar Datos de Sensores
 * Hereda funcionalidad CRUD base de BaseDataService
 * Agrega búsqueda avanzada, estadísticas y métodos especializados
 * 
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root'
})
export class SensorDataService extends BaseDataService<SensorData> {
  /**
   * Endpoint del API para sensores
   */
  protected endpoint = 'sensordata';

  constructor(apiService: ApiService) {
    super(apiService);
    // Datos de sensores cambian frecuentemente - TTL corta (1 minuto)
    this.cacheDuration = 1 * 60 * 1000;
  }

  /**
   * Busca datos de sensores con criterios complejos
   * @param criteria - Criterios de búsqueda (rangos de temperatura, humedad, paginación, etc)
   * @returns Observable<SensorData[]>
   */
  search(criteria: SensorDataSearchCriteria): Observable<SensorData[]> {
    const queryParams = new QueryParamsBuilder()
      .addRange('temperature', criteria.minTemperature, criteria.maxTemperature)
      .addRange('humidity', criteria.minHumidity, criteria.maxHumidity)
      .addRange('co2', criteria.minCo2, criteria.maxCo2)
      .addRange('pm25', criteria.minPm25, criteria.maxPm25)
      .addRange('pm10', criteria.minPm10, criteria.maxPm10)
      .addRange('co', criteria.minCo, criteria.maxCo)
      .addRange('no2', criteria.minNo2, criteria.maxNo2)
      .addRange('nh3', criteria.minNh3, criteria.maxNh3)
      .addIfPresent('deviceId', criteria.deviceId)
      .addIfPresent('locationId', criteria.locationId)
      .addDateRange(criteria.start, criteria.end)
      .addIfPresent('page', criteria.page)
      .addIfPresent('size', criteria.size)
      .build();

    return this.apiService.get<SensorData[]>(`/${this.endpoint}/search`, queryParams).pipe(
      map(data => {
        // Si data es un array, mapear los timestamps
        if (Array.isArray(data)) {
          this.clearServiceError();
          return data.map(d => ({
            ...d,
            timestamp: new Date(d.timestamp)
          }));
        }
        // Si no es array (backend retornó mensaje de texto), retornar array vacío
        console.warn('Backend retornó respuesta no-JSON:', data);
        this.setServiceError(null, 'Respuesta inválida del backend para sensores');
        return [];
      }),
      catchError((error) => {
        // Manejo de errores de parsing JSON (cuando backend retorna texto plano)
        // Esto ocurre cuando no hay datos y el backend retorna un mensaje de texto
        if (error && (error.message?.includes('Http failure during parsing') || error.message?.includes('Unexpected token'))) {
          console.warn('No hay datos disponibles para los criterios especificados');
          this.clearServiceError();
          return of([]);
        }
        // Re-lanzar otros errores
        this.setServiceError(error, 'Error al buscar datos de sensores');
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene únicamente el registro más reciente usando GET /sensordata/last.
   * Es una llamada ligera: solo devuelve 1 fila sin descargar toda la tabla.
   * @returns Observable<SensorData>
   */
  getLast(): Observable<SensorData> {
    return this.apiService.get<SensorData>(`/${this.endpoint}/last`).pipe(
      map(data => ({ ...data, timestamp: new Date((data as any).timestamp) })),
      shareReplay(1),
      catchError((error) => {
        this.setServiceError(error, 'Error al obtener el último registro de sensor');
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene el registro de sensor más reciente.
   * Delega en getLast() para evitar descargar todos los datos.
   * @returns Observable<SensorData>
   */
  getLatest(): Observable<SensorData> {
    return this.getLast();
  }

  /**
   * Obtiene estadísticas para los últimos N registros
   * @param limit - Número de últimos registros a procesar (default 24)
   * @returns Observable<SensorStats>
   */
  getStatsForPeriod(limit: number = 24): Observable<SensorStats> {
    return this.getAll().pipe(
      map(data => {
        const recentData = data.slice(-limit);
        if (recentData.length === 0) {
          return this.getEmptyStats();
        }
        return this.calculateStats(recentData);
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtiene el registro más reciente desde el caché (operación síncrona)
   * Útil si ya se ha cargado antes
   * @returns SensorData | null
   */
  getLatestSync(): SensorData | null {
    const cached = this.getCachedData();
    if (cached.length > 0) {
      return cached[cached.length - 1];
    }
    return null;
  }

  deleteAll(): Observable<any> {
    return this.apiService.deleteText(`/${this.endpoint}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteByDateRange(start: Date, end: Date): Observable<any> {
    const params = new HttpParams()
      .set('start', start.toISOString())
      .set('end', end.toISOString());
    return this.apiService['http'].delete(
      `${this.apiService['apiUrl']}/${this.endpoint}/range`,
      { params, responseType: 'text' }
    ).pipe(tap(() => this.invalidateCache()));
  }

  getFirstRecord(): Observable<SensorData> {
    return this.apiService.get<SensorData>(`/${this.endpoint}/first`);
  }

  getLastRecord(): Observable<SensorData> {
    return this.apiService.get<SensorData>(`/${this.endpoint}/last`);
  }

  /**
   * Calcula estadísticas agregadas de los datos de sensores
   * @returns SensorStats con promedios, mínimos, máximos
   */
  getStats(): SensorStats {
    const data = this.getCachedData();
    if (data.length === 0) {
      return this.getEmptyStats();
    }
    return this.calculateStats(data);
  }

  /**
   * Calcula estadísticas de un conjunto de datos
   * @private
   * @param data - Array de datos para calcular
   * @returns SensorStats
   */
  private calculateStats(data: SensorData[]): SensorStats {
    if (data.length === 0) {
      return this.getEmptyStats();
    }

    const latest = data[data.length - 1];

    const avg = (field: keyof SensorData) => 
      data.reduce((sum, d) => sum + (typeof d[field] === 'number' ? d[field] : 0), 0) / data.length;

    const min = (field: keyof SensorData) => 
      Math.min(...data.map(d => typeof d[field] === 'number' ? d[field] : 0));

    const max = (field: keyof SensorData) => 
      Math.max(...data.map(d => typeof d[field] === 'number' ? d[field] : 0));

    return {
      temperature: {
        current: latest.temperature,
        avg: avg('temperature'),
        min: min('temperature'),
        max: max('temperature')
      },
      humidity: {
        current: latest.humidity,
        avg: avg('humidity'),
        min: min('humidity'),
        max: max('humidity')
      },
      co2: {
        current: latest.co2,
        avg: avg('co2'),
        min: min('co2'),
        max: max('co2')
      },
      pm25: {
        current: latest.pm25,
        avg: avg('pm25'),
        min: min('pm25'),
        max: max('pm25')
      },
      pm10: {
        current: latest.pm10,
        avg: avg('pm10'),
        min: min('pm10'),
        max: max('pm10')
      },
      co: {
        current: latest.co,
        avg: avg('co'),
        min: min('co'),
        max: max('co')
      },
      no2: {
        current: latest.no2,
        avg: avg('no2'),
        min: min('no2'),
        max: max('no2')
      },
      nh3: {
        current: latest.nh3,
        avg: avg('nh3'),
        min: min('nh3'),
        max: max('nh3')
      },
      dataPoints: data.length,
      lastUpdated: new Date()
    };
  }

  /**
   * Devuelve estadísticas vacías cuando no hay datos
   */
  private getEmptyStats(): SensorStats {
    const empty = { current: 0, avg: 0, min: 0, max: 0 };
    return {
      temperature: empty,
      humidity: empty,
      co2: empty,
      pm25: empty,
      pm10: empty,
      co: empty,
      no2: empty,
      nh3: empty,
      dataPoints: 0,
      lastUpdated: new Date()
    };
  }
}
