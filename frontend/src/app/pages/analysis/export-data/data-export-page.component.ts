import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataExportComponent } from '../../../shared/components/analysis/data-export/data-export.component';

/**
 * DataExportPageComponent
 *
 * Contenedor de página para "Exportación de Datos".
 * Renderiza el componente compartido que permite exportar reportes
 * de análisis en formato PDF con gráficos y estadísticas.
 *
 * @selector app-data-export-page
 * @standalone true
 * @imports DataExportComponent
 * @returns Página con herramienta de exportación
 *
 * @example
 * <app-data-export-page />
 */
@Component({
  selector: 'app-data-export-page',
  standalone: true,
  imports: [DataExportComponent],
  template: `<app-data-export />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataExportPageComponent {}
