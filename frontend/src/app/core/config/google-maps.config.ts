import { InjectionToken } from '@angular/core';

/**
 * Configuración de Google Maps para la aplicación MOVE.
 *
 * Flujo de la API Key:
 * - Desarrollo (ng serve): Se lee desde assets/config.json (gitignored).
 *   Copia config.json.example → config.json y pon tu key ahí.
 * - Docker/producción: Se inyecta vía la variable de entorno GOOGLE_MAPS_API_KEY.
 *   El entrypoint de nginx reemplaza el placeholder en index.html en runtime.
 *
 * Para obtener una API Key:
 * 1. Ir a https://console.cloud.google.com/
 * 2. Habilitar "Maps JavaScript API"
 * 3. Crear credenciales → API Key
 * 4. Restringir la key a "Maps JavaScript API" y al dominio de producción
 */

/** Token de inyección para la API Key de Google Maps (reservado para uso futuro) */
export const GOOGLE_MAPS_API_KEY = new InjectionToken<string>('GOOGLE_MAPS_API_KEY');

/**
 * Obtiene la API Key de Google Maps desde window.__GOOGLE_MAPS_API_KEY__.
 * En desarrollo, main.ts la carga desde assets/config.json antes del bootstrap.
 * En Docker, el entrypoint de nginx la inyecta reemplazando el placeholder.
 */
export function getGoogleMapsApiKey(): string {
  const runtimeKey = (window as any).__GOOGLE_MAPS_API_KEY__;
  if (runtimeKey && runtimeKey !== '__GOOGLE_MAPS_KEY_PLACEHOLDER__') {
    return runtimeKey;
  }
  return '';
}

/**
 * Configuración por defecto del mapa centrado en Pasto, Nariño, Colombia
 */
export const DEFAULT_MAP_CONFIG = {
  /** Centro del mapa: Pasto, Nariño (fallback si no se obtiene geolocalización) */
  center: { lat: 1.2136, lng: -77.2811 } as google.maps.LatLngLiteral,
  /** Nivel de zoom por defecto */
  zoom: 14,
  /** Opciones del mapa */
  options: {
    mapId: 'MOVE_MAP_ID',
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
    mapTypeId: 'roadmap',
  } as google.maps.MapOptions,
};
