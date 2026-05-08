import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewChild,
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
import { VehicleDetected } from '../../../../core/models/vehicle.model';

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

@Component({
  selector: 'app-vehicle-detection-charts',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-detection-charts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDetectionChartsComponent implements OnChanges {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  @Input() vehicleDetections: VehicleDetected[] = [];
  @Input() isLoading: boolean = false;

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  private readonly vehicleTypeColors: { [key: string]: string } = {
    CAR: '#3b82f6',
    BUS: '#ef4444',
    MOTORCYCLE: '#f97316',
    BICYCLE: '#10b981',
    TRUCK: '#8b5cf6',
  };

  private readonly allVehicleTypes = ['CAR', 'BUS', 'MOTORCYCLE', 'BICYCLE', 'TRUCK'];

  summaryStats = { totalDetections: 0, mostCommonType: '', detectionRate: 0 };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
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
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value !== null ? value : 'N/A'} detecciones`;
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
        beginAtZero: true,
        title: {
          display: true,
          text: 'Detecciones por Día',
          color: '#64748b',
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

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicleDetections']) {
      this.updateChartData();
      this.calculateSummaryStats();
      this.chart?.chart?.update('none');
    }
  }

  private updateChartData(): void {
    if (!this.vehicleDetections || this.vehicleDetections.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const sortedData = [...this.vehicleDetections].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const dailyData = this.aggregateDataByDay(sortedData);
    const labels = Array.from(dailyData.keys());

    const datasets = this.allVehicleTypes.map((type) => {
      const values = Array.from(dailyData.values()).map((records) => {
        const typeRecords = records.filter((r) => r.vehicleType === type);
        return typeRecords.length;
      });

      const hex = this.vehicleTypeColors[type];
      const rgb = this.hexToRgb(hex);
      const bg = rgb ? `rgba(${rgb}, 0.1)` : 'rgba(0,0,0,0.1)';

      return {
        label: this.getVehicleTypeLabel(type),
        data: values,
        borderColor: hex,
        backgroundColor: bg,
        borderWidth: 2,
        tension: 0.5,
        fill: true,
        pointBackgroundColor: hex,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    this.chartData = {
      labels,
      datasets,
    };
  }

  private aggregateDataByDay(data: VehicleDetected[]): Map<string, VehicleDetected[]> {
    const dailyMap = new Map<string, VehicleDetected[]>();

    for (const record of data) {
      const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(record);
    }

    return dailyMap;
  }

  private calculateSummaryStats(): void {
    const total = this.vehicleDetections.length;

    if (total === 0) {
      this.summaryStats = { totalDetections: 0, mostCommonType: 'N/A', detectionRate: 0 };
      return;
    }

    const typeCounts = this.allVehicleTypes.reduce(
      (acc, type) => {
        acc[type] = this.vehicleDetections.filter((v) => v.vehicleType === type).length;
        return acc;
      },
      {} as { [key: string]: number },
    );

    const mostCommon = Object.entries(typeCounts).reduce((a, b) => (b[1] > a[1] ? b : a));
    const days = this.calculateDayRange();
    const detectionRate = days > 0 ? Math.round((total / days) * 100) / 100 : 0;

    this.summaryStats = {
      totalDetections: total,
      mostCommonType: this.getVehicleTypeLabel(mostCommon[0]),
      detectionRate,
    };
  }

  private calculateDayRange(): number {
    if (this.vehicleDetections.length < 2) return 1;

    const timestamps = this.vehicleDetections
      .map((v) => new Date(v.timestamp).getTime())
      .sort((a, b) => a - b);
    const daysDiff = (timestamps[timestamps.length - 1] - timestamps[0]) / 86400000;
    return Math.max(1, Math.ceil(daysDiff));
  }

  private getVehicleTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      CAR: 'Auto',
      BUS: 'Bus',
      MOTORCYCLE: 'Moto',
      BICYCLE: 'Bicicleta',
      TRUCK: 'Camión',
    };
    return labels[type] || type;
  }

  private hexToRgb(hex: string): string | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
}
