import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationFiltersComponent } from '../../../shared/components/locations/location-filters/location-filters.component';

/**
 * LocationHistoryComponent
 * 
 * Página que muestra el historial de detecciones de vehículos por ubicación
 * y proporciona análisis temporal de la cobertura de monitoreo.
 * 
 * @component
 * @standalone true
 */
@Component({
  selector: 'app-location-history',
  standalone: true,
  imports: [
    CommonModule,
    LocationFiltersComponent,
  ],
  templateUrl: './location-history.component.html',
  styleUrls: ['./location-history.component.css'],
})
export class LocationHistoryComponent implements OnInit {
  /**
   * Historial de detecciones agrupado por ubicación
   */
  detectionHistory = [
    {
      id: 1,
      date: '30/01/2026',
      location: 'Carrera 7',
      vehiclesDetected: 145,
      avgDuration: '2.5 min',
      peakHour: '18:30 - 19:30',
    },
    {
      id: 2,
      date: '30/01/2026',
      location: 'Parque Arvi',
      vehiclesDetected: 89,
      avgDuration: '3.1 min',
      peakHour: '15:00 - 16:00',
    },
    {
      id: 3,
      date: '30/01/2026',
      location: 'Centro Comercial',
      vehiclesDetected: 234,
      avgDuration: '1.8 min',
      peakHour: '19:00 - 20:00',
    },
    {
      id: 4,
      date: '29/01/2026',
      location: 'Terminal',
      vehiclesDetected: 312,
      avgDuration: '2.2 min',
      peakHour: '07:00 - 08:00',
    },
    {
      id: 5,
      date: '29/01/2026',
      location: 'Envigado',
      vehiclesDetected: 156,
      avgDuration: '2.8 min',
      peakHour: '18:00 - 19:00',
    },
    {
      id: 6,
      date: '29/01/2026',
      location: 'Estadio Metropolitano',
      vehiclesDetected: 198,
      avgDuration: '2.4 min',
      peakHour: '20:00 - 21:00',
    },
  ];

  /**
   * Información de cobertura por zona
   */
  coverageByZone = [
    { zone: 'Zona Norte', coverage: 95.2, trend: 'up', vehicles: 342 },
    { zone: 'Centro', coverage: 92.8, trend: 'stable', vehicles: 567 },
    { zone: 'Zona Sur', coverage: 88.5, trend: 'down', vehicles: 423 },
    { zone: 'Zona Conurbana', coverage: 91.3, trend: 'up', vehicles: 515 },
  ];

  /**
   * Estadísticas generales
   */
  overallStats = {
    totalDetections: 1134,
    averageDuration: '2.4 min',
    peakHourOverall: '18:00 - 19:30',
    coverageAverage: 91.95,
  };

  /**
   * Filtros actuales aplicados
   */
  activeFilters: any = null;

  constructor() {}

  /**
   * Inicializa el componente
   */
  ngOnInit(): void {
    // Simulación de carga de datos
    this.loadHistoryData();
  }

  /**
   * Carga los datos del historial
   */
  loadHistoryData(): void {
    // Aquí iría la lógica para cargar datos del backend
  }

  /**
   * Maneja cambios en los filtros
   * @param filters - Filtros aplicados
   */
  onFiltersChanged(filters: any): void {
    this.activeFilters = filters;
    // Aquí iría la lógica para filtrar el historial
  }

  /**
   * Obtiene el color del indicador de tendencia
   * @param trend - Tipo de tendencia: 'up', 'down', 'stable'
   * @returns Clase de color de Tailwind
   */
  getTrendColor(trend: string): string {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      case 'stable':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  /**
   * Obtiene el icono de tendencia
   * @param trend - Tipo de tendencia
   * @returns Símbolo de tendencia
   */
  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'stable':
        return '→';
      default:
        return '•';
    }
  }
}
