import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, firstValueFrom, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  Chart as ChartJS,
  ChartConfiguration,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import jsPDF from 'jspdf';

import { LocationService } from '../../../../core/services/location.service';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Location } from '../../../../core/models/location.model';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import { Device, DeviceType } from '../../../../core/models/device.model';
import {
  PeriodRangeSelectorComponent,
  PeriodRange,
} from '../period-range-selector/period-range-selector.component';

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

/**
 * Environmental metric key type.
 * @typedef {'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3'} MetricKey
 */
type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';

/**
 * Environmental metric key type.
 * @typedef {'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3'} MetricKey
 * (Re-declared here for clarity; identical to the one used in other analysis components.)
 */

/**
 * Metric display and PDF configuration.
 * @interface MetricOption
 * @property {MetricKey} key - Metric identifier.
 * @property {string} label - Display label with Unicode characters.
 * @property {string} pdfLabel - PDF-safe label (ASCII only).
 * @property {string} unit - Display unit with Unicode.
 * @property {string} pdfUnit - PDF-safe unit (ASCII only).
 * @property {string} color - Hex color for charts.
 */
interface MetricOption {
  key: MetricKey;
  label: string;
  pdfLabel: string;
  unit: string;
  pdfUnit: string;
  color: string;
}

/**
 * Complete report data structure.
 * @interface ReportData
 * @property {SensorData[]} sensorData - Environmental sensor readings.
 * @property {VehicleDetected[]} vehicleData - Vehicle detection records.
 * @property {Location[]} locations - Geographic locations.
 */
interface ReportData {
  sensorData: SensorData[];
  vehicleData: VehicleDetected[];
  locations: Location[];
}

/**
 * All available environmental metrics.
 * @constant ALL_METRIC_KEYS
 * @type {MetricKey[]}
 */
const ALL_METRIC_KEYS: MetricKey[] = [
  'co2',
  'pm25',
  'pm10',
  'temperature',
  'humidity',
  'co',
  'no2',
  'nh3',
];

/**
 * Metric configurations with display and PDF labels.
 * @constant METRICS
 * @type {MetricOption[]}
 */
const METRICS: MetricOption[] = [
  { key: 'co2', label: 'CO₂', pdfLabel: 'CO2', unit: 'ppm', pdfUnit: 'ppm', color: '#ef4444' },
  {
    key: 'pm25',
    label: 'PM2.5',
    pdfLabel: 'PM2.5',
    unit: 'µg/m³',
    pdfUnit: 'ug/m3',
    color: '#a855f7',
  },
  {
    key: 'pm10',
    label: 'PM10',
    pdfLabel: 'PM10',
    unit: 'µg/m3',
    pdfUnit: 'ug/m3',
    color: '#f97316',
  },
  {
    key: 'temperature',
    label: 'Temperatura',
    pdfLabel: 'Temperatura',
    unit: '°C',
    pdfUnit: 'C',
    color: '#eab308',
  },
  {
    key: 'humidity',
    label: 'Humedad',
    pdfLabel: 'Humedad',
    unit: '%',
    pdfUnit: '%',
    color: '#3b82f6',
  },
  { key: 'co', label: 'CO', pdfLabel: 'CO', unit: 'ppm', pdfUnit: 'ppm', color: '#6b7280' },
  { key: 'no2', label: 'NO₂', pdfLabel: 'NO2', unit: 'ppb', pdfUnit: 'ppb', color: '#22c55e' },
  { key: 'nh3', label: 'NH₃', pdfLabel: 'NH3', unit: 'ppb', pdfUnit: 'ppb', color: '#14b8a6' },
];


/**
 * Vehicle count chart color.
 * @constant VEHICLE_COLOR
 */
const VEHICLE_COLOR = '#6366f1';

const VEHICLE_TYPES_EXPORT = [
  { key: 'CAR', label: 'Coche' },
  { key: 'TRUCK', label: 'Camión' },
  { key: 'BUS', label: 'Autobús' },
  { key: 'MOTORCYCLE', label: 'Moto' },
  { key: 'BICYCLE', label: 'Bicicleta' },
] as const;

type VehicleTypeKey = (typeof VEHICLE_TYPES_EXPORT)[number]['key'];

const QUICK_EXPORT_OPTIONS = [
  { label: 'Últimas 24h', hours: 24 },
  { label: 'Últimos 7 días', hours: 168 },
  { label: 'Últimos 30 días', hours: 720 },
];

/**
 * Brand color palette aligned with the app's global CSS variables.
 * @constant BRAND
 */
