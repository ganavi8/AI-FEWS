import { createHash, randomBytes, randomUUID } from 'node:crypto';
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { Alert, EnvironmentResponse, NotificationPreferences, ReportInput } from '../src/shared/contracts.js';
import { DATABASE_DSN } from '../src/server/config.js';
import { runMigrations } from '../src/server/db/migrate.js';
import { closePool, getPool } from '../src/server/db/pool.js';
import { MySqlRepository } from '../src/server/db/repository.js';

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) return String(error.code);
  return 'DATABASE_CHECK_FAILED';
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  if (!DATABASE_DSN) {
    console.error('MySQL verification: NOT CONFIGURED (DATABASE_URL is absent).');
    process.exitCode = 2;
    return;
  }

  const pool = getPool();
  const independentPool = mysql.createPool(DATABASE_DSN);
  const repository = new MySqlRepository(pool);
  const independentRepository = new MySqlRepository(independentPool);
  const ownerHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  const runId = randomUUID();
  const reportClientId = randomUUID();
  let locationId: string | undefined;
  let preferenceInserted = false;
  let cleanupFailed = false;
  let currentPhase = 'migration/readiness';

  try {
    const appliedMigrations = await runMigrations(pool);
    await repository.ping();
    console.info(`MySQL readiness: PASS; additive migrations applied this run: ${appliedMigrations.length}.`);

    currentPhase = 'saved-location insert/reload';
    const location = await repository.addSavedLocation(ownerHash, {
      name: `Temporary DB verification ${runId.slice(0, 8)}`,
      latitude: 51.5072,
      longitude: -0.1276,
    });
    locationId = location.id;
    const savedAfterReconnect = await independentRepository.listSavedLocations(ownerHash);
    assert(savedAfterReconnect.some((item) => item.id === location.id), 'Saved location was not visible through an independent MySQL pool.');
    console.info('Saved-location persistence across independent MySQL pools: PASS.');

    currentPhase = 'assessment snapshot idempotency';
    const capturedAt = new Date().toISOString();
    const syntheticEnvironment: EnvironmentResponse = {
      coordinates: { latitude: location.latitude, longitude: location.longitude },
      locationName: location.name, acquisitionMethod: 'saved', status: 'CACHED', fetchedAt: capturedAt,
      weather: {
        provider: 'Open-Meteo Forecast', source: 'https://api.open-meteo.com/v1/forecast', status: 'CACHED',
        freshness: { status: 'CACHED', ageMinutes: 1, observedAt: capturedAt, fetchedAt: capturedAt },
        units: {}, current: null, hourly: [], error: 'Synthetic database verification fixture; not an environmental observation.',
      },
      airQuality: {
        provider: 'Open-Meteo Air Quality', source: 'https://air-quality-api.open-meteo.com/v1/air-quality', status: 'CACHED',
        freshness: { status: 'CACHED', ageMinutes: 1, observedAt: capturedAt, fetchedAt: capturedAt },
        units: {}, current: null, error: 'Synthetic database verification fixture; not an environmental observation.',
      },
      risk: {
        id: randomUUID(), model: 'RuleBasedHeuristic-v1.0', riskLevel: 'UNKNOWN', score: null,
        probability: null, confidence: null, uncertainty: null,
        explanation: 'Synthetic database verification fixture; no environmental assessment was performed.',
        factors: [], dataQuality: 'TEST_FIXTURE_NOT_ENVIRONMENTAL_DATA',
        evaluatedAt: capturedAt, persisted: false,
      },
      currentAlerts: [],
    };
    await repository.appendAssessment(ownerHash, location.id, syntheticEnvironment);
    await repository.appendAssessment(ownerHash, location.id, syntheticEnvironment);
    const [assessmentRows] = await pool.execute<(RowDataPacket & { environment_count: number | string; risk_count: number | string })[]>(
      `SELECT
        (SELECT COUNT(*) FROM environment_snapshots WHERE owner_hash = ? AND location_id = ?) AS environment_count,
        (SELECT COUNT(*) FROM risk_snapshots WHERE owner_hash = ? AND location_id = ?) AS risk_count`,
      [ownerHash, location.id, ownerHash, location.id],
    );
    assert(Number(assessmentRows[0]?.environment_count) === 1 && Number(assessmentRows[0]?.risk_count) === 1,
      'Repeating the same saved-place assessment inserted duplicate environment or risk snapshots.');
    console.info('Saved assessment snapshot idempotency across repeated calls: PASS (synthetic fixture).');

    const reportInput: ReportInput = {
      clientId: reportClientId,
      category: 'OTHER',
      description: 'Temporary database verification fixture; synthetic and immediately deleted.',
      latitude: 51.5072,
      longitude: -0.1276,
      createdAt: new Date().toISOString(),
      status: 'COMMUNITY GENERATED',
    };
    currentPhase = 'community-report insert/idempotency';
    const insertedReport = await repository.createCommunityReport(reportInput);
    const duplicateReport = await independentRepository.createCommunityReport(reportInput);
    const [reportCountRows] = await independentPool.execute<(import('mysql2/promise').RowDataPacket & { record_count: number | string })[]>(
      'SELECT COUNT(*) AS record_count FROM community_reports WHERE client_id = ?', [reportClientId],
    );
    assert(insertedReport.id === duplicateReport.id && Number(reportCountRows[0]?.record_count) === 1,
      'Community report deduplication did not return exactly one row across connections.');
    console.info('Community-report INSERT/SELECT idempotency across independent pools: PASS.');

    const createdAt = new Date();
    const verificationAlert: Alert = {
      id: randomUUID(),
      fingerprint: randomUUID(),
      locationId: location.id,
      locationName: location.name,
      severity: 'INFORMATION',
      type: 'ENVIRONMENTAL',
      reason: 'Temporary verification fixture. This is not a real environmental alert.',
      source: 'Temporary MySQL persistence check',
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
      dataQuality: 'TEST_FIXTURE_NOT_ENVIRONMENTAL_DATA',
      recommendedAction: 'No action. The temporary test record is removed after verification.',
      persisted: false,
    };
    currentPhase = 'alert insert';
    const insertedAlerts = await repository.persistAlerts(ownerHash, location.id, [verificationAlert]);
    currentPhase = 'alert independent reload';
    const alertsAfterReconnect = await independentRepository.listAlerts(ownerHash, 10);
    assert(insertedAlerts.some((item) => item.id === verificationAlert.id && item.persisted)
      && alertsAfterReconnect.some((item) => item.id === verificationAlert.id && item.persisted),
    'The alert fixture was not reloaded as persisted through the independent connection pool.');
    console.info('Saved-location alert persistence: PASS (temporary fixture, not environmental evidence).');

    currentPhase = 'notification default opt-in';
    const defaultPreferences = await repository.getNotificationPreferences(ownerHash);
    assert(Object.values(defaultPreferences).every((enabled) => enabled === false),
      'At least one notification category is enabled before this installation explicitly opts in.');
    console.info('Notification categories disabled by default: PASS.');

    currentPhase = 'notification preference insert/reload';
    const preferences: NotificationPreferences = {
      heavyRain: false, highRisk: true, environmental: true, communitySystem: false,
    };
    await repository.setNotificationPreferences(ownerHash, preferences);
    preferenceInserted = true;
    const preferencesAfterReconnect = await independentRepository.getNotificationPreferences(ownerHash);
    assert(JSON.stringify(preferencesAfterReconnect) === JSON.stringify(preferences), 'Notification preference fields changed between MySQL connections.');
    console.info('Per-installation notification preference persistence: PASS.');
  } catch (error) {
    console.error(`MySQL verification phase ${currentPhase}: FAIL (${errorCode(error)}). No SQL values or credentials were logged.`);
    throw error;
  } finally {
    try {
      const [deletedReports] = await pool.execute<ResultSetHeader>(
        'DELETE FROM community_reports WHERE client_id = ?', [reportClientId],
      );
      if (deletedReports.affectedRows > 1) throw new Error('Duplicate temporary report rows detected.');
      if (preferenceInserted) await pool.execute('DELETE FROM notification_preferences WHERE owner_hash = ?', [ownerHash]);
      if (locationId) {
        const removed = await repository.deleteSavedLocation(ownerHash, locationId);
        if (!removed) throw new Error('The temporary verification location was not deleted.');
      }
    } catch (error) {
      cleanupFailed = true;
      console.error(`TEMPORARY-DATA CLEANUP FAILED (${errorCode(error)}); check isolated verification run ${runId}. No DSN or credentials were printed.`);
    } finally {
      await independentPool.end();
      await closePool();
    }
    if (cleanupFailed) throw new Error('Temporary verification data could not be confirmed removed.');
    console.info('Temporary report, saved place, alert and notification preference records: CLEANED UP.');
  }
}

main().catch((error: unknown) => {
  console.error(`MySQL verification: FAIL (${errorCode(error)}). No database URL, credentials, report content, or server-side records were logged.`);
  process.exitCode = 1;
});
