import '../env.js';
import { createPostgresRuntimeAdapter } from '../db/postgres.js';

const adapter = createPostgresRuntimeAdapter();

try {
  const health = await adapter.healthCheck();
  console.log(JSON.stringify(health, null, 2));
} finally {
  await adapter.close();
}
