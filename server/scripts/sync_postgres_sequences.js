import '../env.js';
import { pathToFileURL } from 'node:url';
import { createPostgresRuntimeAdapter } from '../db/postgres.js';

const identityTables = [
  'users',
  'user_profiles',
  'job_preferences',
  'resumes',
  'companies',
  'saved_jobs',
  'jobs',
  'applications',
  'job_matches',
  'resume_analyses',
  'form_mappings',
  'user_events',
];

if (isCliEntry()) {
  const adapter = createPostgresRuntimeAdapter();

  try {
    const results = [];
    for (const tableName of identityTables) {
      results.push(await syncIdentitySequence(adapter, tableName, 'id'));
    }

    console.log(JSON.stringify({ ok: true, sequences: results }, null, 2));
  } finally {
    await adapter.close();
  }
}

export async function syncIdentitySequence(adapter, tableName, columnName = 'id') {
  assertSafeIdentifier(tableName);
  assertSafeIdentifier(columnName);

  const sequenceResult = await adapter.query('SELECT pg_get_serial_sequence($1, $2) AS sequence_name', [
    tableName,
    columnName,
  ]);
  const sequenceName = sequenceResult.rows[0]?.sequence_name;
  if (!sequenceName) {
    return { table: tableName, column: columnName, skipped: true, reason: 'no_sequence' };
  }

  const maxResult = await adapter.query(`SELECT COALESCE(MAX(${quoteIdentifier(columnName)}), 0)::bigint AS max_id FROM ${quoteIdentifier(tableName)}`);
  const maxId = Number(maxResult.rows[0]?.max_id || 0);
  await adapter.query('SELECT setval($1::regclass, $2, $3)', [sequenceName, Math.max(maxId, 1), maxId > 0]);

  return {
    table: tableName,
    column: columnName,
    sequence: sequenceName,
    nextIdAfter: maxId > 0 ? maxId + 1 : 1,
  };
}

function assertSafeIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(String(value || ''))) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
}

function quoteIdentifier(value) {
  assertSafeIdentifier(value);
  return `"${value}"`;
}

function isCliEntry() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
