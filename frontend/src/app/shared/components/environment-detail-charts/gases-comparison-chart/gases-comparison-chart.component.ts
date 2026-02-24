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
 * Componente que muestra un gráfico dinámico comparativo de múltiples gases
 * (CO, NO₂, NH₃) en las últimas 24 horas desde la base de datos.
 * Utiliza RxJS Observables y ChangeDetectionStrategy.OnPush.
 * 
 * @selector app-gases-comparison-chart
 * @standalone true
 */
@Component({
  selector: 'app-gases-comparison-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './gases-comparison-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasesComparisonChartComponent {
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
   * Observable que emite valores actuales de cada gas
   */
  gasValues$!: Observable<{
    co: number;
    no2: number;
    nh3: number;
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
          text: 'Concentración (µg/m³, ppm, ppb)',
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
        label: 'CO (ppm)',
        data: Array(24).fill(0),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'NO₂ (µg/m³)',
        data: Array(24).fill(0),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'NH₃ (ppb)',
        data: Array(24).fill(0),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeChartData();
    this.initializeGasValues();
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

        // Obtener los últimos 24 valores de cada gas
        const coValues = sensorData.map((d) => d.co || 0);
        const no2Values = sensorData.map((d) => d.no2 || 0);
        const nh3Values = sensorData.map((d) => d.nh3 || 0);

        // Tomar últimos 24 valores
        const displayCO = coValues.length > 24 ? coValues.slice(-24) : coValues;
        const displayNO2 = no2Values.length > 24 ? no2Values.slice(-24) : no2Values;
        const displayNH3 = nh3Values.length > 24 ? nh3Values.slice(-24) : nh3Values;

        // Usar labels según la cantidad de datos
        const displayLabels = this.timeLabels.slice(0, Math.max(displayCO.length, displayNO2.length, displayNH3.length));

        return {
          labels: displayLabels,
          datasets: [
            {
              ...this.defaultChartData.datasets![0],
              data: displayCO,
            },
            {
              ...this.defaultChartData.datasets![1],
              data: displayNO2,
            },
            {
              ...this.defaultChartData.datasets![2],
              data: displayNH3,
            },
          ],
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de gases:', error);
        return of(this.defaultChartData);
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa los valores actuales de los gases
   */
  private initializeGasValues(): void {
    this.gasValues$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => ({
        co: Math.round((latestData?.co || 0) * 10) / 10,
        no2: Math.round(latestData?.no2 || 0),
        nh3: Math.round((latestData?.nh3 || 0) * 10) / 10,
      })),
      catchError(() =>
        of({
          co: 0,
          no2: 0,
          nh3: 0,
          c6h6: 0,
        })
      ),
      shareReplay(1)
    );
  }
}
