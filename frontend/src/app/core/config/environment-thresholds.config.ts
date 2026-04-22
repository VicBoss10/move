/**
 * Configuración centralizada de umbrales ambientales
 *
 * Valores de referencia basados en estándares internacionales:
 * - CO₂: ASHRAE 62.1 / Norma para calidad de aire interior
 * - CO: OMS (Organización Mundial de la Salud) - exposición 8h
 * - NO₂: EPA (Environmental Protection Agency) - AQI breakpoints
 * - NH₃: Estándar OSHA para exposición laboral
 * - PM2.5: OMS Guías de Calidad del Aire 2021
 * - PM10: OMS Guías de Calidad del Aire 2021
 * - Temperatura: ISO 7730 / ASHRAE 55 (confort térmico)
 * - Humedad: ASHRAE 55 (confort térmico)
 *
 * Cada métrica tiene 4 niveles:
 * - good: Condición óptima / segura
 * - moderate: Aceptable pero con precaución
 * - poor: Nivel preocupante, acción sugerida
 * - critical: Nivel peligroso, acción requerida
 *
 * El valor numérico de cada nivel es el LÍMITE SUPERIOR (inclusive).
 * Si el valor supera el límite de 'poor', se considera 'critical'.
 *
 * @example
 * import { ENV_THRESHOLDS, getEnvironmentStatus } from './environment-thresholds.config';
 * const status = getEnvironmentStatus('co2', 1100); // → { key: 'moderate', label: 'Moderado', ... }
 */

// ─── Tipos ───────────────────────────────────────────────────────

/**
 * Claves de estado ambiental unificadas
 */
export type EnvironmentStatusKey = 'good' | 'moderate' | 'poor' | 'critical' | 'no-data';

/**
 * Claves de métricas ambientales disponibles
 */
export type EnvironmentMetricKey =
  | 'co2'
  | 'co'
  | 'no2'
  | 'nh3'
  | 'pm25'
  | 'pm10'
  | 'temperature'
  | 'humidity';

/**
 * Definición de un nivel de umbral
 */
export interface ThresholdLevel {
  /** Límite superior (inclusive). Valores por encima pasan al siguiente nivel */
  max: number;
  /** Clave de estado */
  key: EnvironmentStatusKey;
  /** Etiqueta en español para mostrar al usuario */
  label: string;
  /** Color hexadecimal para gráficas y gauges */
  color: string;
  /** Clase Tailwind para texto */
  textClass: string;
  /** Clase Tailwind para fondo de badge */
  bgClass: string;
  /** Clase Tailwind para gradiente de gauge */
  gaugeGradient: string;
}

/**
 * Configuración completa de una métrica ambiental
 */
export interface MetricThresholdConfig {
  /** Nombre corto para mostrar (ej: 'CO₂') */
  label: string;
  /** Unidad de medida */
  unit: string;
  /** Valor mínimo de la escala (para gauges) */
  scaleMin: number;
  /** Valor máximo de la escala (para gauges) */
  scaleMax: number;
  /** Niveles de umbral ordenados de menor a mayor */
  levels: ThresholdLevel[];
}

// ─── Configuración de Umbrales ───────────────────────────────────

/**
 * Umbrales centralizados para todas las métricas ambientales.
 *
 * Los valores se basan en normativas internacionales y son el punto
 * único de verdad para todos los componentes del frontend.
 */
