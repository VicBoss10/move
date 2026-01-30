import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

/**
 * VehicleChartComponent
 *
 * Componente que muestra gráficos de estadísticas de vehículos.
 * Visualiza tendencias de detecciones, tipos de vehículos y patrones horarios.
 *
 * Características:
 * - Gráfico de línea: Detecciones por hora
 * - Gráfico de barras: Tipos de vehículos
 * - Animaciones suaves
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-vehicle-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @returns Gráfico de estadísticas
 *
 * @example
 * <app-vehicle-chart />
 */
@Component({
  selector: 'app-vehicle-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-chart.component.html',
})
export class VehicleChartComponent implements OnInit {
  /**
   * Configuración del gráfico de línea
   * @type {ChartConfiguration}
   */
  lineChartConfig: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
      datasets: [
        {
          label: 'Detecciones por hora',
          data: [12, 45, 156, 98, 234, 145, 87],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 12, weight: 'bold' },
            usePointStyle: true,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 300,
        },
      },
    },
  };

  /**
   * Configuración del gráfico de barras
   * @type {ChartConfiguration}
   */
  barChartConfig: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: ['Auto', 'Moto', 'Camión', 'Bus', 'Bicicleta'],
      datasets: [
        {
          label: 'Cantidad detectada',
          data: [345, 234, 89, 56, 45, 67],
          backgroundColor: [
            '#3b82f6',
            '#8b5cf6',
            '#ef4444',
            '#f59e0b',
            '#10b981',
            '#06b6d4',
          ],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 12, weight: 'bold' },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };

  ngOnInit(): void {
    // TODO: Cargar datos reales del servicio
  }
}
