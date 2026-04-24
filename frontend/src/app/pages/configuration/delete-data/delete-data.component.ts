import { Component } from '@angular/core';

import { DeleteDataFormComponent } from '../../../shared/components/configuration/delete-data-form/delete-data-form.component';

/**
 * DeleteDataComponent (Page/Container)
 *
 * Página contenedora para la funcionalidad "Eliminar datos".
 * @selector app-delete-data
 * @standalone true
 */
@Component({
  selector: 'app-delete-data',
  standalone: true,
  imports: [DeleteDataFormComponent],
  templateUrl: './delete-data.component.html',
})
export class DeleteDataComponent {}
