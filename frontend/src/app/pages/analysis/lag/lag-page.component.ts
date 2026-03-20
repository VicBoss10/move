import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LagAnalysisComponent } from '../../../shared/components/analysis/lag-analysis/lag-analysis.component';

@Component({
  selector: 'app-lag-page',
  standalone: true,
  imports: [LagAnalysisComponent],
  template: `<app-lag-analysis />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LagPageComponent {}
