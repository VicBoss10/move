import { Component } from '@angular/core';

import { ParticlesChartComponent } from '../../../shared/components/environment-detail-charts/particles-chart/particles-chart.component';
import { PmIndicatorsComponent } from '../../../shared/components/environment-detail-charts/pm-indicators/pm-indicators.component';
import { PmStatsTableComponent } from '../../../shared/components/environment-detail-charts/pm-stats-table/pm-stats-table.component';

/**
 * Componente de página que muestra el detalle de Partículas.
 * Organiza la visualización comparativa de partículas suspendidas (PM2.5 y PM10)
 * con indicadores, gráfico y estadísticas.
 *
 * @selector app-particles-detail
 * @standalone true
 * @imports CommonModule, ParticlesChartComponent, PmIndicatorsComponent, PmStatsTableComponent
 * @returns Página con detalles comparativos de partículas
 */
@Component({
  selector: 'app-particles-detail',
  standalone: true,
  imports: [ParticlesChartComponent, PmIndicatorsComponent, PmStatsTableComponent],
  templateUrl: './particles-detail.component.html',
})
export class ParticlesDetailComponent {}
