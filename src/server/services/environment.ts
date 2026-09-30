import type { Coordinates, DataStatus, EnvironmentResponse } from '../../shared/contracts.js';
import type { ProviderAdapters } from './types.js';
import { evaluateRisk } from '../risk/engine.js';
import { recordProviderState } from './provider-state.js';

const CACHE_TTL_MS = 90_000;
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, { expiresAt: number; value: EnvironmentResponse }>();

function statusFor(weather: DataStatus, air: DataStatus): DataStatus {
  if (weather === 'LIVE' && air === 'LIVE') return 'LIVE';
  if (['LIVE', 'RECENT'].includes(weather) || ['LIVE', 'RECENT'].includes(air)) return 'RECENT';
  if (weather === 'STALE' || air === 'STALE') return 'STALE';
  if (weather === 'ERROR' || air === 'ERROR') return 'ERROR';
  return 'UNAVAILABLE';
}

function markCached(value: EnvironmentResponse, now: Date): EnvironmentResponse {
  const freshness = (current: EnvironmentResponse['weather']['freshness']) => {
    const observedAt = current.observedAt ? Date.parse(current.observedAt) : Number.NaN;
    const ageMinutes = Number.isFinite(observedAt)
      ? Math.max(0, (now.getTime() - observedAt) / 60_000)
      : null;
    return { ...current, status: 'CACHED' as const, ageMinutes };
  };
  return {
    ...value,
    status: 'CACHED',
    weather: { ...value.weather, status: 'CACHED', freshness: freshness(value.weather.freshness) },
    airQuality: { ...value.airQuality, status: 'CACHED', freshness: freshness(value.airQuality.freshness) },
    risk: { ...value.risk, persisted: false },
    currentAlerts: value.currentAlerts.map((alert) => ({ ...alert, persisted: false })),
  };
}

export async function getEnvironment(
  coordinates: Coordinates,
  options: { acquisitionMethod: EnvironmentResponse['acquisitionMethod']; locationName?: string | null },
  providers: Pick<ProviderAdapters, 'weather' | 'airQuality'>,
  now = new Date(),
): Promise<EnvironmentResponse> {
  const key = `${coordinates.latitude.toFixed(4)}:${coordinates.longitude.toFixed(4)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now.getTime()) {
    return {
      ...markCached(cached.value, now),
      acquisitionMethod: options.acquisitionMethod,
      locationName: options.locationName ?? null,
    };
  }
  const [weather, airQuality] = await Promise.all([
    providers.weather(coordinates), providers.airQuality(coordinates),
  ]);
  recordProviderState('open-meteo-weather', {
    status: weather.status, observedAt: weather.freshness.observedAt, checkedAt: now.toISOString(),
  });
  recordProviderState('open-meteo-air', {
    status: airQuality.status, observedAt: airQuality.freshness.observedAt, checkedAt: now.toISOString(),
  });
  const value: EnvironmentResponse = {
    coordinates,
    locationName: options.locationName ?? null,
    acquisitionMethod: options.acquisitionMethod,
    status: statusFor(weather.status, airQuality.status),
    fetchedAt: now.toISOString(),
    weather,
    airQuality,
    risk: evaluateRisk(weather, now),
    currentAlerts: [],
  };
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { expiresAt: now.getTime() + CACHE_TTL_MS, value });
  return value;
}

export function clearEnvironmentMemoryCache(): void {
  cache.clear();
}
