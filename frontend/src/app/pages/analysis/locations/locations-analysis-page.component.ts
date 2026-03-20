import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LocationAnalysisComponent } from '../../../shared/components/analysis/location-analysis/location-analysis.component';

@Component({
  selector: 'app-locations-analysis-page',
  standalone: true,
  imports: [LocationAnalysisComponent],
  template: `<app-location-analysis />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsAnalysisPageComponent {}
