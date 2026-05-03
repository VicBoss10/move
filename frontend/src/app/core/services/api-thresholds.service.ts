import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MetricThresholdConfig, ThresholdLevel } from '../config/environment-thresholds.config';
import { ApiService } from './api.service';

/**
 * Data transfer object for threshold configuration from the API.
 * @interface ApiThresholdDto
 */
interface ApiThresholdDto {
  /** Threshold record identifier. */
  id?: number;
  /** Environmental metric name (e.g., 'co2', 'temperature'). */
  metric: string;
  /** Threshold level name (e.g., 'good', 'moderate', 'poor'). */
  level: 'good' | 'moderate' | 'poor' | 'critical';
  /** Maximum value for this threshold level. */
  maxValue: number | null;
  /** Timestamp when threshold was created. */
  createdAt?: string;
  /** Timestamp when threshold was last updated. */
  updatedAt?: string;
}

/**
 * API threshold service for CRUD operations on alert thresholds.
 * Communicates with the backend threshold endpoints and provides conversion utilities.
 *
 * @class ApiThresholdsService
 * @injectable root
 */
@Injectable({ providedIn: 'root' })
export class ApiThresholdsService {
  constructor(private apiService: ApiService) {}

  /**
   * Fetches all thresholds from the backend.
   *
   * @returns {Observable<ApiThresholdDto[]>} Observable with all threshold records.
   */
  getAllThresholds(): Observable<ApiThresholdDto[]> {
    return this.apiService.get<ApiThresholdDto[]>('/thresholds').pipe(catchError(() => of([])));
  }

  /**
   * Fetches all thresholds grouped by metric name.
   *
   * @returns {Observable} Observable with thresholds organized by metric.
   */
  getThresholdsGrouped(): Observable<{ [key: string]: ApiThresholdDto[] }> {
    return this.apiService
      .get<{ [key: string]: ApiThresholdDto[] }>('/thresholds/grouped')
      .pipe(catchError(() => of({})));
  }

  /**
   * Fetches thresholds for a specific environmental metric.
   *
   * @param {string} metric - Metric name (e.g., 'co2', 'temperature').
   * @returns {Observable<ApiThresholdDto[]>} Observable with thresholds for the metric.
   */
  getThresholdsByMetric(metric: string): Observable<ApiThresholdDto[]> {
    return this.apiService
      .get<ApiThresholdDto[]>(`/thresholds/metric/${metric}`)
      .pipe(catchError(() => of([])));
  }

  /**
   * Creates a new threshold record on the backend.
   *
   * @param {ApiThresholdDto} dto - Threshold data to create.
   * @returns {Observable<ApiThresholdDto>} Observable with the created threshold.
   */
  createThreshold(dto: ApiThresholdDto): Observable<ApiThresholdDto> {
    return this.apiService
      .post<ApiThresholdDto>('/thresholds', dto)
      .pipe(catchError(() => of(dto)));
  }

  /**
   * Updates an existing threshold record on the backend.
   *
   * @param {number} id - Threshold record identifier.
   * @param {ApiThresholdDto} dto - Updated threshold data.
   * @returns {Observable<ApiThresholdDto>} Observable with the updated threshold.
   */
  updateThreshold(id: number, dto: ApiThresholdDto): Observable<ApiThresholdDto> {
    return this.apiService
      .put<ApiThresholdDto>(`/thresholds/${id}`, dto)
      .pipe(catchError(() => of(dto)));
  }

  /**
   * Deletes a threshold record from the backend.
   *
   * @param {number} id - Threshold record identifier.
   * @returns {Observable<unknown>} Observable confirming deletion.
   */
  deleteThreshold(id: number): Observable<unknown> {
    return this.apiService.delete(`/thresholds/${id}`).pipe(catchError(() => of(null)));
  }

  /**
   * Updates all thresholds for a specific metric.
   *
   * @param {string} metric - Metric name.
   * @param {ApiThresholdDto[]} thresholds - Array of threshold records.
   * @returns {Observable<ApiThresholdDto[]>} Observable with updated thresholds.
   */
  updateMetricThresholds(
    metric: string,
    thresholds: ApiThresholdDto[],
  ): Observable<ApiThresholdDto[]> {
    return this.apiService
      .put<ApiThresholdDto[]>(`/thresholds/metric/${metric}`, thresholds)
      .pipe(catchError(() => of(thresholds)));
  }

  /**
   * Deletes all thresholds for a specific metric.
   *
   * @param {string} metric - Metric name.
   * @returns {Observable<unknown>} Observable confirming deletion.
   */
  deleteMetricThresholds(metric: string): Observable<unknown> {
    return this.apiService.delete(`/thresholds/metric/${metric}`).pipe(catchError(() => of(null)));
  }

