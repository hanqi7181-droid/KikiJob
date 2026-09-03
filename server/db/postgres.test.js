import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresRuntimeAdapter } from './postgres.js';

test('PostgreSQL runtime adapter requires DATABASE_URL', () => {
  const previousUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    assert.throws(() => createPostgresRuntimeAdapter(), /DATABASE_URL is required/);
  } finally {
    if (previousUrl) process.env.DATABASE_URL = previousUrl;
  }
});

test('PostgreSQL runtime adapter can be created without opening a connection immediately', async () => {
  const adapter = createPostgresRuntimeAdapter({
    connectionString: 'postgres://user:password@localhost:5432/kikijob',
    ssl: 'disable',
  });

  assert.equal(adapter.info.provider, 'postgres');
  assert.equal(adapter.info.dialect, 'postgresql');
  assert.equal(adapter.info.ssl, false);
  await adapter.close();
});
