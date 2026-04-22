import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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

// Registrar los módulos necesarios de Chart.js para el gráfico Donut
Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

/**
 * VehicleTypeChartComponent
 *
 * Muestra la distribución de detecciones de vehículos por tipo en un gráfico Donut.
 * Recibe las estadísticas del contenedor padre (vehicles-stats) evitando duplicar llamadas al API.
 *
 * @selector app-vehicle-type-chart
 * @standalone true
 */
@Component({
  selector: 'app-vehicle-type-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-type-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleTypeChartComponent implements OnChanges {
  /** Estadísticas calculadas en el padre y pasadas por Input */
  @Input() stats: VehicleStats = {
    totalDetected: 0,
    carCount: 0,
    motorcycleCount: 0,
    busCount: 0,
    truckCount: 0,
  };

  /** Datos del gráfico, actualizados en ngOnChanges */
  donutData: ChartData<'doughnut'> = {
    labels: ['Auto', 'Moto', 'Bus', 'Camión'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
        hoverBackgroundColor: ['#2563eb', '#7c3aed', '#d97706', '#dc2626'],
        borderWidth: 2,
        borderColor: 'transparent',
        hoverOffset: 6,
      },
    ],
  };

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

  constructor(private cdr: ChangeDetectorRef) {}

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
            ],
          },
        ],
      };
      this.cdr.markForCheck();
    }
  }
}
