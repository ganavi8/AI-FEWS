import { z } from 'zod';

export const DataStatusSchema = z.enum([
  'LIVE', 'RECENT', 'STALE', 'CACHED', 'UNAVAILABLE', 'CONFIGURATION REQUIRED', 'ERROR',
]);
export type DataStatus = z.infer<typeof DataStatusSchema>;

export const RiskLevelSchema = z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'UNKNOWN']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const CoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict();
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export const CoordinateQuerySchema = z.object({
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
}).strict();

export const FreshnessSchema = z.object({
  status: DataStatusSchema,
  ageMinutes: z.number().finite().nonnegative().nullable(),
  observedAt: z.string().datetime({ offset: true }).nullable(),
  fetchedAt: z.string().datetime({ offset: true }),
});
export const WeatherCurrentSchema = z.object({
  temperatureC: z.number().finite().nullable(),
  precipitationMm: z.number().finite().nonnegative().nullable(),
  rainMm: z.number().finite().nonnegative().nullable(),
  humidityPercent: z.number().finite().min(0).max(100).nullable(),
  windSpeedKmh: z.number().finite().nonnegative().nullable(),
  windGustKmh: z.number().finite().nonnegative().nullable(),
  pressureHpa: z.number().finite().positive().nullable(),
  weatherCode: z.number().int().nullable(),
  isDay: z.boolean().nullable(),
});
export const ForecastHourSchema = z.object({
  time: z.string().datetime({ offset: true }),
  precipitationMm: z.number().finite().nonnegative().nullable(),
  rainMm: z.number().finite().nonnegative().nullable(),
  precipitationProbabilityPercent: z.number().finite().min(0).max(100).nullable(),
  weatherCode: z.number().int().nullable(),
});
export const WeatherDataSchema = z.object({
  provider: z.string(),
  source: z.string().url(),
  status: DataStatusSchema,
  freshness: FreshnessSchema,
  units: z.record(z.string(), z.string()),
  current: WeatherCurrentSchema.nullable(),
  hourly: z.array(ForecastHourSchema),
  error: z.string().nullable(),
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

export const AirQualityCurrentSchema = z.object({
  pm25: z.number().finite().nonnegative().nullable(),
  pm10: z.number().finite().nonnegative().nullable(),
  ozone: z.number().finite().nonnegative().nullable(),
  usAqi: z.number().finite().nonnegative().nullable(),
});
export const AirQualityDataSchema = z.object({
  provider: z.string(),
  source: z.string().url(),
  status: DataStatusSchema,
  freshness: FreshnessSchema,
  units: z.record(z.string(), z.string()),
  current: AirQualityCurrentSchema.nullable(),
  error: z.string().nullable(),
});
export type AirQualityData = z.infer<typeof AirQualityDataSchema>;

export const RiskFactorSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().finite().nullable(),
  unit: z.string().nullable(),
  contribution: z.number().finite().nullable(),
  explanation: z.string(),
  source: z.string().nullable(),
});
export const RiskAssessmentSchema = z.object({
  id: z.string(),
  model: z.literal('RuleBasedHeuristic-v1.0'),
  riskLevel: RiskLevelSchema,
  score: z.number().finite().min(0).max(100).nullable(),
  probability: z.number().finite().min(0).max(1).nullable(),
  confidence: z.number().finite().min(0).max(1).nullable(),
  uncertainty: z.number().finite().min(0).max(1).nullable(),
  explanation: z.string(),
  factors: z.array(RiskFactorSchema),
  dataQuality: z.string(),
  evaluatedAt: z.string().datetime({ offset: true }),
  persisted: z.boolean(),
});
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

