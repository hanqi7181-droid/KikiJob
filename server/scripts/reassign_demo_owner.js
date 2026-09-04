import '../env.js';
import { createPostgresRuntimeAdapter } from '../db/postgres.js';

const OWNER_EMAIL = normalizeEmail(process.env.DEMO_OWNER_EMAIL || '18741256546@163.com');
const FRESH_EMAIL = normalizeEmail(process.env.FRESH_TEST_EMAIL || 'hanqi7181@gmail.com');
const LEGACY_DEFAULT_USER_ID = Number(process.env.LEGACY_DEFAULT_USER_ID || 1);

const adapter = createPostgresRuntimeAdapter();
const db = adapter;

try {
  const summary = await reassignDemoOwner();
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await adapter.close();
}

async function reassignDemoOwner() {
  const owner = await ensureUser(OWNER_EMAIL);
  const fresh = await ensureUser(FRESH_EMAIL);
  const candidates = await findExplicitCandidateUsers(owner.id, fresh.id);
  const moved = [];

  for (const candidate of candidates) {
    console.log(`moving user_id=${candidate.id} -> owner_id=${owner.id}`);
    await moveOwnedData(candidate.id, owner.id);
    moved.push(maskUser(candidate));
  }

  console.log(`resetting fresh user_id=${fresh.id}`);
  await resetUserToBlank(fresh.id, FRESH_EMAIL);
  await resetDefaultFlags(owner.id);
  await resetDefaultFlags(fresh.id);
  await syncSequences();

  const ownerCounts = await countOwnedRows(owner.id);
  const freshCounts = await countOwnedRows(fresh.id);
  const ownerProfile = await loadProfileSummary(owner.id);
  const freshProfile = await loadProfileSummary(fresh.id);

  return {
    ok: true,
    owner: { email: maskEmail(OWNER_EMAIL), id: Number(owner.id), counts: ownerCounts, profile: ownerProfile },
    freshUser: { email: maskEmail(FRESH_EMAIL), id: Number(fresh.id), counts: freshCounts, profile: freshProfile },
    movedFrom: moved,
  };
}

