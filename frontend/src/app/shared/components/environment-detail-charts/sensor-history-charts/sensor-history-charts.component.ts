import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
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
  TooltipItem,
} from 'chart.js';
import { SensorData } from '../../../../core/models/sensor-data.model';

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
 * SensorHistoryChartsComponent (Presentation Component)
 *
 * Displays historical sensor data with interactive line charts and statistical summaries.
 * Renders multi-parameter trends over custom date ranges with aggregated statistics.
 *
 * Features:
 * - Multi-parameter line chart: CO₂, Temperature, Humidity, PM2.5 displayed on same chart
 * - Parameter selector tabs: switch between CO₂, Temperature, Humidity, PM2.5, PM10, Gases
 * - Real-time statistics calculation: mean, max, min, standard deviation for active parameter
 * - Chart.js line configuration: colored lines per parameter with semi-transparent fills
 * - Date-based X-axis labels: formatted as YYYY-MM-DD for long-term trends
 * - Loading state: spinner displayed while data processes
 * - Empty state: centered message when no data available
 * - Responsive layout: scrollable on mobile, full-width on larger screens
 * - Dark mode support with Tailwind CSS
 * - OnPush change detection with manual trigger on data changes
 *
 * Input properties:
 * - filteredRecords: SensorData[] - array of sensor readings from date range
 * - isLoading: boolean - loading state flag for spinner display
 * - selectedParameter: string - active parameter for statistics display (default: 'co2')
 *
 * @selector app-sensor-history-charts
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-sensor-history-charts
 *   [filteredRecords]="sensorData"
 *   [isLoading]="loading"
 *   [selectedParameter]="'co2'"
 * />
 */
