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

@Component({
  selector: 'app-vehicle-activity',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-activity.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleActivityComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  chartData$: Observable<ChartConfiguration<'bar'>['data']>;
  vehicleCounts$: Observable<number[]>;

  private readonly vehicleTypes: string[] = ['Cars', 'Motorcycles', 'Buses', 'Trucks', 'Bicycles'];

  private readonly defaultChartData: ChartConfiguration<'bar'>['data'] = {
    labels: this.vehicleTypes,
    datasets: [],
  };

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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const vehicleSource$ = this.vehicleService.getAll().pipe(
      map((vehicles: VehicleDetected[]) => {
        if (!vehicles || vehicles.length === 0) return [];
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

    this.chartData$ = vehicleSource$.pipe(
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

    this.vehicleCounts$ = vehicleSource$.pipe(
      map((vehicles: VehicleDetected[]) => {
        if (!vehicles || vehicles.length === 0) return [];
        return this.calculateVehicleCounts(vehicles);
      }),
      shareReplay(1),
    );
  }

  private calculateVehicleCounts(vehicles: VehicleDetected[]): number[] {
    const carCount = vehicles.filter((v) => v.vehicleType === VehicleType.CAR).length;
    const motorcycleCount = vehicles.filter((v) => v.vehicleType === VehicleType.MOTORCYCLE).length;
    const busCount = vehicles.filter((v) => v.vehicleType === VehicleType.BUS).length;
    const truckCount = vehicles.filter((v) => v.vehicleType === VehicleType.TRUCK).length;
    const bicycleCount = vehicles.filter((v) => v.vehicleType === VehicleType.BICYCLE).length;
    return [carCount, motorcycleCount, busCount, truckCount, bicycleCount];
  }
}
