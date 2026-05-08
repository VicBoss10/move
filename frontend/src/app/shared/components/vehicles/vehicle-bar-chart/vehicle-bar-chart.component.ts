import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
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
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

@Component({
  selector: 'app-vehicle-bar-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-bar-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleBarChartComponent implements OnChanges {
  @Input() vehicles: VehicleDetected[] = [];

  barChartData$!: Observable<ChartConfiguration<'bar'>['data']>;

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
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
        ticks: { color: '#6B7280', font: { size: 11 } },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: { display: true, text: 'Count', color: '#f59e0b', font: { weight: 'bold' } },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: { color: '#f59e0b' },
      },
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicles']) {
      this.barChartData$ = of(this.vehicles).pipe(
        map((vehicles) => this.buildBarChartData(vehicles)),
        shareReplay(1),
      );
    }
  }

  private buildBarChartData(vehicles: VehicleDetected[]): ChartConfiguration<'bar'>['data'] {
    const carCount = vehicles.filter((v) => v.vehicleType === 'CAR').length;
    const busCount = vehicles.filter((v) => v.vehicleType === 'BUS').length;
    const motorcycleCount = vehicles.filter((v) => v.vehicleType === 'MOTORCYCLE').length;
    const truckCount = vehicles.filter((v) => v.vehicleType === 'TRUCK').length;
    const bicycleCount = vehicles.filter((v) => v.vehicleType === 'BICYCLE').length;

    return {
      labels: ['Auto', 'Bus', 'Moto', 'Camión', 'Bicicleta'],
      datasets: [
        {
          label: 'Detected vehicles',
          data: [carCount, busCount, motorcycleCount, truckCount, bicycleCount],
          backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981'],
          borderRadius: 8,
          yAxisID: 'y',
        },
      ],
    };
  }
}
