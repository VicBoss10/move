import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

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
 * Componente que muestra tabla con estadísticas dinámicas de los 3 gases:
 * CO, NO₂, NH₃. Obtiene datos en tiempo real del backend.
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasesStatsTableComponent {
  /**
   * Observable que emite estadísticas de cada gas
   */
  gasesStats$!: Observable<GasStats[]>;

  private readonly defaultStats: GasStats[] = [
    {
      symbol: 'CO',
      name: 'Monóxido de Carbono',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      unit: 'ppm',
    },
    {
      symbol: 'NO₂',
      name: 'Dióxido de Nitrógeno',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      unit: 'µg/m³',
    },
    {
      symbol: 'NH₃',
      name: 'Amoníaco',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      unit: 'ppb',
    },
  ];

  constructor(private sensorDataService: SensorDataService) {
    this.initializeGasStats();
  }

  /**
   * Inicializa estadísticas de gases desde el servicio
   */
  private initializeGasStats(): void {
    this.gasesStats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: SensorData[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        // Extraer valores de cada gas
        const coValues = sensorData.map((d) => d.co || 0);
        const no2Values = sensorData.map((d) => d.no2 || 0);
        const nh3Values = sensorData.map((d) => d.nh3 || 0);

        return [
          {
            ...this.defaultStats[0],
            actual: this.getLatestValue(coValues),
            minimo: Math.min(...coValues),
            maximo: Math.max(...coValues),
            promedio: this.calculateAverage(coValues),
          },
          {
            ...this.defaultStats[1],
            actual: this.getLatestValue(no2Values),
            minimo: Math.min(...no2Values),
            maximo: Math.max(...no2Values),
            promedio: this.calculateAverage(no2Values),
          },
          {
            ...this.defaultStats[2],
            actual: this.getLatestValue(nh3Values),
            minimo: Math.min(...nh3Values),
            maximo: Math.max(...nh3Values),
            promedio: this.calculateAverage(nh3Values),
          },
        ];
      }),
      catchError((error) => {
        console.error('Error cargando estadísticas de gases:', error);
        return of(this.defaultStats);
      }),
      shareReplay(1),
    );
  }

  /**
   * Obtiene el último valor de un array
   */
  private getLatestValue(values: number[]): number {
    return values.length > 0 ? values[values.length - 1] : 0;
  }

  /**
   * Calcula el promedio de un array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }
}
