import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

// Registrar los scales y elementos
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * Componente que muestra un gráfico dinámico de línea comparativo de partículas
 * PM2.5 y PM10 en las últimas 24 horas desde la base de datos.
 * Utiliza RxJS Observables y ChangeDetectionStrategy.OnPush.
 * 
 * @selector app-particles-chart
 * @standalone true
 */
@Component({
  selector: 'app-particles-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './particles-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticlesChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Datos de las últimas 24 horas
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
   * Observable que emite valores actuales de partículas
   */
  pmValues$!: Observable<{
    pm25: number;
    pm10: number;
  }>;

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
          text: 'Partículas (µg/m³)',
          color: '#6B7280',
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
          color: '#6B7280',
        },
      },
    },
  };

  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [
      {
        label: 'PM2.5 (µg/m³)',
        data: Array(24).fill(0),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'PM10 (µg/m³)',
        data: Array(24).fill(0),
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
    ],
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeChartData();
    this.initializePMValues();
  }

  /**
   * Inicializa los datos del gráfico desde el servicio
   */
  private initializeChartData(): void {
    this.chartData$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultChartData;
        }

        // Obtener los últimos 24 valores de cada partícula
        const pm25Values = sensorData.map((d) => d.pm25 || 0);
        const pm10Values = sensorData.map((d) => d.pm10 || 0);

        // Tomar últimos 24 valores
        const displayPM25 = pm25Values.length > 24 ? pm25Values.slice(-24) : pm25Values;
        const displayPM10 = pm10Values.length > 24 ? pm10Values.slice(-24) : pm10Values;

        // Usar labels según la cantidad de datos
        const displayLabels = this.timeLabels.slice(0, Math.max(displayPM25.length, displayPM10.length));

        return {
          labels: displayLabels,
          datasets: [
            {
              ...this.defaultChartData.datasets![0],
              data: displayPM25,
            },
            {
              ...this.defaultChartData.datasets![1],
              data: displayPM10,
            },
          ],
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de partículas:', error);
        return of(this.defaultChartData);
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa los valores actuales de las partículas
   */
  private initializePMValues(): void {
    this.pmValues$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => ({
        pm25: Math.round((latestData?.pm25 || 0) * 10) / 10,
        pm10: Math.round((latestData?.pm10 || 0) * 10) / 10,
      })),
      catchError(() =>
        of({
          pm25: 0,
          pm10: 0,
        })
      ),
      shareReplay(1)
    );
  }
}