export const ENV_THRESHOLDS: Record<EnvironmentMetricKey, MetricThresholdConfig> = {
  // ── CO₂ (dióxido de carbono) ─────────────────────────
  // Ref: ASHRAE 62.1 — Calidad de aire interior
  // < 600 ppm: aire fresco exterior
  // 600–1000: aceptable en interiores
  // 1000–1500: aire viciado, ventilar
  // > 1500: inadecuado, riesgo de somnolencia/malestar
  co2: {
    label: 'Dióxido de Carbono (CO₂)',
    unit: 'ppm',
    scaleMin: 0,
    scaleMax: 2000,
    levels: [
      {
        max: 600,
        key: 'good',
        label: 'Bueno',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 1000,
        key: 'moderate',
        label: 'Moderado',
        color: '#f59e0b',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
        gaugeGradient: 'from-yellow-500/20 to-yellow-600/20',
      },
      {
        max: 1500,
        key: 'poor',
        label: 'Elevado',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Crítico',
        color: '#ef4444',
        textClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        gaugeGradient: 'from-red-500/20 to-red-600/20',
      },
    ],
  },

  // ── CO (monóxido de carbono) ──────────────────────────
  // Ref: OMS — Límite 8h exposición: 9 ppm
  // EPA AQI breakpoints: 0–4.4 bueno, 4.5–9.4 moderado, 9.5–12.4 Elevado, >12.5 peligroso
  co: {
    label: 'Monóxido de Carbono (CO)',
    unit: 'ppm',
    scaleMin: 0,
    scaleMax: 50,
    levels: [
      {
        max: 4.4,
        key: 'good',
        label: 'Bueno',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 9.4,
        key: 'moderate',
        label: 'Moderado',
        color: '#f59e0b',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
        gaugeGradient: 'from-yellow-500/20 to-yellow-600/20',
      },
      {
        max: 12.4,
        key: 'poor',
        label: 'Elevado',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Crítico',
        color: '#ef4444',
        textClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        gaugeGradient: 'from-red-500/20 to-red-600/20',
      },
    ],
  },

  // ── NO₂ (dióxido de nitrógeno) ────────────────────────
  // Ref: EPA AQI breakpoints en ppb
  // 0–53 bueno, 54–100 moderado, 101–360 Elevado, >360 peligroso
  no2: {
    label: 'Dióxido de Nitrógeno (NO₂)',
    unit: 'ppb',
    scaleMin: 0,
    scaleMax: 200,
    levels: [
      {
        max: 53,
        key: 'good',
        label: 'Bueno',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 100,
        key: 'moderate',
        label: 'Moderado',
        color: '#f59e0b',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
        gaugeGradient: 'from-yellow-500/20 to-yellow-600/20',
      },
      {
        max: 360,
        key: 'poor',
        label: 'Elevado',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Crítico',
        color: '#ef4444',
        textClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        gaugeGradient: 'from-red-500/20 to-red-600/20',
      },
    ],
  },

  // ── NH₃ (amoníaco) ───────────────────────────────────
  // Ref: OSHA PEL 50 ppm (8h TWA), NIOSH REL 25 ppm (10h TWA)
  // Adaptado a ppb para sensores ambientales de baja concentración
  nh3: {
    label: 'Amoníaco (NH₃)',
    unit: 'ppb',
    scaleMin: 0,
    scaleMax: 100,
    levels: [
      {
        max: 25,
        key: 'good',
        label: 'Bueno',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 50,
        key: 'moderate',
        label: 'Moderado',
        color: '#f59e0b',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
        gaugeGradient: 'from-yellow-500/20 to-yellow-600/20',
      },
      {
        max: 75,
        key: 'poor',
        label: 'Elevado',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Crítico',
        color: '#ef4444',
        textClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        gaugeGradient: 'from-red-500/20 to-red-600/20',
      },
    ],
  },

  // ── PM2.5 (partículas finas) ──────────────────────────
  // Ref: OMS Guías 2021: media anual 5 µg/m³, 24h 15 µg/m³
  // EPA AQI: 0–12 bueno, 12.1–35.4 moderado, 35.5–55.4 Elevado, >55.5 peligroso
  pm25: {
    label: 'Partículas PM₂.₅ (PM2.5)',
    unit: 'µg/m³',
    scaleMin: 0,
    scaleMax: 150,
    levels: [
      {
        max: 12,
        key: 'good',
        label: 'Bueno',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 35.4,
        key: 'moderate',
        label: 'Moderado',
        color: '#f59e0b',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
        gaugeGradient: 'from-yellow-500/20 to-yellow-600/20',
      },
      {
        max: 55.4,
        key: 'poor',
        label: 'Elevado',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Crítico',
        color: '#ef4444',
        textClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        gaugeGradient: 'from-red-500/20 to-red-600/20',
      },
    ],
  },

  // ── PM10 (partículas gruesas) ─────────────────────────
  // Ref: OMS Guías 2021: media anual 15 µg/m³, 24h 45 µg/m³
  // EPA AQI: 0–54 bueno, 55–154 moderado, 155–254 Elevado, >255 peligroso
  pm10: {
    label: 'Partículas PM₁₀ (PM10)',
    unit: 'µg/m³',
    scaleMin: 0,
    scaleMax: 300,
    levels: [
      {
        max: 54,
        key: 'good',
        label: 'Bueno',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 154,
        key: 'moderate',
        label: 'Moderado',
        color: '#f59e0b',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
        gaugeGradient: 'from-yellow-500/20 to-yellow-600/20',
      },
      {
        max: 254,
        key: 'poor',
        label: 'Elevado',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Crítico',
        color: '#ef4444',
        textClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        gaugeGradient: 'from-red-500/20 to-red-600/20',
      },
    ],
  },

  // ── Temperatura ───────────────────────────────────────
  // Ref: ISO 7730 / ASHRAE 55 (confort térmico en interiores)
  // 18–24°C zona de confort, <15 frío, >30 calor excesivo
  temperature: {
    label: 'Temperatura (°C)',
    unit: '°C',
    scaleMin: -10,
    scaleMax: 50,
    levels: [
      {
        max: 15,
        key: 'poor',
        label: 'Frío',
        color: '#3b82f6',
        textClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-100 dark:bg-blue-500/20',
        gaugeGradient: 'from-blue-500/20 to-blue-600/20',
      },
      {
        max: 24,
        key: 'good',
        label: 'Óptimo',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 30,
        key: 'moderate',
        label: 'Cálido',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Muy Caliente',
        color: '#ef4444',
        textClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        gaugeGradient: 'from-red-500/20 to-red-600/20',
      },
    ],
  },

  // ── Humedad relativa ──────────────────────────────────
  // Ref: ASHRAE 55 (30-60% zona de confort)
  // <30% seco (irritación), 30-60% óptimo, 60-80% húmedo (moho), >80% muy húmedo
  humidity: {
    label: 'Humedad (%)',
    unit: '%',
    scaleMin: 0,
    scaleMax: 100,
    levels: [
      {
        max: 30,
        key: 'moderate',
        label: 'Seco',
        color: '#3b82f6',
        textClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-100 dark:bg-blue-500/20',
        gaugeGradient: 'from-blue-500/20 to-blue-600/20',
      },
      {
        max: 60,
        key: 'good',
        label: 'Óptimo',
        color: '#10b981',
        textClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-500/20',
        gaugeGradient: 'from-green-500/20 to-green-600/20',
      },
      {
        max: 80,
        key: 'poor',
        label: 'Húmedo',
        color: '#f59e0b',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        bgClass: 'bg-yellow-100 dark:bg-yellow-500/20',
        gaugeGradient: 'from-yellow-500/20 to-yellow-600/20',
      },
      {
        max: Infinity,
        key: 'critical',
        label: 'Muy Húmedo',
        color: '#f97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        gaugeGradient: 'from-orange-500/20 to-orange-600/20',
      },
    ],
  },
};

