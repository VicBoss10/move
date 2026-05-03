import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  Chart as ChartJS,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { VehicleDetected, VehicleType } from '../../../../core/models/vehicle.model';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

/**
 * VehicleActivityComponent
 *
 * Displays a horizontal bar chart showing vehicle detection counts by type (Cars, Motorcycles, Buses,
 * Trucks, Bicycles) for the current day. Includes summary statistics footer with vehicle counts by type
 * and total vehicles detected. Connected to VehicleDetectedService for real-time vehicle detection data.
 *
 * Features:
 * - Horizontal bar chart with Chart.js (indexAxis: 'y') with five vehicle categories
 * - Five distinct colors per vehicle type: blue (cars), green (motorcycles), orange (buses), red (trucks), purple (bicycles)
 * - Daily vehicle counts filtered from 00:00 to current time (today only)
 * - Vehicle type filtering using VehicleType enum (CAR, MOTORCYCLE, BUS, TRUCK, BICYCLE)
 * - Separate Observables: chartData$ for bar chart, vehicleCounts$ for footer statistics
 * - Shared vehicleData$ observable (private) for today's vehicle detections
 * - Reactive data updates from VehicleDetectedService
 * - Dark mode support with configurable colors
 * - Custom tooltip showing "Detectados: {count}" per vehicle type
 * - Responsive layout with scrollable chart on mobile
 * - Error handling with empty chart fallback
 * - shareReplay pattern for subscription efficiency
 * - Helper method calculateVehicleCounts for type-based counting
 * - OnPush change detection for performance
 *
 * @selector app-vehicle-activity
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-vehicle-activity />
 */
@Component({
  selector: 'app-vehicle-activity',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-activity.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleActivityComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Observable emitting bar chart data with vehicle counts by type
   */
  chartData$!: Observable<ChartConfiguration<'bar'>['data']>;

  /**
   * Observable emitting individual vehicle count array by type
   */
  vehicleCounts$!: Observable<number[]>;

  /**
   * Observable emitting shared vehicle detection data
   * @private
   */
  private vehicleData$!: Observable<VehicleDetected[]>;

  /**
   * Vehicle type labels mapped to VehicleType enum from backend
   * @private
   */
  private readonly vehicleTypes: string[] = ['Cars', 'Motorcycles', 'Buses', 'Trucks', 'Bicycles'];

  /**
   * Default empty chart data structure
   * @private
   */
  private readonly defaultChartData: ChartConfiguration<'bar'>['data'] = {
    labels: this.vehicleTypes,
    datasets: [],
  };

  /**
   * Chart.js configuration options for horizontal bar chart
   */
  chartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
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
          label: function (context) {
            const value = context.parsed.x;
            return 'Detected: ' + value;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        display: true,
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
        },
        title: {
          display: true,
          text: 'Count',
          color: '#6B7280',
        },
      },
      y: {
        stacked: false,
        display: true,
        grid: {
          display: false,
          drawOnChartArea: false,
          drawTicks: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
            weight: 500,
          },
        },
      },
    },
  };

  constructor(private vehicleService: VehicleDetectedService) {
    this.initializeVehicleData();
    this.initializeChartData();
    this.initializeVehicleCounts();
  }

  /**
   * Initializes shared vehicle data observable filtering to today's detections only
   * @private
   */
  private initializeVehicleData(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    this.vehicleData$ = this.vehicleService.getAll().pipe(
      map((vehicles: VehicleDetected[]) => {
        if (!vehicles || vehicles.length === 0) {
          return [];
        }
        return vehicles.filter((v) => {
          const vDate = new Date(v.timestamp);
          return vDate >= todayStart && vDate <= now;
        });
      }),
      catchError((error) => {
        console.error('Error loading vehicle data:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Initializes chart data observable with horizontal bar dataset from shared vehicle data
   * @private
   */
  private initializeChartData(): void {
    this.chartData$ = this.vehicleData$.pipe(
      map((vehicles: VehicleDetected[]) => {
        if (!vehicles || vehicles.length === 0) {
          return this.defaultChartData;
        }

        const vehicleCounts = this.calculateVehicleCounts(vehicles);

        return {
          labels: this.vehicleTypes,
          datasets: [
            {
              label: 'Vehicle Count',
              data: vehicleCounts,
              backgroundColor: ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6'],
              borderColor: ['#1e40af', '#059669', '#ea580c', '#dc2626', '#6d28d9'],
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        };
      }),
      shareReplay(1),
    );
  }

  /**
   * Initializes vehicle counts observable for footer statistics display
   * @private
   */
  private initializeVehicleCounts(): void {
    this.vehicleCounts$ = this.vehicleData$.pipe(
      map((vehicles: VehicleDetected[]) => {
        if (!vehicles || vehicles.length === 0) {
          return [];
        }
        return this.calculateVehicleCounts(vehicles);
      }),
      shareReplay(1),
    );
  }

  /**
   * Calculates vehicle count array by type using VehicleType enum filtering.
   * @param vehicles Array of detected vehicles
   * @returns Array of counts [cars, motorcycles, buses, trucks, bicycles]
   * @private
   */
  private calculateVehicleCounts(vehicles: VehicleDetected[]): number[] {
    const carCount = vehicles.filter(
      (v: VehicleDetected) => v.vehicleType === VehicleType.CAR,
    ).length;
    const motorcycleCount = vehicles.filter(
      (v: VehicleDetected) => v.vehicleType === VehicleType.MOTORCYCLE,
    ).length;
    const busCount = vehicles.filter(
      (v: VehicleDetected) => v.vehicleType === VehicleType.BUS,
    ).length;
    const truckCount = vehicles.filter(
      (v: VehicleDetected) => v.vehicleType === VehicleType.TRUCK,
    ).length;
    const bicycleCount = vehicles.filter(
      (v: VehicleDetected) => v.vehicleType === VehicleType.BICYCLE,
    ).length;

    return [carCount, motorcycleCount, busCount, truckCount, bicycleCount];
  }
}
