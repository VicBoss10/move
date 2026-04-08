import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LagAnalysisComponent } from '../../../shared/components/analysis/lag-analysis/lag-analysis.component';

/**
 * LagPageComponent
 *
 * Contenedor de página para "Análisis de Rezagos".
 * Renderiza el componente compartido que calcula la correlación cruzada
 * con desfases temporales entre variables ambientales y tráfico vehicular.
 *
 * @selector app-lag-page
 * @standalone true
 * @imports LagAnalysisComponent
 * @returns Página con análisis de rezagos
 *
 * @example
 * <app-lag-page />
 */
@Component({
  selector: 'app-lag-page',
  standalone: true,
  imports: [LagAnalysisComponent],
  template: `<app-lag-analysis />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LagPageComponent {}
