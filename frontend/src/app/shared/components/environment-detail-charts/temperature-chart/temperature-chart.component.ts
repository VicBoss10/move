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
 * Componente que muestra un gráfico dinámico de línea con la tendencia de temperatura
 * en las últimas 24 horas, promediando por hora. Mediciones en grados Celsius.
 * Utiliza RxJS Observables y ChangeDetectionStrategy.OnPush.
 *
 * @selector app-temperature-chart
 * @standalone true
 */
@Component({
  selector: 'app-temperature-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './temperature-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Ventana de horas a mostrar
   */
  private readonly HOURS_WINDOW = 24;

  /**
   * Observable que emite la configuración del gráfico con datos reactivos
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable que emite valor actual de temperatura
   */
  tempValue$!: Observable<number>;

  /**
   * Observable compartido de datos del sensor (últimas 24h)
   */
  private sensorData$!: Observable<any[]>;

  /**
   * Opciones de configuración del gráfico
   */
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
        borderColor: '#f97316',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y ?? 0;
            return `${context.dataset.label}: ${value.toFixed(1)}°C`;
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
        ticks: {
          color: '#f97316',
          font: {
            size: 11,
          },
          callback: function (value) {
            return value + '°C';
          },
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          display: true,
        },
        beginAtZero: false,
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
    this.initializeTempValue();
  }

  /**
   * Obtiene el último registro para determinar la ventana de tiempo
   * y luego consulta solo las últimas 24 horas al backend.
   */
  private initializeSensorData(): void {
    this.sensorData$ = this.sensorDataService.getLatest().pipe(
      switchMap((latest) => {
        const endTime = new Date(latest.timestamp);
        const startTime = new Date(endTime.getTime() - this.HOURS_WINDOW * 3600000);
        return this.sensorDataService.search({ start: startTime, end: endTime });
      }),
      catchError((error) => {
        console.error('Error cargando datos de temperatura:', error);
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

        // Crear 24 slots horarios hacia atrás desde la hora más reciente
        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map(s => s.label);
        const tempData: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter(
            d => d._time >= slot.start && d._time < slot.end
          );
          if (slotData.length > 0) {
            const avg = slotData.reduce((sum, d) => sum + (d.temperature || 0), 0) / slotData.length;
            tempData.push(Math.round(avg * 100) / 100);
          } else {
            tempData.push(null);
          }
        }

        return {
          labels,
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
          ],
        };
      }),
      shareReplay(1)
    );
  }

  /**
   * Inicializa el valor actual de temperatura (desde el último registro)
   */
  private initializeTempValue(): void {
    this.tempValue$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => Math.round((latestData?.temperature || 0) * 10) / 10),
      catchError(() => of(0)),
      shareReplay(1)
    );
  }

  /**
   * Calcula el valor mínimo de un array de datos
   */
  getMinValue(data: any[]): number {
    const validData = data.filter(d => d !== null && typeof d === 'number') as number[];
    return validData.length > 0 ? Math.min(...validData) : 0;
  }

  /**
   * Calcula el valor promedio de un array de datos
   */
  getAvgValue(data: any[]): number {
    const validData = data.filter(d => d !== null && typeof d === 'number') as number[];
    if (validData.length === 0) return 0;
    const sum = validData.reduce((acc, val) => acc + val, 0);
    return sum / validData.length;
  }

  /**
   * Calcula el valor máximo de un array de datos
   */
  getMaxValue(data: any[]): number {
    const validData = data.filter(d => d !== null && typeof d === 'number') as number[];
    return validData.length > 0 ? Math.max(...validData) : 0;
  }
}
