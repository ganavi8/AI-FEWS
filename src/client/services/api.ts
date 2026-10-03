import { Capacitor } from '@capacitor/core';
import { z } from 'zod';
import {
  AlertsResponseSchema, AirQualityDataSchema, CommunityReportSchema, CommunityReportsResponseSchema, DataQualityResponseSchema,
  EnvironmentResponseSchema, GeocodeResponseSchema, HealthResponseSchema, ModelsResponseSchema, NotificationPreferencesSchema,
  NotificationsResponseSchema, NotificationInstallationSchema, ProviderCatalogResponseSchema, ReportInputSchema, RiskAssessmentSchema,
  PublicConfigResponseSchema, RiskExplanationResponseSchema, SavedLocationInputSchema, SavedLocationResponseSchema,
  SavedLocationsResponseSchema, SimulationResponseSchema, SyncResponseSchema, TrendsResponseSchema,
  WeatherDataSchema,
  type NotificationInstallation, type NotificationPreferences, type ReportInput, type SavedLocationInput,
} from '../../shared/contracts.js';

const API_BASE_STORAGE_KEY = 'aifews.apiBase';
const OWNER_STORAGE_KEY = 'aifews.ownerKey.v1';
let transientOwnerKey: string | null = null;

export class ApiClientError extends Error {
  constructor(readonly code: string, message: string, readonly status: number | null = null) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

function createOwnerKey(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function getOwnerKey(): string {
  const storage = browserStorage();
  if (storage) {
    try {
      const previous = storage.getItem(OWNER_STORAGE_KEY);
      if (previous && /^[A-Fa-f0-9]{64}$/.test(previous)) return previous;
      const next = createOwnerKey();
      storage.setItem(OWNER_STORAGE_KEY, next);
      return next;
    } catch { /* fall through to per-session storage */ }
  }
  try {
    const session = window.sessionStorage;
    const previous = session.getItem(OWNER_STORAGE_KEY);
    if (previous && /^[A-Fa-f0-9]{64}$/.test(previous)) return previous;
    const next = createOwnerKey();
    session.setItem(OWNER_STORAGE_KEY, next);
    return next;
  } catch {
    transientOwnerKey ??= createOwnerKey();
    return transientOwnerKey;
  }
}

export function ownerKeyStorageLabel(): string {
  if (browserStorage()) return 'This browser/app installation';
  try { void window.sessionStorage; return 'This browser session only'; } catch { return 'This open session only'; }
}

export function isNativePlatform(): boolean { return isNative(); }

export function getApiBaseUrl(): string | null {
  if (!isNative()) return window.location.origin;
  let localValue: string | null = null;
  try { localValue = window.localStorage.getItem(API_BASE_STORAGE_KEY); } catch { /* a user can still provide a build-time base */ }
  const configured = localValue || import.meta.env.VITE_AIFEWS_API_BASE_URL?.trim() || '';
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function setApiBaseUrl(input: string): string {
  const value = input.trim();
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new ApiClientError('INVALID_API_BASE', 'Enter the full HTTPS origin for the AI·FEWS API.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new ApiClientError('INVALID_API_BASE', 'The native API base must be an HTTPS origin with no credentials, path, query, or fragment.');
  }
  try { window.localStorage.setItem(API_BASE_STORAGE_KEY, parsed.origin); }
  catch { throw new ApiClientError('LOCAL_STORAGE_UNAVAILABLE', 'The API URL could not be saved on this device.'); }
  return parsed.origin;
}

export function clearApiBaseUrl(): void {
  try { window.localStorage.removeItem(API_BASE_STORAGE_KEY); } catch { /* settings remain unavailable */ }
}

async function request<T>(method: string, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new ApiClientError('API_BASE_URL_REQUIRED', 'Set the published HTTPS API URL in Settings before connecting this Android app.');
  const url = new URL(path.replace(/^\//, ''), `${base}/`);
  const headers: Record<string, string> = { accept: 'application/json', 'x-aifews-owner': getOwnerKey() };
  if (body !== undefined) headers['content-type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(url, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiClientError('NETWORK_UNAVAILABLE', 'The AI·FEWS service could not be reached. Check your connection or API URL.');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload ? payload.error : null;
    if (error && typeof error === 'object' && 'code' in error && 'message' in error
      && typeof error.code === 'string' && typeof error.message === 'string') {
      throw new ApiClientError(error.code, error.message, response.status);
    }
    throw new ApiClientError('HTTP_ERROR', `The service returned HTTP ${response.status}.`, response.status);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiClientError('INVALID_SERVER_RESPONSE', 'The server response did not match the current shared data contract.', response.status);
  return parsed.data;
}

const get = <T>(path: string, schema: z.ZodType<T>) => request('GET', path, schema);
const post = <T>(path: string, body: unknown, schema: z.ZodType<T>) => request('POST', path, schema, body);
const put = <T>(path: string, body: unknown, schema: z.ZodType<T>) => request('PUT', path, schema, body);
const patch = <T>(path: string, body: unknown, schema: z.ZodType<T>) => request('PATCH', path, schema, body);
const qs = (values: Record<string, string | number>) => new URLSearchParams(values as Record<string, string>).toString();

export const api = {
  health: () => get('/api/health', HealthResponseSchema),
  weather: (latitude: number, longitude: number) => get(`/api/weather?${qs({ latitude, longitude })}`, WeatherDataSchema),
  airQuality: (latitude: number, longitude: number) => get(`/api/air-quality?${qs({ latitude, longitude })}`, AirQualityDataSchema),
  geocode: (latitude: number, longitude: number) => get(`/api/location?${qs({ latitude, longitude })}`, GeocodeResponseSchema),
  environment: (input: { latitude?: number; longitude?: number; locationId?: string; method?: 'browser' | 'android' | 'manual' }) => {
    const values: Record<string, string | number> = {};
    if (input.latitude !== undefined) values.latitude = input.latitude;
    if (input.longitude !== undefined) values.longitude = input.longitude;
    if (input.locationId) values.locationId = input.locationId;
    if (input.method) values.method = input.method;
    return get(`/api/environment?${qs(values)}`, EnvironmentResponseSchema);
  },
  risk: (latitude: number, longitude: number, method: 'browser' | 'android' | 'manual' = 'manual') =>
    get(`/api/risk?${qs({ latitude, longitude, method })}`, RiskAssessmentSchema),
  riskExplain: (latitude: number, longitude: number, method: 'browser' | 'android' | 'manual' = 'manual') =>
    get(`/api/risk/explain?${qs({ latitude, longitude, method })}`, RiskExplanationResponseSchema),
  savedLocations: () => get('/api/saved-locations', SavedLocationsResponseSchema),
  saveLocation: (input: SavedLocationInput) => post('/api/saved-locations', SavedLocationInputSchema.parse(input), SavedLocationResponseSchema),
  renameLocation: (id: string, name: string) => patch(`/api/saved-locations/${encodeURIComponent(id)}`, { name }, SavedLocationResponseSchema),
  deleteLocation: (id: string) => request('DELETE', `/api/saved-locations/${encodeURIComponent(id)}`, z.object({ id: z.string(), deleted: z.literal(true) })),
  alerts: () => get('/api/alerts', AlertsResponseSchema),
  notifications: () => get('/api/notifications', NotificationsResponseSchema),
  registerNotificationInstallation: (value: NotificationInstallation) =>
    post('/api/notifications/installations', NotificationInstallationSchema.parse(value), z.object({}).passthrough()),
  unregisterNotificationInstallation: (installationId: string) =>
    request("DELETE", "/api/notifications/installations/" + encodeURIComponent(installationId), z.object({}).passthrough()),
  setNotificationPreferences: (value: NotificationPreferences) => put('/api/notifications/preferences', NotificationPreferencesSchema.parse(value), z.object({ preferences: NotificationPreferencesSchema, delivery: z.enum(['IN_APP_ON_REFRESH', 'FCM_PUSH']), pushConfigured: z.boolean() })),
  communityReports: (latitude: number, longitude: number, radiusKm = 10) => get(`/api/community-reports?${qs({ latitude, longitude, radiusKm })}`, CommunityReportsResponseSchema),
  syncReports: (reports: ReportInput[]) => post('/api/sync', { reports }, SyncResponseSchema),
  submitReport: (report: ReportInput) => post('/api/community-reports', ReportInputSchema.parse(report), z.object({ report: CommunityReportSchema, message: z.string() })),
  trends: (locationId: string) => get(`/api/trends?${qs({ locationId })}`, TrendsResponseSchema),
  dataQuality: () => get('/api/data-quality', DataQualityResponseSchema),
  providers: () => get('/api/providers', ProviderCatalogResponseSchema),
  models: () => get('/api/models', ModelsResponseSchema),
  publicConfig: () => get('/api/public-config', PublicConfigResponseSchema),
  simulate: (scenario: string, latitude: number, longitude: number) =>
    get(`/api/simulation?${qs({ scenario, latitude, longitude })}`, SimulationResponseSchema),
};

export function validateLocalReport(value: unknown): ReportInput {
  const parsed = ReportInputSchema.safeParse(value);
  if (!parsed.success) throw new ApiClientError('INVALID_REPORT', 'Check the report category, description, coordinates and submission time.');
  return parsed.data;
}







