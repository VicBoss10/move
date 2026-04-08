import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
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
import { Location } from '../../../../core/models/location.model';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

ChartJS.register(
  LineController, LineElement, PointElement,
  BarController, BarElement,
  LinearScale, CategoryScale,
  Tooltip, Legend, Filler,
);

// ── Tipos ─────────────────────────────────────────────────────────────────────

type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';
type PeriodKey = '24h' | '7d' | '30d';

interface MetricOption {
  key: MetricKey;
  label: string;
  pdfLabel: string;
  unit: string;
  pdfUnit: string;
  color: string;
}

interface ReportData {
  sensorData: SensorData[];
  vehicleData: VehicleDetected[];
  locations: Location[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ALL_METRIC_KEYS: MetricKey[] = [
  'co2', 'pm25', 'pm10', 'temperature', 'humidity', 'co', 'no2', 'nh3',
];

const METRICS: MetricOption[] = [
  { key: 'co2',         label: 'CO₂',        pdfLabel: 'CO2',          unit: 'ppm',    pdfUnit: 'ppm',   color: '#ef4444' },
  { key: 'pm25',        label: 'PM2.5',       pdfLabel: 'PM2.5',       unit: 'µg/m³',  pdfUnit: 'ug/m3', color: '#a855f7' },
  { key: 'pm10',        label: 'PM10',        pdfLabel: 'PM10',        unit: 'µg/m3',  pdfUnit: 'ug/m3', color: '#f97316' },
  { key: 'temperature', label: 'Temperatura', pdfLabel: 'Temperatura', unit: '°C',     pdfUnit: 'C',     color: '#eab308' },
  { key: 'humidity',    label: 'Humedad',     pdfLabel: 'Humedad',     unit: '%',      pdfUnit: '%',     color: '#3b82f6' },
  { key: 'co',          label: 'CO',          pdfLabel: 'CO',          unit: 'ppm',    pdfUnit: 'ppm',   color: '#6b7280' },
  { key: 'no2',         label: 'NO₂',         pdfLabel: 'NO2',         unit: 'ppb',    pdfUnit: 'ppb',   color: '#22c55e' },
  { key: 'nh3',         label: 'NH₃',         pdfLabel: 'NH3',         unit: 'ppb',    pdfUnit: 'ppb',   color: '#14b8a6' },
];

const PERIODS: { key: PeriodKey; label: string; hours: number }[] = [
  { key: '24h', label: 'Últimas 24 h',     hours: 24  },
  { key: '7d',  label: 'Últimos 7 días',   hours: 168 },
  { key: '30d', label: 'Últimos 30 días',  hours: 720 },
];

const VEHICLE_COLOR = '#6366f1';

// ── Componente ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-data-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-export.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataExportComponent implements OnDestroy {

  private readonly destroy$ = new Subject<void>();

  readonly metrics = METRICS;
  readonly periods = PERIODS;

  selectedPeriod: PeriodKey = '7d';
  selectedMetric: MetricKey = 'co2';

  isGenerating = false;
  progress     = 0;
  progressMsg  = '';

  constructor(
    private readonly locationService: LocationService,
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Acciones del usuario ───────────────────────────────────────────────────

  setPeriod(p: PeriodKey): void {
    this.selectedPeriod = p;
    this.cdr.markForCheck();
  }

  setMetric(m: MetricKey): void {
    this.selectedMetric = m;
    this.cdr.markForCheck();
  }

  // ── Pipeline principal ─────────────────────────────────────────────────────

  async generatePdf(): Promise<void> {
    this.isGenerating = true;
    this.progress     = 0;
    this.progressMsg  = 'Obteniendo datos del servidor…';
    this.cdr.markForCheck();

    try {
      // 1. Datos
      const data = await this.fetchData();
      this.tick(10, 'Generando gráfico de series temporales…');

      const metric = METRICS.find(m => m.key === this.selectedMetric)!;
      const period = PERIODS.find(p => p.key === this.selectedPeriod)!;
      const { start, end } = this.dateRange();

      // 2. Gráficos
      const tsImg   = this.chartTimeSeries(data, metric, period);
      this.tick(25, 'Generando matriz de correlación…');

      const corrImg = this.chartCorrelationMatrix(data);
      this.tick(45, 'Generando análisis de rezagos…');

      const lagImg  = this.chartLag(data, metric);
      const lagInfo = this.lagResults(data, metric);
      this.tick(60, 'Generando análisis por ubicación…');

      const locImg  = this.chartLocation(data, metric);
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
      this.pageCover(doc, logoUrl, metric, period, start, end, PW, PH);

      // ── Series temporales ───────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      let y = this.pageHeader(doc, 'Series Temporales',
        `${metric.pdfLabel} (${metric.pdfUnit}) + Vehiculos`, MX, 20);
      const tsH = CW * 0.5;
      doc.addImage(tsImg, 'PNG', MX, y, CW, tsH);
      y += tsH + 8;
      y = this.statsRow(doc, MX, y, CW, this.tsStats(data, metric));
      this.pageFooter(doc, PW, PH, 2);

      // ── Correlación ─────────────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      y = this.pageHeader(doc, 'Matriz de Correlacion',
        'Coeficiente de Pearson entre todas las variables', MX, 20);
      const corrH = CW * 0.65;
      doc.addImage(corrImg, 'PNG', MX, y, CW, corrH);
      y += corrH + 6;
      // Interpretation callout box
      doc.setFillColor(240, 253, 244);                 // green-50
      doc.roundedRect(MX, y, CW, 16, 2, 2, 'F');
      doc.setFillColor(34, 197, 94);                   // green-500 left accent
      doc.rect(MX, y, 3, 16, 'F');
      doc.setDrawColor(187, 247, 208);                 // green-200 border
      doc.setLineWidth(0.3);
      doc.roundedRect(MX, y, CW, 16, 2, 2, 'S');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(55, 65, 81);
      doc.text(
        'Interpretacion: valores cercanos a +1 indican correlacion positiva fuerte; '
        + 'cercanos a -1, correlacion negativa fuerte. '
        + 'La diagonal es siempre 1.00 (autocorrelacion).',
        MX + 7, y + 10, { maxWidth: CW - 9 },
      );
      this.pageFooter(doc, PW, PH, 3);

      // ── Rezagos ─────────────────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      y = this.pageHeader(doc, 'Analisis de Rezagos (CCF)',
        `${metric.pdfLabel} vs Vehiculos — lags de -12 h a +12 h`, MX, 20);
      const lagH = CW * 0.42;
      doc.addImage(lagImg, 'PNG', MX, y, CW, lagH);
      y += lagH + 8;
      if (lagInfo.best) {
        // Styled callout for best lag
        doc.setFillColor(240, 253, 244);               // green-50
        doc.roundedRect(MX, y, CW, 26, 2, 2, 'F');
        doc.setFillColor(34, 197, 94);                 // green left bar
        doc.rect(MX, y, 3, 26, 'F');
        doc.setDrawColor(187, 247, 208);
        doc.setLineWidth(0.3);
        doc.roundedRect(MX, y, CW, 26, 2, 2, 'S');
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);                 // green-600
        const lagSign = lagInfo.best.lag > 0 ? '+' : '';
        doc.text(
          `Mejor rezago: ${lagSign}${lagInfo.best.lag} h   |   r = ${lagInfo.best.r.toFixed(4)}`,
          MX + 7, y + 9,
        );
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(lagInfo.text, MX + 7, y + 18, { maxWidth: CW - 9 });
        y += 31;
      }
      y = this.lagTable(doc, MX, y, CW, lagInfo.top5);
      this.pageFooter(doc, PW, PH, 4);

