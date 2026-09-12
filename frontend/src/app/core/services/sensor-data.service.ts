import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, shareReplay, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { SensorData, SensorDataSearchCriteria, SensorStats } from '../models/sensor-data.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Sensor data management service for environmental monitoring.
 * Extends BaseDataService for CRUD operations and adds advanced filtering, search, and statistics.
 * Handles complex range queries on multiple sensor parameters (temperature, humidity, CO2, etc).
 * Automatically normalizes timestamps from string to Date objects.
 *
 * @class SensorDataService
 * @extends BaseDataService<SensorData>
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class SensorDataService extends BaseDataService<SensorData> {
  /**
   * API endpoint path for sensor data resources.
   * @protected
   */
  protected endpoint = 'sensordata';

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 1 * 60 * 1000;
  }

  /**
   * Searches for sensor data matching complex filter criteria.
   * Supports range filtering on all sensor parameters, device/location filtering, and pagination.
   * Automatically handles timestamp string-to-Date conversion.
   * Updates the reactive data$ stream with search results.
   *
   * @param {SensorDataSearchCriteria} criteria - Advanced search and filter criteria.
   * @returns {Observable<SensorData[]>} Observable with matching sensor readings.
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
      map((data) => {
        if (Array.isArray(data)) {
          this.clearServiceError();
          const parsed = this.parseSensorDataArray(data);
          this.dataSubject.next(parsed);
          return parsed;
        }
        console.warn('Backend returned non-JSON response:', data);
        this.setServiceError(null, 'Invalid response from backend for sensor data');
        return [];
      }),
      catchError((error) => {
        if (
          error &&
          (error.message?.includes('Http failure during parsing') ||
            error.message?.includes('Unexpected token'))
        ) {
          console.warn('No data available for specified criteria');
          this.clearServiceError();
          this.dataSubject.next([]);
          return of([]);
        }
        this.setServiceError(error, 'Error searching sensor data');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Obtains the most recent sensor data record using GET /sensordata/last.
   * This is a lightweight call that returns only 1 record without downloading the entire table.
   * @returns Observable<SensorData>
   */
  getLast(): Observable<SensorData> {
    return this.apiService.get<SensorData>(`/${this.endpoint}/last`).pipe(
      map((data) => this.parseSensorData(data)),
      shareReplay(1),
      catchError((error) => {
        this.setServiceError(error, 'Error al obtener el último registro de sensor');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Obtains the most recent sensor data record.
   * Delegates to getLast() to avoid downloading all data.
   * @returns Observable<SensorData>
   */
  getLatest(): Observable<SensorData> {
    return this.getLast();
  }

  /**
   * Obtains statistics for the most recent N records.
   * @param limit - NNumber of recent records to process (default 24)
   * @returns Observable<SensorStats>
   */
  getStatsForPeriod(limit: number = 24): Observable<SensorStats> {
    return this.getAll().pipe(
      map((data) => {
        const recentData = data.slice(-limit);
        if (recentData.length === 0) {
          return this.getEmptyStats();
        }
        return this.calculateStats(recentData);
      }),
      shareReplay(1),
    );
  }

  /**
   * Obtains the most recent sensor data record from the cache (synchronous operation).
   * Useful if the data has already been loaded previously.
   * @returns SensorData | null
   */
  getLatestSync(): SensorData | null {
    const cached = this.getCachedData();
    if (cached.length > 0) {
      return cached[cached.length - 1];
    }
    return null;
  }

  deleteAll(): Observable<void> {
    return this.apiService.delete(`/${this.endpoint}`).pipe(
      tap(() => this.invalidateCache()),
      map(() => undefined),
    );
  }

  deleteByDateRange(start: Date, end: Date): Observable<void> {
    return this.apiService
      .delete(`/${this.endpoint}/range?start=${start.toISOString()}&end=${end.toISOString()}`)
      .pipe(
        tap(() => this.invalidateCache()),
        map(() => undefined),
      );
  }

  deleteByLocation(locationId: number): Observable<void> {
    return this.apiService.delete(`/${this.endpoint}/location/${locationId}`).pipe(
      tap(() => this.invalidateCache()),
      map(() => undefined),
    );
  }

  getFirstRecord(): Observable<SensorData> {
    return this.apiService
      .get<SensorData>(`/${this.endpoint}/first`)
      .pipe(map((d) => this.parseSensorData(d)));
  }

  getLastRecord(): Observable<SensorData> {
    return this.apiService
      .get<SensorData>(`/${this.endpoint}/last`)
      .pipe(map((d) => this.parseSensorData(d)));
  }

  /** Converts an object (possible timestamp string) to `SensorData` with `timestamp: Date`. */
  private parseSensorData(d: unknown): SensorData {
    if (!d || typeof d !== 'object' || d === null) return d as SensorData;
    const record = d as Record<string, unknown>;
    let ts: unknown = record['timestamp'];
    if (typeof ts === 'string' || typeof ts === 'number') {
      const parsed = new Date(ts);
      if (!isNaN(parsed.getTime())) {
        ts = parsed;
      }
    }
    return { ...(record as object), timestamp: ts as Date } as SensorData;
  }

  /** Normalizes an array of responses to `SensorData[]`. */
  private parseSensorDataArray(arr: unknown): SensorData[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => this.parseSensorData(x));
  }

  /**
   * Calculates aggregated statistics for sensor data.
   * @returns SensorStats with averages, minimums, and maximums.
   */
  getStats(): SensorStats {
    const data = this.getCachedData();
    if (data.length === 0) {
      return this.getEmptyStats();
    }
    return this.calculateStats(data);
  }

  /**
   * Calculates statistics for a set of sensor data.
   * @private
   * @param data - Array of data points to calculate statistics for
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
      Math.min(...data.map((d) => (typeof d[field] === 'number' ? d[field] : 0)));

    const max = (field: keyof SensorData) =>
      Math.max(...data.map((d) => (typeof d[field] === 'number' ? d[field] : 0)));

    return {
      temperature: {
        current: latest.temperature,
        avg: avg('temperature'),
        min: min('temperature'),
        max: max('temperature'),
      },
      humidity: {
        current: latest.humidity,
        avg: avg('humidity'),
        min: min('humidity'),
        max: max('humidity'),
      },
      co2: {
        current: latest.co2,
        avg: avg('co2'),
        min: min('co2'),
        max: max('co2'),
      },
      pm25: {
        current: latest.pm25,
        avg: avg('pm25'),
        min: min('pm25'),
        max: max('pm25'),
      },
      pm10: {
        current: latest.pm10,
        avg: avg('pm10'),
        min: min('pm10'),
        max: max('pm10'),
      },
      co: {
        current: latest.co,
        avg: avg('co'),
        min: min('co'),
        max: max('co'),
      },
      no2: {
        current: latest.no2,
        avg: avg('no2'),
        min: min('no2'),
        max: max('no2'),
      },
      nh3: {
        current: latest.nh3,
        avg: avg('nh3'),
        min: min('nh3'),
        max: max('nh3'),
      },
      dataPoints: data.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Returns empty statistics when no data is available.
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
      lastUpdated: new Date(),
    };
  }
}
