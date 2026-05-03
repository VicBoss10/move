import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  Chart as ChartJS,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { LocationService } from '../../../../core/services/location.service';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { Location } from '../../../../core/models/location.model';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

/**
 * Environmental metric key type for location analysis.
 * Represents available air quality and weather parameters.
 * @typedef {('co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3')} MetricKey
 */
type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';

/**
 * Time period key for data aggregation and analysis.
 * @typedef {('24h' | '7d' | '30d')} PeriodKey
 */
type PeriodKey = '24h' | '7d' | '30d';

/**
 * Configuration and metadata for a single environmental metric.
 * @interface MetricOption
 * @property {MetricKey} key - Unique identifier for the metric
 * @property {string} label - Human-readable display label (e.g., 'CO₂')
 * @property {string} unit - Measurement unit (e.g., 'ppm', 'µg/m³')
 * @property {string} color - Hex or named color for chart styling
 * @property {string} bg - RGBA background color for chart bars
 */
interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  bg: string;
}

/**
 * Aggregated environmental and traffic data for a single geographic location.
 * @interface LocationRow
 * @property {Location} location - Associated location entity with coordinates and description
 * @property {number} sensorAvg - Average metric value across all measurements at this location
 * @property {number} sensorMin - Minimum metric value recorded at this location
 * @property {number} sensorMax - Maximum metric value recorded at this location
 * @property {number} vehicleTotal - Total count of vehicles detected at this location
 * @property {number} dataPoints - Number of sensor measurements available for this location
 * @property {number} rank - Pollution ranking (1 = highest average metric value)
 */
interface LocationRow {
  location: Location;
  sensorAvg: number;
  sensorMin: number;
  sensorMax: number;
  vehicleTotal: number;
  dataPoints: number;
  rank: number;
}

/**
 * Catalog of available environmental metrics.
 * Each metric includes display label, unit, and color coding for charts.
 * @type {MetricOption[]}
 * @const
 */
const METRICS: MetricOption[] = [
  { key: 'co2', label: 'CO₂', unit: 'ppm', color: '#ef4444', bg: 'rgba(239,68,68,0.7)' },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', color: '#a855f7', bg: 'rgba(168,85,247,0.7)' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', color: '#f97316', bg: 'rgba(249,115,22,0.7)' },
  {
    key: 'temperature',
    label: 'Temperatura',
    unit: '°C',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.7)',
  },
  { key: 'humidity', label: 'Humedad', unit: '%', color: '#3b82f6', bg: 'rgba(59,130,246,0.7)' },
  { key: 'co', label: 'CO', unit: 'ppm', color: '#6b7280', bg: 'rgba(107,114,128,0.7)' },
  { key: 'no2', label: 'NO₂', unit: 'ppb', color: '#22c55e', bg: 'rgba(34,197,94,0.7)' },
  { key: 'nh3', label: 'NH₃', unit: 'ppb', color: '#14b8a6', bg: 'rgba(20,184,166,0.7)' },
];

/**
 * Available time periods for data aggregation and filtering.
 * @type {{key: PeriodKey; label: string}[]}
 * @const
 */
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '24h', label: 'Últimas 24h' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
];

/**
 * RGBA color value for vehicle detection bars in charts.
 * @type {string}
 * @const
 */
const VEHICLE_COLOR = 'rgba(99,102,241,0.7)';

/**
 * LocationAnalysisComponent (Smart Component)
 *
 * Compara el promedio de un contaminante ambiental y el total de vehículos
 * detectados por cada ubicación registrada en el sistema, para el período
 * de tiempo seleccionado.
 *
 * Características:
 * - Gráfico de barras agrupadas: contaminante + vehículos por ubicación
 * - Tabla ranking: min/avg/max del contaminante + conteos vehiculares
 * - Cards comparativas: ubicación más contaminada vs. más tráfico
 * - Filtros: período (24h/7d/30d) + métrica seleccionable
 * - Dark mode support
 *
 * @selector app-location-analysis
 * @standalone true
 * @imports CommonModule, FormsModule, BaseChartDirective
 * @returns Gráfico de comparación por ubicación
 *
 * @example
 * <app-location-analysis />
 */
