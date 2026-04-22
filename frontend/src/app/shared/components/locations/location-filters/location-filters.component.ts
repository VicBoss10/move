import {
  Component,
  Input,
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
  takeUntil,
  catchError,
  share,
  startWith,
} from 'rxjs/operators';
import { LocationTableComponent } from '../location-table/location-table.component';
import { LocationService } from '../../../../core/services/location.service';
import { ApiService } from '../../../../core/services/api.service';
import { Location } from '../../../../core/models/location.model';

/**
 * LocationFiltersComponent
 *
 * Contenedor que combina búsqueda de ubicaciones y tabla.
 * Maneja el filtrado en tiempo real mientras escribes.
 *
 * @selector app-location-filters
 * @standalone true
 */
@Component({
  selector: 'app-location-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationTableComponent],
  templateUrl: './location-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationFiltersComponent implements OnInit, OnDestroy {
  /**
   * FormControl para búsqueda de ubicación
   */
  searchControl = new FormControl('');

  /**
   * Observable de ubicaciones filtradas
   */
  locations$: Observable<Location[]>;

  /**
   * Subject para forzar refresco de datos
   */
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
  ) {
    // Observable reactivo que filtra ubicaciones cuando el searchControl cambia
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

  ngOnInit(): void {
    // Initialize
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Filtra ubicaciones según el término de búsqueda
   */
  private filterLocations(locations: Location[], searchTerm: string): Location[] {
    if (!searchTerm.trim()) {
      return locations;
    }

    const term = searchTerm.toLowerCase();
    return locations.filter((loc) => (loc.description || '').toLowerCase().includes(term));
  }

  /**
   * Recarga los datos de ubicaciones
   */
  onLocationChanged(): void {
    this.refreshTrigger$.next();
  }
}
