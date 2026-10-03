import { Router } from 'express';
import { SimulationScenarioSchema } from '../../shared/contracts.js';
import { ApiError } from '../errors.js';
import { dataQuality, providerCatalog } from '../services/catalog.js';
import { simulateScenario } from '../services/simulation.js';
import type { RouteContext } from './context.js';
import { parseCoordinates } from './common.js';

const PLACEHOLDER_FIELD = /^\s*(?:not\s+configured|placeholder|dummy|sample|test|tbd|todo|none|your\s+(?:legal\s+)?(?:name|address|email|contact)|test\s+(?:operator|address|contact))\s*$/i;
function publicText(value: string, minimumLength: number): string | null {
  const clean = value.trim();
  return clean.length >= minimumLength && /\p{L}/u.test(clean) && !PLACEHOLDER_FIELD.test(clean) ? clean : null;
}
function publicContact(value: string): string | null {
  const clean = value.trim();
  if (clean.length < 6 || PLACEHOLDER_FIELD.test(clean)) return null;
  const emailMatch = /^([^\s@]+)@([^\s@]+\.[^\s@]{2,})$/.exec(clean);
  const reservedDomain = (domain: string) => {
    const normalized = domain.toLowerCase();
    return normalized.split('.').some((label) => ['example', 'test', 'invalid', 'localhost'].includes(label));
  };
  if (emailMatch && !reservedDomain(emailMatch[2] ?? '')) return clean;
  try {
    const url = new URL(clean);
    if (url.protocol === 'https:' && url.hostname.includes('.') && !reservedDomain(url.hostname)) return clean;
  } catch { /* not a URL */ }
  return null;
}

export function dataRouter(context: RouteContext): Router {
  const router = Router();
  router.get('/public-config', (_request, response) => {
    const operatorLegalName = publicText(context.operatorLegalName, 3);
    const operatorServiceAddress = publicText(context.operatorServiceAddress, 8);
    const supportContact = publicContact(context.supportContact);
    return response.json({
      application: 'AI-FEWS',
      operatorConfigured: Boolean(operatorLegalName && operatorServiceAddress),
      operatorLegalName: operatorLegalName ?? 'NOT CONFIGURED',
      operatorServiceAddress: operatorServiceAddress ?? 'NOT CONFIGURED',
      supportConfigured: Boolean(supportContact),
      supportContact: supportContact ?? 'NOT CONFIGURED',
    });
  });
  router.get('/data-quality', (_request, response) => response.json(dataQuality()));
  router.get('/providers', (_request, response) => response.json({ providers: providerCatalog() }));
  router.get('/models', (_request, response) => response.json({
    models: [{
      id: 'RuleBasedHeuristic-v1.0', kind: 'transparent-rule-based-rainfall-screening',
      status: 'LIVE', probabilityAvailable: false, confidenceAvailable: false, uncertaintyAvailable: false,
      inputs: ['Open-Meteo live hourly precipitation', 'Open-Meteo live hourly precipitation probability'],
      outputLevels: ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'UNKNOWN'],
      limitation: 'Not a calibrated probability of flooding; no terrain, drainage, river-gauge, exposure or validated flood model is configured.',
      source: 'AI·FEWS server-side implementation',
    }],
  }));
  router.get('/simulation', (request, response) => {
    const parsedScenario = SimulationScenarioSchema.safeParse(request.query.scenario);
    if (!parsedScenario.success) {
      throw new ApiError(400, 'INVALID_SIMULATION_SCENARIO', 'Choose NORMAL, HEAVY RAIN, EXTREME RAIN, DRAINAGE FAILURE, or HIGH FLOOD RISK.');
    }
    const result = simulateScenario(parsedScenario.data, parseCoordinates(request));
    response.json(result);
  });

  const notConfigured = (name: string) => (_request: unknown, response: import('express').Response) => response.json({
    status: 'CONFIGURATION REQUIRED', provider: null, source: null, data: null,
    coverage: 'Not available; no provider has been configured.',
    limitations: [`${name} is not configured. No placeholder or simulated observation is returned.`],
  });
  router.get('/satellite', notConfigured('Satellite imagery'));
  router.get('/terrain', notConfigured('Terrain and elevation'));
  router.get('/hydrology', notConfigured('Hydrology and river gauges'));
  router.get('/historical-floods', notConfigured('Historical flood-event data'));
  return router;
}
