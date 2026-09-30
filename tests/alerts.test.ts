import { describe, expect, it } from 'vitest';
import { deriveAlerts } from '../src/server/alerts/engine.js';
import type { AirQualityData, EnvironmentResponse, WeatherData } from '../src/shared/contracts.js';

const now = new Date('2026-09-30T12:00:00.000Z');
const quality = (status: WeatherData['status']): WeatherData => ({
  provider: 'Synthetic unit-test fixture', source: 'https://example.test/weather', status,
  freshness: { status, ageMinutes: 0, observedAt: now.toISOString(), fetchedAt: now.toISOString() },
  units: {}, current: {
    temperatureC: null, precipitationMm: null, rainMm: null, humidityPercent: null,
    windSpeedKmh: null, windGustKmh: null, pressureHpa: null, weatherCode: null, isDay: null,
  }, hourly: [], error: null,
});
const airFixture = (aqi: number | null): AirQualityData => ({
  provider: 'Synthetic unit-test fixture', source: 'https://example.test/air', status: 'LIVE',
  freshness: { status: 'LIVE', ageMinutes: 0, observedAt: now.toISOString(), fetchedAt: now.toISOString() },
  units: {}, current: { pm25: null, pm10: null, ozone: null, usAqi: aqi }, error: null,
});
function environment({
  rainfall = 0, probability = 0, aqi = null, riskLevel = 'LOW', weatherStatus = 'LIVE',
}: {
  rainfall?: number; probability?: number; aqi?: number | null;
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'UNKNOWN';
  weatherStatus?: WeatherData['status'];
} = {}): EnvironmentResponse {
  const weather = quality(weatherStatus);
  weather.hourly = rainfall > 0 ? [1, 2].map((hour) => ({
    time: new Date(now.getTime() + hour * 60 * 60 * 1000).toISOString(),
    precipitationMm: rainfall / 2, rainMm: rainfall / 2,
    precipitationProbabilityPercent: probability, weatherCode: 61,
  })) : [];
  return {
    coordinates: { latitude: 51, longitude: 0 }, locationName: 'Synthetic unit-test location',
    acquisitionMethod: 'manual', status: 'LIVE', fetchedAt: now.toISOString(), weather,
    airQuality: airFixture(aqi),
    risk: {
      id: 'unit-test-only', model: 'RuleBasedHeuristic-v1.0', riskLevel, score: 50,
      probability: null, confidence: null, uncertainty: null,
      explanation: 'Synthetic unit-test explanation; not an environmental observation.', factors: [],
      dataQuality: 'TEST_FIXTURE_NOT_ENVIRONMENTAL_DATA', evaluatedAt: now.toISOString(), persisted: false,
    },
    currentAlerts: [],
  };
}

describe('server-side alert derivation (synthetic fixtures; never production observations)', () => {
  it('requires LIVE weather and both rainfall/probability thresholds before deriving heavy-rain alerts', () => {
    expect(deriveAlerts(environment({ rainfall: 25, probability: 59 }), 'saved-location-1')).toEqual([]);
    const alerts = deriveAlerts(environment({ rainfall: 25, probability: 60 }), 'saved-location-1');
    const heavyRain = alerts.find((alert) => alert.type === 'HEAVY_RAIN');
    expect(heavyRain).toMatchObject({ severity: 'WARNING', source: 'Open-Meteo forecast', persisted: false });
    expect(heavyRain?.reason).toContain('not a flood forecast');
    expect(Date.parse(heavyRain?.expiresAt ?? '') - Date.parse(heavyRain?.createdAt ?? '')).toBe(6 * 60 * 60 * 1000);
  });

  it('raises severity at the higher rainfall threshold and keeps an alert fingerprint stable inside its time bucket', () => {
    const one = deriveAlerts(environment({ rainfall: 50, probability: 80 }), 'saved-location-2')
      .find((alert) => alert.type === 'HEAVY_RAIN');
    const two = deriveAlerts(environment({ rainfall: 50, probability: 80 }), 'saved-location-2')
      .find((alert) => alert.type === 'HEAVY_RAIN');
    expect(one?.severity).toBe('HIGH');
    expect(one?.fingerprint).toBe(two?.fingerprint);
    expect(one?.id).not.toBe(two?.id);
  });

  it('does not derive weather/risk warning alerts from stale weather', () => {
    const alerts = deriveAlerts(environment({ rainfall: 60, probability: 100, riskLevel: 'VERY_HIGH', weatherStatus: 'STALE' }), 'saved-location-3');
    expect(alerts.some((alert) => alert.type === 'HEAVY_RAIN' || alert.type === 'HIGH_RISK')).toBe(false);
  });

  it('uses the explicit environmental AQI threshold and retains a source limitation', () => {
    expect(deriveAlerts(environment({ aqi: 150 }), 'saved-location-4').some((alert) => alert.type === 'ENVIRONMENTAL')).toBe(false);
    const environmental = deriveAlerts(environment({ aqi: 151 }), 'saved-location-4')
      .find((alert) => alert.type === 'ENVIRONMENTAL');
    expect(environmental?.severity).toBe('WARNING');
    expect(environmental?.source).toContain('US AQI scale');
    expect(environmental?.recommendedAction).toContain('local public-health');
  });
});
