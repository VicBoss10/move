import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimeSeriesComponent } from '../../../shared/components/analysis/time-series/time-series.component';

@Component({
  selector: 'app-time-series-page',
  standalone: true,
  imports: [TimeSeriesComponent],
  template: `<app-time-series />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSeriesPageComponent {}
