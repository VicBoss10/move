import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ENV_THRESHOLDS,
  MetricThresholdConfig,
  EnvironmentMetricKey,
} from '../config/environment-thresholds.config';

const STORAGE_KEY = 'env_thresholds_overrides_v1';

@Injectable({ providedIn: 'root' })
export class ThresholdsService {
  /** Almacén reactivo con la configuración actual (incluye overrides). */
  private store$ = new BehaviorSubject<Record<EnvironmentMetricKey, MetricThresholdConfig>>(
    this.load(),
  );

  constructor() {}

  /**
   * Carga la configuración desde `localStorage` y la mergea con los valores
   * por defecto definidos en `ENV_THRESHOLDS`.
   * @returns Mapa de metric key -> MetricThresholdConfig
   */
  private load(): Record<EnvironmentMetricKey, MetricThresholdConfig> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const overrides = (raw ? JSON.parse(raw) : {}) as Partial<
        Record<EnvironmentMetricKey, Partial<MetricThresholdConfig>>
      >;
      // shallow merge of each metric
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
   * Observador para reaccionar a cambios de umbrales en la UI.
   */
  getAll(): Observable<Record<EnvironmentMetricKey, MetricThresholdConfig>> {
    return this.store$.asObservable();
  }

  /**
   * Devuelve una copia de la configuración de una métrica específica.
   * @param metric - Clave de la métrica
   */
  getMetric(metric: EnvironmentMetricKey): MetricThresholdConfig {
    const snapshot = this.store$.getValue();
    // deep clone to avoid external mutation
    return JSON.parse(JSON.stringify(snapshot[metric]));
  }

  /**
   * Actualiza la configuración de una métrica y persiste sólo los overrides.
   * @param metric - Clave de la métrica
   * @param cfg - Nueva configuración completa de la métrica
   */
  updateMetric(metric: EnvironmentMetricKey, cfg: MetricThresholdConfig) {
    const current = this.store$.getValue();
    const next: Record<EnvironmentMetricKey, MetricThresholdConfig> = {
      ...current,
      [metric]: cfg,
    } as Record<EnvironmentMetricKey, MetricThresholdConfig>;
    // persist overrides (only differences from default)
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
   * Restaura los valores por defecto y limpia los overrides persistidos.
   */
  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.store$.next({
      ...(ENV_THRESHOLDS as Record<EnvironmentMetricKey, MetricThresholdConfig>),
    });
  }
}
