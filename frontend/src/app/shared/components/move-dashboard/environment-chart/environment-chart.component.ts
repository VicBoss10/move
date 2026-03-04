import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

// Registrar los scales y elementos
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * EnvironmentChartComponent
 *
 * Componente que muestra un gráfico de línea con tendencias de Temperatura y Humedad
 * en las últimas 24 horas. Utiliza dos ejes Y para escalar independientemente.
 * Conectado con SensorDataService para obtener datos reales del backend.
 *
 * Características:
 * - Gráfico de línea dual: Temperatura y Humedad
 * - Ejes Y independientes
 * - Datos actualizados desde el backend
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-environment-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @returns Gráfico de tendencia ambiental
 *
 * @example
 * <app-environment-chart />
 */
@Component({
  selector: 'app-environment-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './environment-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Labels de tiempo para el eje X
   */
  private readonly timeLabels: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  /**
   * Observable que emite la configuración del gráfico con datos reactivos
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable que emite el promedio de temperatura
   */
  avgTemperature$!: Observable<number>;

  /**
   * Observable que emite el promedio de humedad
   */
  avgHumidity$!: Observable<number>;

  /**
   * Observable compartido para los datos del sensor
   * @private
   */
  private sensorData$!: Observable<SensorData[]>;

  /**
   * Datos por defecto del gráfico
   */
  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [],
  };

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 500,
          },
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
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return label + ': ' + (value !== null ? value.toFixed(2) : 'N/A');
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
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          maxTicksLimit: 12,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Temperatura (°C)',
          color: '#f97316',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#f97316',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Humedad (%)',
          color: '#3b82f6',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#3b82f6',
        },
      },
    },
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
    this.initializeAverages();
  }

  /**
   * Inicializa el observable compartido de datos del sensor
   * @private
   */
  private initializeSensorData(): void {
    this.sensorData$ = this.sensorDataService.getAll().pipe(
      catchError((error) => {
        console.error('Error cargando datos de sensores:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa los datos del gráfico desde el observable compartido
   * @private
   */
  private initializeChartData(): void {
    this.chartData$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) {
          return this.defaultChartData;
        }

        const tempData = data.map(d => d.temperature);
        const humidityData = data.map(d => d.humidity);
        
        return {
          labels: this.timeLabels,
          datasets: [
            {
              label: 'Temperatura (°C)',
              data: tempData,
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#f97316',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y',
            },
            {
              label: 'Humedad (%)',
              data: humidityData,
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
              yAxisID: 'y1',
            },
          ],
        };
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa los observables de promedios de temperatura y humedad
   * @private
   */
  private initializeAverages(): void {
    this.avgTemperature$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, d) => acc + (d.temperature || 0), 0);
        return sum / data.length;
      }),
      shareReplay(1)
    );

    this.avgHumidity$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, d) => acc + (d.humidity || 0), 0);
        return sum / data.length;
      }),
      shareReplay(1)
    );
  }
}