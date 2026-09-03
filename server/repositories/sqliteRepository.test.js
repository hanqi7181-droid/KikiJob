import assert from 'node:assert/strict';
import test from 'node:test';
import { createSqliteRepository } from './sqliteRepository.js';

test('SQLite repository exposes the server persistence contract', () => {
  const repo = createSqliteRepository();
  const expectedMethods = [
    'addImportedJob',
    'addResume',
    'clearApplicationHistory',
    'clearProfileData',
    'createEmailSession',
    'createPasswordSession',
    'deleteFormMappings',
    'deleteImportedJob',
    'deleteResume',
    'ensureDefaultUser',
    'getApplicationMap',
    'getApplicationStatusMap',
    'getAuthProviders',
    'getDatabaseInfo',
    'getLatestResume',
    'getProfile',
    'getUserFromToken',
    'initDatabase',
    'listJobs',
    'listResumes',
    'requestEmailCode',
    'saveApplicationStatus',
    'saveFormMappings',
    'saveProfile',
    'setDefaultResume',
    'revokeSession',
    'syncStandardFormMappings',
  ];

  for (const method of expectedMethods) {
    assert.equal(typeof repo[method], 'function', `${method} should be exposed`);
  }
});

test('SQLite repository keeps the active database provider visible', () => {
  const repo = createSqliteRepository();
  const expectedProvider = ['postgres', 'postgresql', 'pg', 'supabase'].includes(
    String(process.env.DATABASE_PROVIDER || process.env.DB_DRIVER || 'sqlite').trim().toLowerCase(),
  )
    ? 'postgres'
    : 'sqlite';

  assert.equal(repo.getDatabaseInfo().provider, expectedProvider);
});
