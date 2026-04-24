import { Component } from '@angular/core';

import { ConnectedSensorsListComponent } from '../../../shared/components/devices/connected-sensors-list/connected-sensors-list.component';

/**
 * ConnectedSensorsComponent (Page/Container)
 *
 * Componente de página que orquesta la visualización de sensores conectados.
 * Solo renderiza el componente presentacional.
 *
 * @selector app-connected-sensors
 * @standalone true
 */
@Component({
  selector: 'app-connected-sensors',
  standalone: true,
  imports: [ConnectedSensorsListComponent],
  templateUrl: './connected-sensors.component.html',
})
export class ConnectedSensorsComponent {}
