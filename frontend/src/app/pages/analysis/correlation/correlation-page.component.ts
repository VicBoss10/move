import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CorrelationMatrixComponent } from '../../../shared/components/analysis/correlation-matrix/correlation-matrix.component';

/**
 * CorrelationPageComponent
 *
 * Contenedor de página para "Matriz de Correlación de Pearson".
 * Renderiza el componente compartido que calcula y visualiza correlaciones
 * entre variables ambientales y conteos de vehículos.
 *
 * @selector app-correlation-page
 * @standalone true
 * @imports CorrelationMatrixComponent
 * @returns Página con matriz de correlación
 *
 * @example
 * <app-correlation-page />
 */
@Component({
  selector: 'app-correlation-page',
  standalone: true,
  imports: [CorrelationMatrixComponent],
  template: `<app-correlation-matrix />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationPageComponent {}