// ─── Funciones de utilidad ───────────────────────────────────────

/**
 * Estado resultante tras evaluar un valor contra los umbrales
 */
export interface EnvironmentStatus {
  key: EnvironmentStatusKey;
  label: string;
  color: string;
  textClass: string;
  bgClass: string;
  gaugeGradient: string;
}

/** Estado por defecto para valores nulos o 0 sin datos */
const NO_DATA_STATUS: EnvironmentStatus = {
  key: 'no-data',
  label: 'Sin datos',
  color: '#9ca3af',
  textClass: 'text-gray-500 dark:text-gray-400',
  bgClass: 'bg-gray-100 dark:bg-gray-500/20',
  gaugeGradient: 'from-gray-500/20 to-gray-600/20',
};

/**
 * Evalúa un valor contra los umbrales de una métrica y devuelve su estado.
 *
 * @param metric - Clave de la métrica (ej: 'co2', 'pm25', 'temperature')
 * @param value - Valor numérico a evaluar
 * @param treatZeroAsNoData - Si true (default), tratar 0 como 'Sin datos'.
 *   Útil para CO/NO₂/NH₃ donde 0 indica que el sensor no reporta.
 *   Para temperatura/humedad, pasar false.
 * @returns EnvironmentStatus con label, color, clases CSS
 *
 * @example
 * getEnvironmentStatus('co2', 1100);
 * // → { key: 'moderate', label: 'Moderado', color: '#f59e0b', ... }
 *
 * getEnvironmentStatus('temperature', 22, false);
 * // → { key: 'good', label: 'Óptimo', color: '#10b981', ... }
 */
