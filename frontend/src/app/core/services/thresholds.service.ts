import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ENV_THRESHOLDS,
  MetricThresholdConfig,
  EnvironmentMetricKey,
} from '../config/environment-thresholds.config';
import { ApiThresholdsService } from './api-thresholds.service';

const STORAGE_KEY = 'env_thresholds_overrides_v1';

/**
 * Threshold configuration service managing alert thresholds for environmental metrics.
 * Maintains a reactive store of threshold configurations with localStorage persistence and API sync.
 * Supports both default thresholds and user-defined overrides.
 *
 * @class ThresholdsService
 * @injectable root
 */
@Injectable({ providedIn: 'root' })
export class ThresholdsService {
  /**
   * Reactive store of current threshold configuration including overrides.
   * @private
   */
  private store$ = new BehaviorSubject<Record<EnvironmentMetricKey, MetricThresholdConfig>>(
    this.loadSync(),
  );

  /**
   * Flag indicating whether API initialization has completed.
   * @private
   */
  private initialized = false;

  constructor(private apiThresholds: ApiThresholdsService) {
    this.initializeFromApi();
  }

  /**
   * Synchronously loads thresholds from localStorage on initialization.
   * Merges default thresholds with stored overrides for quick startup.
   * Falls back to defaults if localStorage is unavailable.
   *
   * @private
   * @returns {Record} Merged threshold configuration with overrides applied.
   */
  private loadSync(): Record<EnvironmentMetricKey, MetricThresholdConfig> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const overrides = (raw ? JSON.parse(raw) : {}) as Partial<
        Record<EnvironmentMetricKey, Partial<MetricThresholdConfig>>
      >;
      const merged: Record<EnvironmentMetricKey, MetricThresholdConfig> = {
        ...(ENV_THRESHOLDS as Record<EnvironmentMetricKey, MetricThresholdConfig>),
      };
      for (const k of Object.keys(overrides)) {
        const key = k as EnvironmentMetricKey;
        merged[key] = { ...merged[key], ...(overrides[key] as Partial<MetricThresholdConfig>) };
      }
      return merged;
    } catch {
      return { ...(ENV_THRESHOLDS as Record<EnvironmentMetricKey, MetricThresholdConfig>) };
    }
  }

  /**
   * Asynchronously initializes thresholds from the backend API.
   * Updates the reactive store with server values when available.
   * Falls back to default/localStorage values if API call fails.
   *
   * @private
   */
  private initializeFromApi(): void {
    this.apiThresholds.getThresholdsGrouped().subscribe({
      next: (grouped) => {
        const current = this.store$.getValue();
        const updated: Record<EnvironmentMetricKey, MetricThresholdConfig> = { ...current };

        for (const [metric, dtos] of Object.entries(grouped)) {
          const config = this.apiThresholds.convertApiToConfig(dtos);
          if (config) {
            updated[metric as EnvironmentMetricKey] = config;
          }
        }

        this.store$.next(updated);
        this.initialized = true;
      },
      error: () => {
        this.initialized = true;
      },
    });
  }

  /**
   * Retrieves an observable stream of all threshold configurations.
   * Components subscribe to this to react to threshold changes.
   *
   * @returns {Observable} Observable emitting the current threshold configuration.
   */
  getAll(): Observable<Record<EnvironmentMetricKey, MetricThresholdConfig>> {
    return this.store$.asObservable();
  }

  /**
   * Deep clone helper that preserves special values like Infinity.
   * @private
   */
  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item));
    }
    const cloned: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
    }
    return cloned;
  }

  /**
   * Returns a copy of the configuration for a specific metric.
   * @param metric - Key of the metric
   */
  getMetric(metric: EnvironmentMetricKey): MetricThresholdConfig {
    const snapshot = this.store$.getValue();
    return this.deepClone(snapshot[metric]) as MetricThresholdConfig;
  }

  /**
   * Updates the configuration for a specific metric.
   * Persists to the backend and then to localStorage as a fallback.
   * @param metric - Key of the metric
   * @param cfg - New complete configuration for the metric
   */
  updateMetric(metric: EnvironmentMetricKey, cfg: MetricThresholdConfig) {
    const current = this.store$.getValue();
    const next: Record<EnvironmentMetricKey, MetricThresholdConfig> = {
      ...current,
      [metric]: cfg,
    } as Record<EnvironmentMetricKey, MetricThresholdConfig>;

    const apiDtos = this.apiThresholds.convertConfigToApi(metric, cfg);
    this.apiThresholds.updateMetricThresholds(metric, apiDtos).subscribe({
      next: () => {},
      error: () => {},
    });

    const overrides: Partial<Record<EnvironmentMetricKey, MetricThresholdConfig>> = {};
    const defaults = ENV_THRESHOLDS as Record<EnvironmentMetricKey, MetricThresholdConfig>;
    for (const k of Object.keys(next)) {
      const key = k as EnvironmentMetricKey;
      const def = defaults[key];
      if (JSON.stringify(def) !== JSON.stringify(next[key])) {
        overrides[key] = next[key];
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {}
    this.store$.next(next);
  }

  /**
   * Restaures default values and clears overrides.
   * Attempts to restore in the backend first.
   */
  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    const metrics = Object.keys(ENV_THRESHOLDS) as EnvironmentMetricKey[];
    for (const metric of metrics) {
      const defaultConfig = ENV_THRESHOLDS[metric];
      const apiDtos = this.apiThresholds.convertConfigToApi(metric, defaultConfig);
      this.apiThresholds.updateMetricThresholds(metric, apiDtos).subscribe({
        error: () => {},
      });
    }

    this.store$.next({
      ...(ENV_THRESHOLDS as Record<EnvironmentMetricKey, MetricThresholdConfig>),
    });
  }
}
