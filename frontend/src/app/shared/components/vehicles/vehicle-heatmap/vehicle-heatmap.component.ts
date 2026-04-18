import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsModule } from '@angular/google-maps';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

/** Punto del mapa de calor con coordenada y peso (número de detecciones) */
interface HeatPoint {
  lat: number;
  lng: number;
  count: number;
  description: string;
}

/**
 * VehicleHeatmapComponent
 *
 * Muestra un mapa de calor de Google Maps con la concentración de detecciones
 * de vehículos por ubicación. Las zonas con más detecciones aparecen en
 * colores cálidos (rojo/naranja) y las de menor actividad en frío (verde/azul).
 *
 * Proceso de datos:
 * 1. Carga todas las detecciones desde el backend
 * 2. Agrupa por ubicación (lat/lng del dispositivo)
 * 3. Usa el conteo como "peso" para la intensidad del calor
 *
 * @selector app-vehicle-heatmap
 * @standalone true
 */
@Component({
  selector: 'app-vehicle-heatmap',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './vehicle-heatmap.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleHeatmapComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /** Centro del mapa: usa el default del proyecto (Pasto, Nariño) */
  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;

  /** Nivel de zoom inicial */
  zoom = 13;

  /** Opciones del mapa */
  mapOptions: google.maps.MapOptions = {
    ...DEFAULT_MAP_CONFIG.options,
    mapTypeId: 'roadmap',
  };

  /** Si la API de Maps ya fue cargada */
  isApiLoaded = false;

  /** Carga en progreso */
  isLoading = false;

  /** Mensaje de error si algo falla */
  errorMessage: string | null = null;

  /** Total de detecciones procesadas */
  totalDetections = 0;

  /** Número de ubicaciones únicas con datos */
  locationCount = 0;

  /**
   * Datos para MapHeatmapLayer: array de LatLng ponderados.
   * Usamos 'any' para evitar dependencia de tipado en google.maps.visualization
   * (la biblioteca se carga dinámicamente).
   */
  heatmapData: google.maps.LatLng[] = [];

  /** Opciones del heatmap layer */
  heatmapOptions = {
    radius: 40,
    opacity: 0.75,
    dissipating: true,
  };

  constructor(
    private vehicleService: VehicleDetectedService,
    private mapsLoader: GoogleMapsLoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();

    // 1. Cargar la API de Google Maps
    const mapsReady = await this.mapsLoader.load();
    if (!mapsReady) {
      this.errorMessage = 'Google Maps API no disponible. Verifica la clave de API.';
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    // 2. Cargar la biblioteca "visualization" (necesaria para HeatmapLayer)
    try {
      await (google.maps as any).importLibrary('visualization');
    } catch {
      this.errorMessage = 'No se pudo cargar la biblioteca de visualización de Maps.';
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.isApiLoaded = true;
    this.cdr.markForCheck();

    // 3. Cargar detecciones desde el backend
    this.vehicleService
      .getAll()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading heatmap data:', error);
          this.errorMessage = 'Error al cargar los datos del mapa de calor.';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((vehicles: VehicleDetected[]) => {
        this.processHeatmapData(vehicles);
        this.cdr.markForCheck();
      });
  }

  /**
   * Agrupa las detecciones por ubicación y construye los puntos del mapa de calor.
   * El "peso" de cada punto equivale al número de detecciones en esa coordenada.
   */
  private processHeatmapData(vehicles: VehicleDetected[]): void {
    this.totalDetections = vehicles.length;

    const locationMap = new Map<
      string,
      { lat: number; lng: number; count: number; description: string }
    >();

    vehicles.forEach((v) => {
      const loc = v.device?.location;
      if (!loc?.latitude || !loc?.longitude) return;

      const key = `${loc.latitude.toFixed(6)},${loc.longitude.toFixed(6)}`;
      const existing = locationMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        locationMap.set(key, {
          lat: loc.latitude,
          lng: loc.longitude,
          count: 1,
          description: loc.description ?? 'Sin descripción',
        });
      }
    });

    this.locationCount = locationMap.size;

    // Construir puntos ponderados: repetir la coordenada N veces según el conteo
    // para que google.maps.visualization.HeatmapLayer intensifique zonas de mayor actividad
    const points: google.maps.LatLng[] = [];
    locationMap.forEach((point) => {
      for (let i = 0; i < point.count; i++) {
        points.push(new google.maps.LatLng(point.lat, point.lng));
      }
    });

    this.heatmapData = points;

    // Centrar el mapa en la primera ubicación con datos
    if (locationMap.size > 0) {
      const first = locationMap.values().next().value!;
      this.center = { lat: first.lat, lng: first.lng };
    }
  }
}
