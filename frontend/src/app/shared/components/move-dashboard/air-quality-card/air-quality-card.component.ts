import { Component, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SafeHtmlPipe } from "../../../pipe/safe-html.pipe";
import { SensorDataService } from "../../../../core/services/sensor-data.service";
import { ComponentColorUtility } from "../../../../core/utils/component-color.utility";
import { getEnvironmentStatus } from "../../../../core/config/environment-thresholds.config";
import { Observable, of } from "rxjs";
import { map, catchError, shareReplay } from "rxjs/operators";

/**
 * Interfaz para métricas de calidad del aire
 * @interface AirQualityMetric
 * @property {string} label - Nombre de la métrica (PM 2.5, PM 10)
 * @property {string} icon - SVG del icono como string
 * @property {number} value - Valor medido
 * @property {string} unit - Unidad de medida
 * @property {'good' | 'moderate' | 'unhealthy'} status - Estado de calidad
 * @property {string} statusLabel - Etiqueta del estado
 */
interface AirQualityMetric {
  label: string;
  icon: string;
  value: number;
  unit: string;
  status: "good" | "moderate" | "unhealthy";
  statusLabel: string;
}

/**
 * AirQualityCardComponent
 *
 * Componente que muestra tarjetas de métricas de calidad del aire (PM2.5 y PM10).
 * Indica el estado actual de partículas en el ambiente con código de colores.
 * Conectado a SensorDataService para obtener datos en tiempo real.
 *
 * Características:
 * - Tarjetas con código de color según estado
 * - Valores en tiempo real desde el backend
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-air-quality-card
 * @standalone true
 * @imports CommonModule, SafeHtmlPipe
 * @returns Tarjetas de calidad del aire
 *
 * @example
 * <app-air-quality-card />
 */
@Component({
  selector: "app-air-quality-card",
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: "./air-quality-card.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirQualityCardComponent {
  /**
   * Iconos SVG para las métricas
   */
  public readonly icons = {
    pm25Icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="currentColor"/></svg>`,
    pm10Icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>`,
  };

  /**
   * Utility de colores expuesto para el template
   */
  ColorUtility = ComponentColorUtility;

  /**
   * Observable que emite las métricas de calidad del aire
   */
  metrics$!: Observable<AirQualityMetric[]>;

  /**
   * Métricas por defecto cuando no hay datos disponibles
   */
  private readonly defaultMetrics: AirQualityMetric[] = [
    {
      label: "PM 2.5",
      icon: this.icons.pm25Icon,
      value: 0,
      unit: "µg/m³",
      status: "good",
      statusLabel: "Sin datos",
    },
    {
      label: "PM 10",
      icon: this.icons.pm10Icon,
      value: 0,
      unit: "µg/m³",
      status: "good",
      statusLabel: "Sin datos",
    },
  ];

  constructor(private sensorDataService: SensorDataService) {
    this.initializeMetrics();
  }

  /**
   * Inicializa las métricas desde el servicio
   * @private
   */
  private initializeMetrics(): void {
    this.metrics$ = this.sensorDataService.getLatest().pipe(
      map((latest) => {
        const pm25 = Math.round(latest?.pm25 || 0);
        const pm10 = Math.round(latest?.pm10 || 0);

        const pm25Status = getEnvironmentStatus('pm25', pm25);
        const pm10Status = getEnvironmentStatus('pm10', pm10);

        return [
          {
            label: "PM 2.5",
            icon: this.icons.pm25Icon,
            value: pm25,
            unit: "µg/m³",
            status: pm25Status.key as any,
            statusLabel: pm25Status.label,
          },
          {
            label: "PM 10",
            icon: this.icons.pm10Icon,
            value: pm10,
            unit: "µg/m³",
            status: pm10Status.key as any,
            statusLabel: pm10Status.label,
          },
        ] as AirQualityMetric[];
      }),
      catchError((error) => {
        console.error("Error cargando datos de aire:", error);
        return of(this.defaultMetrics);
      }),
      shareReplay(1)
    );
  }
}
