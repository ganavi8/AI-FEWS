import { createHash, randomUUID } from 'node:crypto';
import type { Alert, EnvironmentResponse } from '../../shared/contracts.js';

const HOUR_MS = 60 * 60 * 1000;

export function deriveAlerts(environment: EnvironmentResponse, locationId: string | null): Alert[] {
  const now = Date.parse(environment.fetchedAt);
  if (!Number.isFinite(now)) return [];
  const candidates: Array<Pick<Alert, 'type' | 'severity' | 'reason' | 'source' | 'dataQuality' | 'recommendedAction' | 'expiresAt'>> = [];

  const future = environment.weather.hourly.filter((hour) => {
    const time = Date.parse(hour.time);
    return Number.isFinite(time) && time >= now && time < now + 6 * HOUR_MS;
  });
  const rainfall6h = future.reduce((sum, hour) => sum + (hour.precipitationMm ?? 0), 0);
  const maxProbability = future.reduce((max, hour) => Math.max(max, hour.precipitationProbabilityPercent ?? 0), 0);

  if (environment.weather.status === 'LIVE' && rainfall6h >= 25 && maxProbability >= 60) {
    candidates.push({
      type: 'HEAVY_RAIN', severity: rainfall6h >= 50 ? 'HIGH' : 'WARNING',
      reason: `Open-Meteo forecasts ${rainfall6h.toFixed(1)} mm of precipitation in six hours with a peak probability of ${Math.round(maxProbability)}%. This is a rule-based weather warning, not a flood forecast.`,
      source: 'Open-Meteo forecast', dataQuality: 'LIVE WEATHER · LOCAL HYDROLOGY NOT CONFIGURED',
      recommendedAction: 'Check official local weather and emergency advisories. Avoid crossing floodwater and follow instructions from local authorities.',
      expiresAt: new Date(now + 6 * HOUR_MS).toISOString(),
    });
  }

  if (environment.weather.status === 'LIVE' && (environment.risk.riskLevel === 'HIGH' || environment.risk.riskLevel === 'VERY_HIGH')) {
    candidates.push({
      type: 'HIGH_RISK', severity: environment.risk.riskLevel === 'VERY_HIGH' ? 'HIGH' : 'WARNING',
      reason: `${environment.risk.riskLevel} rule-based rainfall-screening level. ${environment.risk.explanation}`,
      source: environment.risk.model, dataQuality: environment.risk.dataQuality,
      recommendedAction: 'Treat this as precautionary decision support. Confirm with official local alerts and never rely on this screen as an evacuation order.',
      expiresAt: new Date(now + 6 * HOUR_MS).toISOString(),
    });
  }

  const aqi = environment.airQuality.current?.usAqi;
  if (environment.airQuality.status === 'LIVE' && aqi !== null && aqi !== undefined && aqi >= 151) {
    candidates.push({
      type: 'ENVIRONMENTAL', severity: aqi >= 201 ? 'HIGH' : 'WARNING',
      reason: `Provider-reported US AQI is ${Math.round(aqi)}. AQI categories and health advice vary by jurisdiction.`,
      source: 'Open-Meteo air-quality forecast · US AQI scale', dataQuality: environment.airQuality.status,
      recommendedAction: 'Consult local public-health and environmental guidance for location-specific advice.',
      expiresAt: new Date(now + 3 * HOUR_MS).toISOString(),
    });
  }

  const bucket = Math.floor(now / (6 * HOUR_MS));
  return candidates.map((candidate) => {
    const stableKey = `${locationId ?? 'ephemeral'}:${candidate.type}:${candidate.severity}:${bucket}`;
    const fingerprint = createHash('sha256').update(stableKey).digest('hex');
    return {
      id: randomUUID(), fingerprint, locationId, locationName: environment.locationName,
      ...candidate, createdAt: environment.fetchedAt, persisted: false,
    };
  });
}
