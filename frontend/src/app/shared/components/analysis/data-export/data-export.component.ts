import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-export',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-export.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataExportComponent {
  private cdr = inject(ChangeDetectorRef);
}
