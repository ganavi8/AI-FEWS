import { createApp } from './app.js';
import { hasDatabaseConfiguration, PORT } from './config.js';
import { ApiError } from './errors.js';
import { runMigrations } from './db/migrate.js';
import { MySqlRepository } from './db/repository.js';
import { closePool } from './db/pool.js';
import type { ReadinessState } from './routes/index.js';

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('PORT must be an integer from 1024 to 65535.');

const databaseConfigured = hasDatabaseConfiguration();
const repository = databaseConfigured ? new MySqlRepository() : undefined;
const readiness: ReadinessState = {
  databaseConfigured,
  databaseReady: false,
  migrationsReady: false,
};
let monitoringService: { start: () => void; stop: () => void } | undefined;
const app = await createApp({ repository, getReadiness: () => ({ ...readiness }) });
const server = app.listen(PORT, '0.0.0.0', () => {
  console.info(JSON.stringify({ event: 'http_listening', port: PORT }));
});

async function initializeDatabase(): Promise<void> {
  if (!repository) {
    console.error(JSON.stringify({ event: 'database_not_ready', code: 'DATABASE_NOT_CONFIGURED' }));
    return;
  }
  try {
    const applied = await runMigrations();
    readiness.migrationsReady = true;
    await repository.ping();
    readiness.databaseReady = true;
    if (repository && !monitoringService) {
      const { MonitoringService } = await import('./services/monitoring.js');
      monitoringService = new MonitoringService(repository);
      monitoringService.start();
    }
    console.info(JSON.stringify({ event: 'database_ready', migrationsApplied: applied.length }));
  } catch (error) {
    const code = error instanceof ApiError
      ? error.code
      : typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : 'MIGRATION_FAILED';
    console.error(JSON.stringify({ event: 'database_not_ready', code }));
  }
}
void initializeDatabase();

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(JSON.stringify({ event: 'shutdown', signal }));
  monitoringService?.stop();
  server.close(async () => {
    const vite = app.locals.vite as { close?: () => Promise<void> } | undefined;
    await vite?.close?.().catch(() => undefined);
    await closePool().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
