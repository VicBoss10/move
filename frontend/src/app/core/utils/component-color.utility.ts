/**
 * Utility para centralizar toda la lógica de colores y estados de los componentes
 * Evita duplicación de métodos repetitivos en múltiples componentes
 */
export class ComponentColorUtility {
  /**
   * Retorna el color de fondo y borde para un status
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
   * Retorna el color del texto para un status
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
   * Retorna el color de fondo del ícono para un status
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
   * Retorna el color del ícono para un status
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
   * Retorna el color de fondo y borde para un status normal/warning/critical
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
   * Retorna el color del texto para un status normal/warning/critical
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
   * Retorna el color del ícono de fondo para un status normal/warning/critical
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
   * Retorna el color para un trend normal/warning/critical
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

  /**
   * Retorna el color de fondo y borde para un status good/moderate/poor (gases)
   */
  static getGasStatusBgColor(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'poor':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  }

  /**
   * Retorna el color del texto para un status good/moderate/poor (gases)
   */
  static getGasStatusTextColor(status: string): string {
    switch (status) {
      case 'good':
        return 'text-green-700 dark:text-green-400';
      case 'moderate':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'poor':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  }

  /**
   * Convierte estado técnico a etiqueta legible en español
   */
  static getGasStatusLabel(status: string): string {
    switch (status) {
      case 'good':
        return 'Bueno';
      case 'moderate':
        return 'Moderado';
      case 'poor':
        return 'Pobre';
      default:
        return 'Desconocido';
    }
  }
}
