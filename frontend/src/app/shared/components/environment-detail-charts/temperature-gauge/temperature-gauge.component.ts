import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

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
   * Calcula porcentaje de llenado del gauge (rango -10°C a 50°C)
   */
  private calculateGaugePercentage(temperature: number): number {
    // Mapear rango -10 a 50°C a 0-100%
    const percentage = ((temperature + 10) / 60) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  /**
   * Obtiene clase de color según temperatura
   */
  private getGaugeColor(temperature: number): string {
    if (temperature < 15) return 'text-blue-500';
    if (temperature < 25) return 'text-green-500';
    if (temperature < 35) return 'text-orange-500';
    return 'text-red-500';
  }

  /**
   * Obtiene estado según temperatura
   */
  private getStatus(temperature: number): string {
    if (temperature < 15) return 'Frío';
    if (temperature < 25) return 'Óptimo';
    if (temperature < 35) return 'Calor';
    return 'Muy Caliente';
  }

  /**
   * Obtiene color de fondo según temperatura
   */
  getGaugeBgColor(temperature: number): string {
    if (temperature < 15) return 'from-blue-500/20 to-blue-600/20';
    if (temperature < 25) return 'from-green-500/20 to-green-600/20';
    if (temperature < 35) return 'from-orange-500/20 to-orange-600/20';
    return 'from-red-500/20 to-red-600/20';
  }
}
