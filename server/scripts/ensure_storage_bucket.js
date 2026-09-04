import '../env.js';
import { ensureSupabaseStorageBucket } from '../storage.js';

const result = await ensureSupabaseStorageBucket();
console.log(JSON.stringify({ ok: true, ...result }, null, 2));
