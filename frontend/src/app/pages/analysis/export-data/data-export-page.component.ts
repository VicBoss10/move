import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataExportComponent } from '../../../shared/components/analysis/data-export/data-export.component';

@Component({
  selector: 'app-data-export-page',
  standalone: true,
  imports: [DataExportComponent],
  template: `<app-data-export />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataExportPageComponent {}
