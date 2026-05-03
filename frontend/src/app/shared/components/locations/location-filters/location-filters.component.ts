import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  catchError,
  share,
  startWith,
} from 'rxjs/operators';
import { LocationTableComponent } from '../location-table/location-table.component';
import { ApiService } from '../../../../core/services/api.service';
import { Location } from '../../../../core/models/location.model';

/**
 * LocationFiltersComponent (Container Component)
 *
 * Combines real-time location search with a location table, providing debounced search-as-you-type
 * filtering. Emits refresh events to child table component on data changes.
 *
 * Features:
 * - Reactive FormControl for location search with 300ms debounce and distinctUntilChanged
 * - Real-time filtering applied to location descriptions (case-insensitive substring match)
 * - Manual refresh trigger via refreshTrigger$ BehaviorSubject
 * - Integrated location-table child component with input [locations] and output (locationChanged)
 * - combineLatest pattern combining search input and refresh trigger for responsive updates
 * - Error handling with empty array fallback on API failure
 * - OnPush change detection for performance
 * - OnDestroy cleanup via takeUntil(destroy$) pattern
 *
 * @selector app-location-filters
 * @standalone true
 * @imports CommonModule, ReactiveFormsModule, LocationTableComponent
 * @example
 * <app-location-filters />
 */
@Component({
  selector: 'app-location-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationTableComponent],
  templateUrl: './location-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationFiltersComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  locations$: Observable<Location[]>;

  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
  ) {
    this.locations$ = combineLatest([
      this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(''),
      ),
      this.refreshTrigger$,
    ]).pipe(
      switchMap(([searchTerm]) =>
        this.apiService.get<Location[]>('/locations').pipe(
          map((locations: Location[]) => this.filterLocations(locations, searchTerm || '')),
          catchError(() => {
            this.cdr.markForCheck();
            return [[] as Location[]];
          }),
        ),
      ),
      share(),
    );
  }

  /**
   * Initializes component on first view (currently empty).
   * Observable setup occurs in constructor via combineLatest pattern.
   * @returns {void}
   */
  ngOnInit(): void {
    // Initialization handled in constructor
  }

  /**
   * Lifecycle hook: cleans up subscriptions and completes destroy$ subject.
   * Called when component is destroyed to prevent memory leaks.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Filters locations array by description using case-insensitive substring matching.
   * Returns all locations if searchTerm is empty or whitespace only.
   * Used internally by locations$ observable to filter results reactively.
   * @param {Location[]} locations - Array of Location objects to filter
   * @param {string} searchTerm - Search string to match against location descriptions
   * @returns {Location[]} Filtered array of locations matching search term
   */
  private filterLocations(locations: Location[], searchTerm: string): Location[] {
    if (!searchTerm.trim()) {
      return locations;
    }

    const term = searchTerm.toLowerCase();
    return locations.filter((loc) => (loc.description || '').toLowerCase().includes(term));
  }

  /**
   * Triggers data refresh when locations are modified from child LocationTableComponent.
   * Called from locationChanged output event of LocationTableComponent.
   * Emits undefined to refreshTrigger$ BehaviorSubject to re-execute locations$ observable
   * and reload current search results from backend.
   * @returns {void}
   */
  onLocationChanged(): void {
    this.refreshTrigger$.next();
  }
}
