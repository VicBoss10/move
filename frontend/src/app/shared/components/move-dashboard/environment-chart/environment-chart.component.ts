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
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';

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
 * EnvironmentChartComponent
 *
 * Displays a dual-line chart with Temperature and Humidity trends over the last 12 hours.
 * Uses independent Y axes to accommodate different measurement scales. Includes footer statistics
 * with average CO₂, Temperature, and Humidity values. Connected to SensorDataService for real-time data.
 *
 * Features:
 * - Dual-line chart: Temperature (°C) and Humidity (%) with independent Y axes (orange and blue)
 * - 12-hour time window with hourly averaging and dynamic slot generation
 * - Reactive data updates from backend via Observable pattern with spanGaps support for missing data
 * - Dark mode support with configurable colors and responsive styling
 * - Responsive layout with maintainAspectRatio and custom scrolling
 * - shareReplay pattern for subscription efficiency
 * - Average computations displayed in footer: CO₂ (ppm), Temperature (°C), Humidity (%)
 * - OnPush change detection for performance
 * - Error handling with empty array fallback on service errors
 *
 * @selector app-environment-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-environment-chart />
 */
@Component({
  selector: 'app-environment-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './environment-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentChartComponent {
  isLoading = true;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  chartData$!: Observable<ChartConfiguration<'line'>['data']>;
  avgTemperature$!: Observable<number>;
  avgHumidity$!: Observable<number>;
  avgCo2$!: Observable<number>;
  hasData$!: Observable<boolean>;

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
          text: 'Temperatura (°C)',
          color: '#f97316',
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
          color: '#f97316',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Humedad (%)',
          color: '#3b82f6',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#3b82f6',
        },
      },
    },
  };

  private readonly HOURS_WINDOW = 12;

  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
    this.initializeAverages();
  }

  private initializeSensorData(): void {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.HOURS_WINDOW * 3600000);
    this.sensorData$ = this.sensorDataService.search({ start: startTime, end: endTime }).pipe(
      tap(() => (this.isLoading = false)),
      catchError((error) => {
        console.error('Error loading sensor data:', error);
        this.isLoading = false;
        return of([]);
      }),
      shareReplay(1),
    );

    this.hasData$ = this.sensorData$.pipe(
      map((data) => data.length > 0),
      shareReplay(1),
    );
  }

  /**
   * Initializes chart data observable with hourly averaged temperature and humidity
   * @private
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

        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = 11; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map((s) => s.label);

        const tempData: (number | null)[] = [];
        const humidityData: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);

          if (slotData.length > 0) {
            const avgTemp =
              slotData.reduce((sum, d) => sum + (d.temperature || 0), 0) / slotData.length;
            const avgHum =
              slotData.reduce((sum, d) => sum + (d.humidity || 0), 0) / slotData.length;
            tempData.push(Math.round(avgTemp * 100) / 100);
            humidityData.push(Math.round(avgHum * 100) / 100);
          } else {
            tempData.push(null);
            humidityData.push(null);
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
              spanGaps: true,
            },
            {
              label: 'Humedad (%)',
              data: humidityData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y1',
              spanGaps: true,
            },
          ],
        };
      }),
      shareReplay(1),
    );
  }

  /**
   * Initializes average value observables for temperature, humidity, and CO₂
   * @private
   */
  private initializeAverages(): void {
    this.avgTemperature$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, d) => acc + (d.temperature || 0), 0);
        return sum / data.length;
      }),
      shareReplay(1),
    );

    this.avgHumidity$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, d) => acc + (d.humidity || 0), 0);
        return sum / data.length;
      }),
      shareReplay(1),
    );

    this.avgCo2$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, d) => acc + (d.co2 || 0), 0);
        return sum / data.length;
      }),
      shareReplay(1),
    );
  }
}
