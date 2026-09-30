import { describe, expect, it } from 'vitest';
import { evaluateRisk } from '../src/server/risk/engine.js';
import type { WeatherData } from '../src/shared/contracts.js';

const evaluatedAt = new Date('2026-09-30T12:00:00.000Z');
const weather = (overrides: Partial<WeatherData> = {}): WeatherData => ({
  provider: 'Open-Meteo Forecast', source: 'https://api.open-meteo.com/v1/forecast',
  status: 'UNAVAILABLE',
  freshness: { status: 'UNAVAILABLE', ageMinutes: null, observedAt: null, fetchedAt: evaluatedAt.toISOString() },
  units: {}, current: null, hourly: [], error: 'Unavailable', ...overrides,
});

describe('authoritative risk screening', () => {
  it('returns UNKNOWN and no fabricated score or probability without a live six-hour forecast', () => {
    const result = evaluateRisk(weather(), evaluatedAt);
    expect(result.model).toBe('RuleBasedHeuristic-v1.0');
    expect(result.riskLevel).toBe('UNKNOWN');
    expect(result.score).toBeNull();
    expect(result.probability).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.uncertainty).toBeNull();
    expect(result.explanation).toContain('Insufficient environmental data');
  });

  it('calculates the documented rainfall screening score from valid live provider values only', () => {
    const live = weather({
      status: 'LIVE',
      freshness: { status: 'LIVE', ageMinutes: 0, observedAt: evaluatedAt.toISOString(), fetchedAt: evaluatedAt.toISOString() },
      error: null,
      hourly: [
        { time: '2026-09-30T13:00:00.000Z', precipitationMm: 10, rainMm: 8, precipitationProbabilityPercent: 50, weatherCode: 61 },
        { time: '2026-09-30T14:00:00.000Z', precipitationMm: 5, rainMm: 5, precipitationProbabilityPercent: 40, weatherCode: 61 },
      ],
    });
    const result = evaluateRisk(live, evaluatedAt);
    expect(result.score).toBe(35);
    expect(result.riskLevel).toBe('MODERATE');
    expect(result.probability).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.uncertainty).toBeNull();
    expect(result.factors.map((factor) => factor.value)).toEqual([15, 50]);
    expect(result.explanation).toContain('not a calibrated probability');
  });

  it('ignores observations outside its six-hour forecast window', () => {
    const live = weather({
      status: 'LIVE',
      freshness: { status: 'LIVE', ageMinutes: 0, observedAt: evaluatedAt.toISOString(), fetchedAt: evaluatedAt.toISOString() },
      error: null,
      hourly: [{ time: '2026-09-30T19:00:00.000Z', precipitationMm: 60, rainMm: 60, precipitationProbabilityPercent: 100, weatherCode: 65 }],
    });
    expect(evaluateRisk(live, evaluatedAt).riskLevel).toBe('UNKNOWN');
  });
});
