import { Component } from '@angular/core';
import { EcommerceMetricsComponent } from '../../../shared/components/ecommerce/ecommerce-metrics/ecommerce-metrics.component';
import { MonthlySalesChartComponent } from '../../../shared/components/ecommerce/monthly-sales-chart/monthly-sales-chart.component';
import { MonthlyTargetComponent } from '../../../shared/components/ecommerce/monthly-target/monthly-target.component';
import { StatisticsChartComponent } from '../../../shared/components/ecommerce/statics-chart/statics-chart.component';
import { DemographicCardComponent } from '../../../shared/components/ecommerce/demographic-card/demographic-card.component';
import { RecentOrdersComponent } from '../../../shared/components/ecommerce/recent-orders/recent-orders.component';
import { SystemStatusComponent } from '../../../shared/components/move-dashboard/system-status/system-status.component';
import { EnvironmentMetricsComponent } from '../../../shared/components/move-dashboard/environment-metrics/environment-metrics.component';
import { EnvironmentChartComponent } from '../../../shared/components/move-dashboard/environment-chart/environment-chart.component';
import { VehicleActivityComponent } from '../../../shared/components/move-dashboard/vehicle-activity/vehicle-activity.component';

@Component({
  selector: 'app-ecommerce',
  standalone: true,
  imports: [
    EcommerceMetricsComponent,
    MonthlySalesChartComponent,
    MonthlyTargetComponent,
    StatisticsChartComponent,
    DemographicCardComponent,
    RecentOrdersComponent,
    SystemStatusComponent,
    EnvironmentMetricsComponent,
    EnvironmentChartComponent,
    VehicleActivityComponent,
  ],
  templateUrl: './ecommerce.component.html',
})
export class EcommerceComponent {}
