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
 * HumidityChartComponent
 *
 * Componente especializado para mostrar la tendencia de humedad relativa en las últimas 24 horas.
 * Utiliza Chart.js para visualizar datos de humedad con una línea de gráfico azul.
 *
 * @selector app-humidity-chart
 * @standalone true
 * @imports [CommonModule, BaseChartDirective]
 * @returns {Component} Componente para mostrar tendencia de humedad
 *
 * @example
 * // Uso en plantilla
 * <app-humidity-chart />
 *
 * @example
 * // Uso en componente
 * import { HumidityChartComponent } from '@shared/components/environment-detail-charts/humidity-chart/humidity-chart.component';
 *
 * @Component({
 *   imports: [HumidityChartComponent],
 * })
 * export class ParentComponent {}
 */
@Component({
  selector: 'app-humidity-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './humidity-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Observable que emite la configuración del gráfico con datos reactivos
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable que emite valor actual de humedad
   */
  humidityValue$!: Observable<number>;

  private readonly timeLabels: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [
      {
        label: 'Humedad Relativa (%)',
        data: Array(24).fill(0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
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
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
            weight: 500 as any,
          },
          color: '#6b7280',
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y ?? 0;
            return `${context.dataset.label}: ${value.toFixed(1)}%`;
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
          text: 'Humedad (%)',
          color: '#3b82f6',
          font: {
            weight: 'bold',
          },
        },
        min: 0,
        max: 100,
        ticks: {
          color: '#3b82f6',
          font: {
            size: 11,
          },
          callback: function (value) {
            return value + '%';
          },
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          display: true,
        },
      },

    },
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeChartData();
    this.initializeHumidityValue();
  }

  private initializeChartData(): void {
    this.chartData$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultChartData;
        }
        const humidityValues = sensorData.map((d) => d.humidity || 0);
        const displayHumidity = humidityValues.length > 24 ? humidityValues.slice(-24) : humidityValues;
        const displayLabels = this.timeLabels.slice(0, Math.max(displayHumidity.length));
        return {
          labels: displayLabels,
          datasets: [
            {
              ...this.defaultChartData.datasets![0],
              data: displayHumidity,
            },
          ],
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de humedad:', error);
        return of(this.defaultChartData);
      }),
      shareReplay(1)
    );
  }

  private initializeHumidityValue(): void {
    this.humidityValue$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => Math.round((latestData?.humidity || 0) * 10) / 10),
      catchError(() => of(0)),
      shareReplay(1)
    );
  }

  getMinValue(values: any[]): number {
    if (!values || values.length === 0) return 0;
    const numValues = values.filter(v => typeof v === 'number');
    return numValues.length > 0 ? Math.min(...numValues) : 0;
  }

  getAvgValue(values: any[]): number {
    if (!values || values.length === 0) return 0;
    const numValues = values.filter(v => typeof v === 'number');
    if (numValues.length === 0) return 0;
    const sum = numValues.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / numValues.length) * 10) / 10;
  }

  getMaxValue(values: any[]): number {
    if (!values || values.length === 0) return 0;
    const numValues = values.filter(v => typeof v === 'number');
    return numValues.length > 0 ? Math.max(...numValues) : 0;
  }
}
