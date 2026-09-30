import { z } from 'zod';
import type { Coordinates } from '../../shared/contracts.js';
import { NOMINATIM_REVERSE_API, PROVIDER_TIMEOUT_MS } from '../config.js';
import type { ReverseGeocodeResult } from '../services/types.js';

const ResponseSchema = z.object({ display_name: z.string().optional().nullable() }).passthrough();
const SOURCE = 'https://nominatim.org/release-docs/latest/api/Reverse/';
const cache = new Map<string, { expiresAt: number; result: ReverseGeocodeResult }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function reverseGeocode(coordinates: Coordinates, now = new Date()): Promise<ReverseGeocodeResult> {
  const key = `${coordinates.latitude.toFixed(4)}:${coordinates.longitude.toFixed(4)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now.getTime()) return { ...cached.result, status: 'CACHED' };
  if (cache.size > 2000) {
    for (const [cacheKey, value] of cache) if (value.expiresAt <= now.getTime()) cache.delete(cacheKey);
  }
  try {
    const url = new URL(NOMINATIM_REVERSE_API);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', coordinates.latitude.toString());
    url.searchParams.set('lon', coordinates.longitude.toString());
    url.searchParams.set('zoom', '14');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'en');
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AI-FEWS/1.0',
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) {
      return {
        status: 'UNAVAILABLE', provider: 'OpenStreetMap Nominatim', source: SOURCE,
        fetchedAt: now.toISOString(), displayName: null,
        error: response.status === 429 ? 'Reverse geocoding is currently rate limited.' : 'The geocoding provider is temporarily unavailable.',
      };
    }
    const parsed = ResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return {
        status: 'ERROR', provider: 'OpenStreetMap Nominatim', source: SOURCE,
        fetchedAt: now.toISOString(), displayName: null, error: 'The geocoding provider returned an unsupported response.',
      };
    }
    const result: ReverseGeocodeResult = {
      status: parsed.data.display_name ? 'LIVE' : 'UNAVAILABLE',
      provider: 'OpenStreetMap Nominatim', source: SOURCE, fetchedAt: now.toISOString(),
      displayName: parsed.data.display_name ?? null,
      error: parsed.data.display_name ? null : 'No place name was returned for these coordinates.',
    };
    if (result.displayName) cache.set(key, { expiresAt: now.getTime() + CACHE_TTL_MS, result });
    return result;
  } catch {
    return {
      status: 'UNAVAILABLE', provider: 'OpenStreetMap Nominatim', source: SOURCE,
      fetchedAt: now.toISOString(), displayName: null, error: 'The geocoding provider is temporarily unavailable.',
    };
  }
}

export function clearGeocodeMemoryCache(): void {
  cache.clear();
}
