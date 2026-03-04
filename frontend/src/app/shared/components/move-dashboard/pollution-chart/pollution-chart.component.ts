import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

// Registrar los elementos de Chart.js
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * PollutionChartComponent
 *
 * Componente que muestra un gráfico de línea con tendencias de Partículas (PM2.5 y PM10)
 * en las últimas 24 horas. Usa dos ejes Y para escalas distintas.
 * Conectado a SensorDataService para obtener datos reales del backend.
 *
 * Características:
 * - Gráfico de línea dual: PM2.5 y PM10
 * - Ejes Y independientes para cada métrica
 * - Datos actualizados desde el backend
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-pollution-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @returns Gráfico de tendencia de partículas
 *
 * @example
 * <app-pollution-chart />
 */
@Component({
  selector: 'app-pollution-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './pollution-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollutionChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Observable que emite la configuración del gráfico con datos reactivos
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable que emite el promedio de PM 2.5
   */
  avgPm25$!: Observable<number>;

  /**
   * Observable que emite el promedio de PM 10
   */
  avgPm10$!: Observable<number>;

  /**
   * Observable compartido para los datos del sensor
   * @private
   */
  private sensorData$!: Observable<any[]>;

  /**
   * Datos por defecto del gráfico cuando no hay datos disponibles
   */
  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
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
            return label + ': ' + (value !== null ? value.toFixed(1) : 'N/A');
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
          text: 'PM 2.5 (µg/m³)',
          color: '#ef4444',
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
          color: '#ef4444',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'PM 10 (µg/m³)',
          color: '#f59e0b',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#f59e0b',
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
        console.error('Error cargando datos de partículas:', error);
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
      map((data: any[]) => {
        if (!data || data.length === 0) {
          return this.defaultChartData;
        }

        const pm25Data = data.map(d => d.pm25);
        const pm10Data = data.map(d => d.pm10);
        const timeLabels = data.map((d: any) => {
          const time = new Date(d.timestamp);
          const hour = String(time.getHours()).padStart(2, '0');
          const minute = String(time.getMinutes()).padStart(2, '0');
          return `${hour}:${minute}`;
        });

        return {
          labels: timeLabels,
          datasets: [
            {
              label: 'PM 2.5 (µg/m³)',
              data: pm25Data,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y',
            },
            {
              label: 'PM 10 (µg/m³)',
              data: pm10Data,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#f59e0b',
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
   * Inicializa los observables de promedios PM2.5 y PM10
   * @private
   */
  private initializeAverages(): void {
    this.avgPm25$ = this.sensorData$.pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, d) => acc + (d.pm25 || 0), 0);
        return sum / data.length;
      }),
      shareReplay(1)
    );

    this.avgPm10$ = this.sensorData$.pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, d) => acc + (d.pm10 || 0), 0);
        return sum / data.length;
      }),
      shareReplay(1)
    );
  }
}
