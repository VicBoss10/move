import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

// Registrar los scales y elementos
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * Componente que muestra un gráfico dinámico de línea con la tendencia de CO₂
 * en las últimas 24 horas desde la base de datos. Utiliza RxJS Observables
 * y sigue el patrón reactivo con ChangeDetectionStrategy.OnPush.
 * 
 * Datos obtenidos de: SensorDataService
 * Unidad: ppm (partes por millón)
 * 
 * @selector app-co2-chart
 * @standalone true
 */
@Component({
  selector: 'app-co2-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './co2-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Co2ChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private isLoading$ = new BehaviorSubject<boolean>(true);

  // Labels de las últimas 24 horas
  private readonly timeLabels: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  /**
   * Observable con la configuración del gráfico
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable con estadísticas de CO₂
   */
  stats$!: Observable<{ min: number; avg: number; max: number }>;

  chartOptions: ChartConfiguration<'line'>['options'] = {
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
            return label + ': ' + (value !== null ? value.toFixed(1) : 'N/A') + ' ppm';
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
          text: 'CO₂ (ppm)',
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
    },
  };

  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [
      {
        label: 'CO₂ (ppm)',
        data: Array(24).fill(0),
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
    ],
  };

  constructor(private sensorDataService: SensorDataService) {
    // Observable para datos del gráfico
    this.chartData$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultChartData;
        }

        // Tomar los últimos 24 valores de CO₂ (o menos si no hay 24)
        const co2Values = sensorData.map((d) => d.co2 || 0);
        
        // Si hay más de 24 datos, tomar solo los últimos 24
        const displayData = co2Values.length > 24 
          ? co2Values.slice(-24)
          : co2Values;

        // Usar labels según la cantidad de datos
        const displayLabels = this.timeLabels.slice(0, displayData.length);

        return {
          labels: displayLabels,
          datasets: [
            {
              label: 'CO₂ (ppm)',
              data: displayData,
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
          ],
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de CO₂:', error);
        this.isLoading$.next(false);
        return of(this.defaultChartData);
      }),
      shareReplay(1)
    );

    // Observable para estadísticas
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) {
          return { min: 0, avg: 0, max: 0 };
        }

        // Tomar solo los últimos 24 valores (consistente con el gráfico)
        const co2Values = sensorData.map((d) => d.co2 || 0).filter((v) => v > 0);
        if (co2Values.length === 0) {
          return { min: 0, avg: 0, max: 0 };
        }

        const displayValues = co2Values.length > 24 
          ? co2Values.slice(-24)
          : co2Values;

        const min = Math.min(...displayValues);
        const max = Math.max(...displayValues);
        const avg = displayValues.reduce((a, b) => a + b, 0) / displayValues.length;

        this.isLoading$.next(false);
        return { min: Math.round(min), avg: Math.round(avg), max: Math.round(max) };
      }),
      catchError((error) => {
        console.error('Error calculando estadísticas de CO₂:', error);
        this.isLoading$.next(false);
        return of({ min: 0, avg: 0, max: 0 });
      }),
      shareReplay(1)
    );
  }
}
