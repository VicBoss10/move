import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * SensorDataTableComponent (Shared/Presentational)
 *
 * Displays a responsive historical sensor data table with multi-parameter columns and pagination support.
 *
 * Features:
 * - Nine data columns: timestamp (date-formatted), CO₂ (ppm), temperature (°C), humidity (%), PM2.5 (µg/m³), PM10 (µg/m³), CO (ppm), NO₂ (ppb), NH₃ (ppb)
 * - All values formatted to 1 decimal place using number pipe '1.1-1'
 * - Loading state: centered spinner with "Cargando datos..." message during data fetch
 * - Error state: centered error message displayed if fetch fails
 * - Empty state: no records message with document icon when data array is empty
 * - Pagination: "Load more" button at bottom when hasMoreData is true, disabled during loading
 * - End-of-data message showing total record count when no more records available
 * - Hover effects on rows with light background color change
 * - Responsive scrolling: horizontal scroll on small screens, full width on larger screens
 * - OnPush change detection strategy for performance optimization
 *
 * Input properties:
 * - filteredRecords: SensorData[] - array of sensor records to display
 * - isLoading: boolean - loading state flag for spinner and button disable
 * - errorMessage: string - error text to display when fetch fails
 * - hasMoreData: boolean - flag indicating more records available for pagination
 * - pageSize: number - records per page, shown in pagination message
 *
 * Output events:
 * - loadMore: EventEmitter<void> - emitted when user clicks "Load more" button
 *
 * @selector app-sensor-data-table
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-sensor-data-table
 *   [filteredRecords]="records"
 *   [isLoading]="loading"
 *   [errorMessage]="error"
 *   [hasMoreData]="hasMore"
 *   [pageSize]="100"
 *   (loadMore)="onLoadMore()"
 * />
 */
@Component({
  selector: 'app-sensor-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sensor-data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensorDataTableComponent {
  /**
   * Array of sensor records to display in the table.
   * @type {SensorData[]}
   */
  @Input() filteredRecords: SensorData[] = [];

  /**
   * Loading state flag for spinner and button disable.
   * @type {boolean}
   */
  @Input() isLoading: boolean = false;

  /**
   * Error message text to display when fetch fails.
   * @type {string}
   */
  @Input() errorMessage: string = '';

  /**
   * Flag indicating more records available for pagination.
   * @type {boolean}
   */
  @Input() hasMoreData: boolean = true;

  /**
   * Records per page, shown in pagination message.
   * @type {number}
   */
  @Input() pageSize: number = 100;

  /**
   * Emitted when user clicks "Load more" button.
   * @type {EventEmitter<void>}
   */
  @Output() loadMore = new EventEmitter<void>();

  /**
   * Triggers loading of additional sensor data records.
   * @returns {void}
   */
  onLoadMore(): void {
    this.loadMore.emit();
  }
}
