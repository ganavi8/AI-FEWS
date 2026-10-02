import { createHash, randomUUID } from 'node:crypto';
import type { Alert, EnvironmentResponse, RiskLevel } from '../../shared/contracts.js';

const HOUR_MS = 60 * 60 * 1000;
const MONITOR_WINDOW_HOURS = 6;

const RISK_RANK: Record<RiskLevel, number> = {
  UNKNOWN: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  VERY_HIGH: 4,
};

export interface AlertChangeContext {
  previousRiskLevel?: RiskLevel | null;
  previousRainfall6h?: number | null;
  previousProbability?: number | null;
  previousAlerts?: Partial<Record<Alert['type'], Alert | null>>;
}

function classifyChange(
  currentRisk: RiskLevel,
  previousRisk?: RiskLevel | null,
  previousAlert?: Alert | null,
): Alert['changeType'] {
  if (!previousRisk || previousRisk === 'UNKNOWN') return 'NEW';

  const currentRank = RISK_RANK[currentRisk];
  const previousRank = RISK_RANK[previousRisk];

  if (currentRank > previousRank) return 'ESCALATION';

  if (previousAlert?.status === 'ACTIVE' && currentRank === previousRank) {
    return 'PERSISTENCE';
  }

  return null;
}
function fingerprintFor(
  locationId: string | null,
  type: Alert['type'],
): string {
  /*
   * Fingerprint identifies the underlying alert condition, not its
   * lifecycle state or current severity. This prevents repeated
   * monitoring cycles from creating different fingerprints.
   */
  const stableKey = [
    locationId ?? 'ephemeral',
    type,
    '6H',
  ].join(':');

  return createHash('sha256').update(stableKey).digest('hex');
}

