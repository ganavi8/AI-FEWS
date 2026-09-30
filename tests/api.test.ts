import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.js';
import { clearEnvironmentMemoryCache } from '../src/server/services/environment.js';
import { CommunityReportSchema, HealthResponseSchema, ModelsResponseSchema, ProviderCatalogResponseSchema, PublicConfigResponseSchema, WeatherDataSchema } from '../src/shared/contracts.js';
import type { Coordinates, SavedLocation, WeatherData } from '../src/shared/contracts.js';
import type { ProviderAdapters, Repository } from '../src/server/services/types.js';

const generatedAt = new Date().toISOString();
const sampleWeather: WeatherData = {
  provider: 'Open-Meteo Forecast', source: 'https://api.open-meteo.com/v1/forecast', status: 'LIVE',
  freshness: { status: 'LIVE', ageMinutes: 0, observedAt: generatedAt, fetchedAt: generatedAt },
  units: { temperature_2m: '°C', precipitation: 'mm' },
  current: {
    temperatureC: 14, precipitationMm: 0, rainMm: 0, humidityPercent: 65,
    windSpeedKmh: 9, windGustKmh: 13, pressureHpa: 1013, weatherCode: 2, isDay: true,
  }, hourly: [], error: null,
};
const reportRows = new Map<string, ReturnType<typeof CommunityReportSchema.parse>>();
const repository = {
  ping: async () => undefined,
  consumeRateLimit: async () => ({ allowed: true, retryAfterSeconds: 0, remaining: 20 }),
  claimProviderSlot: async () => ({ allowed: true, retryAfterSeconds: 0, remaining: 0 }),
  appendAssessment: async () => undefined,
  persistAlerts: async () => [],
  listTrends: async () => [],
  listAlerts: async () => [],
  listCommunityReports: async () => [],
  createCommunityReport: async (input: Parameters<Repository['createCommunityReport']>[0]) => {
    const existing = reportRows.get(input.clientId);
    if (existing) return existing;
    const report = CommunityReportSchema.parse({
      id: randomUUID(), clientId: input.clientId, category: input.category, description: input.description,
      latitude: input.latitude, longitude: input.longitude, status: 'COMMUNITY GENERATED',
      syncStatus: 'SYNCED', moderationStatus: 'PENDING_REVIEW',
      createdAt: input.createdAt, updatedAt: new Date().toISOString(),
    });
    reportRows.set(report.clientId, report);
    return report;
  },
  updateModeration: async () => null,
  listSavedLocations: async () => [],
  addSavedLocation: async () => { throw new Error('Not used in API contract tests.'); },
  renameSavedLocation: async () => null,
  deleteSavedLocation: async () => false,
  getNotificationPreferences: async () => ({ heavyRain: false, highRisk: false, environmental: false, communitySystem: false }),
  setNotificationPreferences: async (_ownerHash: string, preferences: Parameters<Repository['setNotificationPreferences']>[1]) => preferences,
} as unknown as Repository;
const providers: ProviderAdapters = {
  weather: async (_coordinates: Coordinates) => sampleWeather,
  airQuality: async () => ({
    provider: 'Open-Meteo Air Quality', source: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    status: 'UNAVAILABLE', freshness: { status: 'UNAVAILABLE', ageMinutes: null, observedAt: null, fetchedAt: generatedAt },
    units: {}, current: null, error: 'No observation in test fixture.',
  }),
  reverseGeocode: async (coordinates: Coordinates) => ({
    status: 'UNAVAILABLE', provider: 'OpenStreetMap Nominatim', source: 'https://nominatim.openstreetmap.org/reverse',
    fetchedAt: new Date().toISOString(), displayName: null, error: 'No lookup in test fixture.',
  }),
};
let app: Awaited<ReturnType<typeof createApp>>;

