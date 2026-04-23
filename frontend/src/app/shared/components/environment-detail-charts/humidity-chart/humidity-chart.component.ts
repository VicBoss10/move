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
 * HumidityChartComponent
 *
 * Componente especializado para mostrar la tendencia de humedad relativa en las últimas 24 horas,
 * promediando por hora. Utiliza Chart.js para visualizar datos de humedad con una línea de gráfico azul.
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
   * Ventana de horas a mostrar
   */
  private readonly HOURS_WINDOW = 24;

  /**
   * Observable que emite la configuración del gráfico con datos reactivos
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable que emite valor actual de humedad
   */
  humidityValue$!: Observable<number>;

  /**
   * Observable compartido de datos del sensor (últimas 24h)
   */
  private sensorData$!: Observable<SensorData[]>;

  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
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
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
            weight: 500,
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
    this.initializeSensorData();
    this.initializeChartData();
    this.initializeHumidityValue();
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
        console.error('Error cargando datos de humedad:', error);
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
        const humidityData: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);
          if (slotData.length > 0) {
            const avg = slotData.reduce((sum, d) => sum + (d.humidity || 0), 0) / slotData.length;
            humidityData.push(Math.round(avg * 100) / 100);
          } else {
            humidityData.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'Humedad Relativa (%)',
              data: humidityData,
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
      }),
      shareReplay(1),
    );
  }

  /**
   * Inicializa el valor actual de humedad (desde el último registro)
   */
  private initializeHumidityValue(): void {
    this.humidityValue$ = this.sensorDataService.getLatest().pipe(
      map((latestData: SensorData) => Math.round((latestData?.humidity || 0) * 10) / 10),
      catchError(() => of(0)),
      shareReplay(1),
    );
  }

  getMinValue(values: (number | Point | null)[]): number {
    if (!values || values.length === 0) return 0;
    const numValues = values.filter((v): v is number => typeof v === 'number');
    return numValues.length > 0 ? Math.min(...numValues) : 0;
  }

  getAvgValue(values: (number | Point | null)[]): number {
    if (!values || values.length === 0) return 0;
    const numValues = values.filter((v): v is number => typeof v === 'number');
    if (numValues.length === 0) return 0;
    const sum = numValues.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / numValues.length) * 10) / 10;
  }

  getMaxValue(values: (number | Point | null)[]): number {
    if (!values || values.length === 0) return 0;
    const numValues = values.filter((v): v is number => typeof v === 'number');
    return numValues.length > 0 ? Math.max(...numValues) : 0;
  }
}
