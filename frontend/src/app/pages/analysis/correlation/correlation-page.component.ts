import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CorrelationMatrixComponent } from '../../../shared/components/analysis/correlation-matrix/correlation-matrix.component';

@Component({
  selector: 'app-correlation-page',
  standalone: true,
  imports: [CorrelationMatrixComponent],
  template: `<app-correlation-matrix />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationPageComponent {}
