import '../env.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPostgresRuntimeAdapter } from '../db/postgres.js';

const projectRoot = join(import.meta.dirname, '..', '..');
const exportDir = process.env.MIGRATION_EXPORT_DIR || join(projectRoot, 'migration-exports');
const explicitFile = process.env.MIGRATION_IMPORT_FILE || process.argv.find((arg) => arg.endsWith('.json'));
const importFile = explicitFile || findLatestExportFile(exportDir);
const payload = importFile && existsSync(importFile) ? JSON.parse(readFileSync(importFile, 'utf8')) : null;
const adapter = createPostgresRuntimeAdapter();

try {
  const actual = await readCounts(adapter);
  const expected = payload?.summary || null;
  const mismatches = expected ? compareCounts(expected, actual) : [];

  console.log(
    JSON.stringify(
      {
        ok: mismatches.length === 0,
        checkedAt: new Date().toISOString(),
        comparedWith: importFile || null,
        expected,
        actual,
        mismatches,
      },
      null,
      2
    )
  );

  if (mismatches.length) process.exitCode = 1;
} finally {
  await adapter.close();
}

async function readCounts(adapter) {
  const tables = [
    'users',
    'user_profiles',
    'job_preferences',
    'companies',
    'jobs',
    'resumes',
    'applications',
    'form_mappings',
    'job_matches',
  ];
  const counts = {};
  for (const tableName of tables) {
    const result = await adapter.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
    counts[tableName] = result.rows[0]?.count || 0;
  }
  return counts;
}

function compareCounts(expected, actual) {
  return Object.entries(expected)
    .filter(([tableName, count]) => Number(actual[tableName] || 0) < Number(count || 0))
    .map(([tableName, count]) => ({
      tableName,
      expectedAtLeast: Number(count || 0),
      actual: Number(actual[tableName] || 0),
    }));
}

function findLatestExportFile(directory) {
  if (!existsSync(directory)) return '';
  const files = readdirSync(directory)
    .filter((fileName) => /^sqlite-export-.*\.json$/.test(fileName))
    .sort();
  const latest = files.at(-1);
  return latest ? join(directory, latest) : '';
}
