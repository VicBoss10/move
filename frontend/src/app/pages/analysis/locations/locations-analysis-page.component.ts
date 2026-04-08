import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LocationAnalysisComponent } from '../../../shared/components/analysis/location-analysis/location-analysis.component';

/**
 * LocationsAnalysisPageComponent
 *
 * Contenedor de página para "Análisis por Ubicación".
 * Renderiza el componente compartido que compara contaminación ambiental
 * y conteos vehiculares por cada ubicación registrada en el sistema.
 *
 * @selector app-locations-analysis-page
 * @standalone true
 * @imports LocationAnalysisComponent
 * @returns Página con análisis por ubicación
 *
 * @example
 * <app-locations-analysis-page />
 */
@Component({
  selector: 'app-locations-analysis-page',
  standalone: true,
  imports: [LocationAnalysisComponent],
  template: `<app-location-analysis />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsAnalysisPageComponent {}
