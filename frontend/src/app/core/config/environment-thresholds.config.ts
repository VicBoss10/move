/**
 * Centralized environmental threshold configuration.
 * Defines alert thresholds and styling for all monitored environmental metrics.
 *
 * Threshold references based on international standards:
 * - CO₂: ASHRAE 62.1 (indoor air quality standard).
 * - CO: WHO (World Health Organization) 8-hour exposure limits.
 * - NO₂: EPA (Environmental Protection Agency) AQI breakpoints.
 * - NH₃: OSHA (Occupational Safety and Health Administration) workplace exposure.
 * - PM2.5: WHO 2021 Air Quality Guidelines.
 * - PM10: WHO 2021 Air Quality Guidelines.
 * - Temperature: ISO 7730 / ASHRAE 55 (thermal comfort).
 * - Humidity: ASHRAE 55 (thermal comfort).
 *
 * Each metric has 4 severity levels:
 * - good: Optimal and safe conditions.
 * - moderate: Acceptable but with caution.
 * - poor: Concerning level, action recommended.
 * - critical: Hazardous level, immediate action required.
 *
 * Numeric threshold values are UPPER BOUNDS (inclusive).
 * Values exceeding the 'poor' threshold are classified as 'critical'.
 *
 * @example
 * import { ENV_THRESHOLDS, getEnvironmentStatus } from './environment-thresholds.config';
 * const status = getEnvironmentStatus('co2', 1100);
 * // → { key: 'moderate', label: 'Moderate', color: '#f59e0b', ... }
 */

/**
 * Environmental status keys unified across all metrics.
 */
export type EnvironmentStatusKey = 'good' | 'moderate' | 'poor' | 'critical' | 'no-data';

/**
 * Environmental metric identifier keys.
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
 * Single threshold level definition with styling information.
 * @interface ThresholdLevel
 */
export interface ThresholdLevel {
  /** Upper bound value (inclusive) for this level. Values exceeding this pass to next level. */
  max: number;
  /** Status key corresponding to this threshold level. */
  key: EnvironmentStatusKey;
  /** Human-readable label for user display. */
  label: string;
  /** Hexadecimal color code for charts and gauges. */
  color: string;
  /** Tailwind CSS classes for text styling. */
  textClass: string;
  /** Tailwind CSS classes for badge background styling. */
  bgClass: string;
  /** Tailwind CSS gradient classes for gauge visualization. */
  gaugeGradient: string;
}

/**
 * Complete threshold configuration for an environmental metric.
 * Includes display information, scale boundaries, and severity levels.
 * @interface MetricThresholdConfig
 */
export interface MetricThresholdConfig {
  /** Short display name for the metric (e.g., 'CO₂'). */
  label: string;
  /** Unit of measurement for the metric. */
  unit: string;
  /** Minimum value of the display scale for gauges. */
  scaleMin: number;
  /** Maximum value of the display scale for gauges. */
  scaleMax: number;
  /** Threshold levels ordered from lowest to highest. */
  levels: ThresholdLevel[];
}

/**
 * Centralized threshold configuration for all environmental metrics.
 * These values are the single source of truth across all frontend components.
 * Based on international standards and guidelines.
 * @constant ENV_THRESHOLDS
 */
export const ENV_THRESHOLDS: Record<EnvironmentMetricKey, MetricThresholdConfig> = {
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

/**
 * Environment status result after evaluating a value against thresholds.
 * Contains all styling information for displaying the status to users.
 * @interface EnvironmentStatus
 */
export interface EnvironmentStatus {
  /** Status key corresponding to the threshold level. */
  key: EnvironmentStatusKey;
  /** Human-readable label for the status. */
  label: string;
  /** Hexadecimal color code for the status. */
  color: string;
  /** Tailwind CSS classes for text styling. */
  textClass: string;
  /** Tailwind CSS classes for background styling. */
  bgClass: string;
  /** Tailwind CSS gradient classes for gauge visualization. */
  gaugeGradient: string;
}

/**
 * Default status for null or zero values indicating no data available.
 * @private
 * @constant NO_DATA_STATUS
 */
const NO_DATA_STATUS: EnvironmentStatus = {
  key: 'no-data',
  label: 'No data',
  color: '#9ca3af',
  textClass: 'text-gray-500 dark:text-gray-400',
  bgClass: 'bg-gray-100 dark:bg-gray-500/20',
  gaugeGradient: 'from-gray-500/20 to-gray-600/20',
};

/**
 * Evaluates a value against metric thresholds and returns the environment status.
 * Determines which severity level the value falls into and returns associated styling.
 *
 * @param {EnvironmentMetricKey} metric - Metric key (e.g., 'co2', 'pm25', 'temperature').
 * @param {number | null | undefined} value - Numeric value to evaluate.
 * @param {boolean} [treatZeroAsNoData=true] - If true, treat 0 as no data.
 *   Recommended for CO/NO₂/NH₃ where 0 indicates sensor not reporting.
 *   Use false for temperature/humidity where 0 is a valid value.
 * @returns {EnvironmentStatus} Status with label, color, and CSS classes.
 * @example
 * getEnvironmentStatus('co2', 1100);
 * // → { key: 'moderate', label: 'Moderate', color: '#f59e0b', ... }
 *
 * getEnvironmentStatus('temperature', 22, false);
 * // → { key: 'good', label: 'Optimal', color: '#10b981', ... }
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
 * Retrieves the complete threshold configuration for a metric.
 *
 * @param {EnvironmentMetricKey} metric - Metric key.
 * @returns {MetricThresholdConfig | undefined} Threshold configuration or undefined if not found.
 */
export function getMetricConfig(metric: EnvironmentMetricKey): MetricThresholdConfig | undefined {
  return ENV_THRESHOLDS[metric];
}

/**
 * Calculates the percentage of a value within a metric's display scale.
 * Used for rendering gauge visualizations with proper scaling.
 *
 * @param {EnvironmentMetricKey} metric - Metric key.
 * @param {number} value - Numeric value to convert to percentage.
 * @returns {number} Percentage between 0 and 100.
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
 * Evaluates a value against dynamic threshold configuration instead of static defaults.
 * Allows components to react to runtime threshold changes from ThresholdsService.
 * Variant of getEnvironmentStatus that accepts dynamic configuration.
 *
 * @param {MetricThresholdConfig} config - Dynamic threshold configuration.
 * @param {number | null | undefined} value - Numeric value to evaluate.
 * @param {boolean} [treatZeroAsNoData=true] - Whether to treat 0 as no data.
 * @returns {EnvironmentStatus} Status with label, color, and CSS classes.
 */
export function getEnvironmentStatusFromConfig(
  config: MetricThresholdConfig,
  value: number | null | undefined,
  treatZeroAsNoData: boolean = true,
): EnvironmentStatus {
  if (value === null || value === undefined) {
    return {
      key: 'no-data',
      label: 'No data',
      color: '#9ca3af',
      textClass: 'text-gray-500 dark:text-gray-400',
      bgClass: 'bg-gray-100 dark:bg-gray-500/20',
      gaugeGradient: 'from-gray-500/20 to-gray-600/20',
    };
  }
  if (treatZeroAsNoData && value === 0) {
    return {
      key: 'no-data',
      label: 'No data',
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
 * Calculates gauge percentage using dynamic threshold configuration.
 * Variant of getMetricGaugePercentage that accepts runtime configuration.
 *
 * @param {MetricThresholdConfig} config - Dynamic threshold configuration.
 * @param {number} value - Numeric value to convert to percentage.
 * @returns {number} Percentage between 0 and 100.
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
