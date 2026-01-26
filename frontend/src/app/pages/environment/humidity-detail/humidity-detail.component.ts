import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HumidityChartComponent } from '../../../shared/components/environment-detail-charts/humidity-chart/humidity-chart.component';
import { HumidityGaugeComponent } from '../../../shared/components/environment-detail-charts/humidity-gauge/humidity-gauge.component';
import { HumidityStatsTableComponent } from '../../../shared/components/environment-detail-charts/humidity-stats-table/humidity-stats-table.component';

/**
 * Componente de página que muestra el detalle de Humedad.
 * Organiza la visualización de indicador, gráfico de tendencia y estadísticas de humedad relativa.
 * 
 * @selector app-humidity-detail
 * @standalone true
 * @imports CommonModule, HumidityChartComponent, HumidityGaugeComponent, HumidityStatsTableComponent
 * @returns Página con todos los detalles de humedad
 */
@Component({
  selector: 'app-humidity-detail',
  standalone: true,
  imports: [CommonModule, HumidityChartComponent, HumidityGaugeComponent, HumidityStatsTableComponent],
  templateUrl: './humidity-detail.component.html',
})
export class HumidityDetailComponent {}
