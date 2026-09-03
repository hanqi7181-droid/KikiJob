import '../env.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createPostgresRuntimeAdapter } from '../db/postgres.js';

const migrationsDir = join(import.meta.dirname, '..', 'db', 'migrations', 'postgres');
const dryRun = process.argv.includes('--dry-run');

if (!existsSync(migrationsDir)) {
  throw new Error(`PostgreSQL migrations directory not found: ${migrationsDir}`);
}

const adapter = createPostgresRuntimeAdapter();

try {
  await adapter.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrations = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .map((fileName) => ({
      version: basename(fileName, '.sql'),
      fileName,
      sql: readFileSync(join(migrationsDir, fileName), 'utf8'),
    }));

  const appliedRows = await adapter.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.rows.map((row) => row.version));
  const pending = migrations.filter((migration) => !applied.has(migration.version));

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          applied: [...applied].sort(),
          pending: pending.map((migration) => migration.version),
        },
        null,
        2
      )
    );
    process.exitCode = 0;
  } else {
    for (const migration of pending) {
      await adapter.query('BEGIN');
      try {
        await adapter.query(migration.sql);
        await adapter.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
        await adapter.query('COMMIT');
        console.log(`Applied ${migration.fileName}`);
      } catch (error) {
        await adapter.query('ROLLBACK');
        throw error;
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          appliedNow: pending.map((migration) => migration.version),
          message: pending.length ? 'PostgreSQL migrations applied.' : 'No pending PostgreSQL migrations.',
        },
        null,
        2
      )
    );
  }
} finally {
  await adapter.close();
}
