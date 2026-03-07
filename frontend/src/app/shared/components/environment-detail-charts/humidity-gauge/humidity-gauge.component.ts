import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { getEnvironmentStatus, getMetricGaugePercentage } from '../../../../core/config/environment-thresholds.config';

/**
 * Interface para datos del gauge de humedad
 */
interface GaugeData {
  humidity: number;
  gaugePercentage: number;
  gaugeColor: string;
  status: string;
}

/**
 * HumidityGaugeComponent
 *
 * Componente que muestra indicador circular de humedad relativa en %.
 * Rango: 0-100% con código de color según niveles.
 * Colores: Azul (seco), Verde (óptimo), Amarillo (húmedo), Naranja (muy húmedo).
 *
 * @selector app-humidity-gauge
 * @standalone true
 * @imports CommonModule
 * @returns Indicador circular de humedad
 *
 * @example
 * <app-humidity-gauge />
 */
@Component({
  selector: 'app-humidity-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './humidity-gauge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityGaugeComponent {
  /**
   * Observable que emite datos del gauge (humedad, porcentaje, color, estado)
   */
  gaugeData$!: Observable<GaugeData>;

  private readonly defaultGaugeData: GaugeData = {
    humidity: 0,
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
        const humidity = Math.round((latestData?.humidity || 0) * 10) / 10;
        
        return {
          humidity,
          gaugePercentage: humidity,
          gaugeColor: this.getGaugeColor(humidity),
          status: this.getStatus(humidity),
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de humedad:', error);
        return of(this.defaultGaugeData);
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtiene clase de color según humedad
   */
  private getGaugeColor(humidity: number): string {
    return getEnvironmentStatus('humidity', humidity, false).textClass;
  }

  /**
   * Obtiene estado según humedad
   */
  private getStatus(humidity: number): string {
    return getEnvironmentStatus('humidity', humidity, false).label;
  }

  /**
   * Obtiene color de fondo según humedad
   */
  getGaugeBgColor(humidity: number): string {
    return getEnvironmentStatus('humidity', humidity, false).gaugeGradient;
  }
}
