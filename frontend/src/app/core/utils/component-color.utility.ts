/**
 * Centralized color utility for component styling based on status and health states.
 * Provides Tailwind CSS class selections for consistent theming across the application.
 * Supports both light and dark mode through Tailwind dark mode classes.
 *
 * @class ComponentColorUtility
 */
export class ComponentColorUtility {
  /**
   * Returns background and border Tailwind classes for air quality status.
   * Maps good/moderate/unhealthy states to green/yellow/red color palettes.
   *
   * @static
   * @param {string} status - Air quality status (good, moderate, unhealthy).
   * @returns {string} Tailwind classes for background and border styling.
   */
  static getStatusBgColor(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'moderate':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'unhealthy':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800';
    }
  }

  /**
   * Returns text color Tailwind classes for air quality status.
   * Provides readable text colors that match the status background colors.
   *
   * @static
   * @param {string} status - Air quality status (good, moderate, unhealthy).
   * @returns {string} Tailwind classes for text color styling.
   */
  static getStatusTextColor(status: string): string {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  /**
   * Returns icon background Tailwind classes for air quality status.
   * Creates a subtle background container for status indicator icons.
   *
   * @static
   * @param {string} status - Air quality status (good, moderate, unhealthy).
   * @returns {string} Tailwind classes for icon background styling.
   */
  static getStatusIconBgColor(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'unhealthy':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  }

  /**
   * Returns icon color Tailwind classes for air quality status.
   * Matches icon colors to the status visual hierarchy.
   *
   * @static
   * @param {string} status - Air quality status (good, moderate, unhealthy).
   * @returns {string} Tailwind classes for icon color styling.
   */
  static getStatusIconColor(status: string): string {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  /**
   * Returns background and border Tailwind classes for device health status.
   * Maps normal/warning/critical states to green/yellow/red color palettes.
   *
   * @static
   * @param {string} status - Device health status (normal, warning, critical).
   * @returns {string} Tailwind classes for background and border styling.
   */
  static getHealthBgColor(status: string): string {
    switch (status) {
      case 'normal':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800';
    }
  }

  /**
   * Returns text color Tailwind classes for device health status.
   * Provides readable text colors matching the health status.
   *
   * @static
   * @param {string} status - Device health status (normal, warning, critical).
   * @returns {string} Tailwind classes for text color styling.
   */
  static getHealthTextColor(status: string): string {
    switch (status) {
      case 'normal':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  /**
   * Returns icon background Tailwind classes for device health status.
   * Creates subtle background containers for health indicator icons.
   *
   * @static
   * @param {string} status - Device health status (normal, warning, critical).
   * @returns {string} Tailwind classes for icon background styling.
   */
  static getHealthIconBgColor(status: string): string {
    switch (status) {
      case 'normal':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  }

  /**
   * Returns trend color Tailwind classes for device health status.
   * Used to visualize health trends and changes in device status.
   *
   * @static
   * @param {string} status - Device health status (normal, warning, critical).
   * @returns {string} Tailwind classes for trend color styling.
   */
  static getHealthTrendColor(status: string): string {
    switch (status) {
      case 'normal':
        return 'text-green-500 dark:text-green-400';
      case 'warning':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'critical':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }
}
