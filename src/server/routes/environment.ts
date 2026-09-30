import { Router, type Request, type Response } from 'express';
import {
  AirQualityDataSchema, EnvironmentResponseSchema, GeocodeResponseSchema, RiskAssessmentSchema,
  WeatherDataSchema, type Coordinates, type EnvironmentResponse,
} from '../../shared/contracts.js';
import { ApiError } from '../errors.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { deriveAlerts } from '../alerts/engine.js';
import { getEnvironment } from '../services/environment.js';
import { recordProviderState } from '../services/provider-state.js';
import type { RouteContext } from './context.js';
import { optionalQueryString, parseCoordinates, requireOwnerHash } from './common.js';

function acquisitionMethod(request: Request): EnvironmentResponse['acquisitionMethod'] {
  const method = optionalQueryString(request, 'method') ?? 'manual';
  if (method === 'browser' || method === 'android' || method === 'manual') return method;
  throw new ApiError(400, 'INVALID_ACQUISITION_METHOD', 'Location method must be browser, android, or manual.');
}

async function resolveLocation(context: RouteContext, request: Request): Promise<{
  coordinates: Coordinates;
  ownerHash: string | null;
  locationId: string | null;
  locationName: string | null;
  method: EnvironmentResponse['acquisitionMethod'];
}> {
  const locationId = optionalQueryString(request, 'locationId');
  if (locationId) {
    const ownerHash = requireOwnerHash(request);
    const saved = (await context.repository.listSavedLocations(ownerHash)).find((item) => item.id === locationId);
    if (!saved) throw new ApiError(404, 'SAVED_LOCATION_NOT_FOUND', 'This saved location was not found for this installation.');
    return {
      coordinates: { latitude: saved.latitude, longitude: saved.longitude }, ownerHash,
      locationId: saved.id, locationName: saved.name, method: 'saved',
    };
  }
  return {
    coordinates: parseCoordinates(request), ownerHash: null, locationId: null,
    locationName: null, method: acquisitionMethod(request),
  };
}

const CACHED_WEATHER_MAX_PERSIST_AGE_MINUTES = 720;

function hasPersistableWeather(environment: EnvironmentResponse): boolean {
  const weather = environment.weather;
  if (weather.status === 'LIVE' || weather.status === 'RECENT') return true;
  return weather.status === 'CACHED'
    && (weather.current !== null || weather.hourly.length > 0)
    && weather.freshness.observedAt !== null
    && weather.freshness.ageMinutes !== null
    && weather.freshness.ageMinutes <= CACHED_WEATHER_MAX_PERSIST_AGE_MINUTES;
}

async function evaluateForRequest(context: RouteContext, request: Request): Promise<EnvironmentResponse> {
  const location = await resolveLocation(context, request);
  const environment = await getEnvironment(
    location.coordinates,
    { acquisitionMethod: location.method, locationName: location.locationName },
    context.providers,
  );
  if (!location.locationId || !location.ownerHash || !hasPersistableWeather(environment)) return environment;

  const candidates = environment.weather.status === 'CACHED'
    ? []
    : deriveAlerts(environment, location.locationId);
  const persistedEnvironment: EnvironmentResponse = {
    ...environment,
    risk: { ...environment.risk, persisted: true },
    currentAlerts: [],
  };
  await context.repository.appendAssessment(location.ownerHash, location.locationId, persistedEnvironment);
  await context.repository.persistAlerts(location.ownerHash, location.locationId, candidates);
  const storedAlerts = (await context.repository.listAlerts(location.ownerHash, 100))
    .filter((alert) => alert.locationId === location.locationId);
  return {
    ...persistedEnvironment,
    currentAlerts: storedAlerts,
  };
}

export function environmentRouter(context: RouteContext): Router {
  const router = Router();
  const weatherLimit = rateLimit(context.repository, { key: 'provider-weather', windowMs: 5 * 60_000, limit: 60 });
  const airLimit = rateLimit(context.repository, { key: 'provider-air-quality', windowMs: 5 * 60_000, limit: 60 });
  const geocodeLimit = rateLimit(context.repository, { key: 'provider-reverse-geocode', windowMs: 60 * 60_000, limit: 30 });

  router.get('/location', geocodeLimit, async (request, response) => {
    const coordinates = parseCoordinates(request);
    const slot = await context.repository.claimProviderSlot('nominatim.reverse', 1000);
    if (!slot.allowed) {
      response.setHeader('Retry-After', String(slot.retryAfterSeconds));
      throw new ApiError(429, 'GEOCODER_RATE_LIMITED', 'Place-name lookup is globally limited to one upstream request per second.');
    }
    const result = await context.providers.reverseGeocode(coordinates);
    recordProviderState('nominatim', {
      status: result.status, observedAt: result.status === 'LIVE' || result.status === 'CACHED' ? result.fetchedAt : null,
      checkedAt: result.fetchedAt,
    });
    response.json(GeocodeResponseSchema.parse({ coordinates, ...result }));
  });

  const weatherHandler = async (request: Request, response: Response) => {
    const weather = await context.providers.weather(parseCoordinates(request));
    recordProviderState('open-meteo-weather', {
      status: weather.status, observedAt: weather.freshness.observedAt, checkedAt: weather.freshness.fetchedAt,
    });
    response.json(WeatherDataSchema.parse(weather));
  };
  router.get('/weather', weatherLimit, weatherHandler);
  router.get('/rainfall', weatherLimit, weatherHandler);
  router.get('/air-quality', airLimit, async (request, response) => {
    const air = await context.providers.airQuality(parseCoordinates(request));
    recordProviderState('open-meteo-air', {
      status: air.status, observedAt: air.freshness.observedAt, checkedAt: air.freshness.fetchedAt,
    });
    response.json(AirQualityDataSchema.parse(air));
  });

  router.get('/environment', weatherLimit, async (request, response) => {
    response.json(EnvironmentResponseSchema.parse(await evaluateForRequest(context, request)));
  });

  router.get('/risk', weatherLimit, async (request, response) => {
    const environment = await evaluateForRequest(context, request);
    response.json(RiskAssessmentSchema.parse(environment.risk));
  });

  router.get('/risk/explain', weatherLimit, async (request, response) => {
    const environment = await evaluateForRequest(context, request);
    response.json({
      model: environment.risk.model,
      risk: RiskAssessmentSchema.parse(environment.risk),
      inputs: {
        weather: {
          provider: environment.weather.provider,
          source: environment.weather.source,
          status: environment.weather.status,
          observedAt: environment.weather.freshness.observedAt,
          fetchedAt: environment.weather.freshness.fetchedAt,
        },
        airQuality: {
          provider: environment.airQuality.provider,
          source: environment.airQuality.source,
          status: environment.airQuality.status,
          observedAt: environment.airQuality.freshness.observedAt,
          fetchedAt: environment.airQuality.freshness.fetchedAt,
        },
      },
      disclaimer: 'Decision-support screening only. This is not a calibrated flood probability, hazard warning, or evacuation instruction. Follow official local emergency guidance.',
    });
  });
  return router;
}
