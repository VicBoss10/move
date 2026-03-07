import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { getEnvironmentStatus, getMetricGaugePercentage } from '../../../../core/config/environment-thresholds.config';

/**
 * Interface para datos del gauge de temperatura
 */
interface GaugeData {
  temperature: number;
  gaugePercentage: number;
  gaugeColor: string;
  status: string;
}

/**
 * TemperatureGaugeComponent
 *
 * Componente que muestra indicador circular dinámico de temperatura en °C.
 * Rango de -10°C a 50°C con código de color según condiciones.
 * Obtiene datos en tiempo real del backend.
 *
 * @selector app-temperature-gauge
 * @standalone true
 * @imports CommonModule
 * @returns Indicador circular de temperatura
 *
 * @example
 * <app-temperature-gauge />
 */
@Component({
  selector: 'app-temperature-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temperature-gauge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureGaugeComponent {
  /**
   * Observable que emite datos del gauge (temperatura, porcentaje, color, estado)
   */
  gaugeData$!: Observable<GaugeData>;

  private readonly defaultGaugeData: GaugeData = {
    temperature: 0,
    gaugePercentage: 0,
    gaugeColor: 'text-gray-500',
    status: 'Normal',
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeGaugeData();
  }

  /**
   * Inicializa los datos del gauge desde el servicio
   */
  private initializeGaugeData(): void {
    this.gaugeData$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => {
        const temperature = Math.round((latestData?.temperature || 0) * 10) / 10;
        
        return {
          temperature,
          gaugePercentage: this.calculateGaugePercentage(temperature),
          gaugeColor: this.getGaugeColor(temperature),
          status: this.getStatus(temperature),
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de temperatura:', error);
        return of(this.defaultGaugeData);
      }),
      shareReplay(1)
    );
  }

  /**
   * Calcula porcentaje de llenado del gauge
   */
  private calculateGaugePercentage(temperature: number): number {
    return getMetricGaugePercentage('temperature', temperature);
  }

  /**
   * Obtiene clase de color según temperatura
   */
  private getGaugeColor(temperature: number): string {
    return getEnvironmentStatus('temperature', temperature, false).textClass;
  }

  /**
   * Obtiene estado según temperatura
   */
  private getStatus(temperature: number): string {
    return getEnvironmentStatus('temperature', temperature, false).label;
  }

  /**
   * Obtiene color de fondo según temperatura
   */
  getGaugeBgColor(temperature: number): string {
    return getEnvironmentStatus('temperature', temperature, false).gaugeGradient;
  }
}
