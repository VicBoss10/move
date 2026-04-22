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
} from 'chart.js';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, switchMap } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

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
 * Componente que muestra un gráfico dinámico de línea con la tendencia de CO₂
 * en las últimas 12 horas, promediando por hora. Utiliza RxJS Observables
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

  /**
   * Ventana de horas a mostrar
   */
  private readonly HOURS_WINDOW = 12;

  /**
   * Observable con la configuración del gráfico
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable con estadísticas de CO₂
   */
  stats$!: Observable<{ min: number; avg: number; max: number }>;

  /**
   * Observable compartido de datos del sensor (últimas 12h)
   */
  private sensorData$!: Observable<any[]>;

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
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
    labels: [],
    datasets: [],
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
    this.initializeStats();
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
        console.error('Error cargando datos de CO₂:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Agrupa los datos por hora y los promedia para tener 12 puntos limpios.
   */
  private initializeChartData(): void {
    this.chartData$ = this.sensorData$.pipe(
      map((data: any[]) => {
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

        // Crear 12 slots horarios hacia atrás desde la hora más reciente
        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map((s) => s.label);
        const co2Data: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);
          if (slotData.length > 0) {
            const avg = slotData.reduce((sum, d) => sum + (d.co2 || 0), 0) / slotData.length;
            co2Data.push(Math.round(avg * 100) / 100);
          } else {
            co2Data.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'CO₂ (ppm)',
              data: co2Data,
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
      shareReplay(1),
    );
  }

  /**
   * Calcula estadísticas (min, avg, max) sobre todos los datos de las 12h.
   */
  private initializeStats(): void {
    this.stats$ = this.sensorData$.pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) {
          return { min: 0, avg: 0, max: 0 };
        }
        const co2Values = data.map((d) => d.co2).filter((v: any) => v != null && v > 0);
        if (co2Values.length === 0) {
          return { min: 0, avg: 0, max: 0 };
        }
        const min = Math.min(...co2Values);
        const max = Math.max(...co2Values);
        const avg = co2Values.reduce((a: number, b: number) => a + b, 0) / co2Values.length;
        return { min: Math.round(min), avg: Math.round(avg), max: Math.round(max) };
      }),
      catchError(() => of({ min: 0, avg: 0, max: 0 })),
      shareReplay(1),
    );
  }
}
