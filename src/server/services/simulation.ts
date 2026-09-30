import { randomUUID } from 'node:crypto';
import type { Coordinates, SimulationScenario } from '../../shared/contracts.js';
import { evaluateRisk } from '../risk/engine.js';
import type { SimulationResponse } from './types.js';

const SCENARIOS: Record<SimulationScenario, { rainfallMm: number; probabilityPercent: number; description: string }> = {
  'NORMAL': { rainfallMm: 0, probabilityPercent: 10, description: 'Illustrative low-rain scenario; not a forecast.' },
  'HEAVY RAIN': { rainfallMm: 30, probabilityPercent: 80, description: 'Illustrative heavy-rain input; not a forecast.' },
  'EXTREME RAIN': { rainfallMm: 70, probabilityPercent: 95, description: 'Illustrative extreme-rain input; not a forecast.' },
  'DRAINAGE FAILURE': { rainfallMm: 35, probabilityPercent: 100, description: 'Illustrative rainfall under an assumed drainage-failure scenario; no real drainage condition is detected.' },
  'HIGH FLOOD RISK': { rainfallMm: 50, probabilityPercent: 100, description: 'Illustrative high-risk rainfall input; not a flood prediction.' },
};

export function simulateScenario(scenario: SimulationScenario, coordinates: Coordinates, now = new Date()): SimulationResponse {
  const values = SCENARIOS[scenario];
  const start = now.getTime();
  const hourly = Array.from({ length: 6 }, (_, index) => ({
    time: new Date(start + index * 60 * 60 * 1000).toISOString(),
    precipitationMm: values.rainfallMm / 6,
    rainMm: values.rainfallMm / 6,
    precipitationProbabilityPercent: values.probabilityPercent,
    weatherCode: null,
  }));
  const risk = evaluateRisk({
    provider: 'AI·FEWS scenario simulator', source: 'https://manus.im', status: 'LIVE',
    freshness: { status: 'LIVE', ageMinutes: 0, observedAt: now.toISOString(), fetchedAt: now.toISOString() },
    units: { precipitation: 'mm', precipitation_probability: '%' },
    current: null, hourly, error: null,
  }, now);
  risk.explanation = `SIMULATION ONLY — ${values.description} The server applied the same six-hour rainfall screening arithmetic to the selected synthetic values. It is not evidence of current conditions, flood probability, or a local hazard. ${risk.explanation}`;
  risk.dataQuality = 'SIMULATION ONLY · SYNTHETIC INPUTS · NOT LIVE OBSERVATIONS';
  risk.persisted = false;
  return {
    mode: 'SIMULATION', scenario, coordinates, generatedAt: now.toISOString(), status: 'SIMULATION',
    simulatedRainfallMm: values.rainfallMm,
    simulatedProbabilityPercent: values.probabilityPercent,
    risk,
    disclaimer: 'SIMULATION ONLY. These synthetic inputs are not live observations, a flood forecast, or an evacuation signal. Follow official local emergency guidance.',
  };
}
