import { InjectionToken } from '@angular/core';

/**
 * Google Maps API configuration for the MOVE application.
 *
 * API Key flow:
 * - Development (ng serve): Loaded from assets/config.json (gitignored).
 *   Copy config.json.example → config.json and add your API key.
 * - Docker/Production: Injected via GOOGLE_MAPS_API_KEY environment variable.
 *   Nginx entrypoint replaces the placeholder in index.html at runtime.
 *
 * To obtain an API key:
 * 1. Go to https://console.cloud.google.com/
 * 2. Enable "Maps JavaScript API"
 * 3. Create credentials → API Key
 * 4. Restrict the key to "Maps JavaScript API" and production domain
 */

/**
 * Angular injection token for the Google Maps API key.
 * Reserved for future dependency injection use.
 * @constant GOOGLE_MAPS_API_KEY
 */
export const GOOGLE_MAPS_API_KEY = new InjectionToken<string>('GOOGLE_MAPS_API_KEY');

/**
 * Retrieves the Google Maps API key from runtime window object.
 * In development, loaded by main.ts from assets/config.json before bootstrap.
 * In Docker, injected by nginx entrypoint replacing the placeholder.
 *
 * @returns {string} The Google Maps API key or empty string if not configured.
 */
export function getGoogleMapsApiKey(): string {
  const runtimeKey = (window as any).__GOOGLE_MAPS_API_KEY__;
  if (runtimeKey && runtimeKey !== '__GOOGLE_MAPS_KEY_PLACEHOLDER__') {
    return runtimeKey;
  }
  return '';
}

/**
 * Default map configuration centered on Pasto, Nariño, Colombia.
 * Used as fallback when user geolocation is not available.
 * @constant DEFAULT_MAP_CONFIG
 */
export const DEFAULT_MAP_CONFIG = {
  /** Map center: Pasto, Nariño (fallback location if geolocation unavailable). */
  center: { lat: 1.2136, lng: -77.2811 } as google.maps.LatLngLiteral,
  /** Default zoom level for the map. */
  zoom: 14,
  /** Google Maps API options and styling. */
  options: {
    mapId: 'MOVE_MAP_ID',
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
    mapTypeId: 'roadmap',
  } as google.maps.MapOptions,
};