describe('AI·FEWS API integration', () => {
  beforeAll(async () => {
    reportRows.clear();
    app = await createApp({
      repository, providers, moderationToken: '', supportContact: '', operatorLegalName: '', operatorServiceAddress: '',
      getReadiness: () => ({ databaseConfigured: true, databaseReady: false, migrationsReady: false }),
      production: true,
    });
  });

  it('returns safe no-store readiness and never calls an unavailable database ready', async () => {
    const response = await request(app).get('/api/health').expect(503);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(HealthResponseSchema.parse(response.body).status).toBe('NOT_READY');
    expect(response.body.database.ready).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain(process.env.DATABASE_URL ?? 'definitely-not-a-secret');
  });

  it('validates only explicitly public operator/configuration fields and excludes moderator credentials', async () => {
    const response = await request(app).get('/api/public-config').expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(PublicConfigResponseSchema.parse(response.body)).toMatchObject({
      application: 'AI·FEWS', operatorConfigured: false,
      operatorLegalName: 'NOT CONFIGURED', operatorServiceAddress: 'NOT CONFIGURED',
      supportConfigured: false, supportContact: 'NOT CONFIGURED',
    });
    expect(response.body).not.toHaveProperty('moderationToken');
  });

  it('does not present incomplete placeholders as genuine public operator details', async () => {
    const filteredApp = await createApp({
      repository, providers, moderationToken: '', supportContact: 'not-a-contact',
      operatorLegalName: '456', operatorServiceAddress: '123',
      getReadiness: () => ({ databaseConfigured: true, databaseReady: false, migrationsReady: false }), production: true,
    });
    const response = await request(filteredApp).get('/api/public-config').expect(200);
    expect(response.body).toMatchObject({
      operatorConfigured: false, operatorLegalName: 'NOT CONFIGURED',
      operatorServiceAddress: 'NOT CONFIGURED', supportConfigured: false, supportContact: 'NOT CONFIGURED',
    });
  });

  it('preserves public contact fields that meet minimum name, postal-address and email formats', async () => {
    const validApp = await createApp({
      repository, providers, moderationToken: '',
      operatorLegalName: 'Harbor Research Cooperative',
      operatorServiceAddress: '18 Coast Route, North Bay, AB 12345',
      supportContact: 'support@harbor-research.org',
      getReadiness: () => ({ databaseConfigured: true, databaseReady: false, migrationsReady: false }), production: true,
    });
    const response = await request(validApp).get('/api/public-config').expect(200);
    expect(response.body).toMatchObject({
      operatorConfigured: true, operatorLegalName: 'Harbor Research Cooperative',
      operatorServiceAddress: '18 Coast Route, North Bay, AB 12345',
      supportConfigured: true, supportContact: 'support@harbor-research.org',
    });
  });

  it('keeps all alert categories disabled until an installation explicitly opts in', async () => {
    const response = await request(app).get('/api/notifications')
      .set('x-aifews-owner', 'test-installation-owner-key-0123456789abcdef').expect(200);
    expect(response.body.preferences).toEqual({
      heavyRain: false, highRisk: false, environmental: false, communitySystem: false,
    });
    expect(response.body).toMatchObject({ delivery: 'IN_APP_ON_REFRESH', pushConfigured: false });
  });

  it('persists a still-usable provider-cache observation only after its place is explicitly saved', async () => {
    clearEnvironmentMemoryCache();
    const saved: SavedLocation = {
      id: randomUUID(), name: 'Synthetic Saved Place', latitude: 43.1234, longitude: -72.4321,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const savedAssessments: Parameters<Repository['appendAssessment']>[2][] = [];
    const savedRepository = {
      ...repository,
      listSavedLocations: async () => [saved],
      appendAssessment: async (_ownerHash: string, _locationId: string, assessment: Parameters<Repository['appendAssessment']>[2]) => {
        savedAssessments.push(assessment);
      },
    } as unknown as Repository;
    const cachedApp = await createApp({
      repository: savedRepository, providers, moderationToken: '', supportContact: '', operatorLegalName: '', operatorServiceAddress: '',
      getReadiness: () => ({ databaseConfigured: true, databaseReady: false, migrationsReady: false }), production: true,
    });
    try {
      const unsaved = await request(cachedApp).get('/api/environment')
        .query({ latitude: saved.latitude, longitude: saved.longitude }).expect(200);
      expect(unsaved.body.status).not.toBe('CACHED');
      expect(savedAssessments).toHaveLength(0);

      const ownerKey = 'cache-hit-installation-key-0123456789abcdef';
      const cached = await request(cachedApp).get('/api/environment')
        .query({ locationId: saved.id }).set('x-aifews-owner', ownerKey).expect(200);
      expect(cached.body.status).toBe('CACHED');
      expect(cached.body).toMatchObject({ acquisitionMethod: 'saved', locationName: saved.name });
      expect(cached.body.weather.freshness.ageMinutes).toEqual(expect.any(Number));
      expect(savedAssessments).toHaveLength(1);
      expect(savedAssessments[0]).toMatchObject({
        status: 'CACHED', acquisitionMethod: 'saved', locationName: saved.name,
      });
      expect(savedAssessments[0]?.risk.persisted).toBe(true);
    } finally {
      clearEnvironmentMemoryCache();
    }
  });

  it('validates coordinates at the API boundary and protects external map attribution headers', async () => {
    const invalid = await request(app).get('/api/weather?latitude=91&longitude=0').expect(400);
    expect(invalid.body.error.code).toBe('INVALID_COORDINATES');
    const response = await request(app).get('/api/weather?latitude=0&longitude=0').expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(WeatherDataSchema.parse(response.body).provider).toBe('Open-Meteo Forecast');
  });

  it('exposes only honest model/provider metadata and no fabricated hazard records', async () => {
    const models = ModelsResponseSchema.parse((await request(app).get('/api/models').expect(200)).body);
    expect(models.models[0]?.probabilityAvailable).toBe(false);
    expect(models.models[0]?.outputLevels).toContain('VERY_HIGH');
    const providers = ProviderCatalogResponseSchema.parse((await request(app).get('/api/providers').expect(200)).body);
    expect(providers.providers.some((provider) => provider.id === 'satellite' && provider.status === 'CONFIGURATION REQUIRED')).toBe(true);
    const satellite = await request(app).get('/api/satellite?latitude=0&longitude=0').expect(200);
    expect(satellite.body).toMatchObject({ status: 'CONFIGURATION REQUIRED', data: null, provider: null });
    expect(satellite.body.limitations.join(' ')).toContain('No placeholder or simulated observation');
  });

  it('accepts a community report once, preserves its client ID through offline sync retries, and rejects unconfigured moderation', async () => {
    const input = {
      clientId: randomUUID(), category: 'FLOODING', description: 'Observed water across road',
      latitude: 10, longitude: 20, createdAt: new Date().toISOString(), status: 'PENDING SYNC',
    };
    const submitted = await request(app).post('/api/community-reports').send(input).expect(201);
    const first = CommunityReportSchema.parse(submitted.body.report);
    expect(first.moderationStatus).toBe('PENDING_REVIEW');

    const sync = await request(app).post('/api/sync').send({ reports: [input] }).expect(200);
    expect(sync.body.synced).toBe(1);
    expect(sync.body.results[0].report.id).toBe(first.id);
    expect(reportRows.size).toBe(1);

    const invalid = await request(app).post('/api/community-reports').send({ ...input, clientId: randomUUID(), latitude: 91 }).expect(400);
    expect(invalid.body.error.code).toBe('INVALID_COMMUNITY_REPORT');
    const moderation = await request(app).patch(`/api/community-reports/${first.id}/moderation`).send({ status: 'VERIFIED' }).expect(503);
    expect(moderation.body.error.code).toBe('MODERATION_NOT_CONFIGURED');
  });

  it('permits the intended local Capacitor origin but rejects arbitrary cross-origin browser access', async () => {
    const allowed = await request(app).options('/api/health').set('Origin', 'capacitor://localhost').expect(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('capacitor://localhost');
    await request(app).options('/api/health').set('Origin', 'https://untrusted.example').expect(403);
  });
});
