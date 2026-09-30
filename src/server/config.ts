const configuredUrl = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback;
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return fallback;
  }
};

export const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const DATABASE_DSN = process.env.DATABASE_URL ?? process.env.DRIZZLE_DATABASE_URL ?? '';
export const MODERATION_TOKEN = process.env.MODERATION_TOKEN ?? '';
export const SUPPORT_CONTACT = process.env.PUBLIC_SUPPORT_CONTACT?.trim() ?? '';
export const OPERATOR_LEGAL_NAME = process.env.PUBLIC_OPERATOR_NAME?.trim() ?? '';
export const OPERATOR_SERVICE_ADDRESS = process.env.PUBLIC_OPERATOR_ADDRESS?.trim() ?? '';
export const FORECAST_API = configuredUrl(process.env.OPEN_METEO_FORECAST_URL, 'https://api.open-meteo.com/v1/forecast');
export const AIR_QUALITY_API = configuredUrl(process.env.OPEN_METEO_AIR_QUALITY_URL, 'https://air-quality-api.open-meteo.com/v1/air-quality');
export const NOMINATIM_REVERSE_API = configuredUrl(process.env.NOMINATIM_REVERSE_URL, 'https://nominatim.openstreetmap.org/reverse');
export const API_BODY_LIMIT = '64kb';
export const PROVIDER_TIMEOUT_MS = 8000;
export const SNAPSHOT_RETENTION_DAYS = 90;
export const REPORT_RETENTION_DAYS = 90;
export const ALERT_ARCHIVE_DAYS = 30;

export function hasDatabaseConfiguration(): boolean {
  return Boolean(DATABASE_DSN);
}
