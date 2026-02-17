import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';

// Registrar los elementos de Chart.js
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * Componente que muestra un gráfico de línea con tendencias de Partículas (PM2.5 y PM10)
 * en las últimas 24 horas. Usa dos ejes Y para escalas distintas.
 * Conectado a SensorDataService para obtener datos reales del backend.
 * 
 * @selector app-pollution-chart
 * @standalone true
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

  private isLoading$ = new BehaviorSubject<boolean>(true);

  /**
   * Observable que emite la configuración del gráfico con datos reactivos
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  private readonly defaultPm25Data: number[] = [25, 24, 23, 22, 21, 20, 19, 20, 22, 24, 26, 28, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19];
  private readonly defaultPm10Data: number[] = [35, 34, 33, 32, 31, 30, 29, 30, 32, 34, 36, 38, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29];

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
    this.chartData$ = this.sensorDataService.getAll().pipe(
      map((data: any[]) => {
        const pm25Data = data?.length > 0 ? data.map(d => d.pm25) : this.defaultPm25Data;
        const pm10Data = data?.length > 0 ? data.map(d => d.pm10) : this.defaultPm10Data;
        const timeLabels = data?.length > 0 
          ? data.map((d: any) => {
              const time = new Date(d.timestamp);
              const hour = String(time.getHours()).padStart(2, '0');
              const minute = String(time.getMinutes()).padStart(2, '0');
              return `${hour}:${minute}`;
            })
          : ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

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
      tap(() => this.isLoading$.next(false)),
      catchError((err) => {
        console.error('Error cargando datos de partículas:', err);
        this.isLoading$.next(false);
        return of({
          labels: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
          datasets: [
            {
              label: 'PM 2.5 (µg/m³)',
              data: this.defaultPm25Data,
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
              data: this.defaultPm10Data,
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
        });
      }),
      shareReplay(1)
    );
  }
}
