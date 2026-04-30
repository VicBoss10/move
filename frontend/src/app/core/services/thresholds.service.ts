import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import {
  ENV_THRESHOLDS,
  MetricThresholdConfig,
  EnvironmentMetricKey,
} from '../config/environment-thresholds.config';
import { ApiThresholdsService } from './api-thresholds.service';

const STORAGE_KEY = 'env_thresholds_overrides_v1';

@Injectable({ providedIn: 'root' })
export class ThresholdsService {
  /** Almacén reactivo con la configuración actual (incluye overrides). */
  private store$ = new BehaviorSubject<Record<EnvironmentMetricKey, MetricThresholdConfig>>(
    this.loadSync(),
  );

  private initialized = false;

  constructor(private apiThresholds: ApiThresholdsService) {
    this.initializeFromApi();
  }

  /**
   * Carga desde localStorage de forma síncrona para inicialización rápida.
   * Se actualiza desde la API cuando esté disponible.
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
   * Intenta cargar los umbrales desde la API backend.
   * Si falla, mantiene los valores por defecto.
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
        // Si falla la API, seguimos con los valores por defecto
        this.initialized = true;
      },
    });
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
   * Actualiza la configuración de una métrica.
   * Persiste en el backend y luego en localStorage como fallback.
   * @param metric - Clave de la métrica
   * @param cfg - Nueva configuración completa de la métrica
   */
  updateMetric(metric: EnvironmentMetricKey, cfg: MetricThresholdConfig) {
    const current = this.store$.getValue();
    const next: Record<EnvironmentMetricKey, MetricThresholdConfig> = {
      ...current,
      [metric]: cfg,
    } as Record<EnvironmentMetricKey, MetricThresholdConfig>;

    // Intenta persistir en el backend
    const apiDtos = this.apiThresholds.convertConfigToApi(metric, cfg);
    this.apiThresholds.updateMetricThresholds(metric, apiDtos).subscribe({
      next: () => {
        // Success - umbrales actualizados en la BD
      },
      error: () => {
        // Fallo en API, pero mantiene el valor en memoria
      },
    });

    // Persiste en localStorage como fallback
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
   * Restaura los valores por defecto y limpia los overrides.
   * Intenta restaurar en el backend primero.
   */
  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    // Intenta restaurar todos los umbrales al estado por defecto en la BD
    const metrics = Object.keys(ENV_THRESHOLDS) as EnvironmentMetricKey[];
    for (const metric of metrics) {
      const defaultConfig = ENV_THRESHOLDS[metric];
      const apiDtos = this.apiThresholds.convertConfigToApi(metric, defaultConfig);
      this.apiThresholds.updateMetricThresholds(metric, apiDtos).subscribe({
        error: () => {
          // Silenciosamente falla si la API no está disponible
        },
      });
    }

    this.store$.next({
      ...(ENV_THRESHOLDS as Record<EnvironmentMetricKey, MetricThresholdConfig>),
    });
  }
}