  convertApiToConfig(apiThresholds: ApiThresholdDto[]): MetricThresholdConfig | null {
    if (!apiThresholds || apiThresholds.length === 0) return null;

    const sortedByMax = [...apiThresholds].sort((a, b) => (a.maxValue || 0) - (b.maxValue || 0));

    const levels: ThresholdLevel[] = sortedByMax.map((dto) => ({
      max: dto.maxValue || 0,
      key: dto.level,
      label: this.getLabelForLevel(dto.level),
      color: this.getColorForLevel(dto.level),
      textClass: this.getTextClassForLevel(dto.level),
      bgClass: this.getBgClassForLevel(dto.level),
      gaugeGradient: this.getGaugeGradientForLevel(dto.level),
    }));

    levels.push({
      max: Infinity,
      key: 'critical',
      label: 'Crítico',
      color: '#ef4444',
      textClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-100 dark:bg-red-500/20',
      gaugeGradient: 'from-red-500/20 to-red-600/20',
    });

    return {
      label: apiThresholds[0].metric,
      unit: this.getUnitForMetric(apiThresholds[0].metric),
      scaleMin: this.getScaleMin(apiThresholds[0].metric),
      scaleMax: this.getScaleMax(apiThresholds[0].metric),
      levels,
    };
  }

  convertConfigToApi(metric: string, config: MetricThresholdConfig): ApiThresholdDto[] {
    return config.levels
      .filter((level) => level.max !== Infinity)
      .map((level) => ({
        metric,
        level: level.key as 'good' | 'moderate' | 'poor' | 'critical',
        maxValue: level.max,
      }));
  }

  private getLabelForLevel(level: string): string {
    const labels: Record<string, string> = {
      good: 'Bueno',
      moderate: 'Moderado',
      poor: 'Elevado',
      critical: 'Crítico',
    };
    return labels[level] || level;
  }

  private getColorForLevel(level: string): string {
    const colors: Record<string, string> = {
      good: '#10b981',
      moderate: '#f59e0b',
      poor: '#f97316',
      critical: '#ef4444',
    };
    return colors[level] || '#9ca3af';
  }

  private getTextClassForLevel(level: string): string {
    const classes: Record<string, string> = {
      good: 'text-green-600 dark:text-green-400',
      moderate: 'text-yellow-600 dark:text-yellow-400',
      poor: 'text-orange-600 dark:text-orange-400',
      critical: 'text-red-600 dark:text-red-400',
    };
    return classes[level] || 'text-gray-600 dark:text-gray-400';
  }

  private getBgClassForLevel(level: string): string {
    const classes: Record<string, string> = {
      good: 'bg-green-100 dark:bg-green-500/20',
      moderate: 'bg-yellow-100 dark:bg-yellow-500/20',
      poor: 'bg-orange-100 dark:bg-orange-500/20',
      critical: 'bg-red-100 dark:bg-red-500/20',
    };
    return classes[level] || 'bg-gray-100 dark:bg-gray-500/20';
  }

  private getGaugeGradientForLevel(level: string): string {
    const gradients: Record<string, string> = {
      good: 'from-green-500/20 to-green-600/20',
      moderate: 'from-yellow-500/20 to-yellow-600/20',
      poor: 'from-orange-500/20 to-orange-600/20',
      critical: 'from-red-500/20 to-red-600/20',
    };
    return gradients[level] || 'from-gray-500/20 to-gray-600/20';
  }

  private getUnitForMetric(metric: string): string {
    const units: Record<string, string> = {
      co2: 'ppm',
      co: 'ppm',
      no2: 'ppb',
      nh3: 'ppb',
      pm25: 'µg/m³',
      pm10: 'µg/m³',
      temperature: '°C',
      humidity: '%',
    };
    return units[metric] || '';
  }

  private getScaleMin(metric: string): number {
    const scales: Record<string, number> = {
      co2: 0,
      co: 0,
      no2: 0,
      nh3: 0,
      pm25: 0,
      pm10: 0,
      temperature: -10,
      humidity: 0,
    };
    return scales[metric] ?? 0;
  }

  private getScaleMax(metric: string): number {
    const scales: Record<string, number> = {
      co2: 2000,
      co: 50,
      no2: 200,
      nh3: 100,
      pm25: 150,
      pm10: 300,
      temperature: 50,
      humidity: 100,
    };
    return scales[metric] ?? 100;
  }
}
