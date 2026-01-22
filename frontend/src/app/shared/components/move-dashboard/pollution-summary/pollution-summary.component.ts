import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Fila de contaminante en la tabla de resumen con estadísticas diarias
 * @interface PollutantRow
 * @property {string} name - Nombre del contaminante (CO2, PM 2.5, PM 10, etc)
 * @property {number} current - Valor actual medido
 * @property {string} unit - Unidad de medida (ppm, µg/m³, ppb)
 * @property {number} average - Promedio del día
 * @property {number} min - Valor mínimo del día
 * @property {number} max - Valor máximo del día
 * @property {'good' | 'moderate' | 'poor'} status - Estado actual
 */
interface PollutantRow {
  name: string;
  current: number;
  unit: string;
  average: number;
  min: number;
  max: number;
  status: 'good' | 'moderate' | 'poor';
}

/**
 * Componente que muestra una tabla con el resumen de contaminantes monitoreados.
 * Incluye valores actuales, promedios, mínimos, máximos y estado de cada contaminante.
 * 
 * @selector app-pollution-summary
 * @standalone true
 */
@Component({
  selector: 'app-pollution-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pollution-summary.component.html',
})
export class PollutionSummaryComponent implements OnInit {

  pollutionData: PollutantRow[] = [
    {
      name: 'CO₂',
      current: 450,
      unit: 'ppm',
      average: 425,
      min: 380,
      max: 520,
      status: 'moderate',
    },
    {
      name: 'PM 2.5',
      current: 26,
      unit: 'µg/m³',
      average: 23.4,
      min: 14,
      max: 32,
      status: 'good',
    },
    {
      name: 'PM 10',
      current: 32,
      unit: 'µg/m³',
      average: 30.8,
      min: 22,
      max: 40,
      status: 'good',
    },
    {
      name: 'CO',
      current: 2.655,
      unit: 'ppm',
      average: 2.2,
      min: 1.2,
      max: 3.8,
      status: 'good',
    },
    {
      name: 'NO₂',
      current: 2.772,
      unit: 'ppb',
      average: 2.4,
      min: 0.8,
      max: 4.5,
      status: 'good',
    },
    {
      name: 'NH₃',
      current: 2.697,
      unit: 'ppb',
      average: 2.1,
      min: 0.5,
      max: 3.9,
      status: 'good',
    },
  ];

  ngOnInit() {
    // Conectar con servicio de backend si es necesario
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'poor':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'good':
        return 'Bueno';
      case 'moderate':
        return 'Moderado';
      case 'poor':
        return 'Pobre';
      default:
        return 'Desconocido';
    }
  }

  getTrendIcon(current: number, average: number): string {
    if (current > average) return '↑';
    if (current < average) return '↓';
    return '→';
  }

  getTrendColor(current: number, average: number): string {
    if (current > average) return 'text-red-600 dark:text-red-400';
    if (current < average) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  }
}
