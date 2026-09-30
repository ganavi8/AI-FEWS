import { getAirQuality, getWeather } from '../src/server/providers/open-meteo.js';
import { reverseGeocode } from '../src/server/providers/nominatim.js';
import {
  AirQualityDataSchema,
  WeatherDataSchema,
  type Coordinates,
} from '../src/shared/contracts.js';

interface Attempt {
  host: string;
  httpStatus: number | null;
  responseTimestamp: string;
}

const attempts: Attempt[] = [];
const originalFetch = globalThis.fetch;
const coordinates: Coordinates = { latitude: 51.5072, longitude: -0.1276 };
const location = 'London, UK (fixed public test location; not a device/user location)';
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function safeHost(input: RequestInfo | URL): string {
  try {
    return new URL(input instanceof Request ? input.url : String(input)).hostname;
  } catch {
    return 'unknown';
  }
}

function record(provider: string, host: string, httpStatus: number | null, resultStatus: string,
  observedAt: string | null, fetchedAt: string | null, parseValid: boolean): boolean {
  const validStatus = ['LIVE', 'RECENT', 'CACHED'].includes(resultStatus);
  const passed = httpStatus !== null && httpStatus >= 200 && httpStatus < 300 && parseValid && validStatus;
  console.log(JSON.stringify({
    provider,
    httpStatus: httpStatus ?? 'NO_HTTP_RESPONSE',
    responseTimestamp: [...attempts].reverse().find((attempt) => attempt.host === host)?.responseTimestamp ?? null,
    providerObservedAt: observedAt,
    dataFetchedAt: fetchedAt,
    dataFreshness: resultStatus,
    location,
    success: passed,
  }));
  return passed;
}

async function main(): Promise<void> {
  const callProvider = async <T>(provider: string, run: () => Promise<T>, valid: (value: T) => boolean,
    readStatus: (value: T) => string, readObserved: (value: T) => string | null, readFetched: (value: T) => string | null): Promise<boolean> => {
    const before = attempts.length;
    try {
      const response = await run();
      const recent = attempts.slice(before);
      const last = recent.at(-1);
      const normalized = last?.host ?? 'unknown';
      return record(provider, normalized, last?.httpStatus ?? null, readStatus(response), readObserved(response), readFetched(response), valid(response));
    } catch {
      const last = attempts.slice(before).at(-1);
      return record(provider, last?.host ?? 'unknown', last?.httpStatus ?? null, 'ERROR', null, null, false);
    }
  };

  globalThis.fetch = async (input, init) => {
    const host = safeHost(input);
    try {
      const response = await originalFetch(input, init);
      attempts.push({ host, httpStatus: response.status, responseTimestamp: new Date().toISOString() });
      return response;
    } catch (error) {
      attempts.push({ host, httpStatus: null, responseTimestamp: new Date().toISOString() });
      throw error;
    }
  };

  try {
    let passed = true;
    passed = await callProvider('Open-Meteo Forecast', () => getWeather(coordinates), (value) => {
      const parsed = WeatherDataSchema.safeParse(value);
      return parsed.success && value.current !== null;
    }, (value) => value.status, (value) => value.freshness.observedAt, (value) => value.freshness.fetchedAt) && passed;

    passed = await callProvider('Open-Meteo Air Quality', () => getAirQuality(coordinates), (value) => {
      const parsed = AirQualityDataSchema.safeParse(value);
      return parsed.success && value.current !== null;
    }, (value) => value.status, (value) => value.freshness.observedAt, (value) => value.freshness.fetchedAt) && passed;

    // Nominatim's public endpoint is constrained to at most one request per second.
    await wait(1100);
    passed = await callProvider('OpenStreetMap Nominatim', () => reverseGeocode(coordinates), (value) =>
      typeof value.provider === 'string' && typeof value.source === 'string' && value.displayName !== null,
    (value) => value.status, () => null, (value) => value.fetchedAt) && passed;

    if (!passed) process.exitCode = 1;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch(() => {
  console.error('Live provider verification failed unexpectedly; no URL query, location outside the fixed test point, or credentials were logged.');
  process.exitCode = 1;
});
