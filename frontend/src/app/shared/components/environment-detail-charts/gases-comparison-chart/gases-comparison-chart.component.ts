import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, switchMap } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

// Registrar los scales y elementos
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * Componente que muestra un gráfico dinámico comparativo de múltiples gases
 * (CO, NO₂, NH₃) en las últimas 12 horas, promediando por hora.
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

  /**
   * Ventana de horas a mostrar
   */
  private readonly HOURS_WINDOW = 12;

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

  /**
   * Observable compartido de datos del sensor (últimas 12h)
   */
  private sensorData$!: Observable<any[]>;

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 0,
        bottom: 0
      }
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
    labels: [],
    datasets: [],
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
    this.initializeGasValues();
  }

  /**
   * Obtiene el último registro para determinar la ventana de tiempo
   * y luego consulta solo las últimas 12 horas al backend.
   */
  private initializeSensorData(): void {
    this.sensorData$ = this.sensorDataService.getLatest().pipe(
      switchMap((latest) => {
        const endTime = new Date(latest.timestamp);
        const startTime = new Date(endTime.getTime() - this.HOURS_WINDOW * 3600000);
        return this.sensorDataService.search({ start: startTime, end: endTime });
      }),
      catchError((error) => {
        console.error('Error cargando datos de gases:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa los datos del gráfico agrupando por hora y promediando.
   */
  private initializeChartData(): void {
    this.chartData$ = this.sensorData$.pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) {
          return this.defaultChartData;
        }

        const parsedData = data
          .map(d => ({ ...d, _time: new Date(d.timestamp) }))
          .filter(d => !isNaN(d._time.getTime()))
          .sort((a, b) => a._time.getTime() - b._time.getTime());

        if (parsedData.length === 0) {
          return this.defaultChartData;
        }

        const latestTime = parsedData[parsedData.length - 1]._time;
        const latestSlotStart = new Date(
          latestTime.getFullYear(),
          latestTime.getMonth(),
          latestTime.getDate(),
          latestTime.getHours(),
          0, 0, 0
        );

        // Crear 12 slots horarios hacia atrás desde la hora más reciente
        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map(s => s.label);
        const coData: (number | null)[] = [];
        const no2Data: (number | null)[] = [];
        const nh3Data: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter(
            d => d._time >= slot.start && d._time < slot.end
          );
          if (slotData.length > 0) {
            const avgCo = slotData.reduce((sum, d) => sum + (d.co || 0), 0) / slotData.length;
            const avgNo2 = slotData.reduce((sum, d) => sum + (d.no2 || 0), 0) / slotData.length;
            const avgNh3 = slotData.reduce((sum, d) => sum + (d.nh3 || 0), 0) / slotData.length;
            coData.push(Math.round(avgCo * 100) / 100);
            no2Data.push(Math.round(avgNo2 * 100) / 100);
            nh3Data.push(Math.round(avgNh3 * 100) / 100);
          } else {
            coData.push(null);
            no2Data.push(null);
            nh3Data.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'CO (ppm)',
              data: coData,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#8b5cf6',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'NO₂ (µg/m³)',
              data: no2Data,
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
            },
            {
              label: 'NH₃ (ppb)',
              data: nh3Data,
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#06b6d4',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        };
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa los valores actuales de los gases (desde el último registro)
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
        })
      ),
      shareReplay(1)
    );
  }
}
