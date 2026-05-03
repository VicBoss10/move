import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  ChartData,
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { VehicleStats } from '../vehicle-stats-cards/vehicle-stats-cards.component';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

/**
 * VehicleTypeChartComponent (Presentational Component)
 *
 * Displays vehicle detection distribution by type as a doughnut chart visualization.
 * Receives pre-calculated stats from parent component to avoid duplicate API calls.
 * Includes summary cards showing individual vehicle type counts and percentages.
 *
 * Features:
 * - Doughnut chart with five vehicle type segments: CAR (blue), MOTORCYCLE (purple), BUS (amber), TRUCK (red), BICYCLE (green)
 * - Responsive doughnut with 68% cutout for center space
 * - Hover offset animation for interactive feel
 * - Tooltip showing count and percentage breakdown
 * - Empty state when no detections available
 * - Summary cards grid showing absolute counts per type with color coding
 * - Total detection count centered display
 * - OnPush change detection with manual ChangeDetectorRef triggers on input changes
 *
 * @selector app-vehicle-type-chart
 * @standalone true
 * @imports BaseChartDirective
 * @example
 * <app-vehicle-type-chart [stats]="vehicleStats" />
 */
@Component({
  selector: 'app-vehicle-type-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './vehicle-type-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleTypeChartComponent implements OnChanges {
  /**
   * Input stats object containing vehicle detection counts by type.
   * Calculated in parent component and passed down to avoid duplication.
   * @type {VehicleStats}
   */
  @Input() stats: VehicleStats = {
    totalDetected: 0,
    carCount: 0,
    motorcycleCount: 0,
    busCount: 0,
    truckCount: 0,
    bicycleCount: 0,
  };

  /**
   * Doughnut chart data object, updated in ngOnChanges when stats input changes
   * @type {ChartData<'doughnut'>}
   */
  donutData: ChartData<'doughnut'> = {
    labels: ['Auto', 'Moto', 'Bus', 'Camión', 'Bicicleta'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'],
        hoverBackgroundColor: ['#2563eb', '#7c3aed', '#d97706', '#dc2626', '#059669'],
        borderWidth: 2,
        borderColor: 'transparent',
        hoverOffset: 6,
      },
    ],
  };

  /**
   * Doughnut chart configuration with legend, tooltips, and responsive behavior
   * @type {ChartConfiguration<'doughnut'>['options']}
   */
  donutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: { size: 12 },
          usePointStyle: true,
          pointStyleWidth: 10,
          color: '#6b7280',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round(((ctx.raw as number) / total) * 100) : 0;
            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
          },
        },
      },
    },
  };

  /**
   * Initializes component with change detection reference.
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
  constructor(private cdr: ChangeDetectorRef) {}

  /**
   * Angular lifecycle hook triggered when @Input stats changes.
   * Updates doughnut chart data with new stats values.
   * @param {SimpleChanges} changes - Change detection object
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stats']) {
      this.donutData = {
        ...this.donutData,
        datasets: [
          {
            ...this.donutData.datasets[0],
            data: [
              this.stats.carCount,
              this.stats.motorcycleCount,
              this.stats.busCount,
              this.stats.truckCount,
              this.stats.bicycleCount,
            ],
          },
        ],
      };
      this.cdr.markForCheck();
    }
  }
}
