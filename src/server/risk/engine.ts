import { randomUUID } from 'node:crypto';
import type { RiskAssessment, WeatherData } from '../../shared/contracts.js';

const LOOKAHEAD_MS = 6 * 60 * 60 * 1000;
const LIMITATIONS = 'LIMITED · forecast-only rainfall heuristic; no terrain, drainage, river-gauge or validated flood model';

export function evaluateRisk(weather: WeatherData, evaluatedAt = new Date()): RiskAssessment {
  const assessedAt = evaluatedAt.toISOString();
  const windowEnd = evaluatedAt.getTime() + LOOKAHEAD_MS;
  const forecast = weather.hourly.filter((hour) => {
    const time = Date.parse(hour.time);
    return Number.isFinite(time) && time >= evaluatedAt.getTime() && time < windowEnd;
  });
  const rainfallValues = forecast.map((hour) => hour.precipitationMm).filter((value): value is number => value !== null);
  const probabilityValues = forecast.map((hour) => hour.precipitationProbabilityPercent).filter((value): value is number => value !== null);
  const hasUsableForecast = weather.status === 'LIVE' && rainfallValues.length > 0 && probabilityValues.length > 0;

  if (!hasUsableForecast) {
    return {
      id: randomUUID(), model: 'RuleBasedHeuristic-v1.0', riskLevel: 'UNKNOWN', score: null,
      probability: null, confidence: null, uncertainty: null,
      explanation: 'Insufficient environmental data. A live six-hour rainfall and precipitation-probability forecast is required for this screening calculation.',
      factors: [
        { key: 'precipitation_6h', label: 'Forecast rainfall (next six hours)', value: null, unit: 'mm', contribution: null, explanation: 'No usable live forecast window is available.', source: weather.provider },
        { key: 'precipitation_probability_6h', label: 'Peak precipitation probability (next six hours)', value: null, unit: '%', contribution: null, explanation: 'No usable live probability forecast is available.', source: weather.provider },
      ],
      dataQuality: `${LIMITATIONS}; source status ${weather.status}`,
      evaluatedAt: assessedAt, persisted: false,
    };
  }

  const rainfallMm = rainfallValues.reduce((sum, value) => sum + value, 0);
  const peakProbability = Math.max(...probabilityValues);
  const rainfallContribution = Math.min(60, rainfallMm);
  const probabilityContribution = peakProbability * 0.4;
  const score = Math.round(Math.min(100, rainfallContribution + probabilityContribution));
  const riskLevel: RiskAssessment['riskLevel'] = score >= 70 ? 'VERY_HIGH'
    : score >= 40 ? 'HIGH'
      : score >= 20 ? 'MODERATE' : 'LOW';

  return {
    id: randomUUID(), model: 'RuleBasedHeuristic-v1.0', riskLevel, score,
    probability: null, confidence: null, uncertainty: null,
    explanation: `The six-hour rainfall screening index is ${score}/100 (${riskLevel}). It combines a rainfall contribution capped at 60 points with 40% of peak forecast precipitation probability. This index is not a calibrated probability of flooding and does not model local drainage, terrain, rivers, or impacts.`,
    factors: [
      {
        key: 'precipitation_6h', label: 'Forecast rainfall (next six hours)', value: Number(rainfallMm.toFixed(2)),
        unit: 'mm', contribution: Number(rainfallContribution.toFixed(2)),
        explanation: `Accumulated ${rainfallValues.length} available live hourly precipitation values; contribution capped at 60 points.`,
        source: weather.provider,
      },
      {
        key: 'precipitation_probability_6h', label: 'Peak precipitation probability (next six hours)', value: Number(peakProbability.toFixed(2)),
        unit: '%', contribution: Number(probabilityContribution.toFixed(2)),
        explanation: 'Forty percent of the highest available hourly provider probability contributes to the screening index.',
        source: weather.provider,
      },
    ],
    dataQuality: LIMITATIONS, evaluatedAt: assessedAt, persisted: false,
  };
}
