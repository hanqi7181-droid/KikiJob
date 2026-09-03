import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const defaultDbDir = join(projectRoot, 'data');
const defaultDbPath = join(defaultDbDir, 'auto_cv.sqlite');

export function createSqliteDatabase(options = {}) {
  const dbPath = options.databasePath || process.env.SQLITE_DATABASE_PATH || defaultDbPath;
  mkdirSync(dirname(dbPath), { recursive: true });

  return {
    db: new DatabaseSync(dbPath),
    info: {
      provider: 'sqlite',
      dialect: 'sqlite',
      path: dbPath,
      persistent: true,
    },
  };
}
