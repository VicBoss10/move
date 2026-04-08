import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimeSeriesComponent } from '../../../shared/components/analysis/time-series/time-series.component';

/**
 * TimeSeriesPageComponent
 *
 * Contenedor de página para "Series de Tiempo".
 * Renderiza el componente compartido que visualiza la evolución temporal
 * de un contaminante superpuesto con conteos de vehículos detectados.
 *
 * @selector app-time-series-page
 * @standalone true
 * @imports TimeSeriesComponent
 * @returns Página con gráfico de series de tiempo
 *
 * @example
 * <app-time-series-page />
 */
@Component({
  selector: 'app-time-series-page',
  standalone: true,
  imports: [TimeSeriesComponent],
  template: `<app-time-series />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSeriesPageComponent {}
