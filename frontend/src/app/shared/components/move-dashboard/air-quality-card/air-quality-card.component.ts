import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';

interface AirQualityMetric {
  label: string;
  icon: string;
  value: number;
  unit: string;
  status: 'good' | 'moderate' | 'unhealthy';
  statusLabel: string;
}

@Component({
  selector: 'app-air-quality-card',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './air-quality-card.component.html',
})
export class AirQualityCardComponent implements OnInit {
  
  public icons = {
    pm25Icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="currentColor"/></svg>`,
    pm10Icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>`,
  };

  metrics: AirQualityMetric[] = [
    {
      label: 'PM 2.5',
      icon: this.icons.pm25Icon,
      value: 26,
      unit: 'µg/m³',
      status: 'good',
      statusLabel: 'Bueno'
    },
    {
      label: 'PM 10',
      icon: this.icons.pm10Icon,
      value: 32,
      unit: 'µg/m³',
      status: 'good',
      statusLabel: 'Bueno'
    },
  ];

  ngOnInit() {
    // Aquí conectas con tu servicio backend
    // this.airQualityService.getQualityMetrics().subscribe(data => {
    //   this.metrics[0].value = data.pm25;
    //   this.metrics[1].value = data.pm10;
    //   this.updateStatus();
    // });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'moderate':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'unhealthy':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800';
    }
  }

  getTextColor(status: string): string {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  getIconBgColor(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'unhealthy':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  }

  getIconColor(status: string): string {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }
}