export function deriveAlerts(
  environment: EnvironmentResponse,
  locationId: string | null,
  context: AlertChangeContext = {},
): Alert[] {
  const now = Date.parse(environment.fetchedAt);
  if (!Number.isFinite(now)) return [];

  const detectedAt = new Date(now).toISOString();
  const candidates: Array<
    Pick<
      Alert,
      | 'type'
      | 'severity'
      | 'reason'
      | 'source'
      | 'dataQuality'
      | 'recommendedAction'
      | 'expiresAt'
    > &
      Partial<
        Pick<
          Alert,
          | 'sourceKind'
          | 'authority'
          | 'sourceUrl'
          | 'externalAlertId'
          | 'status'
          | 'acknowledgedAt'
          | 'acknowledgedBy'
          | 'detectedAt'
          | 'updatedAt'
          | 'changeType'
        >
      >
  > = [];

  const future = environment.weather.hourly.filter((hour) => {
    const time = Date.parse(hour.time);
    return (
      Number.isFinite(time) &&
      time >= now &&
      time < now + MONITOR_WINDOW_HOURS * HOUR_MS
    );
  });

  const rainfall6h = future.reduce(
    (sum, hour) => sum + (hour.precipitationMm ?? 0),
    0,
  );

  const maxProbability = future.reduce(
    (max, hour) =>
      Math.max(max, hour.precipitationProbabilityPercent ?? 0),
    0,
  );

  const previousRisk = context.previousRiskLevel ?? null;
  const previousHeavyRainAlert = context.previousAlerts?.HEAVY_RAIN ?? null;
  const previousHighRiskAlert = context.previousAlerts?.HIGH_RISK ?? null;
  const previousEnvironmentalAlert = context.previousAlerts?.ENVIRONMENTAL ?? null;
  const riskChange = classifyChange(
    environment.risk.riskLevel,
    previousRisk,
    previousHighRiskAlert,
  );

  if (
    environment.weather.status === 'LIVE' &&
    rainfall6h >= 25 &&
    maxProbability >= 60
  ) {
    const severity: Alert['severity'] = rainfall6h >= 50 ? 'HIGH' : 'WARNING';

    const rainfallIncreasing =
      context.previousRainfall6h != null &&
      rainfall6h - context.previousRainfall6h >= 10;

    const probabilityIncreasing =
      context.previousProbability != null &&
      maxProbability - context.previousProbability >= 15;

    let changeType: Alert['changeType'] = 'NEW';

    if (previousHeavyRainAlert) {
      changeType =
        rainfallIncreasing || probabilityIncreasing || riskChange === 'ESCALATION'
          ? 'ESCALATION'
          : 'PERSISTENCE';
    }

    candidates.push({
      type: 'HEAVY_RAIN',
      severity,
      reason:
        `Open-Meteo forecasts ${rainfall6h.toFixed(1)} mm of precipitation ` +
        `in six hours with a peak probability of ${Math.round(maxProbability)}%. ` +
        `This is a rule-based weather warning, not a flood forecast.`,
      source: 'Open-Meteo forecast',
      sourceKind: 'AI_RULE',
      authority: null,
      sourceUrl: null,
      externalAlertId: null,
      status: 'ACTIVE',
      acknowledgedAt: null,
      acknowledgedBy: null,
      detectedAt,
      updatedAt: detectedAt,
      changeType,
      dataQuality:
        'LIVE WEATHER · LOCAL HYDROLOGY NOT CONFIGURED',
      recommendedAction:
        'Check official local weather and emergency advisories. ' +
        'Avoid crossing floodwater and follow instructions from local authorities.',
      expiresAt: new Date(now + MONITOR_WINDOW_HOURS * HOUR_MS).toISOString(),
    });
  }

  if (
    environment.weather.status === 'LIVE' &&
    (environment.risk.riskLevel === 'HIGH' ||
      environment.risk.riskLevel === 'VERY_HIGH')
  ) {
    const severity: Alert['severity'] =
      environment.risk.riskLevel === 'VERY_HIGH' ? 'HIGH' : 'WARNING';

    candidates.push({
      type: 'HIGH_RISK',
      severity,
      reason:
        `${environment.risk.riskLevel} rule-based rainfall-screening level. ` +
        `${environment.risk.explanation}`,
      source: environment.risk.model,
      sourceKind: 'AI_RULE',
      authority: null,
      sourceUrl: null,
      externalAlertId: null,
      status: 'ACTIVE',
      acknowledgedAt: null,
      acknowledgedBy: null,
      detectedAt,
      updatedAt: detectedAt,
      changeType: riskChange ?? (previousHighRiskAlert ? 'PERSISTENCE' : 'NEW'),
      dataQuality: environment.risk.dataQuality,
      recommendedAction:
        'Treat this as precautionary decision support. Confirm with official local alerts ' +
        'and never rely on this screen as an evacuation order.',
      expiresAt: new Date(now + MONITOR_WINDOW_HOURS * HOUR_MS).toISOString(),
    });
  }

  const aqi = environment.airQuality.current?.usAqi;

  if (
    environment.airQuality.status === 'LIVE' &&
    aqi != null &&
    aqi >= 151
  ) {
    candidates.push({
      type: 'ENVIRONMENTAL',
      severity: aqi >= 201 ? 'HIGH' : 'WARNING',
      reason:
        `Provider-reported US AQI is ${Math.round(aqi)}. ` +
        `AQI categories and health advice vary by jurisdiction.`,
      source: 'Open-Meteo air-quality forecast · US AQI scale',
      sourceKind: 'AI_RULE',
      authority: null,
      sourceUrl: null,
      externalAlertId: null,
      status: 'ACTIVE',
      acknowledgedAt: null,
      acknowledgedBy: null,
      detectedAt,
      updatedAt: detectedAt,
      changeType: previousEnvironmentalAlert ? 'PERSISTENCE' : 'NEW',
      dataQuality: environment.airQuality.status,
      recommendedAction:
        'Consult local public-health and environmental guidance for location-specific advice.',
      expiresAt: new Date(now + 3 * HOUR_MS).toISOString(),
    });
  }

  return candidates.map((candidate) => {
    const fingerprint = fingerprintFor(locationId, candidate.type);

    return {
      id: randomUUID(),
      fingerprint,
      locationId,
      locationName: environment.locationName,
      ...candidate,
      createdAt: environment.fetchedAt,
      persisted: false,
      sourceKind: candidate.sourceKind ?? 'AI_RULE',
      authority: candidate.authority ?? null,
      sourceUrl: candidate.sourceUrl ?? null,
      externalAlertId: candidate.externalAlertId ?? null,
      status: candidate.status ?? 'ACTIVE',
      acknowledgedAt: candidate.acknowledgedAt ?? null,
      acknowledgedBy: candidate.acknowledgedBy ?? null,
      detectedAt: candidate.detectedAt ?? environment.fetchedAt,
      updatedAt: candidate.updatedAt ?? environment.fetchedAt,
      changeType: candidate.changeType ?? 'NEW',
    };
  });
}








