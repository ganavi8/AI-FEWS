import type {
  AirQualityData, Alert, CommunityReport, Coordinates, DataQualityEntry, EnvironmentResponse,
  NotificationPreferences, ReportInput, RiskAssessment, SavedLocation, SavedLocationInput,
  TrendPoint, WeatherData,
} from '../../shared/contracts.js';

export interface ReverseGeocodeResult {
  status: 'LIVE' | 'CACHED' | 'UNAVAILABLE' | 'ERROR';
  provider: string;
  source: string;
  fetchedAt: string;
  displayName: string | null;
  error: string | null;
}

export interface ProviderAdapters {
  weather(coordinates: Coordinates): Promise<WeatherData>;
  airQuality(coordinates: Coordinates): Promise<AirQualityData>;
  reverseGeocode(coordinates: Coordinates): Promise<ReverseGeocodeResult>;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export interface Repository {
  ping(): Promise<void>;
  consumeRateLimit(clientKey: string, rule: string, windowMs: number, limit: number): Promise<RateLimitDecision>;
  claimProviderSlot(provider: string, minimumIntervalMs: number): Promise<RateLimitDecision>;
  appendAssessment(ownerHash: string, locationId: string, environment: EnvironmentResponse): Promise<void>;
  persistAlerts(ownerHash: string, locationId: string, alerts: Alert[]): Promise<Alert[]>;
  listTrends(ownerHash: string, locationId: string, limit: number): Promise<TrendPoint[]>;
  listAlerts(ownerHash: string, limit: number): Promise<Alert[]>;
  listCommunityReports(latitude: number, longitude: number, radiusKm: number): Promise<CommunityReport[]>;
  createCommunityReport(input: ReportInput): Promise<CommunityReport>;
  updateModeration(reportId: string, status: 'VERIFIED' | 'REJECTED' | 'EXPIRED'): Promise<CommunityReport | null>;
  listSavedLocations(ownerHash: string): Promise<SavedLocation[]>;
  addSavedLocation(ownerHash: string, input: SavedLocationInput): Promise<SavedLocation>;
  renameSavedLocation(ownerHash: string, locationId: string, name: string): Promise<SavedLocation | null>;
  deleteSavedLocation(ownerHash: string, locationId: string): Promise<boolean>;
  getNotificationPreferences(ownerHash: string): Promise<NotificationPreferences>;
  setNotificationPreferences(ownerHash: string, preferences: NotificationPreferences): Promise<NotificationPreferences>;
}

export interface DataQualityResponse {
  generatedAt: string;
  entries: DataQualityEntry[];
  limitations: string[];
}

export interface SimulationResponse {
  mode: 'SIMULATION';
  scenario: string;
  coordinates: Coordinates;
  generatedAt: string;
  status: 'SIMULATION';
  simulatedRainfallMm: number;
  simulatedProbabilityPercent: number;
  risk: RiskAssessment;
  disclaimer: string;
}
