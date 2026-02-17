import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { ComponentColorUtility } from '../../../../core/utils/component-color.utility';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';

/**
 * Métrica ambiental con información de valor, unidad y estado
 */
interface EnvironmentMetric {
  label: string;
  icon: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend?: string;
  secondaryValue?: string;
}

/**
 * Componente que muestra métricas ambientales clave: CO2, Temperatura/Humedad, Vehículos.
 * Conectado a SensorDataService y VehicleDetectedService para obtener datos reales.
 * 
 * @selector app-environment-metrics
 * @standalone true
 */
@Component({
  selector: 'app-environment-metrics',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './environment-metrics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentMetricsComponent {
  public icons = {
    gasIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2C7.44772 2 7 2.44772 7 3V6C7 7.10457 7.89543 8 9 8H10V19C10 20.1046 10.8954 21 12 21C13.1046 21 14 20.1046 14 19V8H15C16.1046 8 17 7.10457 17 6V3C17 2.44772 16.5523 2 16 2H8ZM6 10C5.44772 10 5 10.4477 5 11V19C5 20.1046 5.89543 21 7 21C8.10457 21 9 20.1046 9 19V11C9 10.4477 8.55228 10 8 10H6ZM18 10C17.4477 10 17 10.4477 17 11V19C17 20.1046 17.8954 21 19 21C20.1046 21 21 20.1046 21 19V11C21 10.4477 20.5523 10 20 10H18Z" fill="currentColor"/></svg>`,
    temperatureIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C10.9 2 10 2.9 10 4V13C10 14.66 8.66 16 7 16C5.34 16 4 14.66 4 13C4 10.24 6.04 7.94 8.79 7.1C8.92 7.06 9 6.94 9 6.8V4C9 2.9 9.9 2 11 2H13C14.1 2 15 2.9 15 4V6.8C15 6.94 15.08 7.06 15.21 7.1C17.96 7.94 20 10.24 20 13C20 14.66 18.66 16 17 16C15.34 16 14 14.66 14 13V4C14 2.9 13.1 2 12 2Z" fill="currentColor"/></svg>`,
    vehicleIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11H1V13H3V11ZM20 11H18V13H20V11ZM4 7H2V9H4V7ZM22 7H20V9H22V7ZM7.5 3C6.67 3 6 3.67 6 4.5V5H18V4.5C18 3.67 17.33 3 16.5 3H7.5ZM3.5 9C2.12 9 1 10.12 1 11.5V16.5C1 17.88 2.12 19 3.5 19H4V20.5C4 21.33 4.67 22 5.5 22C6.33 22 7 21.33 7 20.5V19H17V20.5C17 21.33 17.67 22 18.5 22C19.33 22 20 21.33 20 20.5V19H20.5C21.88 19 23 17.88 23 16.5V11.5C23 10.12 21.88 9 20.5 9H3.5ZM3 11H21V16H3V11Z" fill="currentColor"/></svg>`,
  };

  ColorUtility = ComponentColorUtility;

  private isLoading$ = new BehaviorSubject<boolean>(true);

  /**
   * Observable que emite las métricas combinando datos de sensores y vehículos
   */
  metrics$!: Observable<EnvironmentMetric[]>;

  constructor(
    private sensorDataService: SensorDataService,
    private vehicleService: VehicleDetectedService
  ) {
    this.metrics$ = combineLatest([
      this.sensorDataService.getAll(),
      this.vehicleService.getAll()
    ]).pipe(
      map(([sensorData, vehicles]) => {
        const latestSensor = sensorData?.[sensorData.length - 1];
        const stats = this.vehicleService.getStats();

        return [
          {
            label: 'CO₂ / Gases',
            icon: this.icons.gasIcon,
            value: latestSensor?.co2?.toFixed(0) || '0',
            unit: 'ppm',
            status: 'normal' as const,
          },
          {
            label: 'Temp / Hum',
            icon: this.icons.temperatureIcon,
            value: latestSensor ? `${latestSensor.temperature.toFixed(1)}°C` : '0°C',
            unit: `/ ${latestSensor?.humidity?.toFixed(0) || '0'}%`,
            status: 'normal' as const,
            secondaryValue: latestSensor?.humidity?.toFixed(0) + '%'
          },
          {
            label: 'Vehículos',
            icon: this.icons.vehicleIcon,
            value: stats?.todayDetections?.toString() || '0',
            unit: 'hoy',
            status: 'normal' as const,
          },
        ];
      }),
      tap(() => this.isLoading$.next(false)),
      catchError((err) => {
        console.error('Error cargando métricas ambientales:', err);
        this.isLoading$.next(false);
        return of([
          {
            label: 'CO₂ / Gases',
            icon: this.icons.gasIcon,
            value: '0',
            unit: 'ppm',
            status: 'normal' as const,
          },
          {
            label: 'Temp / Hum',
            icon: this.icons.temperatureIcon,
            value: '0°C',
            unit: '/ 0%',
            status: 'normal' as const,
            secondaryValue: '0%'
          },
          {
            label: 'Vehículos',
            icon: this.icons.vehicleIcon,
            value: '0',
            unit: 'hoy',
            status: 'normal' as const,
          },
        ] as EnvironmentMetric[]);
      }),
      shareReplay(1)
    );
  }
}