export function getEnvironmentStatus(
  metric: EnvironmentMetricKey,
  value: number | null | undefined,
  treatZeroAsNoData: boolean = true,
): EnvironmentStatus {
  if (value === null || value === undefined) {
    return NO_DATA_STATUS;
  }

  if (treatZeroAsNoData && value === 0) {
    return NO_DATA_STATUS;
  }

  const config = ENV_THRESHOLDS[metric];
  if (!config) {
    return NO_DATA_STATUS;
  }

  for (const level of config.levels) {
    if (value <= level.max) {
      return {
        key: level.key,
        label: level.label,
        color: level.color,
        textClass: level.textClass,
        bgClass: level.bgClass,
        gaugeGradient: level.gaugeGradient,
      };
    }
  }

  // Fallback al último nivel (critical)
  const last = config.levels[config.levels.length - 1];
  return {
    key: last.key,
    label: last.label,
    color: last.color,
    textClass: last.textClass,
    bgClass: last.bgClass,
    gaugeGradient: last.gaugeGradient,
  };
}

/**
 * Obtiene la configuración completa de una métrica
 * @param metric - Clave de la métrica
 * @returns MetricThresholdConfig o undefined
 */
export function getMetricConfig(metric: EnvironmentMetricKey): MetricThresholdConfig | undefined {
  return ENV_THRESHOLDS[metric];
}

/**
 * Calcula el porcentaje de un valor dentro de la escala de una métrica (para gauges)
 * @param metric - Clave de la métrica
 * @param value - Valor numérico
 * @returns Porcentaje 0-100
 */
export function getMetricGaugePercentage(metric: EnvironmentMetricKey, value: number): number {
  const config = ENV_THRESHOLDS[metric];
  if (!config) return 0;
  const range = config.scaleMax - config.scaleMin;
  if (range === 0) return 0;
  const pct = ((value - config.scaleMin) / range) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Variante de `getEnvironmentStatus` que acepta una configuración dinámica
 * (obtenida desde ThresholdsService) en lugar de leer ENV_THRESHOLDS directamente.
 * Usar este helper en componentes que quieran reaccionar a cambios de umbrales.
 */
export function getEnvironmentStatusFromConfig(
  config: MetricThresholdConfig,
  value: number | null | undefined,
  treatZeroAsNoData: boolean = true,
): EnvironmentStatus {
  if (value === null || value === undefined) {
    return {
      key: 'no-data',
      label: 'Sin datos',
      color: '#9ca3af',
      textClass: 'text-gray-500 dark:text-gray-400',
      bgClass: 'bg-gray-100 dark:bg-gray-500/20',
      gaugeGradient: 'from-gray-500/20 to-gray-600/20',
    };
  }
  if (treatZeroAsNoData && value === 0) {
    return {
      key: 'no-data',
      label: 'Sin datos',
      color: '#9ca3af',
      textClass: 'text-gray-500 dark:text-gray-400',
      bgClass: 'bg-gray-100 dark:bg-gray-500/20',
      gaugeGradient: 'from-gray-500/20 to-gray-600/20',
    };
  }
  for (const level of config.levels) {
    if (value <= level.max) {
      return {
        key: level.key,
        label: level.label,
        color: level.color,
        textClass: level.textClass,
        bgClass: level.bgClass,
        gaugeGradient: level.gaugeGradient,
      };
    }
  }
  const last = config.levels[config.levels.length - 1];
  return {
    key: last.key,
    label: last.label,
    color: last.color,
    textClass: last.textClass,
    bgClass: last.bgClass,
    gaugeGradient: last.gaugeGradient,
  };
}

/**
 * Variante de `getMetricGaugePercentage` que acepta una configuración dinámica.
 */
export function getMetricGaugePercentageFromConfig(
  config: MetricThresholdConfig,
  value: number,
): number {
  const range = config.scaleMax - config.scaleMin;
  if (range === 0) return 0;
  const pct = ((value - config.scaleMin) / range) * 100;
  return Math.max(0, Math.min(100, pct));
}
