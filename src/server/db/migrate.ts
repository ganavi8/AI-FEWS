import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getPool } from './pool.js';

interface MigrationRow extends RowDataPacket {
  version: string;
}

const migrationsDirectory = resolve(process.cwd(), 'db/migrations');

export async function runMigrations(pool: Pool = getPool()): Promise<string[]> {
  const connection = await pool.getConnection();
  const appliedNow: string[] = [];
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(160) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
    const [appliedRows] = await connection.query<MigrationRow[]>('SELECT version FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.version));
    const files = (await readdir(migrationsDirectory))
      .filter((file) => /^\d{4}_[a-z0-9_-]+\.sql$/i.test(file))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const source = await readFile(resolve(migrationsDirectory, file), 'utf8');
      const statements = source.split(';').map((statement) => statement.trim()).filter(Boolean);
      for (const statement of statements) await connection.query(statement);
      await connection.execute(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP(3))',
        [file],
      );
      appliedNow.push(file);
    }
  } finally {
    connection.release();
  }
  return appliedNow;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(process.cwd(), 'src/server/db/migrate.ts')) {
  runMigrations()
    .then((files) => console.info(`Database migrations applied: ${files.length}`))
    .catch((error: unknown) => {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'MIGRATION_FAILED';
      console.error(`Database migration failed (${code}). No database values were logged.`);
      process.exitCode = 1;
    })
    .finally(async () => {
      const { closePool } = await import('./pool.js');
      await closePool();
    });
}
