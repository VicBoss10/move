import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * VehicleTableComponent (Presentational Component)
 *
 * Displays statistics table with vehicle detection counts aggregated by type.
 * Receives stats data via @Input and renders as table rows with color-coded badges.
 * Includes 12-hour trend visualization via mini bar charts and percentage calculations.
 *
 * Features:
 * - Responsive table with horizontal scrolling on mobile
 * - Vehicle type badges with color coding: CAR (blue), BUS (orange), MOTORCYCLE (red), BICYCLE (green), TRUCK (yellow)
 * - Detection count and percentage of total columns
 * - 12-hour trend sparkline with individual hour bars
 * - Tooltip hover showing hourly breakdown ("Hora -N: X detecciones")
 * - Empty state with icon when no stats available
 * - Dark mode support with Tailwind CSS
 * - OnPush change detection
 *
 * @selector app-vehicle-table
 * @standalone true
 * @imports (none - presentational only)
 * @example
 * <app-vehicle-table [stats]="vehicleStats" />
 */
@Component({
  selector: 'app-vehicle-table',
  standalone: true,
  imports: [],
  templateUrl: './vehicle-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleTableComponent {
  /**
   * Input array of vehicle statistics by type for table rendering.
   * Each stat row includes type, total count, percentage, and optional 12-hour trend array.
   * @type {Array<{type: string; count: number; percent: number; trend?: number[]; trendMax?: number;}>}
   */
  @Input() stats: Array<{
    type: string;
    count: number;
    percent: number;
    trend?: number[];
    trendMax?: number;
  }> = [];

  /**
   * Calculates pixel height for trend bar based on value and max for proportional visualization
   * @param {number} value - Current hour's detection count
   * @param {number} trendMax - Maximum value in trend array for scaling
   * @returns {number} Pixel height clamped to minimum 2px
   */
  barHeight(value: number, trendMax?: number): number {
    const max = trendMax && trendMax > 0 ? trendMax : 1;
    return Math.max(2, (value / max) * 28);
  }

  /**
   * Returns Tailwind CSS color classes for vehicle type badge background and text.
   * Color mapping: CAR (blue), BUS (orange), MOTORCYCLE (red), BICYCLE (green), TRUCK (yellow)
   * @param {string} vehicleType - Vehicle type value (CAR, BUS, MOTORCYCLE, BICYCLE, TRUCK)
   * @returns {string} Tailwind CSS class string for badge styling
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
   * Returns localized display label for vehicle type enum value
   * @param {string} vehicleType - Vehicle type enum value
   * @returns {string} Localized label text
   */
  getTypeLabel(vehicleType: string): string {
    const typeLabels: Record<string, string> = {
      CAR: 'Auto',
      BUS: 'Bus',
      MOTORCYCLE: 'Moto',
      BICYCLE: 'Bicicleta',
      TRUCK: 'Camion',
    };
    return typeLabels[vehicleType] || 'Unknown';
  }

  /**
   * Returns icon identifier for vehicle type (utility method, not currently used in template)
   * @param {string} vehicleType - Vehicle type enum value
   * @returns {string} Icon name identifier
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
   * Formats date as relative time string (e.g., "2m ago", "3h ago")
   * @param {Date} date - Date object or ISO string to format
   * @returns {string} Relative time text
   */
  formatTime(date: Date): string {
    const now = new Date();
    const timestamp = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  /**
   * Formats date as full localized datetime string (MM/DD/YYYY HH:MM:SS)
   * @param {Date} date - Date object or ISO string to format
   * @returns {string} Full date-time text
   */
  formatFullDate(date: Date): string {
    const timestamp = typeof date === 'string' ? new Date(date) : date;
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
