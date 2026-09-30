import { z } from 'zod';
import type { AirQualityData, Coordinates, DataStatus, WeatherData } from '../../shared/contracts.js';
import { AIR_QUALITY_API, FORECAST_API, PROVIDER_TIMEOUT_MS } from '../config.js';

const NumberOrNull = z.number().finite().nullable().optional();
const WeatherResponseSchema = z.object({
  current: z.object({
    time: z.string().optional(),
    temperature_2m: NumberOrNull,
    precipitation: NumberOrNull,
    rain: NumberOrNull,
    relative_humidity_2m: NumberOrNull,
    wind_speed_10m: NumberOrNull,
    wind_gusts_10m: NumberOrNull,
    surface_pressure: NumberOrNull,
    weather_code: z.number().int().nullable().optional(),
    is_day: z.number().int().nullable().optional(),
  }).optional(),
  current_units: z.record(z.string(), z.string()).optional(),
  hourly: z.object({
    time: z.array(z.string()).optional(),
    precipitation: z.array(NumberOrNull).optional(),
    rain: z.array(NumberOrNull).optional(),
    precipitation_probability: z.array(NumberOrNull).optional(),
    weather_code: z.array(z.number().int().nullable().optional()).optional(),
  }).optional(),
  hourly_units: z.record(z.string(), z.string()).optional(),
}).passthrough();

const AirQualityResponseSchema = z.object({
  current: z.object({
    time: z.string().optional(),
    pm2_5: NumberOrNull,
    pm10: NumberOrNull,
    ozone: NumberOrNull,
    us_aqi: NumberOrNull,
  }).optional(),
  current_units: z.record(z.string(), z.string()).optional(),
}).passthrough();

function providerTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
    ? trimmed
    : `${trimmed}${/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? ':00' : ''}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validNonnegative(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0 ? value : null;
}

function validRange(value: number | null | undefined, min: number, max: number): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function freshness(observedAt: string | null, now: Date, liveMinutes: number, recentMinutes: number) {
  if (!observedAt) return { status: 'UNAVAILABLE' as const, ageMinutes: null, observedAt, fetchedAt: now.toISOString() };
  const ageMinutes = Math.max(0, (now.getTime() - Date.parse(observedAt)) / 60_000);
  const status: DataStatus = ageMinutes <= liveMinutes ? 'LIVE' : ageMinutes <= recentMinutes ? 'RECENT' : 'STALE';
  return { status, ageMinutes, observedAt, fetchedAt: now.toISOString() };
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
  return response.json() as Promise<unknown>;
}

function providerUrl(endpoint: string, coordinates: Coordinates): URL {
  const url = new URL(endpoint);
  url.searchParams.set('latitude', coordinates.latitude.toString());
  url.searchParams.set('longitude', coordinates.longitude.toString());
  url.searchParams.set('timezone', 'GMT');
  return url;
}

export const OPEN_METEO_WEATHER_SOURCE = 'https://open-meteo.com/en/docs';
export const OPEN_METEO_AIR_SOURCE = 'https://open-meteo.com/en/docs/air-quality-api';

function safeErrorStatus(error: unknown): 'UNAVAILABLE' | 'ERROR' {
  const code = error instanceof Error ? error.message : '';
  return code.startsWith('PROVIDER_HTTP_') ? 'UNAVAILABLE' : 'ERROR';
}

export async function getWeather(coordinates: Coordinates, now = new Date()): Promise<WeatherData> {
  const source = new URL(FORECAST_API);
  source.search = '';
  const unavailable = (status: 'UNAVAILABLE' | 'ERROR', message: string): WeatherData => ({
    provider: 'Open-Meteo Forecast', source: source.toString(), status,
    freshness: { status, ageMinutes: null, observedAt: null, fetchedAt: now.toISOString() },
    units: {}, current: null, hourly: [], error: message,
  });
  try {
    const url = providerUrl(FORECAST_API, coordinates);
    url.searchParams.set('current', [
      'temperature_2m', 'relative_humidity_2m', 'precipitation', 'rain', 'weather_code',
      'is_day', 'surface_pressure', 'wind_speed_10m', 'wind_gusts_10m',
    ].join(','));
    url.searchParams.set('hourly', 'precipitation,rain,precipitation_probability,weather_code');
    url.searchParams.set('forecast_days', '3');
    const parsed = WeatherResponseSchema.safeParse(await fetchJson(url));
    if (!parsed.success) return unavailable('ERROR', 'The weather provider returned an unsupported response.');
    const raw = parsed.data;
    const current = raw.current;
    const observedAt = providerTimestamp(current?.time);
    const fresh = freshness(observedAt, now, 180, 720);
    const times = raw.hourly?.time ?? [];
    const hourly = times.map((value, index) => {
      const time = providerTimestamp(value);
      if (!time) return null;
      return {
        time,
        precipitationMm: validNonnegative(raw.hourly?.precipitation?.[index]),
        rainMm: validNonnegative(raw.hourly?.rain?.[index]),
        precipitationProbabilityPercent: validRange(raw.hourly?.precipitation_probability?.[index], 0, 100),
        weatherCode: raw.hourly?.weather_code?.[index] ?? null,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    return {
      provider: 'Open-Meteo Forecast', source: source.toString(), status: fresh.status,
      freshness: fresh,
      units: { ...(raw.current_units ?? {}), ...(raw.hourly_units ?? {}) },
      current: current ? {
        temperatureC: current.temperature_2m ?? null,
        precipitationMm: validNonnegative(current.precipitation),
        rainMm: validNonnegative(current.rain),
        humidityPercent: validRange(current.relative_humidity_2m, 0, 100),
        windSpeedKmh: validNonnegative(current.wind_speed_10m),
        windGustKmh: validNonnegative(current.wind_gusts_10m),
        pressureHpa: current.surface_pressure && current.surface_pressure > 0 ? current.surface_pressure : null,
        weatherCode: current.weather_code ?? null,
        isDay: current.is_day === undefined || current.is_day === null ? null : current.is_day === 1,
      } : null,
      hourly,
      error: null,
    };
  } catch (error) {
    return unavailable(safeErrorStatus(error), 'The weather provider is temporarily unavailable.');
  }
}

export async function getAirQuality(coordinates: Coordinates, now = new Date()): Promise<AirQualityData> {
  const source = new URL(AIR_QUALITY_API);
  source.search = '';
  const unavailable = (status: 'UNAVAILABLE' | 'ERROR', message: string): AirQualityData => ({
    provider: 'Open-Meteo Air Quality', source: source.toString(), status,
    freshness: { status, ageMinutes: null, observedAt: null, fetchedAt: now.toISOString() },
    units: {}, current: null, error: message,
  });
  try {
    const url = providerUrl(AIR_QUALITY_API, coordinates);
    url.searchParams.set('current', 'pm2_5,pm10,ozone,us_aqi');
    const parsed = AirQualityResponseSchema.safeParse(await fetchJson(url));
    if (!parsed.success) return unavailable('ERROR', 'The air-quality provider returned an unsupported response.');
    const raw = parsed.data;
    const current = raw.current;
    const observedAt = providerTimestamp(current?.time);
    const fresh = freshness(observedAt, now, 360, 1440);
    return {
      provider: 'Open-Meteo Air Quality', source: source.toString(), status: fresh.status,
      freshness: fresh, units: raw.current_units ?? {},
      current: current ? {
        pm25: validNonnegative(current.pm2_5), pm10: validNonnegative(current.pm10),
        ozone: validNonnegative(current.ozone), usAqi: validNonnegative(current.us_aqi),
      } : null,
      error: null,
    };
  } catch (error) {
    return unavailable(safeErrorStatus(error), 'The air-quality provider is temporarily unavailable.');
  }
}
