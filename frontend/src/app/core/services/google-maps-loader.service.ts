import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getGoogleMapsApiKey } from '../config/google-maps.config';

/**
 * Resultado de geolocalización con precisión
 */
export interface GeoLocationResult {
  lat: number;
  lng: number;
  accuracy: number; // metros
}

/**
 * GoogleMapsLoaderService
 *
 * Servicio que carga dinámicamente el script de Google Maps JavaScript API.
 * Garantiza que el script se cargue una sola vez y expone una promesa
 * que los componentes pueden usar para esperar a que esté listo.
 *
 * Flujo:
 * 1. Obtiene la API Key desde google-maps.config (runtime Docker o valor local)
 * 2. Inyecta el <script> de Google Maps en el <head>
 * 3. Resuelve la promesa cuando el script termina de cargar
 *
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  /** Último error de carga/geolocalización del servicio. */
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  /** Stream público de errores de Google Maps. */
  public readonly error$ = this.errorSubject.asObservable();

  /**
   * Promesa que se resuelve cuando la API de Google Maps está lista
   */
  private loadPromise: Promise<boolean> | null = null;

  /**
   * Carga la API de Google Maps dinámicamente.
   * Si ya se cargó o está en proceso, retorna la misma promesa.
   * @returns Promesa que resuelve true si cargó exitosamente, false si falló
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
        const w = window as any;
        const g = w.google || (w.google = {});
        const d = g.maps || (g.maps = {});
        const loaded = new Set<string>();

        const bootstrap = (): Promise<void> => {
          return (d.__promise ||
            (d.__promise = new Promise<void>((res, rej) => {
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
              d.__ib__ = res;
              script.onerror = () => {
                d.__promise = null;
                rej(new Error('Google Maps API could not load.'));
              };
              document.head.appendChild(script);
            })));
        };

        if (!d.importLibrary) {
          d.importLibrary = (lib: string, ...args: any[]) => {
            loaded.add(lib);
            return bootstrap().then(() => d.importLibrary(lib, ...args));
          };
        }

        // Trigger the load and wait for it
        bootstrap().then(() => {
          console.log('Google Maps API cargada correctamente');
          this.errorSubject.next(null);
          resolve(true);
        }).catch(() => {
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
   * Caché del último resultado de geolocalización para evitar pedirlo varias veces.
   */
  private geoCache: GeoLocationResult | null = null;
  private geoPromise: Promise<GeoLocationResult | null> | null = null;

  /**
   * Solicita la geolocalización del usuario de forma rápida.
   * Usa getCurrentPosition para obtener una posición rápida (~1-2s).
   * El resultado se cachea para que otros componentes no repitan la petición.
   * @returns Promesa con las coordenadas y precisión del usuario, o null si no disponible
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
          console.log(`Geolocation: lat=${result.lat.toFixed(6)}, lng=${result.lng.toFixed(6)}, accuracy=${result.accuracy.toFixed(0)}m`);
          this.errorSubject.next(null);
          done(result);
        },
        (error) => {
          console.warn('Geolocalización error:', error.message);
          this.errorSubject.next(`Geolocalización error: ${error.message}`);
          done(null);
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
      );

      // Timeout de seguridad: 3s máximo
      setTimeout(() => done(null), 3500);
    });

    return this.geoPromise;
  }
}
