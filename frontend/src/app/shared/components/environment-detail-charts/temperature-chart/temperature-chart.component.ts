import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  Point,
} from 'chart.js';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, switchMap } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

// Registrar los scales y elementos
ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

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
   * Observable compartido de datos del sensor (últimas 24h)
   */
  private sensorData$!: Observable<SensorData[]>;

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 0,
        bottom: 0,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: 600,
          },
          color: '#374151',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#f1f5f9',
        borderColor: '#64748b',
        borderWidth: 1,
        padding: 16,
        displayColors: true,
        usePointStyle: true,
        boxPadding: 8,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
        },
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
          color: 'rgba(203, 213, 225, 0.2)',
          lineWidth: 1,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500,
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
            weight: 700,
            size: 13,
          },
          padding: 12,
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(203, 213, 225, 0.15)',
          lineWidth: 1,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500,
          },
          padding: 8,
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
      shareReplay(1),
    );
  }

  /**
   * Inicializa los datos del gráfico agrupando por hora y promediando.
   */
  private initializeChartData(): void {
    this.chartData$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) {
          return this.defaultChartData;
        }

        const parsedData = data
          .map((d) => ({ ...d, _time: new Date(d.timestamp) }))
          .filter((d) => !isNaN(d._time.getTime()))
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
          0,
          0,
          0,
        );

        // Crear 24 slots horarios hacia atrás desde la hora más reciente
        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map((s) => s.label);
        const tempData: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);
          if (slotData.length > 0) {
            const avg =
              slotData.reduce((sum, d) => sum + (d.temperature || 0), 0) / slotData.length;
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
              backgroundColor: 'rgba(249, 115, 22, 0.08)',
              borderWidth: 3,
              tension: 0.5,
              fill: true,
              pointBackgroundColor: '#f97316',
              pointBorderColor: '#fff',
              pointBorderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 8,
              pointHoverBackgroundColor: '#b45309',
              pointHoverBorderWidth: 3,
              yAxisID: 'y',
              segment: {
                borderColor: (ctx: any) => {
                  if (ctx.p0DataIndex !== undefined && ctx.p1DataIndex !== undefined) {
                    return '#f97316';
                  }
                  return 'rgba(249, 115, 22, 0.5)';
                },
              },
            },
          ],
        };
      }),
      shareReplay(1),
    );
  }

}
