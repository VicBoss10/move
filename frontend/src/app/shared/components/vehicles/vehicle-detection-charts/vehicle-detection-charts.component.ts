import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from 'chart.js';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

/**
 * VehicleDetectionChartsComponent (Presentational Component)
 *
 * Displays daily vehicle detection trends as a multi-series line chart broken down by vehicle type.
 * Receives raw vehicle detection records from parent component, aggregates them by day, and renders
 * one line per vehicle type. Also computes summary statistics (total detections, most common type,
 * detection rate per day) for display alongside the chart.
 *
 * Features:
 * - Multi-line chart with five vehicle type series: CAR (blue), BUS (red), MOTORCYCLE (orange), BICYCLE (green), TRUCK (purple)
 * - Daily aggregation grouping detections by ISO date key
 * - Smooth tension lines with filled background and translucent area color
 * - Custom tooltip showing detection count per type with localized labels
 * - Summary stats: total detections, most common vehicle type, daily detection rate
 * - Loading state input for parent-controlled spinner display
 * - OnPush change detection with manual chart update on input changes
 * - Empty state handling when no detections are present
 *
 * @selector app-vehicle-detection-charts
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-vehicle-detection-charts [vehicleDetections]="detections" [isLoading]="loading" />
 */
@Component({
  selector: 'app-vehicle-detection-charts',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-detection-charts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDetectionChartsComponent implements OnChanges {
  /**
   * Reference to the underlying ng2-charts directive instance.
   * Used to manually trigger chart updates after input changes in OnPush mode.
   * @type {BaseChartDirective | undefined}
   */
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Input array of vehicle detection records to plot.
   * Source data is grouped by day and split per vehicle type before rendering.
   * @type {VehicleDetected[]}
   */
  @Input() vehicleDetections: VehicleDetected[] = [];

  /**
   * Input flag indicating whether the parent is still loading data.
   * Used by the template to render a loading state instead of the chart.
   * @type {boolean}
   */
  @Input() isLoading: boolean = false;

  /**
   * Line chart data object, rebuilt in updateChartData when vehicleDetections changes.
   * @type {ChartConfiguration<'line'>['data']}
   */
  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /**
   * Color mapping for each vehicle type used as line/border color in the chart.
   * @type {{ [key: string]: string }}
   */
  private readonly vehicleTypeColors: { [key: string]: string } = {
    CAR: '#3b82f6',
    BUS: '#ef4444',
    MOTORCYCLE: '#f97316',
    BICYCLE: '#10b981',
    TRUCK: '#8b5cf6',
  };

  /**
   * Canonical ordered list of vehicle type keys that drive dataset generation.
   * @type {string[]}
   */
  private readonly allVehicleTypes = ['CAR', 'BUS', 'MOTORCYCLE', 'BICYCLE', 'TRUCK'];

  /**
   * Aggregated summary statistics computed from the input detections.
   * @property {number} totalDetections - Total number of detections in the input set
   * @property {string} mostCommonType - Localized label of the vehicle type with highest count
   * @property {number} detectionRate - Average detections per day across the input range
   */
  summaryStats = { totalDetections: 0, mostCommonType: '', detectionRate: 0 };

  /**
   * Line chart configuration: responsive layout, animated transitions, custom legend, tooltip
   * formatting, and grid/tick styling for both axes.
   * @type {ChartConfiguration<'line'>['options']}
   */
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 0,
        bottom: 0,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: 600,
          },
          color: '#374151',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#f1f5f9',
        borderColor: '#64748b',
        borderWidth: 1,
        padding: 16,
        displayColors: true,
        usePointStyle: true,
        boxPadding: 8,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value !== null ? value : 'N/A'} detecciones`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(203, 213, 225, 0.2)',
          lineWidth: 1,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500,
          },
          maxTicksLimit: 10,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Detecciones por Día',
          color: '#64748b',
          font: {
            weight: 700,
            size: 13,
          },
          padding: 12,
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(203, 213, 225, 0.15)',
          lineWidth: 1,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500,
          },
          padding: 8,
        },
      },
    },
  };

  constructor() {}

  /**
   * Angular lifecycle hook triggered when @Input vehicleDetections changes.
   * Rebuilds the chart datasets, recomputes summary statistics, and forces a chart refresh
   * without animation to keep the view in sync under OnPush change detection.
   * @param {SimpleChanges} changes - Change detection object
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicleDetections']) {
      this.updateChartData();
      this.calculateSummaryStats();
      this.chart?.chart?.update('none');
    }
  }

  /**
   * Rebuilds chartData from the current vehicleDetections input.
   * Sorts detections chronologically, aggregates them by day, then produces one dataset per
   * vehicle type with the per-day counts. Resets to empty data when no detections are present.
   * @returns {void}
   */
  private updateChartData(): void {
    if (!this.vehicleDetections || this.vehicleDetections.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const sortedData = [...this.vehicleDetections].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const dailyData = this.aggregateDataByDay(sortedData);
    const labels = Array.from(dailyData.keys());

    const datasets = this.allVehicleTypes.map((type) => {
      const values = Array.from(dailyData.values()).map((records) => {
        const typeRecords = records.filter((r) => r.vehicleType === type);
        return typeRecords.length;
      });

      const hex = this.vehicleTypeColors[type];
      const rgb = this.hexToRgb(hex);
      const bg = rgb ? `rgba(${rgb}, 0.1)` : 'rgba(0,0,0,0.1)';

      return {
        label: this.getVehicleTypeLabel(type),
        data: values,
        borderColor: hex,
        backgroundColor: bg,
        borderWidth: 2,
        tension: 0.5,
        fill: true,
        pointBackgroundColor: hex,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    this.chartData = {
      labels,
      datasets,
    };
  }

  /**
   * Groups detection records into a Map keyed by ISO date (YYYY-MM-DD) preserving insertion order.
   * @param {VehicleDetected[]} data - Sorted detection records to aggregate
   * @returns {Map<string, VehicleDetected[]>} Map of date keys to detections falling on that day
   */
  private aggregateDataByDay(data: VehicleDetected[]): Map<string, VehicleDetected[]> {
    const dailyMap = new Map<string, VehicleDetected[]>();

    for (const record of data) {
      const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(record);
    }

    return dailyMap;
  }

  /**
   * Computes summary statistics from the current vehicleDetections input.
   * Determines total detections, the most common vehicle type (localized label), and the average
   * detection rate per day across the input range. Falls back to safe defaults when empty.
   * @returns {void}
   */
  private calculateSummaryStats(): void {
    const total = this.vehicleDetections.length;

    if (total === 0) {
      this.summaryStats = { totalDetections: 0, mostCommonType: 'N/A', detectionRate: 0 };
      return;
    }

    const typeCounts = this.allVehicleTypes.reduce(
      (acc, type) => {
        acc[type] = this.vehicleDetections.filter((v) => v.vehicleType === type).length;
        return acc;
      },
      {} as { [key: string]: number },
    );

    const mostCommon = Object.entries(typeCounts).reduce((a, b) => (b[1] > a[1] ? b : a));
    const days = this.calculateDayRange();
    const detectionRate = days > 0 ? Math.round((total / days) * 100) / 100 : 0;

    this.summaryStats = {
      totalDetections: total,
      mostCommonType: this.getVehicleTypeLabel(mostCommon[0]),
      detectionRate,
    };
  }

  /**
   * Calculates the inclusive number of days spanned by the current detections.
   * Returns 1 when fewer than two records exist to avoid division-by-zero downstream.
   * @returns {number} Number of days between earliest and latest detection (minimum 1)
   */
  private calculateDayRange(): number {
    if (this.vehicleDetections.length < 2) return 1;

    const timestamps = this.vehicleDetections
      .map((v) => new Date(v.timestamp).getTime())
      .sort((a, b) => a - b);
    const daysDiff = (timestamps[timestamps.length - 1] - timestamps[0]) / 86400000;
    return Math.max(1, Math.ceil(daysDiff));
  }

  /**
   * Maps a vehicle type key to its localized Spanish label for display.
   * Returns the original key when no mapping exists.
   * @param {string} type - Vehicle type key (CAR, BUS, MOTORCYCLE, BICYCLE, TRUCK)
   * @returns {string} Localized vehicle type label
   */
  private getVehicleTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      CAR: 'Auto',
      BUS: 'Bus',
      MOTORCYCLE: 'Moto',
      BICYCLE: 'Bicicleta',
      TRUCK: 'Camión',
    };
    return labels[type] || type;
  }

  /**
   * Converts a hex color string (#RRGGBB) to a comma-separated "r, g, b" string.
   * Used to build translucent rgba() backgrounds from the per-type border color.
   * @param {string} hex - Hex color in #RRGGBB or RRGGBB form
   * @returns {string | null} Comma-separated RGB string, or null when the input is invalid
   */
  private hexToRgb(hex: string): string | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
}