@Component({
  selector: 'app-location-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './location-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationAnalysisComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  readonly metrics = METRICS;
  readonly periods = PERIODS;

  /**
   * Observable emitting current filter state (period and metric selection).
   * @type {BehaviorSubject<{period: PeriodKey; metric: MetricKey}>}
   * @private
   */
  private readonly filter$ = new BehaviorSubject<{ period: PeriodKey; metric: MetricKey }>({
    period: '7d',
    metric: 'co2',
  });

  /**
   * Subject for managing subscriptions and cleanup on component destruction.
   * @type {Subject<void>}
   * @private
   */
  private readonly destroy$ = new Subject<void>();

  /**
   * Loading state indicator.
   * @type {boolean}
   */
  isLoading = true;

  /**
   * Error flag for data loading failures.
   * @type {boolean}
   */
  hasError = false;

  /**
   * Error message displayed to user when hasError is true.
   * @type {string}
   */
  errorMsg = '';

  /**
   * Aggregated location data rows for display and ranking.
   * @type {LocationRow[]}
   */
  rows: LocationRow[] = [];

  /**
   * Chart.js data configuration for grouped bar chart.
   * @type {ChartConfiguration<'bar'>['data']}
   */
  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  /**
   * Chart.js options configuration for responsive and styled bar chart.
   * @type {ChartConfiguration<'bar'>['options']}
   */
  chartOptions: ChartConfiguration<'bar'>['options'] = this.buildChartOptions(METRICS[0]);

  /**
   * Location with the highest average metric value (worst pollution).
   * @type {LocationRow | null}
   */
  worstLocation: LocationRow | null = null;

  /**
   * Location with the most detected vehicles (busiest traffic).
   * @type {LocationRow | null}
   */
  busiestLocation: LocationRow | null = null;

  /**
   * Returns the current filter state (period and metric).
   * @returns {{period: PeriodKey; metric: MetricKey}} Current filter values
   */
  get currentFilter() {
    return this.filter$.value;
  }

  /**
   * Initializes the component with service dependencies.
   * @param {LocationService} locationService - Location data service
   * @param {SensorDataService} sensorDataService - Sensor measurement service
   * @param {VehicleDetectedService} vehicleService - Vehicle detection service
   * @param {ChangeDetectorRef} cdr - Angular change detection reference
   */
  constructor(
    private readonly locationService: LocationService,
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initializes data pipeline and subscriptions on component creation.
   * Subscribes to filter changes and loads location data accordingly.
   */
  ngOnInit(): void {
    this.filter$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((f) => {
          this.isLoading = true;
          this.hasError = false;
          this.cdr.markForCheck();
          return this.loadAndAggregate(f.period, f.metric);
        }),
      )
      .subscribe((result) => {
        this.rows = result.rows;
        this.chartData = result.chartData;
        this.chartOptions = result.chartOptions;
        this.worstLocation = result.worstLocation;
        this.busiestLocation = result.busiestLocation;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  /**
   * Cleanup lifecycle hook.
   * Unsubscribes from all observables via destroy$ subject.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Updates the period filter and triggers data reload.
   * @param {PeriodKey} p - Time period ('24h', '7d', or '30d')
   */
  setPeriod(p: PeriodKey): void {
    this.filter$.next({ ...this.filter$.value, period: p });
  }

  /**
   * Updates the metric filter and triggers data reload.
   * @param {MetricKey} m - Environmental metric key
   */
  setMetric(m: MetricKey): void {
    this.filter$.next({ ...this.filter$.value, metric: m });
  }

  /**
   * Loads all locations and aggregates sensor/vehicle data for the selected period and metric.
   * Computes min/max/avg values per location and identifies worst pollution and busiest locations.
   * @param {PeriodKey} period - Time period for data aggregation
   * @param {MetricKey} metricKey - Environmental metric to analyze
   * @returns {Observable<{rows: LocationRow[]; chartData: ChartConfiguration<'bar'>['data']; chartOptions: ChartConfiguration<'bar'>['options']; worstLocation: LocationRow | null; busiestLocation: LocationRow | null}>} Aggregated data with chart configuration
   * @private
   */
  private loadAndAggregate(period: PeriodKey, metricKey: MetricKey) {
    const end = new Date();
    const ms = { '24h': 24, '7d': 168, '30d': 720 }[period] * 3_600_000;
    const start = new Date(end.getTime() - ms);
    const metricOption = METRICS.find((m) => m.key === metricKey)!;

    const locations$ = this.locationService.getAll().pipe(catchError(() => of<Location[]>([])));

    const sensor$ = this.sensorDataService
      .search({ start, end, size: 10000 })
      .pipe(catchError(() => of<SensorData[]>([])));

    const vehicles$ = this.vehicleService
      .search({ start, end })
      .pipe(catchError(() => of<VehicleDetected[]>([])));

    return combineLatest([locations$, sensor$, vehicles$]).pipe(
      catchError((err) => {
        console.error('[LocationAnalysis] Error:', err);
        this.hasError = true;
        this.errorMsg = 'Error al cargar los datos. Intenta nuevamente.';
        this.isLoading = false;
        this.cdr.markForCheck();
        return of(null);
      }),
      switchMap((result) => {
        const empty = {
          rows: [] as LocationRow[],
          chartData: { labels: [], datasets: [] } as ChartConfiguration<'bar'>['data'],
          chartOptions: this.buildChartOptions(metricOption),
          worstLocation: null,
          busiestLocation: null,
        };

        if (!result) return of(empty);

        const [locations, sensorData, vehicleData] = result;
        if (locations.length === 0) return of(empty);

        // Aggregate per location
        const rows: LocationRow[] = locations.map((loc, idx) => {
          // Sensor data linked to this location via device.location.id
          const locSensor = sensorData.filter((d) => d.device?.location?.id === loc.id);
          const values = locSensor
            .map((d) => d[metricKey] as number)
            .filter((v) => v != null && v >= 0);

          const vehicleTotal = vehicleData.filter((v) => v.location?.id === loc.id).length;

          const sensorAvg = values.length
            ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
            : 0;
          const sensorMin = values.length ? Math.min(...values) : 0;
          const sensorMax = values.length ? Math.max(...values) : 0;

          return {
            location: loc,
            sensorAvg,
            sensorMin,
            sensorMax,
            vehicleTotal,
            dataPoints: locSensor.length,
            rank: idx + 1,
          };
        });

        // Sort by avg descending for ranking
        rows.sort((a, b) => b.sensorAvg - a.sensorAvg);
        rows.forEach((r, i) => (r.rank = i + 1));

        const worstLocation = rows[0] ?? null;
        const busiestLocation =
          [...rows].sort((a, b) => b.vehicleTotal - a.vehicleTotal)[0] ?? null;

        // Build chart
        const labels = rows.map((r) => this.locationLabel(r.location));

        const chartData: ChartConfiguration<'bar'>['data'] = {
          labels,
          datasets: [
            {
              label: `${metricOption.label} promedio (${metricOption.unit})`,
              data: rows.map((r) => r.sensorAvg),
              backgroundColor: metricOption.bg,
              borderColor: metricOption.color,
              borderWidth: 1.5,
              borderRadius: 4,
              yAxisID: 'y',
            },
            {
              label: 'Vehículos detectados',
              data: rows.map((r) => r.vehicleTotal),
              backgroundColor: VEHICLE_COLOR,
              borderColor: '#6366f1',
              borderWidth: 1.5,
              borderRadius: 4,
              yAxisID: 'y1',
            },
          ],
        };

        return of({
          rows,
          chartData,
          chartOptions: this.buildChartOptions(metricOption),
          worstLocation,
          busiestLocation,
        });
      }),
    );
  }

  /**
   * Extracts display label for a location, falling back to generic label if no description.
   * @param {Location} loc - Location entity
   * @returns {string} Human-readable location description
   */
  locationLabel(loc: Location): string {
    return loc.description ?? `Ubicación ${loc.id}`;
  }

  /**
   * Returns Tailwind CSS classes for pollution rank badge styling.
   * Red for rank 1 (worst), orange for 2, yellow for 3, gray for others.
   * @param {number} rank - Pollution ranking position (1 = worst)
   * @returns {string} Tailwind CSS class string for badge appearance
   */
  rankBadgeClass(rank: number): string {
    if (rank === 1) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (rank === 2)
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (rank === 3)
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  }

  /**
   * Builds and configures Chart.js options for grouped bar chart display.
   * Includes dual Y-axes for metric values and vehicle counts, legend, tooltips, and responsive sizing.
   * @param {MetricOption} m - Metric configuration for axis labeling and color
   * @returns {ChartConfiguration<'bar'>['options']} Chart.js options object
   * @private
   */
  private buildChartOptions(m: MetricOption): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { usePointStyle: true, padding: 16, font: { size: 12 }, color: '#6B7280' },
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.82)',
          titleColor: '#fff',
          bodyColor: '#e5e7eb',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: { color: '#6B7280', font: { size: 11 }, maxRotation: 30 },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: `${m.label} (${m.unit})`,
            color: m.color,
            font: { weight: 'bold' },
          },
          grid: { color: 'rgba(107,114,128,0.1)' },
          ticks: { color: m.color },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Vehículos',
            color: '#6366f1',
            font: { weight: 'bold' },
          },
          grid: { drawOnChartArea: false },
          ticks: { color: '#6366f1', stepSize: 1 },
        },
      },
    };
  }
}
