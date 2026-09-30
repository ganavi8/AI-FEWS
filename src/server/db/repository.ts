import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  Alert, CommunityReport, EnvironmentResponse, NotificationPreferences, ReportInput,
  SavedLocation, SavedLocationInput, TrendPoint,
} from '../../shared/contracts.js';
import { ALERT_ARCHIVE_DAYS, REPORT_RETENTION_DAYS, SNAPSHOT_RETENTION_DAYS } from '../config.js';
import type { RateLimitDecision, Repository } from '../services/types.js';
import { getPool } from './pool.js';

interface SavedRow extends RowDataPacket { id: string; name: string; latitude: number | string; longitude: number | string; created_at: Date | string; updated_at: Date | string }
interface ReportRow extends RowDataPacket { id: string; client_id: string; category: string; description: string; latitude: number | string; longitude: number | string; moderation_status: string; created_at: Date | string; updated_at: Date | string }
interface AlertRow extends RowDataPacket { id: string; fingerprint: string; location_id: string; location_name: string; severity: Alert['severity']; event_type: Alert['type']; reason: string; source: string; data_quality: string; recommended_action: string; created_at: Date | string; expires_at: Date | string }
interface TrendRow extends RowDataPacket { captured_at: Date | string; payload: string | Record<string, unknown>; provider: string }
interface CountRow extends RowDataPacket { hit_count: number }
interface ThrottleRow extends RowDataPacket { last_requested_at: string | null }

function iso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const raw = String(value);
  const parsed = new Date(raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Stored timestamp is invalid.');
  return parsed.toISOString();
}

