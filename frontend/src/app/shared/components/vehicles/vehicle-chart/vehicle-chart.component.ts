import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

/**
 * VehicleChartComponent
 *
 * Componente que muestra gráficos de estadísticas de vehículos.
 * Visualiza tendencias de detecciones, tipos de vehículos y patrones horarios.
 * Carga datos en tiempo real desde el backend.
 *
 * Características:
 * - Gráfico de línea: Detecciones por hora
 * - Gráfico de barras: Tipos de vehículos
 * - Datos actualizados desde el backend
 * - Animaciones suaves
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-vehicle-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @returns Gráfico de estadísticas
 *
 * @example
 * <app-vehicle-chart />
 */
@Component({
  selector: 'app-vehicle-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './vehicle-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleChartComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Configuración del gráfico de línea
   * @type {ChartConfiguration}
   */
  lineChartConfig: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
      datasets: [
        {
          label: 'Detecciones por hora',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 12, weight: 'bold' },
            usePointStyle: true,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          // Eliminamos el 'max: 300' fijo para que Chart.js lo calcule automáticamente
          title: {
            display: true,
            text: 'Detecciones',
          },
        },
      },
    },
  };

  /**
   * Configuración del gráfico de barras
   * @type {ChartConfiguration}
   */
  barChartConfig: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: ['Auto', 'Moto', 'Camión', 'Bus'],
      datasets: [
        {
          label: 'Cantidad detectada',
          data: [0, 0, 0, 0],
          backgroundColor: ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 12, weight: 'bold' },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };

  /**
   * Constructor e inyección de dependencias
   */
  constructor(
    private vehicleService: VehicleDetectedService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Hook del ciclo de vida: Carga los datos al inicializar
   */
  ngOnInit(): void {
    this.loadChartData();
  }

  /**
   * Hook del ciclo de vida: Limpia las suscripciones
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga y procesa datos del backend para los gráficos
   * @private
   * @returns {void}
   */
  private loadChartData(): void {
    this.vehicleService
      .getAll()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading vehicle chart data:', error);
          return of([]);
        }),
      )
      .subscribe((vehicles: VehicleDetected[]) => {
        this.updateLineChart(vehicles);
        this.updateBarChart(vehicles);
        this.cdr.markForCheck();
      });
  }

  /**
   * Actualiza el gráfico de línea con datos de detecciones por hora
   * @private
   * @param {VehicleDetected[]} vehicles - Array de vehículos detectados
   * @returns {void}
   */
  private updateLineChart(vehicles: VehicleDetected[]): void {
    // Agrupar vehículos por hora
    const hourBuckets = [0, 4, 8, 12, 16, 20, 24];
    const counts = new Array(7).fill(0);

    vehicles.forEach((vehicle) => {
      const hour = new Date(vehicle.timestamp).getHours();
      let bucketIndex = 0;

      // Encontrar el bucket de hora correspondiente
      for (let i = hourBuckets.length - 1; i >= 0; i--) {
        if (hour >= hourBuckets[i]) {
          bucketIndex = i;
          break;
        }
      }

      counts[bucketIndex]++;
    });

    // Actualizar datos del gráfico
    if (this.lineChartConfig.data?.datasets?.[0]) {
      this.lineChartConfig.data.datasets[0].data = counts;
    }
  }

  /**
   * Actualiza el gráfico de barras con datos de tipos de vehículos
   * @private
   * @param {VehicleDetected[]} vehicles - Array de vehículos detectados
   * @returns {void}
   */
  private updateBarChart(vehicles: VehicleDetected[]): void {
    const carCount = vehicles.filter((v) => v.vehicleType === 'CAR').length;
    const motorcycleCount = vehicles.filter((v) => v.vehicleType === 'MOTORCYCLE').length;
    const truckCount = vehicles.filter((v) => v.vehicleType === 'TRUCK').length;
    const busCount = vehicles.filter((v) => v.vehicleType === 'BUS').length;

    // Actualizar datos del gráfico
    if (this.barChartConfig.data?.datasets?.[0]) {
      this.barChartConfig.data.datasets[0].data = [carCount, motorcycleCount, truckCount, busCount];
    }
  }
}
