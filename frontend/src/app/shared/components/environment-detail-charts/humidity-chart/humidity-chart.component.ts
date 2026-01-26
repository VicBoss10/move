import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

/**
 * HumidityChartComponent
 *
 * Componente especializado para mostrar la tendencia de humedad relativa en las últimas 24 horas.
 * Utiliza Chart.js para visualizar datos de humedad con una línea de gráfico azul.
 *
 * @selector app-humidity-chart
 * @standalone true
 * @imports [CommonModule, BaseChartDirective]
 * @returns {Component} Componente para mostrar tendencia de humedad
 *
 * @example
 * // Uso en plantilla
 * <app-humidity-chart />
 *
 * @example
 * // Uso en componente
 * import { HumidityChartComponent } from '@shared/components/environment-detail-charts/humidity-chart/humidity-chart.component';
 *
 * @Component({
 *   imports: [HumidityChartComponent],
 * })
 * export class ParentComponent {}
 */
@Component({
  selector: 'app-humidity-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './humidity-chart.component.html',
})
export class HumidityChartComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Etiquetas de tiempo para el eje X (24 horas)
   * @type {string[]}
   * @private
   */
  private timeLabels: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  ];

  /**
   * Datos de humedad relativa (%) para 24 horas
   * Rango: 66-83%
   * @type {number[]}
   * @private
   */
  private humidityData: number[] = [
    75, 73, 71, 70, 69, 68,
    67, 68, 70, 72, 74, 75,
    76, 77, 78, 80, 81, 83,
    82, 81, 80, 78, 77, 76,
  ];

  /**
   * Configuración de datos del gráfico
   * @type {ChartConfiguration<'line'>['data']}
   */
  chartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [
      {
        label: 'Humedad Relativa (%)',
        data: this.humidityData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  /**
   * Opciones de configuración del gráfico
   * @type {ChartOptions<'line'>}
   */
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
            weight: 500 as any,
          },
          color: '#6b7280',
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y ?? 0;
            return `${context.dataset.label}: ${value.toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 60,
        max: 100,
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
          },
          callback: function (value) {
            return value + '%';
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          display: true,
        },
      },
      x: {
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  ngOnInit(): void {
    // TODO: Integrar con servicio backend para obtener datos reales de humedad
    // this.loadHumidityData();
  }

  /**
   * Método para cargar datos reales desde el backend
   * @returns {void}
   * @private
   *
   * @example
   * private loadHumidityData(): void {
   *   this.environmentService.getHumidityData().subscribe({
   *     next: (data) => {
   *       this.humidityData = data.values;
   *       this.chart?.chart?.update();
   *     },
   *     error: (error) => console.error('Error loading humidity data:', error),
   *   });
   * }
   */
  private loadHumidityData(): void {
    // Placeholder para carga de datos del servicio
    // Será implementado cuando el backend esté disponible
  }
}
