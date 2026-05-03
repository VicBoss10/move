import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getGoogleMapsApiKey } from '../config/google-maps.config';

/**
 * Geolocation coordinates with accuracy information.
 * @interface GeoLocationResult
 */
export interface GeoLocationResult {
  /** Latitude coordinate. */
  lat: number;
  /** Longitude coordinate. */
  lng: number;
  /** Position accuracy in meters. */
  accuracy: number;
}

/**
 * Google Maps API dynamic loader and geolocation service.
 * Handles lazy-loading the Google Maps JavaScript API with automatic deduplication.
 * Provides user geolocation via browser API with result caching.
 *
 * Initialization flow:
 * 1. Retrieves API Key from runtime configuration or environment.
 * 2. Dynamically injects Google Maps script into document head.
 * 3. Resolves when script finishes loading and is ready for use.
 *
 * @class GoogleMapsLoaderService
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  /**
   * Subject tracking errors from Google Maps or geolocation operations.
   * @private
   */
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  /**
   * Public error stream for components to subscribe to load/location failures.
   */
  public readonly error$ = this.errorSubject.asObservable();

  /**
   * Cached promise for the Google Maps API load operation.
   * Ensures the API is loaded only once even with multiple subscribers.
   * @private
   */
  private loadPromise: Promise<boolean> | null = null;

  /**
   * Loads the Google Maps JavaScript API dynamically.
   * Returns cached promise if load is already in progress or completed.
   * Logs warnings if API key is not configured.
   *
   * @returns {Promise<boolean>} Promise resolving to true on success, false on failure.
   */
  load(): Promise<boolean> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Si ya está cargada (por ejemplo, desde Docker/index.html)
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
      this.loadPromise = Promise.resolve(true);
      return this.loadPromise;
    }

    const apiKey = getGoogleMapsApiKey();

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.warn('Google Maps API Key no configurada');
      this.errorSubject.next('Google Maps API Key no configurada');
      this.loadPromise = Promise.resolve(false);
      return this.loadPromise;
    }

    // Usa el bootstrap loader oficial de Google Maps que configura importLibrary()
    // antes de cargar el script, requerido por @angular/google-maps v20+
    this.loadPromise = new Promise<boolean>((resolve) => {
      try {
        type GoogleObj = { [k: string]: unknown };
        const w = window as unknown as { google?: GoogleObj };
        const g = w.google ?? (w.google = {} as GoogleObj);
        const d = (g['maps'] ?? (g['maps'] = {} as GoogleObj)) as GoogleObj;
        const loaded = new Set<string>();

        const bootstrap = (): Promise<void> => {
          return (
            (d['__promise'] as Promise<void> | undefined) ||
            (d['__promise'] = new Promise<void>((res, rej) => {
              const script = document.createElement('script');
              const params = new URLSearchParams({
                key: apiKey,
                libraries: 'marker',
                loading: 'async',
                callback: 'google.maps.__ib__',
              });
              script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
              script.async = true;
              script.defer = true;
              d['__ib__'] = res;
              script.onerror = () => {
                delete d['__promise'];
                rej(new Error('Google Maps API could not load.'));
              };
              document.head.appendChild(script);
            }) as Promise<void>)
          );
        };

        type MapsWithImport = GoogleObj & {
          importLibrary?: (lib: string, ...args: unknown[]) => unknown;
        };
        const dTyped = d as MapsWithImport;
        if (!dTyped.importLibrary) {
          dTyped.importLibrary = (lib: string, ...args: unknown[]) => {
            loaded.add(lib);
            return bootstrap().then(() => dTyped.importLibrary!(lib, ...args));
          };
        }

        // Trigger the load and wait for it
        bootstrap()
          .then(() => {
            console.log('Google Maps API cargada correctamente');
            this.errorSubject.next(null);
            resolve(true);
          })
          .catch(() => {
            console.error('Error al cargar Google Maps API');
            this.errorSubject.next('Error al cargar Google Maps API');
            resolve(false);
          });
      } catch {
        console.error('Error al inicializar Google Maps bootstrap');
        this.errorSubject.next('Error al inicializar Google Maps bootstrap');
        resolve(false);
      }
    });

    return this.loadPromise;
  }

  /**
   * Cache of the last geolocation result to avoid repeated requests.
   * @private
   */
  private geoCache: GeoLocationResult | null = null;
  /**
   * Shared promise for the geolocation request to prevent duplicate API calls.
   * @private
   */
  private geoPromise: Promise<GeoLocationResult | null> | null = null;

  /**
   * Requests the user's current geolocation using the Geolocation API.
   * Uses getCurrentPosition for fast single-shot positioning (~1-2s).
   * Caches the result to prevent repeated geolocation requests.
   * Supports 3-second timeout with fallback to null.
   *
   * @returns {Promise<GeoLocationResult | null>} Promise with user coordinates and accuracy, or null if unavailable.
   */
  requestUserLocation(): Promise<GeoLocationResult | null> {
    // Retornar caché si ya tenemos resultado
    if (this.geoCache) {
      return Promise.resolve(this.geoCache);
    }
    // Reutilizar promesa si ya está en curso
    if (this.geoPromise) {
      return this.geoPromise;
    }

    this.geoPromise = new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocalización no soportada por el navegador');
        this.errorSubject.next('Geolocalización no soportada por el navegador');
        resolve(null);
        return;
      }

      let resolved = false;
      const done = (result: GeoLocationResult | null) => {
        if (resolved) return;
        resolved = true;
        this.geoCache = result;
        resolve(result);
      };

      // getCurrentPosition es más rápido que watchPosition para un solo resultado
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result: GeoLocationResult = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log(
            `Geolocation: lat=${result.lat.toFixed(6)}, lng=${result.lng.toFixed(6)}, accuracy=${result.accuracy.toFixed(0)}m`,
          );
          this.errorSubject.next(null);
          done(result);
        },
        (error) => {
          console.warn('Geolocalización error:', error.message);
          this.errorSubject.next(`Geolocalización error: ${error.message}`);
          done(null);
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 },
      );

      // Timeout de seguridad: 3s máximo
      setTimeout(() => done(null), 3500);
    });

    return this.geoPromise;
  }
}
