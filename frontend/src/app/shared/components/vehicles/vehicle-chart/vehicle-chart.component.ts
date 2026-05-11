import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
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
} from 'chart.js';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
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
 * VehicleChartComponent (Presentational Component)
 *
 * Displays a 24-hour rolling window of vehicle detections as an hourly line chart.
 * Receives raw vehicle detection records from parent component, slots them into one-hour buckets
 * relative to the current time, and renders the per-hour totals as a single time series.
 *
 * Features:
 * - Rolling 24-hour window built from the current clock time, with hour labels (HH:00)
 * - Single-series line chart with smooth tension and filled translucent background (blue)
 * - Custom tooltip showing hourly detection count
 * - Empty hours rendered as null gaps so they don't draw a zero baseline
 * - Reactive data stream via Observable + shareReplay for async pipe consumption
 * - OnPush change detection driven by @Input vehicles
 *
 * @selector app-vehicle-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-vehicle-chart [vehicles]="vehicleDetections" />
 */
@Component({
  selector: 'app-vehicle-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleChartComponent implements OnChanges {
  /**
   * Input array of vehicle detection records to plot.
   * Records outside the rolling 24-hour window are ignored when bucketing.
   * @type {VehicleDetected[]}
   */
  @Input() vehicles: VehicleDetected[] = [];

  /**
   * Size of the rolling time window (in hours) used to build the hourly slots.
   * @type {number}
   */
  private readonly HOURS_WINDOW = 24;

  /**
   * Reactive stream of line chart data, rebuilt in ngOnChanges from the latest vehicles input.
   * Consumed in the template through the async pipe.
   * @type {Observable<ChartConfiguration<'line'>['data']>}
   */
  lineChartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Line chart configuration: responsive layout, custom legend, tooltip formatting, and
   * grid/tick styling for both axes.
   * @type {ChartConfiguration<'line'>['options']}
   */
  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { left: 20, right: 20, top: 0, bottom: 0 },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12, weight: 500 },
          color: '#6B7280',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return label + ': ' + (value !== null ? value : 'N/A') + ' detections';
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
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: { color: '#6B7280', font: { size: 11 }, maxTicksLimit: 24 },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Detections', color: '#3b82f6', font: { weight: 'bold' } },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: { color: '#3b82f6' },
      },
    },
  };

  /**
   * Empty chart data placeholder returned when no detections are available.
   * @type {ChartConfiguration<'line'>['data']}
   */
  private readonly defaultLineData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /**
   * Angular lifecycle hook triggered when @Input vehicles changes.
   * Rebuilds lineChartData$ as a fresh observable that emits the recomputed chart data,
   * shared with all template subscribers via shareReplay.
   * @param {SimpleChanges} changes - Change detection object
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicles']) {
      this.lineChartData$ = of(this.vehicles).pipe(
        map((vehicles) => this.buildLineChartData(vehicles)),
        shareReplay(1),
      );
    }
  }

  /**
   * Builds the line chart dataset from the input detections.
   * Creates one-hour slots ending at the current hour for the last HOURS_WINDOW hours, counts
   * detections falling into each slot, and emits null for empty slots so the line breaks instead
   * of plotting a zero baseline.
   * @param {VehicleDetected[]} vehicles - Source detection records to bucket by hour
   * @returns {ChartConfiguration<'line'>['data']} Chart data with hour labels and per-hour counts
   */
  private buildLineChartData(vehicles: VehicleDetected[]): ChartConfiguration<'line'>['data'] {
    if (!vehicles || vehicles.length === 0) {
      return this.defaultLineData;
    }

    const now = new Date();
    const slots: { start: Date; end: Date; label: string }[] = [];

    for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
      const slotStart = new Date(now.getTime() - i * 3600000);
      slotStart.setMinutes(0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 3600000);
      const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
      slots.push({ start: slotStart, end: slotEnd, label });
    }

    const labels = slots.map((s) => s.label);
    const detectionCounts: (number | null)[] = [];

    for (const slot of slots) {
      const slotData = vehicles.filter((v) => {
        const vTime = new Date(v.timestamp);
        return vTime >= slot.start && vTime < slot.end;
      });
      detectionCounts.push(slotData.length > 0 ? slotData.length : null);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Detecciones por hora',
          data: detectionCounts,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
      ],
    };
  }
}
