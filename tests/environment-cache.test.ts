import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AirQualityData, Coordinates, WeatherData } from '../src/shared/contracts.js';
import { clearEnvironmentMemoryCache, getEnvironment } from '../src/server/services/environment.js';

const coordinates: Coordinates = { latitude: 45.5, longitude: -73.56 };
const requestedAt = new Date('2026-06-01T12:00:00.000Z');
const observedAt = new Date(requestedAt.getTime() - 179.5 * 60_000).toISOString();
const weather: WeatherData = {
  provider: 'Open-Meteo Forecast', source: 'https://api.open-meteo.com/v1/forecast', status: 'LIVE',
  freshness: { status: 'LIVE', ageMinutes: 179.5, observedAt, fetchedAt: requestedAt.toISOString() },
  units: { precipitation: 'mm' },
  current: {
    temperatureC: 16, precipitationMm: 4, rainMm: 4, humidityPercent: 70,
    windSpeedKmh: 5, windGustKmh: 8, pressureHpa: 1013, weatherCode: 61, isDay: true,
  },
  hourly: [{
    time: new Date(requestedAt.getTime() + 60 * 60_000).toISOString(),
    precipitationMm: 20, rainMm: 20, precipitationProbabilityPercent: 80, weatherCode: 61,
  }],
  error: null,
};
const airQuality: AirQualityData = {
  provider: 'Open-Meteo Air Quality', source: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  status: 'LIVE', freshness: {
    status: 'LIVE', ageMinutes: 0, observedAt: requestedAt.toISOString(), fetchedAt: requestedAt.toISOString(),
  },
  units: { pm2_5: 'µg/m³' }, current: { pm25: 5, pm10: 8, ozone: 40, usAqi: 22 }, error: null,
};

afterEach(() => clearEnvironmentMemoryCache());

describe('server environment memory cache', () => {
  it('updates source-observation ages and labels a cache hit with the current saved-location request', async () => {
    clearEnvironmentMemoryCache();
    const providers = {
      weather: vi.fn(async () => weather),
      airQuality: vi.fn(async () => airQuality),
    };
    const first = await getEnvironment(
      coordinates, { acquisitionMethod: 'manual' }, providers, requestedAt,
    );
    expect(first.weather.freshness.ageMinutes).toBe(179.5);

    const checkedAgainAt = new Date(requestedAt.getTime() + 60_000);
    const cached = await getEnvironment(
      coordinates, { acquisitionMethod: 'saved', locationName: 'Synthetic Test Place' }, providers, checkedAgainAt,
    );

    expect(cached.status).toBe('CACHED');
    expect(cached.weather.status).toBe('CACHED');
    expect(cached.weather.freshness.status).toBe('CACHED');
    expect(cached.weather.freshness.ageMinutes).toBeCloseTo(180.5);
    expect(cached.airQuality.freshness.ageMinutes).toBeCloseTo(1);
    expect(cached.acquisitionMethod).toBe('saved');
    expect(cached.locationName).toBe('Synthetic Test Place');
    expect(cached.risk.persisted).toBe(false);
    expect(providers.weather).toHaveBeenCalledOnce();
    expect(providers.airQuality).toHaveBeenCalledOnce();
  });
});
