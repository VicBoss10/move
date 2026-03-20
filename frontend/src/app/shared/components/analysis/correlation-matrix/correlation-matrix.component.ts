import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-correlation-matrix',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './correlation-matrix.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationMatrixComponent {
  private cdr = inject(ChangeDetectorRef);
}