async function ensureUser(email) {
  const existing = await db.query('SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
  if (existing.rows[0]) return existing.rows[0];

  const created = await db.query(
    `INSERT INTO users (name, email, identity, auth_provider, auth_subject)
     VALUES ($1, $2, '应届毕业生', 'local', $2)
     RETURNING id, email, name`,
    [email.split('@')[0], email]
  );
  return created.rows[0];
}

async function findExplicitCandidateUsers(ownerId, freshUserId) {
  const ids = [...new Set([LEGACY_DEFAULT_USER_ID, Number(freshUserId)].filter((id) => id && id !== Number(ownerId)))];
  if (!ids.length) return [];
  const result = await db.query(
    `SELECT id, email, name
     FROM users
     WHERE id = ANY($1::bigint[])
     ORDER BY id`,
    [ids]
  );
  return result.rows;
}

async function moveOwnedData(sourceUserId, targetUserId) {
  if (Number(sourceUserId) === Number(targetUserId)) return;

  const sourceProfile = await hasRow('user_profiles', sourceUserId);
  if (sourceProfile) {
    await db.query('DELETE FROM user_profiles WHERE user_id = $1', [targetUserId]);
    await db.query('UPDATE user_profiles SET user_id = $1 WHERE user_id = $2', [targetUserId, sourceUserId]);
  }

  const sourcePreference = await hasRow('job_preferences', sourceUserId);
  if (sourcePreference) {
    await db.query('DELETE FROM job_preferences WHERE user_id = $1', [targetUserId]);
    await db.query('UPDATE job_preferences SET user_id = $1 WHERE user_id = $2', [targetUserId, sourceUserId]);
  }

  const sourceMappings = await hasRow('form_mappings', sourceUserId);
  if (sourceMappings) {
    await db.query('DELETE FROM form_mappings WHERE user_id = $1', [targetUserId]);
    await db.query('UPDATE form_mappings SET user_id = $1 WHERE user_id = $2', [targetUserId, sourceUserId]);
  }

  await db.query('UPDATE resumes SET is_default = FALSE WHERE user_id = $1', [targetUserId]);
  await db.query('UPDATE resumes SET user_id = $1, is_default = FALSE WHERE user_id = $2', [targetUserId, sourceUserId]);
  await db.query('UPDATE resume_analyses SET user_id = $1 WHERE user_id = $2', [targetUserId, sourceUserId]);
  await db.query('UPDATE job_matches SET user_id = $1 WHERE user_id = $2', [targetUserId, sourceUserId]);

  await db.query(
    `INSERT INTO applications (
       user_id, job_id, status, resume_id, source_url, submitted_at, applied_at, follow_up_at,
       next_action, notes, submission_result, autofill_session_id, updated_source, created_at, updated_at, deleted_at
     )
     SELECT $1, job_id, status, resume_id, source_url, submitted_at, applied_at, follow_up_at,
       next_action, notes, submission_result, autofill_session_id, updated_source, created_at, updated_at, deleted_at
     FROM applications
     WHERE user_id = $2
     ON CONFLICT(user_id, job_id) DO UPDATE SET
       status = EXCLUDED.status,
       resume_id = COALESCE(EXCLUDED.resume_id, applications.resume_id),
       notes = COALESCE(EXCLUDED.notes, applications.notes),
       follow_up_at = COALESCE(EXCLUDED.follow_up_at, applications.follow_up_at),
       next_action = COALESCE(EXCLUDED.next_action, applications.next_action),
       submission_result = COALESCE(EXCLUDED.submission_result, applications.submission_result),
       autofill_session_id = COALESCE(EXCLUDED.autofill_session_id, applications.autofill_session_id),
       updated_source = COALESCE(EXCLUDED.updated_source, applications.updated_source),
       deleted_at = EXCLUDED.deleted_at,
       updated_at = NOW()`,
    [targetUserId, sourceUserId]
  );
  await db.query('DELETE FROM applications WHERE user_id = $1', [sourceUserId]);

  await db.query(
    `INSERT INTO saved_jobs (user_id, job_id, notes, created_at, updated_at, deleted_at)
     SELECT $1, job_id, notes, created_at, updated_at, deleted_at
     FROM saved_jobs
     WHERE user_id = $2
     ON CONFLICT(user_id, job_id) DO UPDATE SET
       notes = COALESCE(EXCLUDED.notes, saved_jobs.notes),
       deleted_at = EXCLUDED.deleted_at,
       updated_at = NOW()`,
    [targetUserId, sourceUserId]
  );
  await db.query('DELETE FROM saved_jobs WHERE user_id = $1', [sourceUserId]);
}

async function resetUserToBlank(userId, email) {
  await db.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM job_preferences WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM form_mappings WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM applications WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM saved_jobs WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM job_matches WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM resume_analyses WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM resumes WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
  await db.query(
    `UPDATE users
     SET name = $1, identity = '应届毕业生', auth_provider = 'local', auth_subject = $2
     WHERE id = $3`,
    [email.split('@')[0], email, userId]
  );
  await db.query(
    `INSERT INTO user_profiles (user_id, email, profile_json)
     VALUES ($1, $2, $3::jsonb)`,
    [userId, email, stringifyJson(buildEmptyProfile(email))]
  );
  await db.query(
    `INSERT INTO job_preferences (user_id, preference_json)
     VALUES ($1, $2::jsonb)`,
    [userId, stringifyJson(buildEmptyProfile(email))]
  );
}

async function resetDefaultFlags(userId) {
  await db.query('UPDATE resumes SET is_default = FALSE WHERE user_id = $1', [userId]);
  await db.query(
    `UPDATE resumes
     SET is_default = TRUE
     WHERE id = (
       SELECT id FROM resumes WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1
     )`,
    [userId]
  );
}

async function hasRow(tableName, userId) {
  const result = await db.query(`SELECT 1 FROM ${tableName} WHERE user_id = $1 LIMIT 1`, [userId]);
  return Boolean(result.rows[0]);
}

async function countOwnedRows(userId) {
  const tables = [
    'user_profiles',
    'job_preferences',
    'resumes',
    'applications',
    'saved_jobs',
    'job_matches',
    'resume_analyses',
    'form_mappings',
    'auth_sessions',
  ];
  const counts = {};
  for (const table of tables) {
    const result = await db.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE user_id = $1`, [userId]);
    counts[table] = Number(result.rows[0]?.count || 0);
  }
  return counts;
}

async function loadProfileSummary(userId) {
  const result = await db.query(
    `SELECT profile_json FROM user_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  const profile = result.rows[0]?.profile_json || {};
  return {
    resumeName: profile.resumeName || '',
    name: profile.name || '',
    roles: profile.roles || '',
    cities: Array.isArray(profile.cities) ? profile.cities : [],
    goals: Array.isArray(profile.goals) ? profile.goals : [],
  };
}

async function syncSequences() {
  const tables = [
    'users',
    'user_profiles',
    'job_preferences',
    'resumes',
    'saved_jobs',
    'applications',
    'job_matches',
    'resume_analyses',
    'form_mappings',
    'user_events',
  ];
  for (const table of tables) {
    await db.query(
      `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
      [table]
    ).catch(() => {});
  }
}

function buildEmptyProfile(email = '') {
  return {
    resumeName: '',
    identity: '应届毕业生',
    name: '',
    email,
    phone: '',
    goals: [],
    roles: '',
    cities: [],
    salaryIntern: '',
    salaryGraduate: '',
    industries: [],
    accounts: [],
    companyTypes: [],
    allowTailor: true,
    education: [],
    experiences: [],
    projects: [],
    practice: [],
    skills: {},
  };
}

function stringifyJson(value) {
  return JSON.stringify(value ?? null);
}

function maskUser(user) {
  return {
    id: Number(user.id),
    email: maskEmail(user.email || ''),
  };
}

function maskEmail(email) {
  const clean = normalizeEmail(email);
  if (!clean || !clean.includes('@')) return clean;
  const [name, domain] = clean.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