function numeric(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function reportFromRow(row: ReportRow): CommunityReport {
  return {
    id: row.id,
    clientId: row.client_id,
    category: row.category as CommunityReport['category'],
    description: row.description,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: 'COMMUNITY GENERATED',
    syncStatus: 'SYNCED',
    moderationStatus: row.moderation_status as CommunityReport['moderationStatus'],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function savedFromRow(row: SavedRow): SavedLocation {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function alertFromRow(row: AlertRow): Alert {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    locationId: row.location_id,
    locationName: row.location_name,
    severity: row.severity,
    type: row.event_type,
    reason: row.reason,
    source: row.source,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    dataQuality: row.data_quality,
    recommendedAction: row.recommended_action,
    persisted: true,
  };
}

const EMPTY_PREFERENCES: NotificationPreferences = {
  heavyRain: false,
  highRisk: false,
  environmental: false,
  communitySystem: false,
};

export class MySqlRepository implements Repository {
  constructor(private readonly pool: Pool = getPool()) {}

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1 AS ok');
    const [rows] = await this.pool.query<RowDataPacket[]>("SELECT version FROM schema_migrations LIMIT 1");
    void rows;
  }

  async consumeRateLimit(clientKey: string, rule: string, windowMs: number, limit: number): Promise<RateLimitDecision> {
    const now = Date.now();
    const windowId = Math.floor(now / windowMs);
    await this.pool.execute(
      `INSERT INTO api_rate_limits (client_key, rule_key, window_id, hit_count, updated_at)
       VALUES (?, ?, ?, 1, UTC_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE
         hit_count = IF(window_id = VALUES(window_id), hit_count + 1, 1),
         window_id = VALUES(window_id), updated_at = UTC_TIMESTAMP(3)`,
      [clientKey, rule, windowId],
    );
    const [rows] = await this.pool.execute<CountRow[]>(
      'SELECT hit_count FROM api_rate_limits WHERE client_key = ? AND rule_key = ? LIMIT 1',
      [clientKey, rule],
    );
    const hits = rows[0]?.hit_count ?? limit + 1;
    return {
      allowed: hits <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil(((windowId + 1) * windowMs - now) / 1000)),
      remaining: Math.max(0, limit - hits),
    };
  }

  async claimProviderSlot(provider: string, minimumIntervalMs: number): Promise<RateLimitDecision> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        'INSERT IGNORE INTO provider_throttles (provider, last_requested_at) VALUES (?, NULL)',
        [provider],
      );
      const [rows] = await connection.execute<ThrottleRow[]>(
        "SELECT DATE_FORMAT(last_requested_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS last_requested_at FROM provider_throttles WHERE provider = ? FOR UPDATE",
        [provider],
      );
      const last = rows[0]?.last_requested_at ? Date.parse(rows[0].last_requested_at) : Number.NaN;
      const now = Date.now();
      const elapsed = Number.isFinite(last) ? now - last : minimumIntervalMs;
      const wait = Math.max(0, minimumIntervalMs - elapsed);
      if (wait > 0) {
        await connection.commit();
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(wait / 1000)), remaining: 0 };
      }
      await connection.execute(
        'UPDATE provider_throttles SET last_requested_at = UTC_TIMESTAMP(3) WHERE provider = ?',
        [provider],
      );
      await connection.commit();
      return { allowed: true, retryAfterSeconds: 0, remaining: 0 };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async appendAssessment(ownerHash: string, locationId: string, environment: EnvironmentResponse): Promise<void> {
    const connection = await this.pool.getConnection();
    const capturedAt = new Date(environment.fetchedAt);
    const observedAt = environment.weather.freshness.observedAt;
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT IGNORE INTO environment_snapshots (id, owner_hash, location_id, provider, observed_at, captured_at, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(), ownerHash, locationId, 'Open-Meteo', observedAt ? new Date(observedAt) : null,
          capturedAt, JSON.stringify(environment),
        ],
      );
      await connection.execute(
        `INSERT IGNORE INTO risk_snapshots (id, owner_hash, location_id, risk_level, risk_score, evaluated_at, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(), ownerHash, locationId, environment.risk.riskLevel, environment.risk.score,
          new Date(environment.risk.evaluatedAt), JSON.stringify(environment.risk),
        ],
      );
      await connection.execute(
        `DELETE FROM environment_snapshots
         WHERE owner_hash = ? AND location_id = ? AND captured_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY)`,
        [ownerHash, locationId, SNAPSHOT_RETENTION_DAYS],
      );
      await connection.execute(
        `DELETE FROM risk_snapshots
         WHERE owner_hash = ? AND location_id = ? AND evaluated_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY)`,
        [ownerHash, locationId, SNAPSHOT_RETENTION_DAYS],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async persistAlerts(ownerHash: string, locationId: string, alerts: Alert[]): Promise<Alert[]> {
    const inserted: Alert[] = [];
    for (const alert of alerts) {
      const [result] = await this.pool.execute<ResultSetHeader>(
        `INSERT IGNORE INTO alerts
          (id, fingerprint, owner_hash, location_id, severity, event_type, reason, source,
           data_quality, recommended_action, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alert.id, alert.fingerprint, ownerHash, locationId, alert.severity, alert.type,
          alert.reason, alert.source, alert.dataQuality, alert.recommendedAction,
          new Date(alert.createdAt), new Date(alert.expiresAt),
        ],
      );
      if (result.affectedRows === 1) inserted.push({ ...alert, persisted: true });
    }
    return inserted;
  }

  async listTrends(ownerHash: string, locationId: string, limit: number): Promise<TrendPoint[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 500)) : 500;
    const [rows] = await this.pool.execute<TrendRow[]>(
      `SELECT DATE_FORMAT(e.captured_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS captured_at,
              e.payload, e.provider
       FROM environment_snapshots e
       WHERE e.owner_hash = ? AND e.location_id = ?
         AND e.captured_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY)
       ORDER BY e.captured_at DESC LIMIT ${safeLimit}`,
      [ownerHash, locationId, SNAPSHOT_RETENTION_DAYS],
    );
    return rows.map((row) => {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) as Record<string, unknown> : row.payload;
      const weather = payload.weather as { current?: { temperatureC?: number | null; precipitationMm?: number | null } } | undefined;
      const air = payload.airQuality as { current?: { pm25?: number | null } } | undefined;
      const risk = payload.risk as { riskLevel?: TrendPoint['riskLevel']; score?: number | null } | undefined;
      return {
        capturedAt: iso(row.captured_at),
        temperatureC: weather?.current?.temperatureC ?? null,
        precipitationMm: weather?.current?.precipitationMm ?? null,
        pm25: air?.current?.pm25 ?? null,
        riskLevel: risk?.riskLevel ?? 'UNKNOWN',
        riskScore: numeric(risk?.score ?? null),
        source: row.provider,
      };
    });
  }

  async listAlerts(ownerHash: string, limit: number): Promise<Alert[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 100)) : 100;
    await this.pool.execute(
      `DELETE FROM alerts WHERE owner_hash = ? AND expires_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY)`,
      [ownerHash, ALERT_ARCHIVE_DAYS],
    );
    const [rows] = await this.pool.execute<AlertRow[]>(
      `SELECT a.id, a.fingerprint, a.location_id, s.name AS location_name,
              a.severity, a.event_type, a.reason, a.source, a.data_quality,
              a.recommended_action,
              DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,
              DATE_FORMAT(a.expires_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS expires_at
       FROM alerts a JOIN saved_locations s ON s.id = a.location_id
       WHERE a.owner_hash = ? AND a.expires_at > UTC_TIMESTAMP(3)
       ORDER BY a.created_at DESC LIMIT ${safeLimit}`,
      [ownerHash],
    );
    return rows.map(alertFromRow);
  }

  async listCommunityReports(latitude: number, longitude: number, radiusKm: number): Promise<CommunityReport[]> {
    await this.pool.execute(
      `DELETE FROM community_reports WHERE created_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY)`,
      [REPORT_RETENTION_DAYS],
    );
    const latDelta = radiusKm / 110.574;
    const cosLat = Math.max(0.01, Math.cos((latitude * Math.PI) / 180));
    const lonDelta = Math.min(180, radiusKm / (111.32 * cosLat));
    const [rows] = await this.pool.execute<ReportRow[]>(
      `SELECT id, client_id, category, description, latitude, longitude, moderation_status,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at
       FROM community_reports
       WHERE moderation_status = 'VERIFIED'
         AND status = 'COMMUNITY GENERATED'
         AND created_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY)
         AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
       ORDER BY created_at DESC LIMIT 250`,
      [REPORT_RETENTION_DAYS, Math.max(-90, latitude - latDelta), Math.min(90, latitude + latDelta),
        Math.max(-180, longitude - lonDelta), Math.min(180, longitude + lonDelta)],
    );
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const distanceKm = (lat: number, lon: number) => {
      const dLat = toRad(lat - latitude);
      const dLon = toRad(lon - longitude);
      const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(latitude)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
      return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    return rows.map(reportFromRow).filter((report) => distanceKm(report.latitude, report.longitude) <= radiusKm);
  }

  async createCommunityReport(input: ReportInput): Promise<CommunityReport> {
    const id = randomUUID();
    const now = new Date();
    const eventTime = new Date(input.createdAt);
    try {
      await this.pool.execute(
        `INSERT INTO community_reports
         (id, client_id, category, description, latitude, longitude, status, sync_status,
          moderation_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'COMMUNITY GENERATED', 'SYNCED', 'PENDING_REVIEW', ?, UTC_TIMESTAMP(3))`,
        [id, input.clientId, input.category, input.description, input.latitude, input.longitude, eventTime],
      );
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      if (code !== 'ER_DUP_ENTRY') throw error;
      const [existingRows] = await this.pool.execute<ReportRow[]>(
        `SELECT id, client_id, category, description, latitude, longitude, moderation_status,
                DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,
                DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at
         FROM community_reports WHERE client_id = ? LIMIT 1`,
        [input.clientId],
      );
      if (existingRows[0]) return reportFromRow(existingRows[0]);
      throw error;
    }
    return {
      id, clientId: input.clientId, category: input.category, description: input.description,
      latitude: input.latitude, longitude: input.longitude, status: 'COMMUNITY GENERATED',
      syncStatus: 'SYNCED', moderationStatus: 'PENDING_REVIEW',
      createdAt: eventTime.toISOString(), updatedAt: now.toISOString(),
    };
  }

  async updateModeration(reportId: string, status: 'VERIFIED' | 'REJECTED' | 'EXPIRED'): Promise<CommunityReport | null> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'UPDATE community_reports SET moderation_status = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?',
      [status, reportId],
    );
    if (result.affectedRows === 0) {
      const [rows] = await this.pool.execute<ReportRow[]>(
        `SELECT id, client_id, category, description, latitude, longitude, moderation_status,
                DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,
                DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at
         FROM community_reports WHERE id = ? LIMIT 1`, [reportId],
      );
      if (!rows[0]) return null;
    }
    const [rows] = await this.pool.execute<ReportRow[]>(
      `SELECT id, client_id, category, description, latitude, longitude, moderation_status,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at
       FROM community_reports WHERE id = ? LIMIT 1`, [reportId],
    );
    return rows[0] ? reportFromRow(rows[0]) : null;
  }

  async listSavedLocations(ownerHash: string): Promise<SavedLocation[]> {
    const [rows] = await this.pool.execute<SavedRow[]>(
      `SELECT id, name, latitude, longitude,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at
       FROM saved_locations WHERE owner_hash = ? ORDER BY created_at DESC`, [ownerHash],
    );
    return rows.map(savedFromRow);
  }

  async addSavedLocation(ownerHash: string, input: SavedLocationInput): Promise<SavedLocation> {
    const id = randomUUID();
    const now = new Date();
    await this.pool.execute(
      `INSERT INTO saved_locations (id, owner_hash, name, latitude, longitude, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [id, ownerHash, input.name, input.latitude, input.longitude],
    );
    return { id, ...input, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  }

  async renameSavedLocation(ownerHash: string, locationId: string, name: string): Promise<SavedLocation | null> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'UPDATE saved_locations SET name = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND owner_hash = ?',
      [name, locationId, ownerHash],
    );
    if (result.affectedRows === 0) {
      const [exists] = await this.pool.execute<SavedRow[]>(
        'SELECT id, name, latitude, longitude, created_at, updated_at FROM saved_locations WHERE id = ? AND owner_hash = ? LIMIT 1',
        [locationId, ownerHash],
      );
      if (!exists[0]) return null;
    }
    const [rows] = await this.pool.execute<SavedRow[]>(
      `SELECT id, name, latitude, longitude,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at
       FROM saved_locations WHERE id = ? AND owner_hash = ? LIMIT 1`,
      [locationId, ownerHash],
    );
    return rows[0] ? savedFromRow(rows[0]) : null;
  }

  async deleteSavedLocation(ownerHash: string, locationId: string): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'DELETE FROM saved_locations WHERE id = ? AND owner_hash = ?', [locationId, ownerHash],
    );
    return result.affectedRows > 0;
  }

  async getNotificationPreferences(ownerHash: string): Promise<NotificationPreferences> {
    const [rows] = await this.pool.execute<(RowDataPacket & { heavy_rain: number; high_risk: number; environmental: number; community_system: number })[]>(
      'SELECT heavy_rain, high_risk, environmental, community_system FROM notification_preferences WHERE owner_hash = ? LIMIT 1',
      [ownerHash],
    );
    const row = rows[0];
    if (!row) return { ...EMPTY_PREFERENCES };
    return {
      heavyRain: Boolean(row.heavy_rain), highRisk: Boolean(row.high_risk),
      environmental: Boolean(row.environmental), communitySystem: Boolean(row.community_system),
    };
  }

  async setNotificationPreferences(ownerHash: string, preferences: NotificationPreferences): Promise<NotificationPreferences> {
    await this.pool.execute(
      `INSERT INTO notification_preferences (owner_hash, heavy_rain, high_risk, environmental, community_system, updated_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE heavy_rain = VALUES(heavy_rain), high_risk = VALUES(high_risk),
        environmental = VALUES(environmental), community_system = VALUES(community_system), updated_at = UTC_TIMESTAMP(3)`,
      [ownerHash, Number(preferences.heavyRain), Number(preferences.highRisk), Number(preferences.environmental), Number(preferences.communitySystem)],
    );
    return preferences;
  }
}
