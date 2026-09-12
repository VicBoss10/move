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
import { combineLatest, of, Subject } from 'rxjs';
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
import { DeviceService } from '../../../../core/services/device.service';
import { Device } from '../../../../core/models/device.model';
import { Location } from '../../../../core/models/location.model';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import {
  PeriodRangeSelectorComponent,
  PeriodRange,
} from '../period-range-selector/period-range-selector.component';

ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';

interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  bg: string;
}

interface LocationRow {
  location: Location;
  sensorAvg: number;
  sensorMin: number;
  sensorMax: number;
  vehicleTotal: number;
  dataPoints: number;
  rank: number;
}

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

const VEHICLE_COLOR = 'rgba(99,102,241,0.7)';

/**
 * LocationAnalysisComponent
 *
 * Compares average pollutant and vehicle counts per location for the selected period.
 * Period is selected via the shared PeriodRangeSelectorComponent.
 *
 * @selector app-location-analysis
 * @standalone true
 */
@Component({
  selector: 'app-location-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, PeriodRangeSelectorComponent],
  templateUrl: './location-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationAnalysisComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  readonly metrics = METRICS;

  private readonly load$ = new Subject<{ start: Date; end: Date; metric: MetricKey }>();
  private readonly destroy$ = new Subject<void>();
  private currentRange: { start: Date; end: Date } | null = null;

  /** True once the user has selected at least one period. */
  hasPeriod = false;
  /** Currently selected metric key (bound to the metric select). */
  currentMetric: MetricKey = 'co2';
  isLoading = false;
  hasError = false;
  errorMsg = '';
  rows: LocationRow[] = [];
  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'bar'>['options'] = this.buildChartOptions(METRICS[0]);
  worstLocation: LocationRow | null = null;
  busiestLocation: LocationRow | null = null;

  constructor(
    private readonly locationService: LocationService,
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly deviceService: DeviceService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((f) => {
          this.isLoading = true;
          this.hasError = false;
          this.cdr.markForCheck();
          return this.loadAndAggregate(f.start, f.end, f.metric);
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Called by PeriodRangeSelectorComponent when the user selects or applies a period. */
  onPeriodChange(range: PeriodRange): void {
    this.currentRange = range;
    this.currentMetric = range.metric;
    this.hasPeriod = true;
    this.load$.next({ start: range.start, end: range.end, metric: range.metric });
  }

  private loadAndAggregate(start: Date, end: Date, metricKey: MetricKey) {
    const metricOption = METRICS.find((m) => m.key === metricKey)!;

    const locations$ = this.locationService.getAll().pipe(catchError(() => of<Location[]>([])));

    const sensor$ = this.sensorDataService
      .search({ start, end, size: 10000 })
      .pipe(catchError(() => of<SensorData[]>([])));

    const vehicles$ = this.vehicleService
      .search({ start, end })
      .pipe(catchError(() => of<VehicleDetected[]>([])));

    const devices$ = this.deviceService.getAll().pipe(catchError(() => of<Device[]>([])));

    return combineLatest([locations$, sensor$, vehicles$, devices$]).pipe(
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

        const [locations, sensorData, vehicleData, devices] = result;
        if (locations.length === 0) return of(empty);

        // Detections carry their location through the device that captured them;
        // the map covers responses where the device is not expanded with its location.
        const deviceLocationMap = new Map<number, number>(
          devices.map((d) => [d.id, d.location.id]),
        );

        const rows: LocationRow[] = locations.map((loc, idx) => {
          const locSensor = sensorData.filter((d) => d.device?.location?.id === loc.id);
          const values = locSensor
            .map((d) => d[metricKey] as number)
            .filter((v) => v != null && v >= 0);

          const vehicleTotal = vehicleData.filter(
            (v) => this.resolveVehicleLocationId(v, deviceLocationMap) === loc.id,
          ).length;

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

        // Only locations with activity in the period are compared: one without
        // measurements nor detections would rank last with an average of zero.
        const rowsWithData = rows.filter((r) => r.dataPoints > 0 || r.vehicleTotal > 0);
        if (rowsWithData.length === 0) return of(empty);

        rowsWithData.sort((a, b) => b.sensorAvg - a.sensorAvg);
        rowsWithData.forEach((r, i) => (r.rank = i + 1));

        const worstLocation = rowsWithData[0] ?? null;
        const busiestLocation =
          [...rowsWithData].sort((a, b) => b.vehicleTotal - a.vehicleTotal)[0] ?? null;

        const labels = rowsWithData.map((r) => this.locationLabel(r.location));

        const chartData: ChartConfiguration<'bar'>['data'] = {
          labels,
          datasets: [
            {
              label: `${metricOption.label} promedio (${metricOption.unit})`,
              data: rowsWithData.map((r) => r.sensorAvg),
              backgroundColor: metricOption.bg,
              borderColor: metricOption.color,
              borderWidth: 1.5,
              borderRadius: 4,
              yAxisID: 'y',
            },
            {
              label: 'Vehículos detectados',
              data: rowsWithData.map((r) => r.vehicleTotal),
              backgroundColor: VEHICLE_COLOR,
              borderColor: '#6366f1',
              borderWidth: 1.5,
              borderRadius: 4,
              yAxisID: 'y1',
            },
          ],
        };

        return of({
          rows: rowsWithData,
          chartData,
          chartOptions: this.buildChartOptions(metricOption),
          worstLocation,
          busiestLocation,
        });
      }),
    );
  }

  /**
   * Resolves the location a detection belongs to.
   * Detections reference their location through the capturing device; the map is
   * used as a fallback when the device is returned without its location expanded.
   */
  private resolveVehicleLocationId(
    vehicle: VehicleDetected,
    deviceLocationMap: Map<number, number>,
  ): number | undefined {
    return vehicle.device?.location?.id ?? deviceLocationMap.get(vehicle.device?.id);
  }

  locationLabel(loc: Location): string {
    return loc.description ?? `Ubicación ${loc.id}`;
  }

  rankBadgeClass(rank: number): string {
    if (rank === 1) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (rank === 2)
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (rank === 3)
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  }

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
