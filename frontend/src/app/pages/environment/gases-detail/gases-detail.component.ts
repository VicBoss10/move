import { Component } from '@angular/core';

import { GasesComparisonChartComponent } from '../../../shared/components/environment-detail-charts/gases-comparison-chart/gases-comparison-chart.component';
import { MultiGasIndicatorsComponent } from '../../../shared/components/environment-detail-charts/multi-gas-indicators/multi-gas-indicators.component';
import { GasesStatsTableComponent } from '../../../shared/components/environment-detail-charts/gases-stats-table/gases-stats-table.component';

/**
 * Componente de página que muestra el detalle de Gases.
 * Organiza la visualización comparativa de gases múltiples (CO, NO₂, NH₃, C₆H₆)
 * con indicadores, gráfico y estadísticas.
 *
 * @selector app-gases-detail
 * @standalone true
 * @imports CommonModule, GasesComparisonChartComponent, MultiGasIndicatorsComponent, GasesStatsTableComponent
 * @returns Página con detalles comparativos de gases
 */
@Component({
  selector: 'app-gases-detail',
  standalone: true,
  imports: [GasesComparisonChartComponent, MultiGasIndicatorsComponent, GasesStatsTableComponent],
  templateUrl: './gases-detail.component.html',
})
export class GasesDetailComponent {}