const BRAND = {
  brand25: [242, 251, 245] as [number, number, number],
  brand50: [233, 247, 239] as [number, number, number],
  brand100: [209, 240, 224] as [number, number, number],
  brand200: [163, 224, 193] as [number, number, number],
  brand400: [79, 187, 122] as [number, number, number],
  brand500: [46, 164, 79] as [number, number, number],
  brand600: [37, 138, 65] as [number, number, number],
  brand700: [30, 111, 53] as [number, number, number],
  brand800: [23, 84, 41] as [number, number, number],
  brand900: [17, 50, 37] as [number, number, number],
  brand950: [4, 32, 22] as [number, number, number],
  gray50: [248, 250, 249] as [number, number, number],
  gray100: [241, 245, 243] as [number, number, number],
  gray200: [227, 232, 230] as [number, number, number],
  gray300: [208, 213, 221] as [number, number, number],
  gray400: [152, 162, 179] as [number, number, number],
  gray500: [102, 112, 133] as [number, number, number],
  gray600: [71, 84, 103] as [number, number, number],
  gray700: [52, 64, 84] as [number, number, number],
  gray800: [29, 41, 57] as [number, number, number],
  gray900: [16, 24, 40] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/**
 * DataExportComponent
 *
 * Interactive PDF report generation tool for environmental analysis.
 * Loads complete data (sensor, vehicle, location) and generates professional
 * multi-page reports with embedded charts and statistics.
 *
 * Features:
 * - Period and metric selection (24h/7d/30d)
 * - Real-time progress tracking during generation
 * - Professional PDF with cover page, headers, footers
 * - Embedded high-resolution charts (time series, correlation, lag analysis)
 * - Summary statistics and location ranking tables
 * - Full dark mode support
 *
 * Report sections:
 * 1. Cover page with MOVE branding
 * 2. Time series visualization (metric + vehicle count)
 * 3. 9×9 Pearson correlation matrix
 * 4. Cross-correlation lag analysis (−12h to +12h)
 * 5. Location-based comparison with rankings
 *
 * @class DataExportComponent
 * @implements {OnDestroy}
 * @selector app-data-export
 * @standalone true
 * @imports CommonModule, FormsModule
 */
@Component({
  selector: 'app-data-export',
  standalone: true,
  imports: [CommonModule, FormsModule, PeriodRangeSelectorComponent],
  templateUrl: './data-export.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataExportComponent implements OnDestroy, OnInit {
  /**
   * Subject for cleanup on component destruction.
   * @private
   */
  private readonly destroy$ = new Subject<void>();

  /**
   * Available metrics for report generation.
   * @readonly
   */
  readonly metrics = METRICS;

  /** Controls whether the PDF section or the raw data export section is shown. */
  exportMode: 'pdf' | 'raw' = 'pdf';

  /** Active date range set by PeriodRangeSelectorComponent. Null until the user selects one. */
  selectedRange: PeriodRange | null = null;

  /** True once the user has selected at least one period. */
  hasPeriod = false;

  /**
   * True while PDF generation is in progress.
   */
  isGenerating = false;

  /**
   * Generation progress percentage (0-100).
   */
  progress = 0;

  /**
   * Current status message displayed during generation.
   */
  progressMsg = '';

  // ── Raw data export state ────────────────────────────────────────────────

  rawDataType: 'sensor' | 'vehicle' = 'sensor';
  rawFormat: 'csv' | 'json' = 'csv';
  rawStartDate = '';
  rawEndDate = '';
  rawDateError = '';
  rawMinDate = '';
  rawMaxDate = '';
  isExporting = false;

  allDevices: Device[] = [];
  selectedDeviceIds = new Set<number>();
  selectedMetrics = new Set<MetricKey>(ALL_METRIC_KEYS);
  selectedVehicleTypes = new Set<VehicleTypeKey>(['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'BICYCLE']);

  readonly vehicleTypesExport = VEHICLE_TYPES_EXPORT;
  readonly quickExportOptions = QUICK_EXPORT_OPTIONS;

  constructor(
    private readonly locationService: LocationService,
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly deviceService: DeviceService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.sensorDataService.getFirstRecord().subscribe({
      next: (r) => { this.rawMinDate = this.toDateInputString(new Date(r.timestamp)); this.cdr.markForCheck(); },
      error: () => {},
    });
    this.sensorDataService.getLastRecord().subscribe({
      next: (r) => { this.rawMaxDate = this.toDateInputString(new Date(r.timestamp)); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  /**
   * Cleans up resources on component destruction.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Called by PeriodRangeSelectorComponent when the user selects or applies a period. */
  onPeriodChange(range: PeriodRange): void {
    this.selectedRange = range;
    this.hasPeriod = true;
    this.cdr.markForCheck();
  }

  /**
   * Orchestrates the complete PDF generation process.
   * Fetches data, creates charts, assembles pages, and triggers download.
   *
   * @async
   * @returns {Promise<void>}
   */
  async generatePdf(): Promise<void> {
    this.isGenerating = true;
    this.progress = 0;
    this.progressMsg = 'Obteniendo datos del servidor…';
    this.cdr.markForCheck();

    try {
      // 1. Datos
      const data = await this.fetchData();
      this.tick(10, 'Generando gráfico de series temporales…');

      const metric = METRICS.find((m) => m.key === this.selectedRange!.metric)!;
      const { start, end } = this.selectedRange!;

      // 2. Gráficos
      const tsImg = this.chartTimeSeries(data, metric);
      this.tick(25, 'Generando matriz de correlación…');

      const corrImg = this.chartCorrelationMatrix(data);
      this.tick(45, 'Generando análisis de rezagos…');

      const lagImg = this.chartLag(data, metric);
      const lagInfo = this.lagResults(data, metric);
      this.tick(60, 'Generando análisis por ubicación…');

      const locImg = this.chartLocation(data, metric);
      const locRows = this.locationRows(data, metric);
      this.tick(75, 'Cargando logo…');

      // 3. Logo
      const logoUrl = await this.loadLogo();
      this.tick(80, 'Ensamblando PDF…');

      // 4. Ensamblar PDF (carta: 215.9 × 279.4 mm)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const PW = 215.9;
      const PH = 279.4;
      const MX = 20;
      const CW = PW - 2 * MX;

      // ── Portada ─────────────────────────────────────────────────────────
      this.pageCover(doc, logoUrl, metric, start, end, PW, PH);

      // ── Series temporales ───────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      let y = this.pageHeader(
        doc,
        'Series Temporales',
        `${metric.pdfLabel} (${metric.pdfUnit}) + Vehiculos`,
        MX,
        20,
      );
      const tsH = CW * 0.5;
      doc.addImage(tsImg, 'PNG', MX, y, CW, tsH);
      y += tsH + 8;
      y = this.statsRow(doc, MX, y, CW, this.tsStats(data, metric));
      this.pageFooter(doc, PW, PH, 2);

      // ── Correlación ─────────────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      y = this.pageHeader(
        doc,
        'Matriz de Correlacion',
        'Coeficiente de Pearson entre todas las variables',
        MX,
        20,
      );
      // Keep aspect ratio matching the matrix canvas so cells stay square.
      // Canvas is ~1158×1190 (≈ 0.973); apply the same ratio to the PDF area.
      const corrH = CW / 0.973;
      doc.addImage(corrImg, 'PNG', MX, y, CW, corrH);
      y += corrH + 6;
      // Interpretation callout box
      this.calloutBox(
        doc,
        MX,
        y,
        CW,
        20,
        'Como interpretar la matriz',
        'Valores cercanos a +1 indican correlacion positiva fuerte; cercanos a -1, ' +
          'correlacion negativa fuerte. La diagonal es siempre 1.00 (autocorrelacion).',
      );
      this.pageFooter(doc, PW, PH, 3);

      // ── Rezagos ─────────────────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      y = this.pageHeader(
        doc,
        'Analisis de Rezagos (CCF)',
        `${metric.pdfLabel} vs Vehiculos — lags de -12 h a +12 h`,
        MX,
        20,
      );
      const lagH = CW * 0.42;
      doc.addImage(lagImg, 'PNG', MX, y, CW, lagH);
      y += lagH + 8;
      if (lagInfo.best) {
        const lagSign = lagInfo.best.lag > 0 ? '+' : '';
        const heading = `Mejor rezago: ${lagSign}${lagInfo.best.lag} h  ·  r = ${lagInfo.best.r.toFixed(4)}`;
        this.calloutBox(doc, MX, y, CW, 28, heading, lagInfo.text);
        y += 33;
      }
      y = this.lagTable(doc, MX, y, CW, lagInfo.top5);
      this.pageFooter(doc, PW, PH, 4);

      // ── Ubicaciones ─────────────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      y = this.pageHeader(
        doc,
        'Analisis por Ubicacion',
        `${metric.pdfLabel} promedio + Vehiculos por ubicacion`,
        MX,
        20,
      );
      const locH = CW * 0.42;
      doc.addImage(locImg, 'PNG', MX, y, CW, locH);
      y += locH + 8;
      y = this.locationTable(doc, MX, y, CW, locRows, metric);
      this.pageFooter(doc, PW, PH, 5);

      this.tick(95, 'Descargando…');

      // 5. Descargar
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`MOVE_Informe_${metric.pdfLabel}_${dateStr}.pdf`);

      this.tick(100, 'Informe generado correctamente');
      setTimeout(() => {
        this.isGenerating = false;
        this.progress = 0;
        this.cdr.markForCheck();
      }, 2500);
    } catch (err) {
      console.error('[DataExport] Error:', err);
      this.progressMsg = 'Error al generar el informe. Intenta nuevamente.';
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Fetches data from all services for report generation.
   *
   * @private
   * @returns {Promise<ReportData>} Promise with sensor data, vehicles, and locations.
   */
  private fetchData(): Promise<ReportData> {
    const { start, end } = this.dateRange();
    return new Promise((resolve, reject) => {
      forkJoin({
        sensorData: this.sensorDataService
          .search({ start, end, size: 10000 })
          .pipe(catchError(() => of([] as SensorData[]))),
        vehicleData: this.vehicleService
          .search({ start, end })
          .pipe(catchError(() => of([] as VehicleDetected[]))),
        locations: this.locationService.getAll().pipe(catchError(() => of([] as Location[]))),
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: (d) => resolve(d), error: (e) => reject(e) });
    });
  }

  /**
   * Renders dual-axis line chart: metric over time with vehicle counts.
   * Aggregates data into time buckets and returns as PNG dataURL.
   *
   * @private
   * @param {ReportData} data - Report data with sensor and vehicle information.
   * @param {MetricOption} metric - Selected metric for Y-axis.
   * @param {{key: PeriodKey, hours: number}} period - Analysis period.
   * @returns {string} PNG chart image as dataURL.
   */
  private chartTimeSeries(data: ReportData, metric: MetricOption): string {
    const { start, end } = this.dateRange();
    const durationMs = end.getTime() - start.getTime();
    const bucketMs =
      durationMs <= 24 * 3_600_000
        ? 3_600_000
        : durationMs <= 14 * 24 * 3_600_000
          ? 4 * 3_600_000
          : 24 * 3_600_000;

    const buckets = this.timeBuckets(start, end, bucketMs);
    const mVals = new Array(buckets.length).fill(0);
    const mCnts = new Array(buckets.length).fill(0);
    const vCnts = new Array(buckets.length).fill(0);

    for (const d of data.sensorData) {
      const idx = Math.floor((new Date(d.timestamp).getTime() - start.getTime()) / bucketMs);
      if (idx < 0 || idx >= buckets.length) continue;
      const v = d[metric.key] as number;
      if (v != null && v >= 0) {
        mVals[idx] += v;
        mCnts[idx]++;
      }
    }
    for (const v of data.vehicleData) {
      const idx = Math.floor((new Date(v.timestamp).getTime() - start.getTime()) / bucketMs);
      if (idx >= 0 && idx < buckets.length) vCnts[idx]++;
    }

    const avgs = mVals.map((s, i) => (mCnts[i] ? +(s / mCnts[i]).toFixed(2) : 0));
    const labels = buckets.map((b) => this.bucketLabel(b, bucketMs));

    return this.offscreenChart(1400, 700, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${metric.pdfLabel} (${metric.pdfUnit})`,
            data: avgs,
            borderColor: metric.color,
            backgroundColor: metric.color + '22',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderWidth: 2.5,
            yAxisID: 'y',
          },
          {
            label: 'Vehiculos detectados',
            data: vCnts,
            borderColor: VEHICLE_COLOR,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderWidth: 2,
            borderDash: [6, 4],
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        layout: { padding: { top: 24, right: 24, bottom: 16, left: 16 } },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              font: { size: 13, weight: 500 },
              padding: 18,
              boxWidth: 18,
              boxHeight: 8,
              usePointStyle: false,
              color: '#475467',
            },
          },
        },
        scales: {
          x: {
            display: true,
            border: { display: false },
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#98a2b3', maxRotation: 0, autoSkip: true },
          },
          y: {
            type: 'linear',
            position: 'left',
            border: { display: false },
            grid: { color: '#f1f5f3', drawTicks: false },
            ticks: { font: { size: 11 }, color: '#98a2b3', padding: 6 },
            title: {
              display: true,
              text: `${metric.pdfLabel} (${metric.pdfUnit})`,
              font: { size: 11, weight: 'bold' },
              color: '#667085',
              padding: { bottom: 8 },
            },
          },
          y1: {
            type: 'linear',
            position: 'right',
            border: { display: false },
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 11 }, color: '#98a2b3', padding: 6 },
            title: {
              display: true,
              text: 'Vehiculos',
              font: { size: 11, weight: 'bold' },
              color: '#667085',
              padding: { bottom: 8 },
            },
          },
        },
      },
    });
  }

  /**
   * Renders 9×9 Pearson correlation matrix using custom canvas drawing.
   * Includes color-coding based on correlation strength.
   *
   * @private
   * @param {ReportData} data - Report data for correlation computation.
   * @returns {string} PNG chart image as dataURL.
   */
  private chartCorrelationMatrix(data: ReportData): string {
    const { start } = this.dateRange();
    const slotMs = 3_600_000;
    const nSlots = Math.ceil((this.dateRange().end.getTime() - start.getTime()) / slotMs);

    const keys: string[] = [...ALL_METRIC_KEYS, 'vehicleCount'];
    const sums: Record<string, number[]> = {};
    const cnts: Record<string, number[]> = {};
    for (const k of keys) {
      sums[k] = new Array(nSlots).fill(0);
      cnts[k] = new Array(nSlots).fill(0);
    }

    for (const d of data.sensorData) {
      const idx = Math.floor((new Date(d.timestamp).getTime() - start.getTime()) / slotMs);
      if (idx < 0 || idx >= nSlots) continue;
      for (const k of ALL_METRIC_KEYS) {
        const v = d[k] as number;
        if (v != null && v >= 0) {
          sums[k][idx] += v;
          cnts[k][idx]++;
        }
      }
    }
    for (const v of data.vehicleData) {
      const idx = Math.floor((new Date(v.timestamp).getTime() - start.getTime()) / slotMs);
      if (idx >= 0 && idx < nSlots) {
        sums['vehicleCount'][idx]++;
        cnts['vehicleCount'][idx] = 1;
      }
    }

    const vectors: Record<string, number[]> = {};
    for (const k of keys) {
      vectors[k] = sums[k].map((s, i) =>
        cnts[k][i] > 0 ? s / (k === 'vehicleCount' ? 1 : cnts[k][i]) : 0,
      );
    }

    const n = keys.length;
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        matrix[i][j] = i === j ? 1 : this.pearson(vectors[keys[i]], vectors[keys[j]]);
      }
    }

    // Layout: aspect ratio matches PDF placement (CW × CW*0.78 ≈ 1.28)
    // Canvas 1500 × 1170 keeps things crisp with room for labels.
    const cellSize = 102;
    const cellGap = 3;
    const labelLeftW = 200;
    const labelTopH = 200;
    const padR = 16;
    const padB = 48;
    const matrixSide = n * cellSize + (n - 1) * cellGap;
    const cW = labelLeftW + matrixSide + padR;
    const cH = labelTopH + matrixSide + padB;

    const canvas = document.createElement('canvas');
    canvas.width = cW;
    canvas.height = cH;
    const ctx = canvas.getContext('2d')!;

    // Clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cW, cH);

    const pdfLabels = [...METRICS.map((m) => m.pdfLabel), 'Vehiculos'];

    // ─── Top column labels (rotated -45°) ─────────────────────────────
    ctx.fillStyle = '#344054'; // gray-700
    ctx.font = '600 22px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < n; j++) {
      const cx = labelLeftW + j * (cellSize + cellGap) + cellSize / 2;
      const cy = labelTopH - 14;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(pdfLabels[j], 0, 0);
      ctx.restore();
    }

    // ─── Left row labels (horizontal, right-aligned) ──────────────────
    ctx.fillStyle = '#344054';
    ctx.font = '600 22px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const cy = labelTopH + i * (cellSize + cellGap) + cellSize / 2;
      ctx.fillText(pdfLabels[i], labelLeftW - 14, cy);
    }

    // ─── Subtle frame hairline around the matrix area ─────────────────
    ctx.strokeStyle = '#e3e8e6'; // gray-200
    ctx.lineWidth = 1;
    ctx.strokeRect(labelLeftW - 4, labelTopH - 4, matrixSide + 8, matrixSide + 8);

    // ─── Cells (rounded corners, gap-separated) ───────────────────────
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const r = matrix[i][j];
        const x = labelLeftW + j * (cellSize + cellGap);
        const y = labelTopH + i * (cellSize + cellGap);

        ctx.fillStyle = this.corrColor(r);
        this.roundedRect(ctx, x, y, cellSize, cellSize, 6);
        ctx.fill();

        // Diagonal cell: subtle inner ring to highlight
        if (i === j) {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 2;
          this.roundedRect(ctx, x + 5, y + 5, cellSize - 10, cellSize - 10, 4);
          ctx.stroke();
        }

        // Coefficient value
        ctx.fillStyle = Math.abs(r) > 0.4 ? '#ffffff' : '#1d2939';
        ctx.font = '600 22px Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.toFixed(2), x + cellSize / 2, y + cellSize / 2 + 1);
      }
    }

    // ─── Color legend (compact gradient strip below matrix) ───────────
    const legendY = labelTopH + matrixSide + 14;
    const legendW = matrixSide;
    const legendX = labelLeftW;
    const legendH = 6;
    const stops: [number, string][] = [
      [-1, '#1e3a8a'],
      [-0.5, '#60a5fa'],
      [0, '#f1f5f3'],
      [0.5, '#4fbb7a'],
      [1, '#113225'],
    ];
    const grad = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
    for (const [pos, color] of stops) {
      grad.addColorStop((pos + 1) / 2, color);
    }
    ctx.fillStyle = grad;
    this.roundedRect(ctx, legendX, legendY, legendW, legendH, 3);
    ctx.fill();

    // Legend ticks
    ctx.fillStyle = '#667085';
    ctx.font = '14px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tickVals = [-1, -0.5, 0, 0.5, 1];
    for (const t of tickVals) {
      const x = legendX + ((t + 1) / 2) * legendW;
      ctx.fillText(t.toFixed(1), x, legendY + legendH + 4);
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Path helper for rounded rectangles on canvas.
   * @private
   */
  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  /**
   * Renders cross-correlation bar chart with lag offsets (−12h to +12h).
   * Highlights best lag in orange.
   *
   * @private
   * @param {ReportData} data - Report data for lag computation.
   * @param {MetricOption} metric - Metric for correlation analysis.
   * @returns {string} PNG chart image as dataURL.
   */
  private chartLag(data: ReportData, metric: MetricOption): string {
    const info = this.lagResults(data, metric);
    const colors = info.lags.map((l) =>
      l.lag === info.best?.lag ? '#2ea44f' : Math.abs(l.r) > 0.3 ? '#7bd69a' : '#e3e8e6',
    );

    return this.offscreenChart(1400, 600, {
      type: 'bar',
      data: {
        labels: info.lags.map((l) => `${l.lag}h`),
        datasets: [
          {
            label: 'Correlacion cruzada (r)',
            data: info.lags.map((l) => l.r),
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 0,
            borderRadius: 4,
            barPercentage: 0.85,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        layout: { padding: { top: 24, right: 24, bottom: 16, left: 16 } },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              font: { size: 13, weight: 500 },
              padding: 16,
              boxWidth: 18,
              boxHeight: 8,
              color: '#475467',
            },
          },
        },
        scales: {
          x: {
            display: true,
            border: { display: false },
            grid: { display: false },
            title: {
              display: true,
              text: 'Rezago (horas)',
              font: { size: 11, weight: 'bold' },
              color: '#667085',
              padding: { top: 8 },
            },
            ticks: { font: { size: 10 }, color: '#98a2b3' },
          },
          y: {
            display: true,
            border: { display: false },
            grid: { color: '#f1f5f3', drawTicks: false },
            title: {
              display: true,
              text: 'Coeficiente r',
              font: { size: 11, weight: 'bold' },
              color: '#667085',
              padding: { bottom: 8 },
            },
            ticks: { font: { size: 11 }, color: '#98a2b3', padding: 6 },
            min: -1,
            max: 1,
          },
        },
      },
    });
  }

  /**
   * Renders grouped bar chart comparing metric and vehicle counts by location.
   *
   * @private
   * @param {ReportData} data - Report data with location information.
   * @param {MetricOption} metric - Metric for comparison chart.
   * @returns {string} PNG chart image as dataURL.
   */
  private chartLocation(data: ReportData, metric: MetricOption): string {
    const rows = this.locationRows(data, metric);
    return this.offscreenChart(1400, 600, {
      type: 'bar',
      data: {
        labels: rows.map((r) => this.truncateLabel(r.label, 18)),
        datasets: [
          {
            label: `${metric.pdfLabel} promedio (${metric.pdfUnit})`,
            data: rows.map((r) => r.avg),
            backgroundColor: metric.color + 'CC',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 4,
            barPercentage: 0.7,
            yAxisID: 'y',
          },
          {
            label: 'Vehiculos detectados',
            data: rows.map((r) => r.vehicles),
            backgroundColor: VEHICLE_COLOR + 'CC',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 4,
            barPercentage: 0.7,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        layout: { padding: { top: 24, right: 24, bottom: 16, left: 16 } },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              font: { size: 13, weight: 500 },
              padding: 16,
              boxWidth: 18,
              boxHeight: 8,
              color: '#475467',
            },
          },
        },
        scales: {
          x: {
            display: true,
            border: { display: false },
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#98a2b3', maxRotation: 25 },
          },
          y: {
            type: 'linear',
            position: 'left',
            border: { display: false },
            grid: { color: '#f1f5f3', drawTicks: false },
            ticks: { font: { size: 11 }, color: '#98a2b3', padding: 6 },
            title: {
              display: true,
              text: `${metric.pdfLabel} (${metric.pdfUnit})`,
              font: { size: 11, weight: 'bold' },
              color: '#667085',
              padding: { bottom: 8 },
            },
          },
          y1: {
            type: 'linear',
            position: 'right',
            border: { display: false },
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 11 }, color: '#98a2b3', padding: 6 },
            title: {
              display: true,
              text: 'Vehiculos',
              font: { size: 11, weight: 'bold' },
              color: '#667085',
              padding: { bottom: 8 },
            },
          },
        },
      },
    });
  }

  /**
   * Truncate label to a reasonable display length.
   * @private
   */
  private truncateLabel(s: string, max: number): string {
    if (!s) return '';
    return s.length > max ? s.substring(0, max - 1) + '…' : s;
  }

  /**
   * Computes time-series statistics for the selected metric.
   *
   * @private
   * @param {ReportData} data - Report data.
   * @param {MetricOption} metric - Metric for statistics.
   * @returns {Array<{label: string, value: string}>} Statistics rows.
   */
  private tsStats(data: ReportData, metric: MetricOption): { label: string; value: string }[] {
    const vals = data.sensorData
      .map((d) => d[metric.key] as number)
      .filter((v) => v != null && v >= 0);

    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return [
      { label: 'Promedio', value: `${avg.toFixed(2)} ${metric.pdfUnit}` },
      {
        label: 'Minimo',
        value: `${vals.length ? Math.min(...vals).toFixed(2) : '—'} ${metric.pdfUnit}`,
      },
      {
        label: 'Maximo',
        value: `${vals.length ? Math.max(...vals).toFixed(2) : '—'} ${metric.pdfUnit}`,
      },
      { label: 'Vehiculos totales', value: `${data.vehicleData.length}` },
      { label: 'Total mediciones', value: `${vals.length}` },
    ];
  }

  /**
   * Computes cross-correlation lag analysis (−12h to +12h).
   * Returns best lag, interpretation text, and top 5 results.
   *
   * @private
   * @param {ReportData} data - Report data.
   * @param {MetricOption} metric - Metric for lag analysis.
   * @returns {Object} Lag results with best, interpretation, and top 5.
   */
  private lagResults(
    data: ReportData,
    metric: MetricOption,
  ): {
    lags: { lag: number; r: number }[];
    best: { lag: number; r: number } | null;
    text: string;
    top5: { lag: number; r: number }[];
  } {
    const { start } = this.dateRange();
    const slotMs = 3_600_000;
    const nSlots = Math.ceil((this.dateRange().end.getTime() - start.getTime()) / slotMs);

    const mArr: number[] = new Array(nSlots).fill(0);
    const mCnt: number[] = new Array(nSlots).fill(0);
    const vArr: number[] = new Array(nSlots).fill(0);

    for (const d of data.sensorData) {
      const idx = Math.floor((new Date(d.timestamp).getTime() - start.getTime()) / slotMs);
      if (idx < 0 || idx >= nSlots) continue;
      const val = d[metric.key] as number;
      if (val != null && val >= 0) {
        mArr[idx] += val;
        mCnt[idx]++;
      }
    }
    for (const v of data.vehicleData) {
      const idx = Math.floor((new Date(v.timestamp).getTime() - start.getTime()) / slotMs);
      if (idx >= 0 && idx < nSlots) vArr[idx]++;
    }

    const mAvg = mArr.map((s, i) => (mCnt[i] ? s / mCnt[i] : 0));

    const lags: { lag: number; r: number }[] = [];
    for (let k = -12; k <= 12; k++) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < nSlots; i++) {
        const j = i + k;
        if (j >= 0 && j < nSlots) {
          xs.push(vArr[i]);
          ys.push(mAvg[j]);
        }
      }
      lags.push({ lag: k, r: xs.length > 2 ? this.pearson(xs, ys) : 0 });
    }

    const best = lags.reduce((b, l) => (Math.abs(l.r) > Math.abs(b.r) ? l : b), lags[0]);
    const top5 = [...lags].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5);

    let text = '';
    if (best && Math.abs(best.r) > 0.05) {
      const dir = best.r > 0 ? 'positiva' : 'negativa';
      const str = Math.abs(best.r) > 0.7 ? 'fuerte' : Math.abs(best.r) > 0.4 ? 'moderada' : 'debil';
      if (best.lag === 0) {
        text = `Correlacion ${dir} ${str} (r=${best.r.toFixed(3)}) sin desfase, efecto simultaneo.`;
      } else if (best.lag > 0) {
        text = `Correlacion ${dir} ${str} (r=${best.r.toFixed(3)}) con rezago de ${best.lag} h: el trafico precede los cambios en ${metric.pdfLabel}.`;
      } else {
        text = `Correlacion ${dir} ${str} (r=${best.r.toFixed(3)}) con adelanto de ${Math.abs(best.lag)} h: ${metric.pdfLabel} cambia antes que el trafico.`;
      }
    }

    return {
      lags,
      best: best && Math.abs(best.r) > 0.05 ? best : null,
      text,
      top5,
    };
  }

  /**
   * Computes per-location statistics ranked by average metric value.
   *
   * @private
   * @param {ReportData} data - Report data with location information.
   * @param {MetricOption} metric - Metric for location statistics.
   * @returns {Array} Location rows with avg, min, max, vehicle count, and sample count.
   */
  private locationRows(
    data: ReportData,
    metric: MetricOption,
  ): { label: string; avg: number; min: number; max: number; vehicles: number; samples: number }[] {
    return data.locations
      .map((loc) => {
        const locSensor = data.sensorData.filter((d) => d.device?.location?.id === loc.id);
        const vals = locSensor
          .map((d) => d[metric.key] as number)
          .filter((v) => v != null && v >= 0);
        const vehicles = data.vehicleData.filter((v) => v.location?.id === loc.id).length;
        const avg = vals.length
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
          : 0;

        return {
          label: loc.description ?? `Ubicacion ${loc.id}`,
          avg,
          min: vals.length ? Math.min(...vals) : 0,
          max: vals.length ? Math.max(...vals) : 0,
          vehicles,
          samples: locSensor.length,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }

  /**
   * Renders cover page with MOVE branding, logo, and report metadata.
   *
   * @private
   * @param {jsPDF} doc - jsPDF document instance.
   * @param {string} logo - Logo image as dataURL.
   * @param {MetricOption} metric - Selected metric for title badge.
   * @param {{key: PeriodKey, label: string}} period - Analysis period.
   * @param {Date} start - Report start date.
   * @param {Date} end - Report end date.
   * @param {number} pw - Page width in mm.
   * @param {number} ph - Page height in mm.
   */
  private pageCover(
    doc: jsPDF,
    logo: string,
    metric: MetricOption,
    start: Date,
    end: Date,
    pw: number,
    ph: number,
  ): void {
    // ── Clean white canvas ─────────────────────────────────────────────
    doc.setFillColor(...BRAND.white);
    doc.rect(0, 0, pw, ph, 'F');

    // ── Side ribbon (full height, brand) ───────────────────────────────
    doc.setFillColor(...BRAND.brand500);
    doc.rect(0, 0, 4, ph, 'F');
    doc.setFillColor(...BRAND.brand700);
    doc.rect(4, 0, 1.2, ph, 'F');

    // ── Header bar with logo + brand mark ──────────────────────────────
    const padX = 22;
    const headerY = 24;

    if (logo) {
      doc.addImage(logo, 'PNG', padX, headerY - 6, 13, 13);
    }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand700);
    doc.text('MOVE', padX + 17, headerY + 1);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray500);
    doc.text('Sistema de Monitoreo Ambiental', padX + 17, headerY + 6, { charSpace: 0.3 });

    // Right side: report number / date
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray400);
    doc.text(
      'REPORTE TECNICO',
      pw - padX,
      headerY + 1,
      { align: 'right', charSpace: 1 },
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray700);
    doc.text(
      this.fmtDateShort(new Date()),
      pw - padX,
      headerY + 6,
      { align: 'right' },
    );

    // Hairline rule under header
    doc.setDrawColor(...BRAND.gray200);
    doc.setLineWidth(0.3);
    doc.line(padX, headerY + 12, pw - padX, headerY + 12);

    // ── Editorial main title block ─────────────────────────────────────
    const titleY = 90;

    // Eyebrow: pre-title category
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand600);
    doc.text('INFORME · ANALISIS AMBIENTAL', padX, titleY, { charSpace: 1.6 });

    // Massive title
    doc.setFontSize(34);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray900);
    doc.text('Calidad del Aire', padX, titleY + 18);
    doc.text('y Trafico Urbano', padX, titleY + 32);

    // Brand accent rule
    doc.setDrawColor(...BRAND.brand500);
    doc.setLineWidth(1.2);
    doc.line(padX, titleY + 40, padX + 28, titleY + 40);

    // Subtitle / lead paragraph
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray600);
    doc.text(
      `Estudio del comportamiento de ${metric.pdfLabel} (${metric.pdfUnit}) y su relacion`,
      padX,
      titleY + 50,
    );
    doc.text(
      `con el flujo vehicular en el período ${this.fmtDateShort(start)} – ${this.fmtDateShort(end)}.`,
      padX,
      titleY + 56,
    );

    // ── Detail meta rows (clean editorial table) ───────────────────────
    const metaY = 196;
    const metaCols: [string, string][] = [
      ['CONTAMINANTE', `${metric.pdfLabel} · ${metric.pdfUnit}`],
      ['DESDE', this.fmtDate(start)],
      ['HASTA', this.fmtDate(end)],
    ];

    // Top rule
    doc.setDrawColor(...BRAND.gray800);
    doc.setLineWidth(0.6);
    doc.line(padX, metaY, pw - padX, metaY);

    let my = metaY;
    const metaRowH = 11;
    for (let i = 0; i < metaCols.length; i++) {
      const [lbl, val] = metaCols[i];
      my += metaRowH;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.gray500);
      doc.text(lbl, padX, my, { charSpace: 0.6 });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.gray900);
      doc.text(val, pw - padX, my, { align: 'right' });

      // Hairline divider between rows
      doc.setDrawColor(...BRAND.gray200);
      doc.setLineWidth(0.2);
      doc.line(padX, my + 3, pw - padX, my + 3);
    }

    // ── Footer ─────────────────────────────────────────────────────────
    doc.setDrawColor(...BRAND.gray200);
    doc.setLineWidth(0.3);
    doc.line(padX, ph - 22, pw - padX, ph - 22);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand700);
    doc.text('MOVE', padX, ph - 16);
    const fmoveW = doc.getTextWidth('MOVE');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray500);
    doc.text('·  Reporte tecnico generado automaticamente', padX + fmoveW + 2, ph - 16);

    doc.setFontSize(7);
    doc.setTextColor(...BRAND.gray400);
    doc.text('Pagina 1 de 5', pw - padX, ph - 16, { align: 'right' });
  }

  /**
   * Formats date as compact ISO-like (YYYY-MM-DD).
   * @private
   */
  private fmtDateShort(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Renders page header with title, subtitle, and decorative accent bar.
   *
   * @private
   * @param {jsPDF} doc - jsPDF document instance.
   * @param {string} title - Page title.
   * @param {string} subtitle - Page subtitle.
   * @param {number} mx - Left margin in mm.
   * @param {number} my - Top margin in mm.
   * @returns {number} Y-position after header.
   */
  private pageHeader(doc: jsPDF, title: string, subtitle: string, mx: number, my: number): number {
    const pw = 215.9;

    // Side ribbon (matches cover)
    doc.setFillColor(...BRAND.brand500);
    doc.rect(0, 0, 4, 279.4, 'F');
    doc.setFillColor(...BRAND.brand700);
    doc.rect(4, 0, 1.2, 279.4, 'F');

    // Top brand mark
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand700);
    doc.text('MOVE', mx, my);
    const moveW = doc.getTextWidth('MOVE');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray400);
    doc.text('·  Sistema de Monitoreo Ambiental', mx + moveW + 2, my);

    // Right: section eyebrow
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray400);
    doc.text(subtitle.toUpperCase(), pw - mx, my, { align: 'right', charSpace: 0.6 });

    // Hairline rule
    doc.setDrawColor(...BRAND.gray200);
    doc.setLineWidth(0.3);
    doc.line(mx, my + 4, pw - mx, my + 4);

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray900);
    doc.text(title, mx, my + 16);

    // Brand accent under title
    doc.setDrawColor(...BRAND.brand500);
    doc.setLineWidth(1.2);
    doc.line(mx, my + 20, mx + 18, my + 20);

    return my + 28;
  }

  /**
   * Renders footer with document info and page number.
   *
   * @private
   * @param {jsPDF} doc - jsPDF document instance.
   * @param {number} pw - Page width in mm.
   * @param {number} ph - Page height in mm.
   * @param {number} pageNum - Current page number.
   */
  private pageFooter(doc: jsPDF, pw: number, ph: number, pageNum: number): void {
    const mx = 20;
    // Hairline rule
    doc.setDrawColor(...BRAND.gray200);
    doc.setLineWidth(0.3);
    doc.line(mx, ph - 14, pw - mx, ph - 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand700);
    doc.text('MOVE', mx, ph - 8);
    const moveW = doc.getTextWidth('MOVE');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray400);
    doc.text('·  Reporte tecnico generado automaticamente', mx + moveW + 2, ph - 8);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray500);
    doc.text(`Pagina ${pageNum} de 5`, pw - mx, ph - 8, { align: 'right' });
  }

  /**
   * Renders a statistics row with multiple columns.
   *
   * @private
   * @param {jsPDF} doc - jsPDF document instance.
   * @param {number} mx - Left margin in mm.
   * @param {number} y - Top position in mm.
   * @param {number} cw - Content width in mm.
   * @param {Array<{label: string, value: string}>} stats - Statistics to display.
   * @returns {number} Y-position after stats row.
   */
  private statsRow(
    doc: jsPDF,
    mx: number,
    y: number,
    cw: number,
    stats: { label: string; value: string }[],
  ): number {
    // Section eyebrow
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand600);
    doc.text('RESUMEN ESTADISTICO', mx, y, { charSpace: 1 });
    doc.setDrawColor(...BRAND.gray800);
    doc.setLineWidth(0.5);
    doc.line(mx, y + 3, mx + cw, y + 3);

    y += 8;

    const colW = cw / stats.length;
    const boxH = 26;

    for (let i = 0; i < stats.length; i++) {
      const x = mx + i * colW;
      const cx = x + colW / 2;

      // Vertical hairline divider between columns (not before first)
      if (i > 0) {
        doc.setDrawColor(...BRAND.gray200);
        doc.setLineWidth(0.3);
        doc.line(x, y + 3, x, y + boxH - 3);
      }

      // Big bold value
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.gray900);
      doc.text(stats[i].value, cx, y + 12, { align: 'center' });

      // Small uppercase label
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.gray500);
      doc.text(stats[i].label.toUpperCase(), cx, y + 20, { align: 'center', charSpace: 0.6 });
    }

    // Bottom hairline
    doc.setDrawColor(...BRAND.gray200);
    doc.setLineWidth(0.3);
    doc.line(mx, y + boxH, mx + cw, y + boxH);

    doc.setFont('helvetica', 'normal');
    return y + boxH + 6;
  }

  /**
   * Renders a brand-styled callout box with optional heading and body text.
   *
   * @private
   * @param {jsPDF} doc - jsPDF document instance.
   * @param {number} x - Left position in mm.
   * @param {number} y - Top position in mm.
   * @param {number} w - Width in mm.
   * @param {number} h - Height in mm.
   * @param {string} heading - Bold heading.
   * @param {string} body - Body text.
   */
  private calloutBox(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    heading: string,
    body: string,
  ): void {
    // Subtle background
    doc.setFillColor(...BRAND.gray50);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');

    // Brand accent bar (left)
    doc.setFillColor(...BRAND.brand500);
    doc.rect(x, y, 1.6, h, 'F');

    // Heading
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray900);
    doc.text(heading, x + 7, y + 7);

    // Body
    if (body) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.gray600);
      doc.text(body, x + 7, y + 13, { maxWidth: w - 10, lineHeightFactor: 1.45 });
    }
  }

  /**
   * Renders a table of top 5 lag results with color-coded values.
   *
   * @private
   * @param {jsPDF} doc - jsPDF document instance.
   * @param {number} mx - Left margin in mm.
   * @param {number} y - Top position in mm.
   * @param {number} cw - Content width in mm.
   * @param {Array<{lag: number, r: number}>} top5 - Top 5 lag results.
   * @returns {number} Y-position after table.
   */
  private lagTable(
    doc: jsPDF,
    mx: number,
    y: number,
    cw: number,
    top5: { lag: number; r: number }[],
  ): number {
    // Section eyebrow
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand600);
    doc.text('TOP 5 REZAGOS CON MAYOR CORRELACION', mx, y, { charSpace: 1 });
    doc.setDrawColor(...BRAND.gray800);
    doc.setLineWidth(0.5);
    doc.line(mx, y + 3, mx + cw, y + 3);
    y += 8;

    // Column positions
    const cols = {
      rank: mx + 4,
      lag: mx + 18,
      r: mx + 60,
      intensity: mx + 105,
      sentido: mx + 152,
    };

    // Header (no fill, just hairlines)
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray500);
    doc.text('#', cols.rank, y, { charSpace: 0.4 });
    doc.text('REZAGO', cols.lag, y, { charSpace: 0.4 });
    doc.text('COEFICIENTE r', cols.r, y, { charSpace: 0.4 });
    doc.text('INTENSIDAD', cols.intensity, y, { charSpace: 0.4 });
    doc.text('SENTIDO', cols.sentido, y, { charSpace: 0.4 });
    y += 3;
    doc.setDrawColor(...BRAND.gray300);
    doc.setLineWidth(0.3);
    doc.line(mx, y, mx + cw, y);
    y += 1;

    // Body rows
    const rowH = 9;
    for (let i = 0; i < top5.length; i++) {
      const lag = top5[i];
      const absR = Math.abs(lag.r);
      const rowMid = y + rowH / 2 + 1.2;

      // Rank
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.gray400);
      doc.text(`${i + 1}`, cols.rank, rowMid);

      // Lag
      const lagText = `${lag.lag > 0 ? '+' : ''}${lag.lag} h`;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND.gray900);
      doc.text(lagText, cols.lag, rowMid);

      // r value (color-coded by strength)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      if (absR > 0.7) doc.setTextColor(...BRAND.brand700);
      else if (absR > 0.4) doc.setTextColor(217, 119, 6);
      else doc.setTextColor(...BRAND.gray500);
      doc.text(lag.r.toFixed(4), cols.r, rowMid);

      // Intensity (small dot + text — no badge)
      const intensity = absR > 0.7 ? 'Fuerte' : absR > 0.4 ? 'Moderada' : 'Debil';
      const intensityColor: [number, number, number] =
        absR > 0.7 ? BRAND.brand500 : absR > 0.4 ? [217, 119, 6] : BRAND.gray400;
      doc.setFillColor(...intensityColor);
      doc.circle(cols.intensity + 1, rowMid - 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.gray700);
      doc.text(intensity, cols.intensity + 5, rowMid);

      // Sentido
      const dir = lag.r >= 0 ? 'Positiva' : 'Negativa';
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      if (lag.r >= 0) doc.setTextColor(...BRAND.brand700);
      else doc.setTextColor(99, 102, 241);
      doc.text(dir, cols.sentido, rowMid);

      // Hairline divider
      y += rowH;
      doc.setDrawColor(...BRAND.gray100);
      doc.setLineWidth(0.2);
      doc.line(mx, y, mx + cw, y);
    }

    return y + 4;
  }

  /**
   * Renders a table of location statistics ranked by average metric value.
   * Includes medal styling for top 3 locations.
   *
   * @private
   * @param {jsPDF} doc - jsPDF document instance.
   * @param {number} mx - Left margin in mm.
   * @param {number} y - Top position in mm.
   * @param {number} cw - Content width in mm.
   * @param {Array} rows - Location data rows.
   * @param {MetricOption} metric - Metric for unit display.
   * @returns {number} Y-position after table.
   */
  private locationTable(
    doc: jsPDF,
    mx: number,
    y: number,
    cw: number,
    rows: {
      label: string;
      avg: number;
      min: number;
      max: number;
      vehicles: number;
      samples: number;
    }[],
    metric: MetricOption,
  ): number {
    // Section eyebrow
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.brand600);
    doc.text('RANKING DE UBICACIONES', mx, y, { charSpace: 1 });
    doc.setDrawColor(...BRAND.gray800);
    doc.setLineWidth(0.5);
    doc.line(mx, y + 3, mx + cw, y + 3);
    y += 8;

    // Column layout: cw = 175.9mm
    const cols = {
      rank: { x: mx + 5, w: 8 },
      label: { x: mx + 14, w: 62 },
      avg: { x: mx + 76, w: 30 },
      min: { x: mx + 106, w: 22 },
      max: { x: mx + 128, w: 22 },
      vehic: { x: mx + 150, w: 26 },
    };

    // Header (no fill, just hairlines)
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.gray500);
    doc.text('#', cols.rank.x, y, { charSpace: 0.4 });
    doc.text('UBICACION', cols.label.x, y, { charSpace: 0.4 });
    doc.text(`PROMEDIO (${metric.pdfUnit})`, cols.avg.x + cols.avg.w - 2, y, {
      align: 'right',
      charSpace: 0.4,
    });
    doc.text('MIN', cols.min.x + cols.min.w - 2, y, { align: 'right', charSpace: 0.4 });
    doc.text('MAX', cols.max.x + cols.max.w - 2, y, { align: 'right', charSpace: 0.4 });
    doc.text('VEHIC.', cols.vehic.x + cols.vehic.w - 2, y, { align: 'right', charSpace: 0.4 });
    y += 3;
    doc.setDrawColor(...BRAND.gray300);
    doc.setLineWidth(0.3);
    doc.line(mx, y, mx + cw, y);
    y += 1;

    const [mR, mG, mB] = this.hexRgb(metric.color);
    const medalFg: [number, number, number][] = [
      [217, 167, 7], // gold
      [148, 163, 184], // silver
      [180, 120, 68], // bronze
    ];

    const rowH = 9;
    const maxY = 258;

    for (let i = 0; i < rows.length && y + rowH < maxY; i++) {
      const row = rows[i];
      const rowMid = y + rowH / 2 + 1.2;

      // Subtle alternating zebra (very light)
      if (i % 2 === 0) {
        doc.setFillColor(...BRAND.gray50);
        doc.rect(mx, y - 1, cw, rowH, 'F');
      }

      // Rank: small medal dot for top 3, plain number otherwise
      if (i < 3) {
        doc.setFillColor(...medalFg[i]);
        doc.circle(cols.rank.x + 1, rowMid - 1.2, 2, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND.white);
        doc.text(`${i + 1}`, cols.rank.x + 1, rowMid - 0.2, { align: 'center' });
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BRAND.gray400);
        doc.text(`${i + 1}`, cols.rank.x, rowMid);
      }

      // Location label
      const maxChars = 32;
      let label = row.label;
      if (label.length > maxChars) label = label.substring(0, maxChars - 1) + '…';
      doc.setFontSize(8.5);
      doc.setFont('helvetica', i < 3 ? 'bold' : 'normal');
      doc.setTextColor(...BRAND.gray900);
      doc.text(label, cols.label.x, rowMid);

      // Avg
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mR, mG, mB);
      doc.text(`${row.avg}`, cols.avg.x + cols.avg.w - 2, rowMid, { align: 'right' });

      // Min / Max
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.gray500);
      doc.text(`${row.min}`, cols.min.x + cols.min.w - 2, rowMid, { align: 'right' });
      doc.text(`${row.max}`, cols.max.x + cols.max.w - 2, rowMid, { align: 'right' });

      // Vehicles
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text(`${row.vehicles}`, cols.vehic.x + cols.vehic.w - 2, rowMid, { align: 'right' });

      y += rowH;
      // Hairline divider
      doc.setDrawColor(...BRAND.gray100);
      doc.setLineWidth(0.2);
      doc.line(mx, y, mx + cw, y);
    }

    return y + 4;
  }

  /**
   * Updates progress tracking during PDF generation.
   *
   * @private
   * @param {number} pct - Progress percentage (0-100).
   * @param {string} msg - Status message.
   */
  private tick(pct: number, msg: string): void {
    this.progress = pct;
    this.progressMsg = msg;
    this.cdr.markForCheck();
  }

  /**
   * Returns the active date range set by the period selector.
   * Only called after the user has selected a period (selectedRange is non-null).
   */
  private dateRange(): { start: Date; end: Date } {
    return this.selectedRange!;
  }

  /**
   * Creates array of time bucket boundaries.
   *
   * @private
   * @param {Date} start - Start date.
   * @param {Date} end - End date.
   * @param {number} ms - Bucket size in milliseconds.
   * @returns {Date[]} Array of bucket boundary dates.
   */
  private timeBuckets(start: Date, end: Date, ms: number): Date[] {
    const out: Date[] = [];
    let t = start.getTime();
    while (t < end.getTime()) {
      out.push(new Date(t));
      t += ms;
    }
    return out;
  }

  /**
   * Formats bucket boundary date for chart labels.
   *
   * @private
   * @param {Date} d - Date to format.
   * @param {PeriodKey} p - Period for formatting context.
   * @returns {string} Formatted label.
   */
  private bucketLabel(d: Date, bucketMs: number): string {
    if (bucketMs === 3_600_000)
      return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (bucketMs === 4 * 3_600_000)
      return d.toLocaleDateString('es', { weekday: 'short', hour: '2-digit' });
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  }

  /**
   * Formats date for PDF display.
   *
   * @private
   * @param {Date} d - Date to format.
   * @returns {string} Formatted date string.
   */
  private fmtDate(d: Date): string {
    return d.toLocaleDateString('es', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Computes Pearson correlation coefficient.
   *
   * @private
   * @param {number[]} x - First variable.
   * @param {number[]} y - Second variable.
   * @returns {number} Correlation coefficient.
   */
  private pearson(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;
    let sx = 0,
      sy = 0,
      sxy = 0,
      sx2 = 0,
      sy2 = 0;
    for (let i = 0; i < n; i++) {
      sx += x[i];
      sy += y[i];
      sxy += x[i] * y[i];
      sx2 += x[i] * x[i];
      sy2 += y[i] * y[i];
    }
    const den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
    return den === 0 ? 0 : (n * sxy - sx * sy) / den;
  }

  /**
   * Returns hex color for correlation strength.
   *
   * @private
   * @param {number} r - Correlation coefficient.
   * @returns {string} Hex color string.
   */
  private corrColor(r: number): string {
    // Positive: brand green ramp (aligned with --color-brand-* palette)
    if (r >= 0.8) return '#113225'; // brand-900
    if (r >= 0.6) return '#1e6f35'; // brand-700
    if (r >= 0.4) return '#4fbb7a'; // brand-400
    if (r >= 0.2) return '#a3e0c1'; // brand-200
    // Neutral
    if (r > -0.2) return '#f1f5f3'; // gray-100
    // Negative: blue ramp
    if (r > -0.4) return '#bfdbfe';
    if (r > -0.6) return '#60a5fa';
    if (r > -0.8) return '#2563eb';
    return '#1e3a8a';
  }

  /**
   * Renders chart to off-screen canvas and returns PNG dataURL.
   *
   * @private
   * @param {number} w - Canvas width in pixels.
   * @param {number} h - Canvas height in pixels.
   * @param {ChartConfiguration} cfg - Chart.js configuration.
   * @returns {string} PNG image as dataURL.
   */
  private offscreenChart(w: number, h: number, cfg: ChartConfiguration): string {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const chart = new ChartJS(canvas, {
      ...cfg,
      options: { ...cfg.options, responsive: false, animation: false },
    });
    const url = canvas.toDataURL('image/png');
    chart.destroy();
    return url;
  }

  /**
   * Converts CSS hex color to RGB tuple for jsPDF.
   *
   * @private
   * @param {string} hex - Hex color string (e.g., '#ff0000').
   * @returns {[number, number, number]} RGB tuple.
   */
  private hexRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  /**
   * Loads logo image from assets and converts to canvas dataURL.
   *
   * @private
   * @async
   * @returns {Promise<string>} Logo as PNG dataURL, or empty string on failure.
   */
  private async loadLogo(): Promise<string> {
    try {
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 200;
          c.height = 200;
          c.getContext('2d')!.drawImage(img, 0, 0, 200, 200);
          resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = 'images/logo/logo-icon.svg';
      });
    } catch {
      return '';
    }
  }

  // ── Raw data export ──────────────────────────────────────────────────────

  get filteredDevices(): Device[] {
    const targetType = this.rawDataType === 'sensor' ? DeviceType.SENSOR : DeviceType.CAMERA;
    return this.allDevices.filter((d) => d.type === targetType);
  }

  get allDevicesSelected(): boolean {
    return this.filteredDevices.length > 0 && this.filteredDevices.every((d) => this.selectedDeviceIds.has(d.id));
  }

  get allMetricsSelected(): boolean {
    return ALL_METRIC_KEYS.every((k) => this.selectedMetrics.has(k));
  }

  get allVehicleTypesSelected(): boolean {
    return VEHICLE_TYPES_EXPORT.every((t) => this.selectedVehicleTypes.has(t.key));
  }

  get canExport(): boolean {
    const hasDateRange = !!this.rawStartDate && !!this.rawEndDate && !this.rawDateError;
    const hasSelection =
      this.rawDataType === 'sensor' ? this.selectedMetrics.size > 0 : this.selectedVehicleTypes.size > 0;
    return hasDateRange && hasSelection && !this.isExporting;
  }

  setExportMode(mode: 'pdf' | 'raw'): void {
    this.exportMode = mode;
    if (mode === 'raw' && this.allDevices.length === 0) {
      this.deviceService
        .getAll()
        .pipe(catchError(() => of([] as Device[])), takeUntil(this.destroy$))
        .subscribe((devices) => {
          this.allDevices = devices;
          this.cdr.markForCheck();
        });
    }
    this.cdr.markForCheck();
  }

  setRawDataType(type: 'sensor' | 'vehicle'): void {
    this.rawDataType = type;
    this.selectedDeviceIds.clear();
    this.cdr.markForCheck();
  }

  toggleDevice(id: number): void {
    if (this.selectedDeviceIds.has(id)) {
      this.selectedDeviceIds.delete(id);
    } else {
      this.selectedDeviceIds.add(id);
    }
    this.cdr.markForCheck();
  }

  toggleAllDevices(): void {
    if (this.allDevicesSelected) {
      this.selectedDeviceIds.clear();
    } else {
      this.filteredDevices.forEach((d) => this.selectedDeviceIds.add(d.id));
    }
    this.cdr.markForCheck();
  }

  toggleMetric(key: MetricKey): void {
    if (this.selectedMetrics.has(key)) {
      this.selectedMetrics.delete(key);
    } else {
      this.selectedMetrics.add(key);
    }
    this.cdr.markForCheck();
  }

  toggleAllMetrics(): void {
    if (this.allMetricsSelected) {
      this.selectedMetrics.clear();
    } else {
      ALL_METRIC_KEYS.forEach((k) => this.selectedMetrics.add(k));
    }
    this.cdr.markForCheck();
  }

  toggleVehicleType(key: VehicleTypeKey): void {
    if (this.selectedVehicleTypes.has(key)) {
      this.selectedVehicleTypes.delete(key);
    } else {
      this.selectedVehicleTypes.add(key);
    }
    this.cdr.markForCheck();
  }

  toggleAllVehicleTypes(): void {
    if (this.allVehicleTypesSelected) {
      this.selectedVehicleTypes.clear();
    } else {
      VEHICLE_TYPES_EXPORT.forEach((t) => this.selectedVehicleTypes.add(t.key));
    }
    this.cdr.markForCheck();
  }

  selectRawQuick(hours: number): void {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3_600_000);
    this.rawEndDate = this.toDateInputString(end);
    this.rawStartDate = this.toDateInputString(start);
    this.rawDateError = '';
    this.cdr.markForCheck();
  }

  onRawDateChange(): void {
    this.rawDateError = '';
    this.cdr.markForCheck();
  }

  private validateRawDates(): boolean {
    this.rawDateError = '';
    if (!this.rawStartDate || !this.rawEndDate) {
      this.rawDateError = 'Debes seleccionar tanto la fecha de inicio como la de fin.';
      this.cdr.markForCheck();
      return false;
    }
    const start = new Date(this.rawStartDate + 'T00:00:00');
    const end = new Date(this.rawEndDate + 'T23:59:59');
    if (start > end) {
      this.rawDateError = 'La fecha de inicio no puede ser posterior a la fecha de fin.';
      this.cdr.markForCheck();
      return false;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (end > today) {
      this.rawDateError = 'La fecha de fin no puede ser en el futuro.';
      this.cdr.markForCheck();
      return false;
    }
    return true;
  }

  async exportRawData(): Promise<void> {
    if (!this.validateRawDates()) return;

    this.isExporting = true;
    this.cdr.markForCheck();

    try {
      const start = new Date(this.rawStartDate + 'T00:00:00');
      const end = new Date(this.rawEndDate + 'T23:59:59');
      const deviceIds = this.selectedDeviceIds.size > 0 ? Array.from(this.selectedDeviceIds) : undefined;
      const ext = this.rawFormat;
      const mime = ext === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json';

      if (this.rawDataType === 'sensor') {
        const data = await firstValueFrom(
          this.sensorDataService.search({ start, end, size: 10000 }).pipe(catchError(() => of([] as SensorData[]))),
        );
        const filtered = deviceIds ? data.filter((d) => deviceIds.includes(d.device?.id ?? d.deviceId)) : data;
        if (filtered.length === 0) {
          this.toastService.show('No se encontraron registros de sensores para el período y filtros seleccionados.', {
            title: 'Sin datos',
            variant: 'warning',
          });
          return;
        }
        const content =
          ext === 'csv'
            ? this.buildSensorCsv(filtered)
            : this.buildSensorJson(filtered, start, end, deviceIds);
        this.downloadFile(content, `sensores_${this.rawStartDate}_${this.rawEndDate}.${ext}`, mime);
      } else {
        const data = await firstValueFrom(
          this.vehicleService.search({ start, end, deviceIds }).pipe(catchError(() => of([] as VehicleDetected[]))),
        );
        const filtered =
          this.selectedVehicleTypes.size < VEHICLE_TYPES_EXPORT.length
            ? data.filter((v) => this.selectedVehicleTypes.has(v.vehicleType as VehicleTypeKey))
            : data;
        if (filtered.length === 0) {
          this.toastService.show('No se encontraron detecciones de vehículos para el período y filtros seleccionados.', {
            title: 'Sin datos',
            variant: 'warning',
          });
          return;
        }
        const content =
          ext === 'csv'
            ? this.buildVehicleCsv(filtered)
            : this.buildVehicleJson(filtered, start, end, deviceIds);
        this.downloadFile(content, `vehiculos_${this.rawStartDate}_${this.rawEndDate}.${ext}`, mime);
      }
    } finally {
      this.isExporting = false;
      this.cdr.markForCheck();
    }
  }

  private buildSensorCsv(data: SensorData[]): string {
    const metricCols = METRICS.filter((m) => this.selectedMetrics.has(m.key));
    const header = [
      'timestamp',
      'device_id',
      'device_name',
      'location',
      ...metricCols.map((m) => `${m.pdfLabel}_${m.pdfUnit}`),
    ].join(',');
    const rows = data.map((d) => {
      const ts = new Date(d.timestamp).toISOString();
      const name = d.device?.name ?? '';
      const loc = d.device?.location?.description ?? '';
      const vals = metricCols.map((m) => d[m.key] ?? '');
      return [ts, d.device?.id ?? d.deviceId, `"${name}"`, `"${loc}"`, ...vals].join(',');
    });
    return [header, ...rows].join('\n');
  }

  private buildVehicleCsv(data: VehicleDetected[]): string {
    const header = ['timestamp', 'device_id', 'device_name', 'location', 'vehicle_type'].join(',');
    const rows = data.map((v) => {
      const ts = new Date(v.timestamp).toISOString();
      const name = v.device?.name ?? '';
      const loc = v.device?.location?.description ?? v.location?.description ?? '';
      return [ts, v.device?.id ?? '', `"${name}"`, `"${loc}"`, v.vehicleType].join(',');
    });
    return [header, ...rows].join('\n');
  }

  private buildSensorJson(data: SensorData[], start: Date, end: Date, deviceIds?: number[]): string {
    const metricCols = METRICS.filter((m) => this.selectedMetrics.has(m.key));
    const exportedData = data.map((d) => {
      const record: Record<string, unknown> = {
        timestamp: new Date(d.timestamp).toISOString(),
        device_id: d.device?.id ?? d.deviceId,
        device_name: d.device?.name ?? null,
        location: d.device?.location?.description ?? null,
      };
      for (const m of metricCols) {
        record[m.key] = d[m.key] ?? null;
      }
      return record;
    });
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        type: 'sensor_data',
        period: { start: start.toISOString(), end: end.toISOString() },
        devices: deviceIds ?? 'all',
        metrics: metricCols.map((m) => ({ key: m.key, label: m.pdfLabel, unit: m.pdfUnit })),
        data: exportedData,
      },
      null,
      2,
    );
  }

  private buildVehicleJson(data: VehicleDetected[], start: Date, end: Date, deviceIds?: number[]): string {
    const exportedData = data.map((v) => ({
      timestamp: new Date(v.timestamp).toISOString(),
      device_id: v.device?.id ?? null,
      device_name: v.device?.name ?? null,
      location: v.device?.location?.description ?? v.location?.description ?? null,
      vehicle_type: v.vehicleType,
    }));
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        type: 'vehicle_detections',
        period: { start: start.toISOString(), end: end.toISOString() },
        devices: deviceIds ?? 'all',
        vehicle_types: Array.from(this.selectedVehicleTypes),
        data: exportedData,
      },
      null,
      2,
    );
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private toDateInputString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
