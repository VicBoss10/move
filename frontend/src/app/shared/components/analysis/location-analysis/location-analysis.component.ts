import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-location-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationAnalysisComponent {
  private cdr = inject(ChangeDetectorRef);
}
