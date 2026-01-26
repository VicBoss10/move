import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Co2ChartComponent } from '../../../shared/components/environment-detail-charts/co2-chart/co2-chart.component';
import { Co2GaugeComponent } from '../../../shared/components/environment-detail-charts/co2-gauge/co2-gauge.component';
import { Co2StatsTableComponent } from '../../../shared/components/environment-detail-charts/co2-stats-table/co2-stats-table.component';

/**
 * Componente de página que muestra el detalle de CO₂.
 * Organiza la visualización de indicador, gráfico de tendencia y estadísticas de CO₂.
 * 
 * @selector app-co2-detail
 * @standalone true
 * @imports CommonModule, Co2ChartComponent, Co2GaugeComponent, Co2StatsTableComponent
 * @returns Página con todos los detalles de CO₂
 */
@Component({
  selector: 'app-co2-detail',
  standalone: true,
  imports: [CommonModule, Co2ChartComponent, Co2GaugeComponent, Co2StatsTableComponent],
  templateUrl: './co2-detail.component.html',
})
export class Co2DetailComponent {}
