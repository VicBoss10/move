import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, switchMap } from 'rxjs/operators';

// Registrar los elementos de Chart.js
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * PollutionChartComponent
 *
 * Componente que muestra un gráfico de línea con tendencias de Partículas (PM2.5 y PM10)
 * en las últimas 12 horas, promediadas por hora. Usa dos ejes Y para escalas distintas.
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

  /**
   * Ventana de horas a mostrar en la gráfica
   */
  private readonly HOURS_WINDOW = 12;

  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
    this.initializeAverages();
  }

  /**
   * Inicializa el observable compartido de datos del sensor.
   * Obtiene el último registro para determinar la ventana de tiempo
   * y luego consulta solo las últimas 12 horas al backend.
   * @private
   */
  private initializeSensorData(): void {
    this.sensorData$ = this.sensorDataService.getLatest().pipe(
      switchMap((latest) => {
        const endTime = new Date(latest.timestamp);
        const startTime = new Date(endTime.getTime() - this.HOURS_WINDOW * 3600000);
        return this.sensorDataService.search({ start: startTime, end: endTime });
      }),
      catchError((error) => {
        console.error('Error cargando datos de partículas:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa los datos del gráfico desde el observable compartido.
   * Agrupa los datos por hora y los promedia para tener 12 puntos limpios.
   * @private
   */
  private initializeChartData(): void {
    this.chartData$ = this.sensorData$.pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) {
          return this.defaultChartData;
        }

        // Parsear timestamps y ordenar cronológicamente
        const parsedData = data
          .map(d => ({ ...d, _time: new Date(d.timestamp) }))
          .filter(d => !isNaN(d._time.getTime()))
          .sort((a, b) => a._time.getTime() - b._time.getTime());

        if (parsedData.length === 0) {
          return this.defaultChartData;
        }

        // Hora del dato más reciente como referencia
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

        // Agrupar datos en cada slot horario y promediar
        const pm25Data: (number | null)[] = [];
        const pm10Data: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter(
            d => d._time >= slot.start && d._time < slot.end
          );

          if (slotData.length > 0) {
            const avgPm25 = slotData.reduce((sum, d) => sum + (d.pm25 || 0), 0) / slotData.length;
            const avgPm10 = slotData.reduce((sum, d) => sum + (d.pm10 || 0), 0) / slotData.length;
            pm25Data.push(Math.round(avgPm25 * 100) / 100);
            pm10Data.push(Math.round(avgPm10 * 100) / 100);
          } else {
            pm25Data.push(null);
            pm10Data.push(null);
          }
        }

        return {
          labels,
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
        const values = data.filter(d => d.pm25 != null).map(d => d.pm25);
        if (values.length === 0) return 0;
        return values.reduce((a: number, b: number) => a + b, 0) / values.length;
      }),
      shareReplay(1)
    );

    this.avgPm10$ = this.sensorData$.pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) return 0;
        const values = data.filter(d => d.pm10 != null).map(d => d.pm10);
        if (values.length === 0) return 0;
        return values.reduce((a: number, b: number) => a + b, 0) / values.length;
      }),
      shareReplay(1)
    );
  }
}
