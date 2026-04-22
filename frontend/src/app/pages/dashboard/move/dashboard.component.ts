import { Component } from '@angular/core';
import { SystemStatusComponent } from '../../../shared/components/move-dashboard/system-status/system-status.component';
import { EnvironmentMetricsComponent } from '../../../shared/components/move-dashboard/environment-metrics/environment-metrics.component';
import { EnvironmentChartComponent } from '../../../shared/components/move-dashboard/environment-chart/environment-chart.component';
import { VehicleActivityComponent } from '../../../shared/components/move-dashboard/vehicle-activity/vehicle-activity.component';
import { GasIndicatorsComponent } from '../../../shared/components/move-dashboard/gas-indicators/gas-indicators.component';
import { PollutionChartComponent } from '../../../shared/components/move-dashboard/pollution-chart/pollution-chart.component';
import { PollutionSummaryComponent } from '../../../shared/components/move-dashboard/pollution-summary/pollution-summary.component';

/**
 * Componente principal del dashboard MOVE (Observatorio Móvil de Emisiones Vehiculares).
 * Orquesta la visualización de 7 componentes que muestran métricas ambientales,
 * calidad del aire, actividad vehicular y estado del sistema.
 *
 * @selector app-dashboard
 * @standalone true
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SystemStatusComponent,
    EnvironmentMetricsComponent,
    EnvironmentChartComponent,
    VehicleActivityComponent,
    GasIndicatorsComponent,
    PollutionChartComponent,
    PollutionSummaryComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {}
