import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * VehicleTableComponent
 *
 * Componente que muestra una tabla de vehículos detectados con todos sus datos.
 * Incluye filtrado, ordenamiento y detalles de cada vehículo.
 *
 * Características:
 * - Tabla responsive con scroll en mobile
 * - Indicadores de estado con colores
 * - Velocidad visual con barras de progreso
 * - Emisiones de CO₂ con alertas
 * - Timestamp de última detección
 *
 * @selector app-vehicle-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla de vehículos detectados
 *
 * @example
 * <app-vehicle-table [vehicles]="vehiclesList" />
 */
@Component({
  selector: 'app-vehicle-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleTableComponent {
  /**
   * Estadísticas por tipo que el componente mostrará en filas.
   * Cada elemento contiene `type`, `count`, `percent` y `trend` (array numérico).
   */
  @Input() stats: Array<{
    type: string;
    count: number;
    percent: number;
    trend?: number[];
    trendMax?: number;
  }> = [];

  /** Devuelve la altura (px) para una barra de tendencia */
  barHeight(value: number, trendMax?: number): number {
    const max = trendMax && trendMax > 0 ? trendMax : 1;
    return Math.max(2, (value / max) * 28);
  }

  /**
   * Obtiene el color por tipo de vehículo
   * @param {string} vehicleType - Tipo de vehículo
   * @returns {string} Clase de color Tailwind
   */
  getTypeColor(vehicleType: string): string {
    const typeColors: Record<string, string> = {
      CAR: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      BUS: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      MOTORCYCLE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      BICYCLE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      TRUCK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return (
      typeColors[vehicleType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    );
  }

  /**
   * Obtiene el label del tipo de vehículo
   * @param {string} vehicleType - Tipo de vehículo
   * @returns {string} Label legible
   */
  getTypeLabel(vehicleType: string): string {
    const typeLabels: Record<string, string> = {
      CAR: 'Auto',
      BUS: 'Bus',
      MOTORCYCLE: 'Moto',
      BICYCLE: 'Bicicleta',
      TRUCK: 'Camion',
    };
    return typeLabels[vehicleType] || 'Desconocido';
  }

  /**
   * Obtiene el ícono para el tipo de vehículo
   * @param {string} vehicleType - Tipo de vehículo
   * @returns {string} Emoji del vehículo
   */
  getTypeIcon(vehicleType: string): string {
    const icons: Record<string, string> = {
      CAR: 'car',
      BUS: 'bus',
      MOTORCYCLE: 'motorcycle',
      BICYCLE: 'bike',
      TRUCK: 'truck',
    };
    return icons[vehicleType] || 'vehicle';
  }

  /**
   * Formatea la fecha de detección de forma relativa
   * @param {Date} date - Fecha a formatear
   * @returns {string} Fecha formateada (ej: "hace 2m")
   */
  formatTime(date: Date): string {
    const now = new Date();
    const timestamp = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `hace ${seconds}s`;
    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${days}d`;
  }

  /**
   * Formatea fecha completa
   * @param {Date} date - Fecha a formatear
   * @returns {string} Fecha completa formateada
   */
  formatFullDate(date: Date): string {
    const timestamp = typeof date === 'string' ? new Date(date) : date;
    return timestamp.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
