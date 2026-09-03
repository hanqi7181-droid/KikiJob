import '../env.js';
import { createPostgresDatabase } from './postgres.js';
import { createSqliteDatabase } from './sqlite.js';

const provider = normalizeProvider(process.env.DATABASE_PROVIDER || process.env.DB_DRIVER || 'sqlite');
const adapter = provider === 'postgres' ? createPostgresDatabase() : createSqliteDatabase();

export const db = adapter.db;
export const databaseInfo = adapter.info;

export function getDatabaseInfo() {
  return databaseInfo;
}

function normalizeProvider(value) {
  const provider = String(value || '').trim().toLowerCase();
  if (['postgres', 'postgresql', 'pg', 'supabase'].includes(provider)) return 'postgres';
  return 'sqlite';
}
