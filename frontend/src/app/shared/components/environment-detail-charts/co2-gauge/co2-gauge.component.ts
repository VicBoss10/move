import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { getEnvironmentStatus, getMetricGaugePercentage } from '../../../../core/config/environment-thresholds.config';

/**
 * Co2GaugeComponent
 *
 * Componente dinámico que muestra el nivel de CO₂ actual en un indicador circular (gauge).
 * Obtiene datos en tiempo real del backend usando SensorDataService.
 * Código de color según rango: Óptimo (<600), Moderado (600-1000), Elevado (1000-1500), Crítico (>1500)
 *
 * @selector app-co2-gauge
 * @standalone true
 */
@Component({
  selector: 'app-co2-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './co2-gauge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Co2GaugeComponent {
  /**
   * Observable que emite los datos actuales del gauge de CO₂
   */
  gaugeData$!: Observable<{
    co2Value: number;
    gaugePercentage: number;
    gaugeColor: string;
    status: string;
    bgColor: string;
  }>;

  constructor(private sensorDataService: SensorDataService) {
    this.initializeGaugeData();
  }

  /**
   * Inicializa los datos del gauge desde el servicio
   */
  private initializeGaugeData(): void {
    this.gaugeData$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => {
        const co2Value = latestData?.co2 || 0;
        return this.calculateGaugeData(co2Value);
      }),
      catchError((error) => {
        console.error('Error cargando datos de CO₂:', error);
        return of(this.calculateGaugeData(0));
      }),
      shareReplay(1)
    );
  }

  /**
   * Calcula todos los valores del gauge basado en el valor de CO₂
   * @param co2Value - Valor de CO₂ en ppm
   * @returns Objeto con datos del gauge
   */
  private calculateGaugeData(co2Value: number): {
    co2Value: number;
    gaugePercentage: number;
    gaugeColor: string;
    status: string;
    bgColor: string;
  } {
    const gaugePercentage = getMetricGaugePercentage('co2', co2Value);
    const envStatus = getEnvironmentStatus('co2', co2Value, false);

    return {
      co2Value,
      gaugePercentage,
      gaugeColor: envStatus.textClass,
      status: envStatus.label,
      bgColor: envStatus.gaugeGradient,
    };
  }
}
