import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lag-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lag-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LagAnalysisComponent {
  private cdr = inject(ChangeDetectorRef);
}
