import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
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
} from 'chart.js';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
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
  selector: 'app-vehicle-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleChartComponent implements OnChanges {
  @Input() vehicles: VehicleDetected[] = [];

  private readonly HOURS_WINDOW = 24;

  lineChartData$!: Observable<ChartConfiguration<'line'>['data']>;

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { left: 20, right: 20, top: 0, bottom: 0 },
    },
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
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return label + ': ' + (value !== null ? value : 'N/A') + ' detections';
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
        ticks: { color: '#6B7280', font: { size: 11 }, maxTicksLimit: 24 },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Detections', color: '#3b82f6', font: { weight: 'bold' } },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: { color: '#3b82f6' },
      },
    },
  };

  private readonly defaultLineData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicles']) {
      this.lineChartData$ = of(this.vehicles).pipe(
        map((vehicles) => this.buildLineChartData(vehicles)),
        shareReplay(1),
      );
    }
  }

  private buildLineChartData(vehicles: VehicleDetected[]): ChartConfiguration<'line'>['data'] {
    if (!vehicles || vehicles.length === 0) {
      return this.defaultLineData;
    }

    const now = new Date();
    const slots: { start: Date; end: Date; label: string }[] = [];

    for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
      const slotStart = new Date(now.getTime() - i * 3600000);
      slotStart.setMinutes(0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 3600000);
      const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
      slots.push({ start: slotStart, end: slotEnd, label });
    }

    const labels = slots.map((s) => s.label);
    const detectionCounts: (number | null)[] = [];

    for (const slot of slots) {
      const slotData = vehicles.filter((v) => {
        const vTime = new Date(v.timestamp);
        return vTime >= slot.start && vTime < slot.end;
      });
      detectionCounts.push(slotData.length > 0 ? slotData.length : null);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Hourly detections',
          data: detectionCounts,
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
          yAxisID: 'y',
        },
      ],
    };
  }
}
