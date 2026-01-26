import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface para estadísticas de gas
 */
interface GasStats {
  symbol: string;
  name: string;
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  unit: string;
}

/**
 * GasesStatsTableComponent
 *
 * Componente que muestra tabla con estadísticas de los 4 gases:
 * CO, NO₂, NH₃, C₆H₆. Incluye actual, mínimo, máximo y promedio.
 *
 * @selector app-gases-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de gases
 *
 * @example
 * <app-gases-stats-table />
 */
@Component({
  selector: 'app-gases-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gases-stats-table.component.html',
})
export class GasesStatsTableComponent implements OnInit {
  /**
   * Estadísticas de cada gas
   * @type {GasStats[]}
   */
  gasesStats: GasStats[] = [
    {
      symbol: 'CO',
      name: 'Monóxido de Carbono',
      actual: 1.2,
      minimo: 0.8,
      maximo: 2.1,
      promedio: 1.4,
      unit: 'ppm',
    },
    {
      symbol: 'NO₂',
      name: 'Dióxido de Nitrógeno',
      actual: 45.8,
      minimo: 32.5,
      maximo: 68.3,
      promedio: 48.2,
      unit: 'µg/m³',
    },
    {
      symbol: 'NH₃',
      name: 'Amoníaco',
      actual: 8.5,
      minimo: 5.2,
      maximo: 12.8,
      promedio: 9.1,
      unit: 'ppb',
    },
    {
      symbol: 'C₆H₆',
      name: 'Benceno',
      actual: 2.3,
      minimo: 1.5,
      maximo: 3.9,
      promedio: 2.6,
      unit: 'µg/m³',
    },
  ];

  ngOnInit(): void {
    // TODO: Cargar datos reales del servicio
    // this.loadGasesStats();
  }
}
