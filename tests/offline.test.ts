// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityReport, EnvironmentResponse } from '../src/shared/contracts.js';

const mocks = vi.hoisted(() => ({ syncReports: vi.fn() }));
vi.mock('../src/client/services/api.js', () => ({ api: { syncReports: mocks.syncReports } }));

import {
  clearLocalData, deleteDatabaseForTests, latestEnvironmentSnapshot, listLocalReports,
  queueReport, saveEnvironmentSnapshot, syncQueuedReports,
} from '../src/client/services/offline.js';

const now = new Date().toISOString();
const environment: EnvironmentResponse = {
  coordinates: { latitude: 1, longitude: 2 }, locationName: null, acquisitionMethod: 'manual',
  status: 'LIVE', fetchedAt: now,
  weather: {
    provider: 'Open-Meteo Forecast', source: 'https://api.open-meteo.com/v1/forecast', status: 'LIVE',
    freshness: { status: 'LIVE', ageMinutes: 0, observedAt: now, fetchedAt: now }, units: { temperature_2m: '°C' },
    current: { temperatureC: 18, precipitationMm: 1, rainMm: 1, humidityPercent: 70, windSpeedKmh: 5, windGustKmh: 8, pressureHpa: 1013, weatherCode: 61, isDay: true },
    hourly: [], error: null,
  },
  airQuality: {
    provider: 'Open-Meteo Air Quality', source: 'https://air-quality-api.open-meteo.com/v1/air-quality', status: 'LIVE',
    freshness: { status: 'LIVE', ageMinutes: 0, observedAt: now, fetchedAt: now }, units: { pm2_5: 'µg/m³' },
    current: { pm25: 5, pm10: 8, ozone: 40, usAqi: 22 }, error: null,
  },
  risk: {
    id: 'screen-test', model: 'RuleBasedHeuristic-v1.0', riskLevel: 'UNKNOWN', score: null,
    probability: null, confidence: null, uncertainty: null, explanation: 'Insufficient environmental data.',
    factors: [], dataQuality: 'test', evaluatedAt: now, persisted: false,
  }, currentAlerts: [],
};

beforeEach(async () => {
  await deleteDatabaseForTests();
  mocks.syncReports.mockReset();
  localStorage.clear();
});
afterEach(async () => { await deleteDatabaseForTests(); });

describe('offline-first persistence', () => {
  it('stores and reloads a snapshot as CACHED with its source observation time intact', async () => {
    await saveEnvironmentSnapshot(environment);
    const restored = await latestEnvironmentSnapshot(1, 2);
    expect(restored?.status).toBe('CACHED');
    expect(restored?.weather.status).toBe('CACHED');
    expect(restored?.weather.freshness.observedAt).toBe(now);
    expect(restored?.risk.persisted).toBe(false);
    expect(restored?.currentAlerts).toEqual([]);
  });

  it('keeps stable report IDs pending while offline and marks SYNCED only after the API returns the record', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const clientId = 'd8f41ef7-7814-4790-a8fa-799ac42b7a5b';
    const queued = await queueReport({
      clientId, category: 'FLOODING', description: 'Water covers lower crossing',
      latitude: 1, longitude: 2, createdAt: now,
    });
    expect(queued.status).toBe('PENDING SYNC');
    await syncQueuedReports();
    expect(mocks.syncReports).not.toHaveBeenCalled();
    expect((await listLocalReports())[0]?.status).toBe('PENDING SYNC');

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const serverReport: CommunityReport = {
      id: 'server-report-1', clientId, category: 'FLOODING', description: 'Water covers lower crossing',
      latitude: 1, longitude: 2, status: 'COMMUNITY GENERATED', syncStatus: 'SYNCED',
      moderationStatus: 'PENDING_REVIEW', createdAt: now, updatedAt: now,
    };
    mocks.syncReports.mockResolvedValueOnce({ results: [{ clientId, syncStatus: 'SYNCED', report: serverReport }], synced: 1, failed: 0 });
    const completed = await syncQueuedReports(true);
    expect(mocks.syncReports).toHaveBeenCalledOnce();
    expect(mocks.syncReports.mock.calls[0]?.[0][0]?.clientId).toBe(clientId);
    expect(completed[0]?.status).toBe('SYNCED');
    expect(completed[0]?.serverReport?.clientId).toBe(clientId);
  });

  it('clears all device-local snapshots, queued reports, preparedness and preferences without touching server data', async () => {
    await saveEnvironmentSnapshot(environment);
    await queueReport({ clientId: '7f2ffabf-9786-4d71-9956-6a2b249a9d88', category: 'OTHER', description: 'A field observation', latitude: 1, longitude: 2, createdAt: now });
    localStorage.setItem('aifews.pref.notificationsEnabled', 'true');
    localStorage.setItem('aifews.apiBase', 'https://api.example.test');
    await clearLocalData();
    expect(await latestEnvironmentSnapshot(1, 2)).toBeNull();
    expect(await listLocalReports()).toEqual([]);
    expect(localStorage.getItem('aifews.pref.notificationsEnabled')).toBeNull();
    expect(localStorage.getItem('aifews.apiBase')).toBeNull();
  });
});
