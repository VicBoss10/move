import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleStatsCardsComponent, VehicleStats } from '../../../shared/components/vehicles/vehicle-stats-cards/vehicle-stats-cards.component';
import { VehicleChartComponent } from '../../../shared/components/vehicles/vehicle-chart/vehicle-chart.component';

/**
 * VehiclesStatsComponent
 *
 * Página que muestra estadísticas generales del monitoreo de vehículos.
 * Incluye tarjetas de métricas clave y gráficos de análisis.
 *
 * Características:
 * - Tarjetas con métricas principales
 * - Gráfico de detecciones por hora
 * - Gráfico de tipos de vehículos
 * - Indicadores de tendencias
 * - Análisis de emisiones promedio
 *
 * @selector app-vehicles-stats
 * @standalone true
 * @imports CommonModule, VehicleStatsCardsComponent, VehicleChartComponent
 * @returns Página con estadísticas de vehículos
 *
 * @example
 * <app-vehicles-stats />
 */
@Component({
  selector: 'app-vehicles-stats',
  standalone: true,
  imports: [CommonModule, VehicleStatsCardsComponent, VehicleChartComponent],
  templateUrl: './vehicles-stats.component.html',
})
export class VehiclesStatsComponent {
  /**
   * Estadísticas de vehículos
   * En producción, esto vendría de un servicio
   * @type {VehicleStats}
   */
  stats: VehicleStats = {
    totalDetected: 1247,
    activeNow: 23,
    carCount: 452,
    motorcycleCount: 234,
    busCount: 89,
    truckCount: 56,
  };
}
