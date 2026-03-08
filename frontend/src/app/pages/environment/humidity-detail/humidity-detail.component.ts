import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, switchMap } from 'rxjs/operators';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { HumidityChartComponent } from '../../../shared/components/environment-detail-charts/humidity-chart/humidity-chart.component';
import { HumidityGaugeComponent } from '../../../shared/components/environment-detail-charts/humidity-gauge/humidity-gauge.component';
import { HumidityStatsTableComponent } from '../../../shared/components/environment-detail-charts/humidity-stats-table/humidity-stats-table.component';
import { SensorDataService } from '../../../core/services/sensor-data.service';
import { SensorData } from '../../../core/models/sensor-data.model';
import { getEnvironmentStatus, getMetricGaugePercentage } from '../../../core/config/environment-thresholds.config';

ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

interface GaugeData {
  humidity: number;
  gaugePercentage: number;
  gaugeColor: string;
  status: string;
}

interface HumidityStats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * Componente de página que muestra el detalle de Humedad.
 * Organiza la visualización de indicador, gráfico de tendencia y estadísticas de humedad.
 * Gestiona la lógica de datos del servicio y propasa observables a los componentes secundarios.
 */
@Component({
  selector: 'app-humidity-detail',
  standalone: true,
  imports: [CommonModule, HumidityChartComponent, HumidityGaugeComponent, HumidityStatsTableComponent],
  templateUrl: './humidity-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityDetailComponent implements OnInit {
  private readonly HOURS_WINDOW = 24;
  private readonly defaultGaugeData: GaugeData = {
    humidity: 0,
    gaugePercentage: 0,
    gaugeColor: 'text-gray-500',
    status: 'Normal',
  };
  private readonly defaultStats: HumidityStats = {
    actual: 0,
    minimo: 0,
    maximo: 0,
    promedio: 0,
    variacion: 0,
  };

  gaugeData$!: Observable<GaugeData>;
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;
  stats$!: Observable<HumidityStats>;
  private sensorData$!: Observable<SensorData[]>;

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12, weight: 500 },
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
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Humedad (%)',
          color: '#3b82f6',
          font: { weight: 'bold' },
        },
        ticks: { color: '#3b82f6' },
      },
    },
  };

  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  constructor(private sensorDataService: SensorDataService) {}

  ngOnInit(): void {
    this.initializeSensorData();
    this.initializeGaugeData();
    this.initializeChartData();
    this.initializeStats();
  }

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
      shareReplay(1)
    );
  }

  private initializeGaugeData(): void {
    this.gaugeData$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => {
        const humidity = Math.round((latestData?.humidity || 0) * 10) / 10;
        return {
          humidity,
          gaugePercentage: humidity,
          gaugeColor: getEnvironmentStatus('humidity', humidity, false).textClass,
          status: getEnvironmentStatus('humidity', humidity, false).label,
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de humedad:', error);
        return of(this.defaultGaugeData);
      }),
      shareReplay(1)
    );
  }

  private initializeChartData(): void {
    this.chartData$ = this.sensorData$.pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) return this.defaultChartData;

        const parsedData = data
          .map(d => ({ ...d, _time: new Date(d.timestamp) }))
          .filter(d => !isNaN(d._time.getTime()))
          .sort((a, b) => a._time.getTime() - b._time.getTime());

        if (parsedData.length === 0) return this.defaultChartData;

        const latestTime = parsedData[parsedData.length - 1]._time;
        const latestSlotStart = new Date(
          latestTime.getFullYear(),
          latestTime.getMonth(),
          latestTime.getDate(),
          latestTime.getHours(),
          0, 0, 0
        );

        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          slots.push({
            start: slotStart,
            end: slotEnd,
            label: `${slotStart.getHours().toString().padStart(2, '0')}:00`,
          });
        }

        const labels = slots.map(s => s.label);
        const humidityData: (number | null)[] = [];

        for (const slot of slots) {
          const hourData = parsedData.filter(d => d._time >= slot.start && d._time < slot.end);
          if (hourData.length > 0) {
            const avg = hourData.reduce((sum, d) => sum + (d.humidity || 0), 0) / hourData.length;
            humidityData.push(Math.round(avg * 10) / 10);
          } else {
            humidityData.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'Humedad (%)',
              data: humidityData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.4,
              fill: true,
            },
          ],
        };
      })
    );
  }

  private initializeStats(): void {
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) return this.defaultStats;

        const humidityValues = sensorData.map((d) => d.humidity || 0);
        const actual = humidityValues.length > 0 ? humidityValues[humidityValues.length - 1] : 0;
        const minimo = Math.min(...humidityValues);
        const maximo = Math.max(...humidityValues);
        const promedio = humidityValues.length > 0 ? humidityValues.reduce((a, b) => a + b, 0) / humidityValues.length : 0;
        const variacion = maximo - minimo;

        return {
          actual: Math.round(actual * 10) / 10,
          minimo: Math.round(minimo * 10) / 10,
          maximo: Math.round(maximo * 10) / 10,
          promedio: Math.round(promedio * 10) / 10,
          variacion: Math.round(variacion * 10) / 10,
        };
      }),
      catchError((error) => {
        console.error('Error cargando estadísticas de humedad:', error);
        return of(this.defaultStats);
      }),
      shareReplay(1)
    );
  }
}
