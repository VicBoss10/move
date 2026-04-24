import { Component } from '@angular/core';

import { TemperatureChartComponent } from '../../../shared/components/environment-detail-charts/temperature-chart/temperature-chart.component';
import { TemperatureGaugeComponent } from '../../../shared/components/environment-detail-charts/temperature-gauge/temperature-gauge.component';
import { TemperatureStatsTableComponent } from '../../../shared/components/environment-detail-charts/temperature-stats-table/temperature-stats-table.component';

/**
 * Componente de página que muestra el detalle de Temperatura.
 * Organiza la visualización de indicador, gráfico de tendencia y estadísticas de temperatura.
 *
 * @selector app-temperature-detail
 * @standalone true
 * @imports CommonModule, TemperatureChartComponent, TemperatureGaugeComponent, TemperatureStatsTableComponent
 * @returns Página con todos los detalles de temperatura
 */
@Component({
  selector: 'app-temperature-detail',
  standalone: true,
  imports: [TemperatureChartComponent, TemperatureGaugeComponent, TemperatureStatsTableComponent],
  templateUrl: './temperature-detail.component.html',
})
export class TemperatureDetailComponent {}