@Component({
  selector: 'app-sensor-history-charts',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './sensor-history-charts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensorHistoryChartsComponent implements OnChanges {
  /**
   * Reference to Chart.js canvas element for programmatic access.
   * @type {BaseChartDirective | undefined}
   */
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Array of historical sensor records to visualize and analyze.
   * @type {SensorData[]}
   */
  @Input() filteredRecords: SensorData[] = [];

  /**
   * Loading state flag indicating data fetch in progress.
   * @type {boolean}
   */
  @Input() isLoading: boolean = false;

  /**
   * Currently selected parameter for statistics and highlight in chart.
   * Maps to parameter keys: 'co2', 'temperature', 'humidity', 'pm25', 'pm10', 'gases'.
   * @type {string}
   */
  @Input() selectedParameter: string = 'co2';

  /**
   * Calculated statistics for active parameter: mean, max, min, standard deviation.
   * Updated whenever filteredRecords or selectedParameter changes.
   * @type {{ mean: number; max: number; min: number; stdDev: number }}
   */
  stats = { mean: 0, max: 0, min: 0, stdDev: 0 };

  /**
   * Chart.js configuration data object with labels and datasets for multi-parameter rendering.
   * Regenerated on input change with color-coded lines per parameter.
   * @type {ChartConfiguration<'line'>['data']}
   */
  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /**
   * Available parameter options for tab selector with value keys and display labels.
   * @type {Array<{value: string; label: string; unit: string; color: string}>}
   */
  parameters = [
    { value: 'co2', label: 'CO₂', unit: 'ppm', color: '#ef4444' },
    { value: 'temperature', label: 'Temperatura', unit: '°C', color: '#f97316' },
    { value: 'humidity', label: 'Humedad', unit: '%', color: '#3b82f6' },
    { value: 'pm25', label: 'PM2.5', unit: 'µg/m³', color: '#8b5cf6' },
    { value: 'pm10', label: 'PM10', unit: 'µg/m³', color: '#d946ef' },
    { value: 'gases', label: 'Gases', unit: 'ppb', color: '#10b981' },
  ];

  /**
   * Chart.js configuration object for line chart styling and interactivity.
   * Defines responsive layout, legend positioning, tooltip formatting, and axis labels.
   * @type {ChartConfiguration<'line'>['options']}
   */
  chartOptions: ChartConfiguration<'line'>['options'] = {
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
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y;
            const param = this.parameters.find((p) => p.value === this.selectedParameter);
            const unit = param?.unit ?? '';
            const label = context.dataset.label || '';
            return `${label}: ${value !== null ? value.toFixed(1) : 'N/A'} ${unit}`;
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
          maxTicksLimit: 10,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: false,
        title: {
          display: true,
          text: this.getAxisTitle(),
          color: this.getParameterColor(),
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
      },
    },
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filteredRecords'] || changes['selectedParameter']) {
      this.updateChartData();
      this.calculateStatistics();
      this.updateChartOptions();
      this.chart?.chart?.update('none');
    }
  }

  /**
   * Processes sensor data array into chart-compatible format with daily aggregation.
   * Shows only the selected parameter dataset with its corresponding color and units.
   * @private
   */
  private updateChartData(): void {
    if (!this.filteredRecords || this.filteredRecords.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const sortedData = [...this.filteredRecords].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const dailyData = this.aggregateDataByDay(sortedData);
    const labels = Array.from(dailyData.keys());
    const param = this.parameters.find((p) => p.value === this.selectedParameter)!;
    const paramKey = this.selectedParameter === 'gases' ? 'no2' : this.selectedParameter;
    const values = this.getAverageValuesForParameter(dailyData, paramKey);

    const hex = param.color;
    const rgb = this.hexToRgb(hex);
    const bg = rgb ? `rgba(${rgb}, 0.1)` : 'rgba(0,0,0,0.1)';

    this.chartData = {
      labels,
      datasets: [
        {
          label: `${param.label} (${param.unit})`,
          data: values,
          borderColor: hex,
          backgroundColor: bg,
          borderWidth: 3,
          tension: 0.5,
          fill: true,
          pointBackgroundColor: hex,
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
      ],
    };
  }

  /**
   * Updates Y-axis title and color to match the selected parameter.
   * @private
   */
  private updateChartOptions(): void {
    if (!this.chartOptions?.scales?.['y']?.title) return;
    const title = this.chartOptions.scales['y'].title;
    title.text = this.getAxisTitle();
    title.color = this.getParameterColor();
  }

  /**
   * Converts a hex color string to "r, g, b" format for rgba() usage.
   * @private
   */
  private hexToRgb(hex: string): string | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }

  /**
   * Groups sensor records by date (YYYY-MM-DD).
   * @private
   * @returns Map with date keys and arrays of records for that day
   */
  private aggregateDataByDay(
    data: SensorData[],
  ): Map<string, SensorData[]> {
    const dailyMap = new Map<string, SensorData[]>();

    for (const record of data) {
      const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(record);
    }

    return dailyMap;
  }

  /**
   * Calculates daily average values for a specific parameter.
   * @private
   * @param dailyData Map of date keys to record arrays
   * @param parameter Parameter name (co2, temperature, humidity, pm25, pm10, no2)
   * @returns Array of daily average values in chart order
   */
  private getAverageValuesForParameter(
    dailyData: Map<string, SensorData[]>,
    parameter: string,
  ): (number | null)[] {
    return Array.from(dailyData.values()).map((records) => {
      const values = records
        .map((r) => this.getParameterValue(r, parameter))
        .filter((v) => v !== null && v !== undefined) as number[];

      if (values.length === 0) return null;
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    });
  }

  /**
   * Extracts parameter value from a sensor record.
   * @private
   * @param record Sensor data record
   * @param parameter Parameter name
   * @returns Parameter value or null
   */
  private getParameterValue(record: SensorData, parameter: string): number | null {
    switch (parameter) {
      case 'co2':
        return record.co2 ?? null;
      case 'temperature':
        return record.temperature ?? null;
      case 'humidity':
        return record.humidity ?? null;
      case 'pm25':
        return record.pm25 ?? null;
      case 'pm10':
        return record.pm10 ?? null;
      case 'no2':
        return record.no2 ?? null;
      default:
        return null;
    }
  }

  /**
   * Calculates mean, max, min, and standard deviation for the selected parameter.
   * Filters out null/undefined values before calculation.
   * @private
   */
  private calculateStatistics(): void {
    if (!this.filteredRecords || this.filteredRecords.length === 0) {
      this.stats = { mean: 0, max: 0, min: 0, stdDev: 0 };
      return;
    }

    const values = this.getValuesForParameter(this.selectedParameter).filter(
      (v) => v !== null && v !== undefined,
    );

    if (values.length === 0) {
      this.stats = { mean: 0, max: 0, min: 0, stdDev: 0 };
      return;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    this.stats = {
      mean: Math.round(mean * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
    };
  }

  /**
   * Extracts numeric values for a specific parameter from sensor records.
   * Returns array of numbers or nulls, preserving missing data gaps.
   * @private
   * @param {string} parameter - Parameter key ('co2', 'temperature', etc.)
   * @returns {(number | null)[]} Array of values for the parameter
   */
  private getValuesForParameter(parameter: string): (number | null)[] {
    switch (parameter) {
      case 'co2':
        return this.filteredRecords.map((r) => r.co2 ?? null);
      case 'temperature':
        return this.filteredRecords.map((r) => r.temperature ?? null);
      case 'humidity':
        return this.filteredRecords.map((r) => r.humidity ?? null);
      case 'pm25':
        return this.filteredRecords.map((r) => r.pm25 ?? null);
      case 'pm10':
        return this.filteredRecords.map((r) => r.pm10 ?? null);
      case 'gases':
        return this.filteredRecords.map((r) => r.no2 ?? null);
      default:
        return [];
    }
  }

  /**
   * Returns Y-axis title based on selected parameter, including units.
   * @private
   * @returns {string} Formatted axis title with parameter name and unit
   */
  private getAxisTitle(): string {
    const param = this.parameters.find((p) => p.value === this.selectedParameter);
    return param ? `${param.label} (${param.unit})` : 'Valor';
  }

  /**
   * Returns color hex value for selected parameter from configuration.
   * Used for Y-axis title and ticks coloring.
   * @returns {string} Color hex code for parameter
   */
  getParameterColor(): string {
    const param = this.parameters.find((p) => p.value === this.selectedParameter);
    return param?.color || '#6B7280';
  }

  /**
   * Returns currently selected parameter configuration object.
   * @returns {object | undefined} Parameter config with label, unit, color
   */
  getSelectedParameterConfig(): { value: string; label: string; unit: string; color: string } | undefined {
    return this.parameters.find((p) => p.value === this.selectedParameter);
  }

  /**
   * Handler for parameter tab selection.
   * Updates selectedParameter input and triggers chart/stats recalculation.
   * @param {string} parameter - Parameter key to select
   */
  onParameterSelect(parameter: string): void {
    this.selectedParameter = parameter;
    this.updateChartData();
    this.calculateStatistics();
    this.updateChartOptions();
    this.chart?.chart?.update('none');
    this.cdr.markForCheck();
  }
}
