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

// Registrar los elementos de Chart.js
ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

/**
 * VehicleActivityComponent
 *
 * Componente que muestra un gráfico de barras horizontal con conteo de vehículos
 * por tipo: Carros, Motos, Buses, Camiones, Bicicletas. Actualizado diariamente.
 * Conectado a VehicleDetectedService para obtener datos en tiempo real.
 *
 * Características:
 * - Gráfico de barras horizontal
 * - Conteo por tipo de vehículo
 * - Datos actualizados desde el backend
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-vehicle-activity
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @returns Gráfico de actividad vehicular
 *
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
   * Observable que emite la configuración del gráfico de barras con conteos de vehículos
   */
  chartData$!: Observable<ChartConfiguration<'bar'>['data']>;

  /**
   * Observable que emite los conteos individuales de vehículos por tipo
   */
  vehicleCounts$!: Observable<number[]>;

  /**
   * Observable compartido de datos de vehículos
   * @private
   */
  private vehicleData$!: Observable<VehicleDetected[]>;

  /**
   * Tipos de vehículos mapeados al enum VehicleType del backend
   */
  private readonly vehicleTypes: string[] = ['Carros', 'Motos', 'Buses', 'Camiones', 'Bicicletas'];

  /**
   * Datos por defecto del gráfico
   */
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
            return 'Detectados: ' + value;
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
          text: 'Cantidad',
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
   * Inicializa el observable compartido de datos de vehículos
   * Filtra en memoria solo los vehículos detectados hoy
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
        // Filtrar solo vehículos de hoy
        return vehicles.filter((v) => {
          const vDate = new Date(v.timestamp);
          return vDate >= todayStart && vDate <= now;
        });
      }),
      catchError((error) => {
        console.error('Error cargando datos de vehículos:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Inicializa los datos del gráfico desde el observable compartido
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
              label: 'Cantidad de Vehículos',
              data: vehicleCounts,
              backgroundColor: [
                '#3b82f6', // Azul para Carros
                '#10b981', // Verde para Motos
                '#f97316', // Naranja para Buses
                '#ef4444', // Rojo para Camiones
                '#8b5cf6', // Púrpura para Bicicletas
              ],
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
   * Inicializa los conteos de vehículos desde el observable compartido
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
   * Calcula los conteos de vehículos por tipo
   * @private
   * @param {any[]} vehicles - Array de vehículos detectados
   * @returns {number[]} Array de conteos [carros, motos, buses, camiones, bicicletas]
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