      // ── Ubicaciones ─────────────────────────────────────────────────────
      doc.addPage('letter', 'portrait');
      y = this.pageHeader(doc, 'Analisis por Ubicacion',
        `${metric.pdfLabel} promedio + Vehiculos por ubicacion`, MX, 20);
      const locH = CW * 0.42;
      doc.addImage(locImg, 'PNG', MX, y, CW, locH);
      y += locH + 8;
      y = this.locationTable(doc, MX, y, CW, locRows, metric);
      this.pageFooter(doc, PW, PH, 5);

      this.tick(95, 'Descargando…');

      // 5. Descargar
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`MOVE_Informe_${metric.pdfLabel}_${period.key}_${dateStr}.pdf`);

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

  // ── Obtener datos ──────────────────────────────────────────────────────────

  private fetchData(): Promise<ReportData> {
    const { start, end } = this.dateRange();
    return new Promise((resolve, reject) => {
      forkJoin({
        sensorData:  this.sensorDataService.search({ start, end, size: 10000 }).pipe(catchError(() => of([] as SensorData[]))),
        vehicleData: this.vehicleService.search({ start, end }).pipe(catchError(() => of([] as VehicleDetected[]))),
        locations:   this.locationService.getAll().pipe(catchError(() => of([] as Location[]))),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: d => resolve(d), error: e => reject(e) });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDERIZACIÓN DE GRÁFICOS (canvas off-screen → dataURL)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Gráfico de líneas dual: contaminante + vehículos en el tiempo */
  private chartTimeSeries(
    data: ReportData,
    metric: MetricOption,
    period: { key: PeriodKey; hours: number },
  ): string {
    const { start, end } = this.dateRange();
    const bucketMs =
      period.key === '24h' ? 3_600_000
      : period.key === '7d' ? 4 * 3_600_000
      : 24 * 3_600_000;

    const buckets = this.timeBuckets(start, end, bucketMs);
    const mVals  = new Array(buckets.length).fill(0);
    const mCnts  = new Array(buckets.length).fill(0);
    const vCnts  = new Array(buckets.length).fill(0);

    for (const d of data.sensorData) {
      const idx = Math.floor((new Date(d.timestamp).getTime() - start.getTime()) / bucketMs);
      if (idx < 0 || idx >= buckets.length) continue;
      const v = d[metric.key] as number;
      if (v != null && v >= 0) { mVals[idx] += v; mCnts[idx]++; }
    }
    for (const v of data.vehicleData) {
      const idx = Math.floor((new Date(v.timestamp).getTime() - start.getTime()) / bucketMs);
      if (idx >= 0 && idx < buckets.length) vCnts[idx]++;
    }

    const avgs   = mVals.map((s, i) => mCnts[i] ? +(s / mCnts[i]).toFixed(2) : 0);
    const labels = buckets.map(b => this.bucketLabel(b, period.key));

    return this.offscreenChart(1400, 700, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${metric.pdfLabel} (${metric.pdfUnit})`,
            data: avgs,
            borderColor: metric.color,
            backgroundColor: metric.color + '33',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y',
          },
          {
            label: 'Vehiculos',
            data: vCnts,
            borderColor: VEHICLE_COLOR,
            backgroundColor: VEHICLE_COLOR + '33',
            fill: false,
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: false,
        animation: false as any,
        plugins: { legend: { display: true, position: 'top', labels: { font: { size: 14 }, padding: 16 } } },
        scales: {
          x: { display: true, ticks: { font: { size: 10 }, maxRotation: 45 } },
          y:  { type: 'linear', position: 'left',  title: { display: true, text: `${metric.pdfLabel} (${metric.pdfUnit})`, font: { size: 12 } } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Vehiculos', font: { size: 12 } }, grid: { drawOnChartArea: false } },
        },
      },
    } as any);
  }

  /** Matriz de correlación 9×9 dibujada a mano en un canvas */
  private chartCorrelationMatrix(data: ReportData): string {
    const { start } = this.dateRange();
    const slotMs = 3_600_000;
    const nSlots = Math.ceil(
      (this.dateRange().end.getTime() - start.getTime()) / slotMs,
    );

    const keys: string[] = [...ALL_METRIC_KEYS, 'vehicleCount'];
    const sums:  Record<string, number[]> = {};
    const cnts:  Record<string, number[]> = {};
    for (const k of keys) {
      sums[k] = new Array(nSlots).fill(0);
      cnts[k] = new Array(nSlots).fill(0);
    }

    for (const d of data.sensorData) {
      const idx = Math.floor((new Date(d.timestamp).getTime() - start.getTime()) / slotMs);
      if (idx < 0 || idx >= nSlots) continue;
      for (const k of ALL_METRIC_KEYS) {
        const v = d[k] as number;
        if (v != null && v >= 0) { sums[k][idx] += v; cnts[k][idx]++; }
      }
    }
    for (const v of data.vehicleData) {
      const idx = Math.floor((new Date(v.timestamp).getTime() - start.getTime()) / slotMs);
      if (idx >= 0 && idx < nSlots) { sums['vehicleCount'][idx]++; cnts['vehicleCount'][idx] = 1; }
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

    // Dibujar en canvas
    const cellW = 110;
    const cellH = 70;
    const labelW = 170;
    const headerH = 90;
    const cW = labelW + n * cellW;
    const cH = headerH + n * cellH;
    const canvas = document.createElement('canvas');
    canvas.width = cW;
    canvas.height = cH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cW, cH);

    const pdfLabels = [...METRICS.map(m => m.pdfLabel), 'Vehiculos'];

    // encabezados columna
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    for (let j = 0; j < n; j++) {
      ctx.save();
      ctx.translate(labelW + j * cellW + cellW / 2, headerH - 12);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(pdfLabels[j], 0, 0);
      ctx.restore();
    }

    // filas
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(pdfLabels[i], labelW - 14, headerH + i * cellH + cellH / 2 + 7);

      for (let j = 0; j < n; j++) {
        const r = matrix[i][j];
        const x = labelW + j * cellW;
        const y = headerH + i * cellH;

        ctx.fillStyle = this.corrColor(r);
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

        ctx.fillStyle = Math.abs(r) > 0.6 ? '#ffffff' : '#1f2937';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.toFixed(2), x + cellW / 2, y + cellH / 2 + 7);
      }
    }

    return canvas.toDataURL('image/png');
  }

  /** Gráfico de barras de cross-correlación por lag */
  private chartLag(data: ReportData, metric: MetricOption): string {
    const info = this.lagResults(data, metric);
    const colors = info.lags.map(l =>
      l.lag === info.best?.lag ? '#f59e0b'
      : Math.abs(l.r) > 0.3   ? '#3b82f6'
      : '#d1d5db',
    );

    return this.offscreenChart(1400, 600, {
      type: 'bar',
      data: {
        labels: info.lags.map(l => `${l.lag}h`),
        datasets: [{
          label: 'Correlacion cruzada (r)',
          data: info.lags.map(l => l.r),
          backgroundColor: colors,
          borderColor: colors.map(c => c === '#d1d5db' ? '#9ca3af' : c),
          borderWidth: 1,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: false,
        animation: false as any,
        plugins: { legend: { display: true, position: 'top', labels: { font: { size: 13 } } } },
        scales: {
          x: { display: true, title: { display: true, text: 'Rezago (horas)', font: { size: 12 } }, ticks: { font: { size: 10 } } },
          y: { display: true, title: { display: true, text: 'Coeficiente r', font: { size: 12 } }, min: -1, max: 1 },
        },
      },
    } as any);
  }

  /** Barras agrupadas por ubicación: contaminante + vehículos */
  private chartLocation(data: ReportData, metric: MetricOption): string {
    const rows = this.locationRows(data, metric);
    return this.offscreenChart(1400, 600, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.label),
        datasets: [
          {
            label: `${metric.pdfLabel} promedio (${metric.pdfUnit})`,
            data: rows.map(r => r.avg),
            backgroundColor: metric.color + 'B3',
            borderColor: metric.color,
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Vehiculos detectados',
            data: rows.map(r => r.vehicles),
            backgroundColor: VEHICLE_COLOR + 'B3',
            borderColor: VEHICLE_COLOR,
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: false,
        animation: false as any,
        plugins: { legend: { display: true, position: 'top', labels: { font: { size: 13 } } } },
        scales: {
          x:  { display: true, ticks: { font: { size: 11 }, maxRotation: 30 } },
          y:  { type: 'linear', position: 'left',  title: { display: true, text: `${metric.pdfLabel} (${metric.pdfUnit})`, font: { size: 12 } } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Vehiculos', font: { size: 12 } }, grid: { drawOnChartArea: false } },
        },
      },
    } as any);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CÓMPUTO DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════

  private tsStats(
    data: ReportData,
    metric: MetricOption,
  ): { label: string; value: string }[] {
    const vals = data.sensorData
      .map(d => d[metric.key] as number)
      .filter(v => v != null && v >= 0);

    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return [
      { label: 'Promedio',           value: `${avg.toFixed(2)} ${metric.pdfUnit}` },
      { label: 'Minimo',             value: `${vals.length ? Math.min(...vals).toFixed(2) : '—'} ${metric.pdfUnit}` },
      { label: 'Maximo',             value: `${vals.length ? Math.max(...vals).toFixed(2) : '—'} ${metric.pdfUnit}` },
      { label: 'Vehiculos totales',  value: `${data.vehicleData.length}` },
      { label: 'Total mediciones',   value: `${vals.length}` },
    ];
  }

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
    const nSlots = Math.ceil(
      (this.dateRange().end.getTime() - start.getTime()) / slotMs,
    );

    const mArr: number[] = new Array(nSlots).fill(0);
    const mCnt: number[] = new Array(nSlots).fill(0);
    const vArr: number[] = new Array(nSlots).fill(0);

    for (const d of data.sensorData) {
      const idx = Math.floor((new Date(d.timestamp).getTime() - start.getTime()) / slotMs);
      if (idx < 0 || idx >= nSlots) continue;
      const val = d[metric.key] as number;
      if (val != null && val >= 0) { mArr[idx] += val; mCnt[idx]++; }
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
        if (j >= 0 && j < nSlots) { xs.push(vArr[i]); ys.push(mAvg[j]); }
      }
      lags.push({ lag: k, r: xs.length > 2 ? this.pearson(xs, ys) : 0 });
    }

    const best = lags.reduce((b, l) => (Math.abs(l.r) > Math.abs(b.r) ? l : b), lags[0]);
    const top5 = [...lags].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 5);

    let text = '';
    if (best && Math.abs(best.r) > 0.05) {
      const dir  = best.r > 0 ? 'positiva' : 'negativa';
      const str  = Math.abs(best.r) > 0.7 ? 'fuerte' : Math.abs(best.r) > 0.4 ? 'moderada' : 'debil';
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

  private locationRows(
    data: ReportData,
    metric: MetricOption,
  ): { label: string; avg: number; min: number; max: number; vehicles: number; samples: number }[] {
    return data.locations
      .map(loc => {
        const locSensor = data.sensorData.filter(d => d.device?.location?.id === loc.id);
        const vals = locSensor.map(d => d[metric.key] as number).filter(v => v != null && v >= 0);
        const vehicles = data.vehicleData.filter(v => v.location?.id === loc.id).length;
        const avg = vals.length
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  PÁGINAS DEL PDF
  // ═══════════════════════════════════════════════════════════════════════════

  private pageCover(
    doc: jsPDF,
    logo: string,
    metric: MetricOption,
    period: { key: PeriodKey; label: string },
    start: Date,
    end: Date,
    pw: number,
    ph: number,
  ): void {
    // ── Background ───────────────────────────────────────────────────────────
    doc.setFillColor(15, 23, 42);                       // slate-900
    doc.rect(0, 0, pw, ph, 'F');

    // ── Top green accent bar ─────────────────────────────────────────────────
    doc.setFillColor(34, 197, 94);                      // green-500
    doc.rect(0, 0, pw, 7, 'F');

    // ── Left green stripe ────────────────────────────────────────────────────
    doc.setFillColor(22, 163, 74);                      // green-600
    doc.rect(0, 7, 5, ph - 7, 'F');

    // ── Center content card ──────────────────────────────────────────────────
    const cardX = pw / 2 - 78;
    const cardW = 156;
    const cardH = 215;
    doc.setFillColor(30, 41, 59);                       // slate-800
    doc.roundedRect(cardX, 40, cardW, cardH, 5, 5, 'F');
    // green bar on top of card
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(cardX, 40, cardW, 6, 5, 5, 'F');
    doc.rect(cardX, 43, cardW, 3, 'F');

    // ── Logo ─────────────────────────────────────────────────────────────────
    if (logo) {
      doc.addImage(logo, 'PNG', pw / 2 - 16, 58, 32, 32);
    }

    // ── MOVE title in green ───────────────────────────────────────────────────
    doc.setFontSize(54);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);                      // green
    doc.text('MOVE', pw / 2, 115, { align: 'center' });

    // ── System subtitle ──────────────────────────────────────────────────────
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);                    // slate-500
    doc.text('Sistema de Monitoreo Ambiental', pw / 2, 124, { align: 'center' });

    // ── Green divider ────────────────────────────────────────────────────────
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.8);
    doc.line(pw / 2 - 46, 130, pw / 2 + 46, 130);

    // ── Report title ─────────────────────────────────────────────────────────
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(248, 250, 252);                    // white-ish
    doc.text('Informe de Analisis Ambiental', pw / 2, 141, { align: 'center' });

    // ── Metric pill (colored with metric color) ───────────────────────────────
    const [mR, mG, mB] = this.hexRgb(metric.color);
    doc.setFillColor(mR, mG, mB);
    doc.roundedRect(pw / 2 - 33, 147, 66, 11, 3, 3, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${metric.pdfLabel}  ·  ${metric.pdfUnit}`, pw / 2, 154, { align: 'center' });

    // ── Detail rows ──────────────────────────────────────────────────────────
    const details: [string, string][] = [
      ['Periodo',   period.label],
      ['Desde',     this.fmtDate(start)],
      ['Hasta',     this.fmtDate(end)],
      ['Generado',  this.fmtDate(new Date())],
    ];
    let dy = 170;
    for (const [lbl, val] of details) {
      doc.setDrawColor(51, 65, 85);                     // slate-700 separator
      doc.setLineWidth(0.2);
      doc.line(cardX + 10, dy - 3, cardX + cardW - 10, dy - 3);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(lbl, cardX + 14, dy + 2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(226, 232, 240);
      doc.text(val, cardX + cardW - 14, dy + 2, { align: 'right' });
      dy += 11;
    }

    // ── Footer note ───────────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Documento generado automaticamente por el sistema MOVE', pw / 2, ph - 12, { align: 'center' });
  }

  private pageHeader(doc: jsPDF, title: string, subtitle: string, mx: number, my: number): number {
    // Green left accent bar
    doc.setFillColor(34, 197, 94);                     // green-500
    doc.rect(mx, my, 3.5, 16, 'F');

    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title, mx + 8, my + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, mx + 8, my + 14.5);

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(mx, my + 19, 215.9 - mx, my + 19);

    return my + 27;
  }

  private pageFooter(doc: jsPDF, pw: number, ph: number, pageNum: number): void {
    // Dark footer bar
    doc.setFillColor(15, 23, 42);                      // slate-900
    doc.rect(0, ph - 11, pw, 11, 'F');
    // Green left accent strip
    doc.setFillColor(34, 197, 94);                     // green-500
    doc.rect(0, ph - 11, 5, 11, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);                   // slate-400
    doc.text('MOVE — Sistema de Monitoreo Ambiental', 10, ph - 4.5);
    doc.setTextColor(34, 197, 94);                     // green
    doc.text(`Pagina ${pageNum} de 5`, pw - 10, ph - 4.5, { align: 'right' });
  }

  private statsRow(
    doc: jsPDF,
    mx: number,
    y: number,
    cw: number,
    stats: { label: string; value: string }[],
  ): number {
    const colW = cw / stats.length;
    const boxH = 27;

    // Light green background
    doc.setFillColor(240, 253, 244);                   // green-50
    doc.roundedRect(mx, y, cw, boxH, 3, 3, 'F');
    // Top green accent bar
    doc.setFillColor(34, 197, 94);                     // green-500
    doc.roundedRect(mx, y, cw, 4, 3, 3, 'F');
    doc.rect(mx, y + 2, cw, 2, 'F');                  // fill lower arc of accent
    // Border
    doc.setDrawColor(187, 247, 208);                   // green-200
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, y, cw, boxH, 3, 3, 'S');

    for (let i = 0; i < stats.length; i++) {
      const cx = mx + i * colW + colW / 2;
      // Column divider
      if (i > 0) {
        doc.setDrawColor(167, 243, 208);               // green-200
        doc.setLineWidth(0.3);
        doc.line(mx + i * colW, y + 6, mx + i * colW, y + boxH - 3);
      }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(stats[i].label, cx, y + 13, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);                   // green-600
      doc.text(stats[i].value, cx, y + 22, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    return y + boxH + 6;
  }

  private lagTable(
    doc: jsPDF,
    mx: number,
    y: number,
    cw: number,
    top5: { lag: number; r: number }[],
  ): number {
    // Section title
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);                     // green-600
    doc.text('Top 5 rezagos con mayor correlacion', mx, y);
    y += 6;

    // Dark header bar
    doc.setFillColor(15, 23, 42);                      // slate-900
    doc.rect(mx, y, cw, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);                   // slate-400
    doc.text('Rezago', mx + 5, y + 5.5);
    doc.text('Coeficiente r', mx + 46, y + 5.5);
    doc.text('Intensidad', mx + 96, y + 5.5);
    doc.text('Sentido', mx + 140, y + 5.5);
    y += 9;

    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < top5.length; i++) {
      const lag = top5[i];
      // Alternating row background
      doc.setFillColor(i % 2 === 0 ? 240 : 249, i % 2 === 0 ? 253 : 250, i % 2 === 0 ? 244 : 251);
      doc.rect(mx, y - 1, cw, 7.5, 'F');

      doc.setFontSize(8.5);
      doc.setTextColor(17, 24, 39);
      doc.text(`${lag.lag > 0 ? '+' : ''}${lag.lag} h`, mx + 5, y + 4.5);

      // Color-code the r value
      const absR = Math.abs(lag.r);
      if (absR > 0.7)       doc.setTextColor(22, 163, 74);    // green
      else if (absR > 0.4)  doc.setTextColor(217, 119, 6);   // amber
      else                  doc.setTextColor(107, 114, 128);  // gray
      doc.setFont('helvetica', 'bold');
      doc.text(lag.r.toFixed(4), mx + 46, y + 4.5);
      doc.setFont('helvetica', 'normal');

      doc.setTextColor(55, 65, 81);
      const str = absR > 0.7 ? 'Fuerte' : absR > 0.4 ? 'Moderada' : 'Debil';
      doc.text(str, mx + 96, y + 4.5);

      const dir = lag.r >= 0 ? 'Positiva' : 'Negativa';
      doc.setTextColor(lag.r >= 0 ? 22 : 99, lag.r >= 0 ? 163 : 102, lag.r >= 0 ? 74 : 241);
      doc.text(dir, mx + 140, y + 4.5);

      y += 7.5;
    }

    // Bottom border
    doc.setDrawColor(187, 247, 208);                   // green-200
    doc.setLineWidth(0.3);
    doc.line(mx, y, mx + cw, y);
    return y + 6;
  }

  private locationTable(
    doc: jsPDF,
    mx: number,
    y: number,
    cw: number,
    rows: { label: string; avg: number; min: number; max: number; vehicles: number; samples: number }[],
    metric: MetricOption,
  ): number {
    // Section title
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);                     // green-600
    doc.text('Ranking de ubicaciones', mx, y);
    y += 6;

    // Dark header bar
    doc.setFillColor(15, 23, 42);                      // slate-900
    doc.rect(mx, y, cw, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);                   // slate-400
    const c = [mx + 4, mx + 16, mx + 72, mx + 106, mx + 134, mx + 158];
    doc.text('#', c[0], y + 5.5);
    doc.text('Ubicacion', c[1], y + 5.5);
    doc.text(`Promedio (${metric.pdfUnit})`, c[2], y + 5.5);
    doc.text('Min', c[3], y + 5.5);
    doc.text('Max', c[4], y + 5.5);
    doc.text('Vehiculos', c[5], y + 5.5);
    y += 9;

    const [mR, mG, mB] = this.hexRgb(metric.color);
    const medalBg: [number, number, number][] = [
      [254, 252, 232],   // amber-50  (gold)
      [248, 250, 252],   // slate-50  (silver)
      [253, 244, 234],   // orange-50 (bronze)
    ];
    const medalFg: [number, number, number][] = [
      [234, 179, 8],     // amber
      [148, 163, 184],   // slate
      [180, 120, 68],    // brown
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    for (let i = 0; i < rows.length && y < 260; i++) {
      const row = rows[i];
      const rowH = 7.5;

      // Row background
      if (i < 3) {
        const [br, bg, bb] = medalBg[i];
        doc.setFillColor(br, bg, bb);
      } else {
        doc.setFillColor(i % 2 === 0 ? 240 : 249, i % 2 === 0 ? 253 : 250, i % 2 === 0 ? 244 : 251);
      }
      doc.rect(mx, y - 1, cw, rowH, 'F');

      // Left accent bar for top 3
      if (i < 3) {
        const [ar, ag, ab] = medalFg[i];
        doc.setFillColor(ar, ag, ab);
        doc.rect(mx, y - 1, 3, rowH, 'F');
      }

      // Rank badge
      if (i < 3) {
        const [br, bg, bb] = medalFg[i];
        doc.setFillColor(br, bg, bb);
        doc.roundedRect(c[0] - 1, y - 0.5, 8, 5.5, 1.5, 1.5, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${i + 1}`, c[0] + 3, y + 3.5, { align: 'center' });
        doc.setFont('helvetica', i < 3 ? 'bold' : 'normal');
        doc.setFontSize(8.5);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`${i + 1}`, c[0], y + 4.5);
      }

      doc.setTextColor(17, 24, 39);
      doc.text(row.label.substring(0, 26), c[1], y + 4.5);

      // Avg in metric color
      doc.setFillColor(mR, mG, mB);
      doc.setTextColor(mR, mG, mB);
      doc.setFont('helvetica', 'bold');
      doc.text(`${row.avg}`, c[2], y + 4.5);
      doc.setFont('helvetica', 'normal');

      doc.setTextColor(75, 85, 99);
      doc.text(`${row.min}`, c[3], y + 4.5);
      doc.text(`${row.max}`, c[4], y + 4.5);

      // Vehicles in indigo
      doc.setTextColor(99, 102, 241);
      doc.setFont('helvetica', 'bold');
      doc.text(`${row.vehicles}`, c[5], y + 4.5);
      doc.setFont('helvetica', 'normal');

      y += rowH;
    }

    // Bottom border
    doc.setDrawColor(187, 247, 208);                   // green-200
    doc.setLineWidth(0.3);
    doc.line(mx, y, mx + cw, y);
    return y + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  private tick(pct: number, msg: string): void {
    this.progress    = pct;
    this.progressMsg = msg;
    this.cdr.markForCheck();
  }

  private dateRange(): { start: Date; end: Date } {
    const end   = new Date();
    const hours = PERIODS.find(p => p.key === this.selectedPeriod)!.hours;
    return { start: new Date(end.getTime() - hours * 3_600_000), end };
  }

  private timeBuckets(start: Date, end: Date, ms: number): Date[] {
    const out: Date[] = [];
    let t = start.getTime();
    while (t < end.getTime()) { out.push(new Date(t)); t += ms; }
    return out;
  }

  private bucketLabel(d: Date, p: PeriodKey): string {
    if (p === '24h') return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (p === '7d')  return d.toLocaleDateString('es', { weekday: 'short', hour: '2-digit' });
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  }

  private fmtDate(d: Date): string {
    return d.toLocaleDateString('es', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  private pearson(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
    for (let i = 0; i < n; i++) {
      sx += x[i]; sy += y[i]; sxy += x[i] * y[i];
      sx2 += x[i] * x[i]; sy2 += y[i] * y[i];
    }
    const den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
    return den === 0 ? 0 : (n * sxy - sx * sy) / den;
  }

  private corrColor(r: number): string {
    if (r >=  0.8) return '#065f46';
    if (r >=  0.6) return '#059669';
    if (r >=  0.4) return '#34d399';
    if (r >=  0.2) return '#a7f3d0';
    if (r > -0.2)  return '#f3f4f6';
    if (r > -0.4)  return '#bfdbfe';
    if (r > -0.6)  return '#60a5fa';
    if (r > -0.8)  return '#2563eb';
    return '#1e3a8a';
  }

  private offscreenChart(w: number, h: number, cfg: ChartConfiguration): string {
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const chart = new ChartJS(canvas, {
      ...cfg,
      options: { ...cfg.options, responsive: false, animation: false as any },
    });
    const url = canvas.toDataURL('image/png');
    chart.destroy();
    return url;
  }

  /** Converts a CSS hex color string to an [R, G, B] tuple for jsPDF. */
  private hexRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  private async loadLogo(): Promise<string> {
    try {
      return await new Promise<string>(resolve => {
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
    } catch { return ''; }
  }
}
