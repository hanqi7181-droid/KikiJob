import '../env.js';
import { createPostgresRepository } from './postgresRepository.js';
import { createSqliteRepository } from './sqliteRepository.js';

const provider = normalizeProvider(process.env.DATABASE_PROVIDER || process.env.DB_DRIVER || 'sqlite');
const repository = provider === 'postgres' ? createPostgresRepository() : createSqliteRepository();

export function getRepository() {
  return repository;
}

function normalizeProvider(value) {
  const provider = String(value || '').trim().toLowerCase();
  if (['postgres', 'postgresql', 'pg', 'supabase'].includes(provider)) return 'postgres';
  return 'sqlite';
}