export const AlertSeveritySchema = z.enum(['INFORMATION', 'WATCH', 'WARNING', 'HIGH']);
export const AlertSchema = z.object({
  id: z.string(),
  fingerprint: z.string(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  severity: AlertSeveritySchema,
  type: z.enum(['HEAVY_RAIN', 'HIGH_RISK', 'ENVIRONMENTAL']),
  reason: z.string(),
  source: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  dataQuality: z.string(),
  recommendedAction: z.string(),
  persisted: z.boolean(),
  status: DataStatusSchema.optional(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const EnvironmentResponseSchema = z.object({
  coordinates: CoordinatesSchema,
  locationName: z.string().nullable(),
  acquisitionMethod: z.enum(['browser', 'android', 'manual', 'saved']),
  status: DataStatusSchema,
  fetchedAt: z.string().datetime({ offset: true }),
  weather: WeatherDataSchema,
  airQuality: AirQualityDataSchema,
  risk: RiskAssessmentSchema,
  currentAlerts: z.array(AlertSchema),
});
export type EnvironmentResponse = z.infer<typeof EnvironmentResponseSchema>;

export const ReportCategorySchema = z.enum([
  'FLOODING', 'WATERLOGGING', 'HEAVY_RAIN', 'BLOCKED_DRAINAGE', 'ROAD_HAZARD', 'LANDSLIDE', 'OTHER',
]);
export type ReportCategory = z.infer<typeof ReportCategorySchema>;
export const SyncStatusSchema = z.enum(['PENDING SYNC', 'SYNCING', 'SYNCED', 'FAILED']);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export const ModerationStatusSchema = z.enum(['SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED']);
export const ReportInputSchema = z.object({
  clientId: z.string().uuid(),
  category: ReportCategorySchema,
  description: z.string().trim().min(3).max(500),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  createdAt: z.string().datetime({ offset: true }),
  status: z.enum(['COMMUNITY GENERATED', 'PENDING SYNC', 'SYNCING', 'SYNCED', 'FAILED']),
}).strict();
export type ReportInput = z.infer<typeof ReportInputSchema>;
export const CommunityReportSchema = z.object({
  id: z.string(),
  clientId: z.string().uuid(),
  category: ReportCategorySchema,
  description: z.string(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  status: z.literal('COMMUNITY GENERATED'),
  syncStatus: SyncStatusSchema,
  moderationStatus: ModerationStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type CommunityReport = z.infer<typeof CommunityReportSchema>;

export const SavedLocationInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict();
export type SavedLocationInput = z.infer<typeof SavedLocationInputSchema>;
export const SavedLocationSchema = SavedLocationInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type SavedLocation = z.infer<typeof SavedLocationSchema>;

export const DataQualityEntrySchema = z.object({
  provider: z.string(),
  source: z.string().nullable(),
  latestUpdate: z.string().datetime({ offset: true }).nullable(),
  freshness: DataStatusSchema,
  status: DataStatusSchema,
  coverage: z.string(),
  limitations: z.array(z.string()),
});
export type DataQualityEntry = z.infer<typeof DataQualityEntrySchema>;

export const TrendPointSchema = z.object({
  capturedAt: z.string().datetime({ offset: true }),
  temperatureC: z.number().finite().nullable(),
  precipitationMm: z.number().finite().nonnegative().nullable(),
  pm25: z.number().finite().nonnegative().nullable(),
  riskLevel: RiskLevelSchema,
  riskScore: z.number().finite().min(0).max(100).nullable(),
  source: z.string(),
});
export type TrendPoint = z.infer<typeof TrendPointSchema>;
export const NotificationPreferencesSchema = z.object({
  heavyRain: z.boolean(), highRisk: z.boolean(), environmental: z.boolean(), communitySystem: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export const SimulationScenarioSchema = z.enum([
  'NORMAL', 'HEAVY RAIN', 'EXTREME RAIN', 'DRAINAGE FAILURE', 'HIGH FLOOD RISK',
]);
export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;

export const ProviderSchema = z.object({
  id: z.string(), name: z.string(), category: z.string(), source: z.string().url().nullable(),
  status: DataStatusSchema, configured: z.boolean(), attribution: z.string(), limitations: z.array(z.string()),
});
export const GeocodeResponseSchema = z.object({
  coordinates: CoordinatesSchema, status: z.enum(['LIVE', 'CACHED', 'UNAVAILABLE', 'ERROR']), provider: z.string(),
  source: z.string().url(), fetchedAt: z.string().datetime({ offset: true }),
  displayName: z.string().nullable(), error: z.string().nullable(),
});
export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
});

export const SyncResultSchema = z.object({
  clientId: z.string().uuid().nullable(),
  syncStatus: z.enum(['SYNCED', 'FAILED']),
  report: CommunityReportSchema.optional(),
  message: z.string().optional(),
});
export const SyncResponseSchema = z.object({
  results: z.array(SyncResultSchema), synced: z.number().int().nonnegative(), failed: z.number().int().nonnegative(),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;
export const CommunityReportsResponseSchema = z.object({
  status: z.literal('LIVE'), reports: z.array(CommunityReportSchema), source: z.string(), disclaimer: z.string(),
});
export const SavedLocationsResponseSchema = z.object({ locations: z.array(SavedLocationSchema) });
export const SavedLocationResponseSchema = z.object({ location: SavedLocationSchema });
export const AlertsResponseSchema = z.object({ alerts: z.array(AlertSchema) });
export const NotificationsResponseSchema = z.object({
  alerts: z.array(AlertSchema), preferences: NotificationPreferencesSchema,
  delivery: z.literal('IN_APP_ON_REFRESH'), pushConfigured: z.boolean(),
});
export const TrendsResponseSchema = z.object({
  locationId: z.string().uuid(), points: z.array(TrendPointSchema), retentionDays: z.number().int(), source: z.string(), note: z.string(),
});
export const DataQualityResponseSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }), entries: z.array(DataQualityEntrySchema), limitations: z.array(z.string()),
});
export const ProviderCatalogResponseSchema = z.object({ providers: z.array(ProviderSchema) });
export const ModelsResponseSchema = z.object({ models: z.array(z.object({
  id: z.string(), kind: z.string(), status: z.enum(['LIVE', 'UNAVAILABLE', 'CONFIGURATION REQUIRED']),
  probabilityAvailable: z.boolean(), confidenceAvailable: z.boolean(), uncertaintyAvailable: z.boolean(),
  inputs: z.array(z.string()), outputLevels: z.array(z.string()), limitation: z.string(), source: z.string(),
})) });
export const PublicConfigResponseSchema = z.object({
  application: z.literal('AI·FEWS'),
  operatorConfigured: z.boolean(), operatorLegalName: z.string(), operatorServiceAddress: z.string(),
  supportConfigured: z.boolean(), supportContact: z.string(),
});
export const RiskExplanationResponseSchema = z.object({
  model: z.string(), risk: RiskAssessmentSchema,
  inputs: z.object({
    weather: z.object({ provider: z.string(), source: z.string().url(), status: DataStatusSchema, observedAt: z.string().datetime({ offset: true }).nullable(), fetchedAt: z.string().datetime({ offset: true }) }),
    airQuality: z.object({ provider: z.string(), source: z.string().url(), status: DataStatusSchema, observedAt: z.string().datetime({ offset: true }).nullable(), fetchedAt: z.string().datetime({ offset: true }) }),
  }),
  disclaimer: z.string(),
});
export type RiskExplanationResponse = z.infer<typeof RiskExplanationResponseSchema>;
export const SimulationResponseSchema = z.object({
  mode: z.literal('SIMULATION'), scenario: SimulationScenarioSchema, coordinates: CoordinatesSchema,
  generatedAt: z.string().datetime({ offset: true }), status: z.literal('SIMULATION'),
  simulatedRainfallMm: z.number().nonnegative(), simulatedProbabilityPercent: z.number().min(0).max(100),
  risk: RiskAssessmentSchema, disclaimer: z.string(),
});
export const HealthResponseSchema = z.object({
  service: z.string(), status: z.enum(['READY', 'NOT_READY']), checkedAt: z.string().datetime({ offset: true }),
  database: z.object({ configured: z.boolean(), ready: z.boolean() }), migrations: z.object({ ready: z.boolean() }),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
