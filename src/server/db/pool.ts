import mysql, { type Pool } from 'mysql2/promise';
import { DATABASE_DSN } from '../config.js';

let sharedPool: Pool | undefined;

export class DatabaseNotConfiguredError extends Error {
  readonly code = 'DATABASE_NOT_CONFIGURED';

  constructor() {
    super('Managed database connection is not configured.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function getPool(): Pool {
  if (!DATABASE_DSN) throw new DatabaseNotConfiguredError();
  if (!sharedPool) {
    sharedPool = mysql.createPool(DATABASE_DSN);
  }
  return sharedPool;
}

export async function closePool(): Promise<void> {
  if (!sharedPool) return;
  const current = sharedPool;
  sharedPool = undefined;
  await current.end();
}

export async function checkDatabase(): Promise<boolean> {
  try {
    const [rows] = await getPool().query('SELECT 1 AS ok');
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}
