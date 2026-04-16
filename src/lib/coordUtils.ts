/**
 * coordUtils.ts
 *
 * Universal coordinate resolver for CatchRank.
 *
 * Handles all coordinate schema variants across migrated and v2 data:
 *  - Spot (v2):       spot.coordinates.lat / spot.coordinates.lng
 *  - Spot (migrated): spot.lat / spot.lng  OR  spot.latitude / spot.longitude
 *  - Catch (v2):      catch.latitude / catch.longitude
 *  - Catch (legacy):  catch.location.lat / catch.location.lng
 *  - Any flat top-level: obj.lat / obj.lng
 */

export interface ResolvedCoords {
  lat: number;
  lng: number;
}

/**
 * Resolve coordinates from any data object — spot, catch, session reference etc.
 * Returns null if no valid non-zero coordinates can be found.
 */
export function resolveCoords(data: any): ResolvedCoords | null {
  if (!data) return null;

  const candidates: [any, any][] = [
    // v2 Spot — nested coordinates object
    [data.coordinates?.lat, data.coordinates?.lng],
    // Migrated spot / any flat lat/lng
    [data.lat, data.lng],
    // Flat latitude/longitude (Catch v2, some Spot migrations)
    [data.latitude, data.longitude],
    // Legacy Catch — nested location object
    [data.location?.lat, data.location?.lng],
  ];

  for (const [rawLat, rawLng] of candidates) {
    if (rawLat == null || rawLng == null) continue;
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Build a Google Maps URL from coordinates.
 */
export function googleMapsUrl(lat: number, lng: number, label?: string): string {
  const query = label
    ? encodeURIComponent(label) + `+${lat},${lng}`
    : `${lat},${lng}`;
  return `https://maps.google.com/?q=${query}`;
}

/**
 * Format coordinates for display, e.g. "52.1234° N, 5.4321° E"
 */
export function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'Z';
  const lngDir = lng >= 0 ? 'O' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir},  ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}
