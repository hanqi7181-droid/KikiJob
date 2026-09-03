import { Pool } from 'pg';

export function createPostgresRuntimeAdapter(options = {}) {
  const connectionString = options.connectionString || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for the PostgreSQL runtime adapter.');
  }

  const pool = new Pool({
    connectionString,
    ssl: resolveSslConfig(options),
    max: Number(process.env.POSTGRES_POOL_MAX || options.max || 8),
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS || options.idleTimeoutMillis || 30000),
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT_MS || options.connectionTimeoutMillis || 10000),
  });

  return {
    pool,
    info: {
      provider: 'postgres',
      dialect: 'postgresql',
      persistent: true,
      ssl: Boolean(resolveSslConfig(options)),
      databaseUrlConfigured: true,
    },
    query: (text, params) => pool.query(text, params),
    healthCheck: () => healthCheck(pool),
    close: () => pool.end(),
  };
}

export function createPostgresDatabase() {
  const adapter = createPostgresRuntimeAdapter();
  return {
    ...adapter,
    db: unsupportedSyncDb,
  };
}

async function healthCheck(pool) {
  const startedAt = Date.now();
  const result = await pool.query('SELECT NOW() AS now, current_database() AS database_name, current_user AS user_name');
  const row = result.rows[0] || {};
  return {
    ok: true,
    provider: 'postgres',
    databaseName: row.database_name,
    userName: row.user_name,
    serverTime: row.now,
    latencyMs: Date.now() - startedAt,
  };
}

function resolveSslConfig(options) {
  const setting = String(process.env.POSTGRES_SSL || options.ssl || 'require').toLowerCase();
  if (setting === 'false' || setting === 'disable' || setting === '0') return false;
  return { rejectUnauthorized: String(process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED || 'false') === 'true' };
}

const unsupportedSyncDb = {
  exec() {
    throw new Error(
      'PostgreSQL runtime is available, but the synchronous business persistence layer has not been ported from SQLite yet.'
    );
  },
  prepare() {
    throw new Error(
      'PostgreSQL runtime is available, but the synchronous business persistence layer has not been ported from SQLite yet.'
    );
  },
};
