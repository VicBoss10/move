import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryFiltersComponent } from '../../../shared/components/environment-detail-charts/history-filters/history-filters.component';

/**
 * Interfaz para un registro histórico de datos ambientales
 * @interface EnvironmentalRecord
 * @property {string} id - Identificador único
 * @property {Date} timestamp - Fecha y hora del registro
 * @property {number} co2 - Concentración de CO₂ en ppm
 * @property {number} temperature - Temperatura en °C
 * @property {number} humidity - Humedad relativa en %
 * @property {number} pm25 - Partículas PM2.5 en µg/m³
 * @property {number} pm10 - Partículas PM10 en µg/m³
 */
interface EnvironmentalRecord {
  id: string;
  timestamp: Date;
  co2: number;
  temperature: number;
  humidity: number;
  pm25: number;
  pm10: number;
}

/**
 * Componente de página Historial Ambiental
 * Muestra datos históricos de todos los contaminantes y variables ambientales
 * con opciones de filtrado, comparación y exportación.
 * 
 * @selector app-environmental-history
 * @standalone true
 * @imports CommonModule
 * @returns Página con tabla de historial ambiental
 */
@Component({
  selector: 'app-environmental-history',
  standalone: true,
  imports: [CommonModule, HistoryFiltersComponent],
  templateUrl: './environmental-history.component.html',
})
export class EnvironmentalHistoryComponent implements OnInit {
  /**
   * Lista de registros históricos ambientales
   * @type {EnvironmentalRecord[]}
   */
  records: EnvironmentalRecord[] = [];

  /**
   * Registros filtrados según criterios actuales
   * @type {EnvironmentalRecord[]}
   */
  filteredRecords: EnvironmentalRecord[] = [];

  /**
   * Criterio de filtrado por parámetro
   * @type {string}
   */
  parameterFilter: string = 'all';

  /**
   * Orden de clasificación (asc/desc)
   * @type {string}
   */
  sortOrder: string = 'desc';

  ngOnInit(): void {
    // TODO: Conectar con servicio backend
    // this.historyService.getHistory().subscribe({
    //   next: (data) => {
    //     this.records = data;
    //     this.filterAndSort();
    //   },
    //   error: (error) => console.error('Error loading history:', error),
    // });

    // Datos de prueba
    this.loadSampleData();
  }

  /**
   * Carga datos de prueba para demostración
   * @returns {void}
   * @private
   */
  private loadSampleData(): void {
    this.records = [
      {
        id: '1',
        timestamp: new Date('2024-01-15 10:30'),
        co2: 450,
        temperature: 22.5,
        humidity: 65,
        pm25: 18.5,
        pm10: 35.2,
      },
      {
        id: '2',
        timestamp: new Date('2024-01-15 11:30'),
        co2: 465,
        temperature: 23.0,
        humidity: 68,
        pm25: 20.1,
        pm10: 38.5,
      },
      {
        id: '3',
        timestamp: new Date('2024-01-15 12:30'),
        co2: 480,
        temperature: 24.2,
        humidity: 72,
        pm25: 22.3,
        pm10: 42.1,
      },
    ];
    this.filterAndSort();
  }

  /**
   * Filtra y ordena los registros según criterios actuales
   * @returns {void}
   * @private
   */
  private filterAndSort(): void {
    this.filteredRecords = [...this.records].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }

  /**
   * Cambia el criterio de filtrado
   * @param {string} parameter - Parámetro a filtrar
   * @returns {void}
   */
  changeFilter(parameter: string): void {
    this.parameterFilter = parameter;
    this.filterAndSort();
  }

  /**
   * Invierte el orden de clasificación
   * @returns {void}
   */
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.filterAndSort();
  }
}
