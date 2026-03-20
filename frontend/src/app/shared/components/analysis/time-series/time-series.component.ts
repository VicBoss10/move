import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TimeSeriesComponent (Shared/Smart Component)
 *
 * Visualización de series temporales de datos ambientales.
 *
 * @selector app-time-series
 * @standalone true
 */
@Component({
  selector: 'app-time-series',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './time-series.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSeriesComponent {}
