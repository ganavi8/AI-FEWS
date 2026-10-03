import { getWeather, getAirQuality } from '../providers/open-meteo.js';
import { getOfficialWarningProviders } from '../providers/official/index.js';
import { officialAlertToAlert } from '../providers/official/adapter.js';
import { deriveAlerts } from '../alerts/engine.js';
import { getEnvironment } from './environment.js';
import { deliverAlertPush } from './notification-delivery.js';
import type { Repository } from './types.js';

export const DEFAULT_MONITOR_INTERVAL_MS = 5 * 60 * 1000;

export function getMonitorIntervalMs(): number {
  const raw = Number.parseInt(process.env.AIFEWS_MONITOR_INTERVAL_MS ?? '', 10);
  if (!Number.isFinite(raw) || raw < 60_000) return DEFAULT_MONITOR_INTERVAL_MS;
  return raw;
}

function rainfall6h(environment: Awaited<ReturnType<typeof getEnvironment>>): number {
  const now = Date.parse(environment.fetchedAt);
  return environment.weather.hourly.filter((hour) => {
    const time = Date.parse(hour.time);
    return Number.isFinite(time) && time >= now && time < now + 6 * 60 * 60 * 1000;
  }).reduce((sum, hour) => sum + (hour.precipitationMm ?? 0), 0);
}

function maxProbability(environment: Awaited<ReturnType<typeof getEnvironment>>): number {
  const now = Date.parse(environment.fetchedAt);
  return environment.weather.hourly.filter((hour) => {
    const time = Date.parse(hour.time);
    return Number.isFinite(time) && time >= now && time < now + 6 * 60 * 60 * 1000;
  }).reduce((max, hour) => Math.max(max, hour.precipitationProbabilityPercent ?? 0), 0);
}

export class MonitoringService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private cycleInProgress = false;
  private readonly intervalMs: number;

  constructor(
    private readonly repository: Repository,
    private readonly providers = { weather: getWeather, airQuality: getAirQuality },
  ) {
    this.intervalMs = getMonitorIntervalMs();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      void this.runCycle();
    }, this.intervalMs);
  }

  async runCycle(): Promise<void> {
    if (!this.running || this.cycleInProgress) return;
    this.cycleInProgress = true;
    try {
      console.info(JSON.stringify({ event: 'monitor_cycle_started', intervalMs: this.intervalMs }));
      const locations = await this.repository.listMonitorLocations(50);
      let evaluated = 0;
      let failed = 0;
      const concurrency = 5;
      for (let start = 0; start < locations.length; start += concurrency) {
        const batch = locations.slice(start, start + concurrency);
        const results = await Promise.all(batch.map(async (location) => {
        try {
          const previous = await this.repository.getLatestAssessment(location.ownerHash, location.id);
          const environment = await getEnvironment(
            { latitude: location.latitude, longitude: location.longitude },
            { acquisitionMethod: 'saved', locationName: location.name },
            this.providers,
          );

          const previousRainfall = previous ? rainfall6h(previous) : null;
          const previousProbability = previous ? maxProbability(previous) : null;
          const [previousHeavyRainAlert, previousHighRiskAlert, previousEnvironmentalAlert] = await Promise.all([
            this.repository.getLatestActiveAlert(location.ownerHash, location.id, 'HEAVY_RAIN'),
            this.repository.getLatestActiveAlert(location.ownerHash, location.id, 'HIGH_RISK'),
            this.repository.getLatestActiveAlert(location.ownerHash, location.id, 'ENVIRONMENTAL'),
          ]);

          const alerts = deriveAlerts(environment, location.id, {
            previousRiskLevel: previous?.risk.riskLevel ?? null,
            previousRainfall6h: previousRainfall,
            previousProbability,
            previousAlerts: {
              HEAVY_RAIN: previousHeavyRainAlert,
              HIGH_RISK: previousHighRiskAlert,
              ENVIRONMENTAL: previousEnvironmentalAlert,
            },
          });

          await this.repository.appendAssessment(location.ownerHash, location.id, environment);

          const officialAlerts: import('../../shared/contracts.js').Alert[] = [];

          for (const provider of getOfficialWarningProviders()) {
            try {
              const result = await provider.getWarnings(
                location.latitude,
                location.longitude,
              );

              console.info(JSON.stringify({
                event: 'official_provider_checked',
                provider: provider.name,
                locationId: location.id,
                status: result.status,
                alertCount: result.alerts.length,
              }));

              if (result.status !== 'OK') continue;

              for (const official of result.alerts) {
                if (official.status !== 'Actual' || official.scope !== 'Public') continue;

                const previousOfficial = await this.repository.getLatestOfficialAlert(
                  location.ownerHash,
                  location.id,
                  official.externalAlertId,
                );

                officialAlerts.push(
                  officialAlertToAlert(
                    official,
                    location.id,
                    location.name,
                    previousOfficial,
                  ),
                );
              }
            } catch (error) {
              console.error(JSON.stringify({
                event: 'official_provider_failed',
                provider: provider.name,
                locationId: location.id,
                code: error instanceof Error ? error.name : 'UNKNOWN',
              }));
            }
          }

          const allAlerts = [...alerts, ...officialAlerts];

          const persisted = allAlerts.length > 0
            ? await this.repository.persistAlerts(
                location.ownerHash,
                location.id,
                allAlerts,
              )
            : [];

          for (const alert of persisted) {
            try {
              await deliverAlertPush(this.repository, location.ownerHash, alert);
            } catch (error) {
              console.error(JSON.stringify({
                event: 'alert_push_delivery_failed',
                alertId: alert.id,
                locationId: location.id,
                code: error instanceof Error ? error.name : 'UNKNOWN',
              }));
            }
          }

          await this.repository.expireAlerts(location.ownerHash, location.id);
          console.info(JSON.stringify({
            event: 'monitor_location_evaluated',
            locationId: location.id,
            riskLevel: environment.risk.riskLevel,
            rainfall6h: Number(rainfall6h(environment).toFixed(2)),
            maxProbability: maxProbability(environment),
            alertCount: persisted.length,
          }));
          return true;
} catch (error) {
          console.error(JSON.stringify({
            event: 'monitor_location_failed',
            locationId: location.id,
            code: error instanceof Error ? error.name : 'UNKNOWN',
          }));
          return false;
        }
      }));
        evaluated += results.filter(Boolean).length;
        failed += results.filter((result) => !result).length;
      }

      console.info(JSON.stringify({
        event: 'monitor_cycle_completed',
        locationCount: locations.length,
        evaluated,
        failed,
      }));
    } catch (error) {
      console.error(JSON.stringify({
        event: 'monitor_cycle_failed',
        code: error instanceof Error ? error.name : 'UNKNOWN',
      }));
    } finally {
      this.cycleInProgress = false;
      if (this.running) this.schedule();
    }
  }
}








