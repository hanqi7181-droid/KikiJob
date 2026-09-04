import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { buildStandardFormMappings } from '../../src/data/standardFormMappings.js';
import { createPostgresRuntimeAdapter } from '../db/postgres.js';
import { sendVerificationEmail } from '../email.js';

export function createPostgresRepository(options = {}) {
  const runtime = options.runtime || createPostgresRuntimeAdapter(options);

  return {
    addImportedJob: (job) => addImportedJob(runtime, job),
    addResume: (userId = 1, fileName, rawText = null, parsedProfile = null, metadata = {}) =>
      addResume(runtime, userId, fileName, rawText, parsedProfile, metadata),
    clearApplicationHistory: (userId = 1) => clearApplicationHistory(runtime, userId),
    clearProfileData: (userId = 1) => clearProfileData(runtime, userId),
    createEmailSession: (email, code) => createEmailSession(runtime, email, code),
    createPasswordSession: (account, password) => createPasswordSession(runtime, account, password),
    createSmsSession: unsupportedMutation('createSmsSession'),
    deleteFormMappings: (userId = 1) => deleteFormMappings(runtime, userId),
    deleteImportedJob: (jobId) => deleteImportedJob(runtime, jobId),
    deleteResume: (userId = 1, resumeId) => deleteResume(runtime, userId, resumeId),
    ensureDefaultUser: async () => null,
    getApplicationMap: (userId = 1) => getApplicationMap(runtime, userId),
    getApplicationStatusMap: (userId = 1) => getApplicationStatusMap(runtime, userId),
    getAuthProviders: async () => ({ password: true, emailCode: true }),
    getDatabaseInfo: () => runtime.info,
    getLatestResume: (userId = 1) => getLatestResume(runtime, userId),
    getProfile: (userId = 1) => getProfile(runtime, userId),
    getUserFromToken: (token = '') => getUserFromToken(runtime, token),
    initDatabase: async () => null,
    listJobs: () => listJobs(runtime),
    listResumes: (userId = 1) => listResumes(runtime, userId),
    requestEmailCode: (email) => requestEmailCode(runtime, email),
    requestSmsCode: unsupportedMutation('requestSmsCode'),
    revokeSession: (token = '') => revokeSession(runtime, token),
    saveApplicationStatus: (userId = 1, jobId, status, details = undefined, legacyFollowUpAt = undefined) =>
      saveApplicationStatus(runtime, userId, jobId, status, details, legacyFollowUpAt),
    saveFormMappings: (userId = 1, mappings = []) => saveFormMappings(runtime, userId, mappings),
    saveProfile: (userId = 1, profile) => saveProfile(runtime, userId, profile),
    setDefaultResume: (userId = 1, resumeId) => setDefaultResume(runtime, userId, resumeId),
    syncStandardFormMappings: (userId = 1, options = {}) => syncStandardFormMappings(runtime, userId, options),
  };
}

async function getUserFromToken(runtime, token = '') {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return null;
  const result = await runtime.query(
    `SELECT users.id, users.name, users.email, users.phone, users.identity, users.auth_provider, users.created_at
     FROM auth_sessions
     JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.token_hash = $1
       AND auth_sessions.expires_at > NOW()
       AND auth_sessions.revoked_at IS NULL`,
    [hashToken(cleanToken)]
  );
  return sanitizeUser(result.rows[0] || null);
}

async function createPasswordSession(runtime, account, password) {
  const rawAccount = String(account || '').trim();
  const cleanAccount = normalizeEmail(rawAccount);
  const cleanPassword = String(password || '');
  if (!isValidEmail(cleanAccount) || cleanPassword.length < 6) {
    throw new Error('请输入有效邮箱和至少 6 位密码');
  }

  let user = await findUserByEmail(runtime, cleanAccount);
  if (!user) {
    user = await createLocalUser(runtime, cleanAccount, cleanPassword);
  } else if (!user.password_hash) {
    const passwordHash = hashSecret(cleanPassword);
    const updateResult = await runtime.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *', [
      passwordHash,
      user.id,
    ]);
    user = updateResult.rows[0];
  }

  if (!verifySecret(cleanPassword, user.password_hash)) {
    throw new Error('账号或密码不正确');
  }

  return buildSessionPayload(runtime, user.id);
}

async function requestEmailCode(runtime, email) {
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) throw new Error('请输入有效邮箱');
  const code = process.env.NODE_ENV === 'production' ? String(randomInt(100000, 999999)) : '123456';
  await runtime.query(
    `INSERT INTO email_codes (email, code_hash, expires_at, attempts)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0)
     ON CONFLICT(email) DO UPDATE SET
       code_hash = EXCLUDED.code_hash,
       created_at = NOW(),
       expires_at = EXCLUDED.expires_at,
       attempts = 0`,
    [cleanEmail, hashSecret(code)]
  );
  await sendVerificationEmail({ to: cleanEmail, code, purpose: 'login' });

  return {
    email: maskEmail(cleanEmail),
    expiresInSeconds: 600,
    devCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
}

async function revokeSession(runtime, token = '') {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return { revoked: false, reason: 'missing_token' };
  const result = await runtime.query(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(cleanToken)]
  );
  return { revoked: Number(result.rowCount || 0) > 0 };
}

async function createEmailSession(runtime, email, code) {
  const cleanEmail = normalizeEmail(email);
  const cleanCode = String(code || '').trim();
  const codeResult = await runtime.query('SELECT * FROM email_codes WHERE email = $1 AND expires_at > NOW()', [cleanEmail]);
  const row = codeResult.rows[0];
  if (!row || !verifySecret(cleanCode, row.code_hash)) {
    await runtime.query('UPDATE email_codes SET attempts = attempts + 1 WHERE email = $1', [cleanEmail]);
    throw new Error('验证码不正确或已过期');
  }

  await runtime.query('DELETE FROM email_codes WHERE email = $1', [cleanEmail]);
  let user = await findUserByEmail(runtime, cleanEmail);
  if (!user) {
    user = await createLocalUser(runtime, cleanEmail, null);
  }
  const verifiedResult = await runtime.query(
    'UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = $1 RETURNING *',
    [user.id]
  );
  user = verifiedResult.rows[0] || user;
  return buildSessionPayload(runtime, user.id);
}

async function getProfile(runtime, userId) {
  const result = await runtime.query(
    `SELECT profile_json
     FROM user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  const profile = parseJsonValue(result.rows[0]?.profile_json, null);
  return profile && Object.keys(profile).length ? profile : buildEmptyProfile();
}

async function listJobs(runtime) {
  const result = await runtime.query(`
    SELECT
      id,
      source,
      source_url,
      title,
      company_name,
      location,
      salary,
      jd_text,
      tags,
      company_type,
      recruitment_type,
      channel,
      is_demo,
      published_at,
      deadline,
      source_updated_at,
      fetched_at
    FROM jobs
    WHERE is_demo = FALSE
    ORDER BY fetched_at DESC, id ASC
  `);

  return result.rows.map(mapPostgresJob);
}

async function getLatestResume(runtime, userId) {
  const result = await runtime.query(
    `SELECT
       id,
       file_name,
       parsed_text,
       parsed_profile_json,
       created_at,
       is_default,
       parse_status
     FROM resumes
     WHERE user_id = $1
     ORDER BY is_default DESC, id DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ? mapPostgresResume(result.rows[0]) : null;
}

async function listResumes(runtime, userId) {
  const result = await runtime.query(
    `SELECT
       id,
       file_name,
       parsed_text,
       parsed_profile_json,
       created_at,
       is_default,
       parse_status
     FROM resumes
     WHERE user_id = $1
     ORDER BY is_default DESC, id DESC`,
    [userId]
  );

  return result.rows.map(mapPostgresResume);
}

async function saveProfile(runtime, userId, profile = {}) {
  await runtime.query('UPDATE users SET identity = $1 WHERE id = $2', [profile.identity || null, userId]);
  await runtime.query(
    `INSERT INTO user_profiles (
       user_id, name, email, phone, current_city, school, degree, major, graduation_date,
       education_json, experiences_json, projects_json, practice_json, skills_json, profile_json
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb)
     ON CONFLICT(user_id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       current_city = EXCLUDED.current_city,
       school = EXCLUDED.school,
       degree = EXCLUDED.degree,
       major = EXCLUDED.major,
       graduation_date = EXCLUDED.graduation_date,
       education_json = EXCLUDED.education_json,
       experiences_json = EXCLUDED.experiences_json,
       projects_json = EXCLUDED.projects_json,
       practice_json = EXCLUDED.practice_json,
       skills_json = EXCLUDED.skills_json,
       profile_json = EXCLUDED.profile_json`,
    [
      userId,
      profile.name || null,
      profile.email || null,
      profile.phone || null,
      profile.currentCity || profile.city || null,
      profile.school || null,
      profile.degree || null,
      profile.major || null,
      profile.graduationDate || profile.graduation || null,
      stringifyJson(profile.education || []),
      stringifyJson(profile.experiences || profile.workExperience || []),
      stringifyJson(profile.projects || []),
      stringifyJson(profile.practice || []),
      stringifyJson(profile.skills || {}),
      stringifyJson(profile),
    ]
  );

  await runtime.query(
    `INSERT INTO job_preferences (
       user_id, target_roles, goals, locations, salary_rules, industries, company_types,
       remote_preference, company_size_preference, allow_resume_tailoring, preference_json
     )
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11::jsonb)
     ON CONFLICT(user_id) DO UPDATE SET
       target_roles = EXCLUDED.target_roles,
       goals = EXCLUDED.goals,
       locations = EXCLUDED.locations,
       salary_rules = EXCLUDED.salary_rules,
       industries = EXCLUDED.industries,
       company_types = EXCLUDED.company_types,
       remote_preference = EXCLUDED.remote_preference,
       company_size_preference = EXCLUDED.company_size_preference,
       allow_resume_tailoring = EXCLUDED.allow_resume_tailoring,
       preference_json = EXCLUDED.preference_json`,
    [
      userId,
      profile.roles || '',
      stringifyJson(profile.goals || []),
      stringifyJson(profile.cities || []),
      stringifyJson({
        intern: profile.salaryIntern || '',
        graduate: profile.salaryGraduate || '',
      }),
      stringifyJson(profile.industries || []),
      stringifyJson(profile.companyTypes || []),
      profile.remotePreference || null,
      profile.companySizePreference || null,
      Boolean(profile.allowTailor),
      stringifyJson(profile),
    ]
  );

  return getProfile(runtime, userId);
}

async function findUserByEmail(runtime, email) {
  const result = await runtime.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
  return result.rows[0] || null;
}

async function createLocalUser(runtime, email, password) {
  const cleanEmail = normalizeEmail(email);
  const profile = buildEmptyProfile(cleanEmail);
  const result = await runtime.query(
    `INSERT INTO users (name, email, identity, password_hash, auth_provider, auth_subject)
     VALUES ($1, $2, $3, $4, 'local', $2)
     RETURNING *`,
    [
      cleanEmail.split('@')[0],
      cleanEmail,
      profile.identity,
      password ? hashSecret(password) : null,
    ]
  );
  const user = result.rows[0];
  await saveProfile(runtime, user.id, profile);
  return user;
}

async function buildSessionPayload(runtime, userId) {
  const token = randomBytes(32).toString('hex');
  const result = await runtime.query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')
     RETURNING user_id`,
    [hashToken(token), userId]
  );
  const id = result.rows[0]?.user_id || userId;
  const userResult = await runtime.query(
    'SELECT id, name, email, phone, identity, auth_provider, created_at FROM users WHERE id = $1',
    [id]
  );
  return { token, user: sanitizeUser(userResult.rows[0]) };
}

async function addResume(runtime, userId, fileName, rawText = null, parsedProfile = null, metadata = {}) {
  await runtime.query('UPDATE resumes SET is_default = FALSE WHERE user_id = $1', [userId]);
  const result = await runtime.query(
    `INSERT INTO resumes (
       user_id, file_name, storage_path, file_type, file_size, parsed_text, parsed_profile_json, is_default, parse_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE, $8)
     RETURNING *`,
    [
      userId,
      fileName,
      metadata.storagePath || null,
      metadata.fileType || null,
      metadata.fileSize || null,
      rawText,
      stringifyNullableJson(parsedProfile),
      parsedProfile ? 'parsed' : 'pending',
    ]
  );

  const profile = { ...(await getProfile(runtime, userId)), resumeName: fileName };
  await saveProfile(runtime, userId, profile);
  return result.rows[0];
}

async function setDefaultResume(runtime, userId, resumeId) {
  const resumeResult = await runtime.query('SELECT * FROM resumes WHERE user_id = $1 AND id = $2', [userId, resumeId]);
  const resume = resumeResult.rows[0];
  if (!resume) return { updated: false, reason: 'not_found' };

  await runtime.query('UPDATE resumes SET is_default = FALSE WHERE user_id = $1', [userId]);
  await runtime.query('UPDATE resumes SET is_default = TRUE WHERE user_id = $1 AND id = $2', [userId, resumeId]);
  await saveProfile(runtime, userId, { ...(await getProfile(runtime, userId)), resumeName: resume.file_name });
  return { updated: true, resume: await getLatestResume(runtime, userId), profile: await getProfile(runtime, userId) };
}

async function deleteResume(runtime, userId, resumeId) {
  const resumeResult = await runtime.query('SELECT * FROM resumes WHERE user_id = $1 AND id = $2', [userId, resumeId]);
  const resume = resumeResult.rows[0];
  if (!resume) return { deleted: false, reason: 'not_found' };

  await runtime.query('DELETE FROM resumes WHERE user_id = $1 AND id = $2', [userId, resumeId]);
  const latestResult = await runtime.query(
    'SELECT id, file_name FROM resumes WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
    [userId]
  );
  const latest = latestResult.rows[0];
  if (latest) {
    await runtime.query('UPDATE resumes SET is_default = TRUE WHERE user_id = $1 AND id = $2', [userId, latest.id]);
    await saveProfile(runtime, userId, { ...(await getProfile(runtime, userId)), resumeName: latest.file_name });
  } else {
    await saveProfile(runtime, userId, { ...(await getProfile(runtime, userId)), resumeName: '' });
  }

  return {
    deleted: true,
    resumes: await listResumes(runtime, userId),
    latestResume: await getLatestResume(runtime, userId),
    profile: await getProfile(runtime, userId),
  };
}

async function addImportedJob(runtime, job = {}) {
  const duplicate = await findDuplicateJob(runtime, job);
  if (duplicate) {
    return { job: mapPostgresJob(duplicate), duplicate: true };
  }

  const result = await runtime.query(
    `INSERT INTO jobs (
       source, source_url, title, company_name, location, salary, jd_text,
       tags, company_type, recruitment_type, channel, is_demo, fetched_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, FALSE, NOW())
     RETURNING *`,
    [
      job.source,
      job.sourceUrl || null,
      job.title,
      job.company,
      job.city,
      job.salary,
      job.description,
      stringifyJson(job.tags || []),
      job.companyType,
      job.goal,
      job.channel,
    ]
  );

  return { job: mapPostgresJob(result.rows[0]), duplicate: false };
}

async function deleteImportedJob(runtime, jobId) {
  const result = await runtime.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  const job = result.rows[0];
  if (!job) return { deleted: false, reason: 'not_found' };
  if (job.is_demo) return { deleted: false, reason: 'demo_job' };

  await runtime.query('DELETE FROM applications WHERE job_id = $1', [jobId]);
  await runtime.query('DELETE FROM job_matches WHERE job_id = $1', [jobId]);
  await runtime.query('DELETE FROM jobs WHERE id = $1', [jobId]);
  return { deleted: true, job: mapPostgresJob(job) };
}

async function getApplicationStatusMap(runtime, userId) {
  const result = await runtime.query(
    `SELECT applications.job_id, applications.status
     FROM applications
     INNER JOIN jobs ON jobs.id = applications.job_id
     WHERE applications.user_id = $1 AND jobs.is_demo = FALSE AND applications.deleted_at IS NULL`,
    [userId]
  );
  return Object.fromEntries(result.rows.map((row) => [Number(row.job_id), row.status]));
}

async function clearApplicationHistory(runtime, userId) {
  await runtime.query('DELETE FROM applications WHERE user_id = $1', [userId]);
  return {};
}

async function getApplicationMap(runtime, userId) {
  const result = await runtime.query(
    `SELECT applications.job_id, applications.status, applications.notes, applications.applied_at,
      applications.follow_up_at, applications.next_action, applications.submission_result,
      applications.autofill_session_id, applications.updated_source, applications.deleted_at,
      applications.updated_at
     FROM applications
     INNER JOIN jobs ON jobs.id = applications.job_id
     WHERE applications.user_id = $1 AND jobs.is_demo = FALSE`,
    [userId]
  );
  return Object.fromEntries(result.rows.map((row) => [Number(row.job_id), mapApplicationDetails(row)]));
}

async function saveApplicationStatus(runtime, userId, jobId, status, details = undefined, legacyFollowUpAt = undefined) {
  const normalizedDetails =
    details && typeof details === 'object'
      ? details
      : {
          notes: details,
          followUpAt: legacyFollowUpAt,
        };
  const followUpAt = normalizedDetails.followUpAt || normalizedDetails.nextActionAt || null;

  const result = await runtime.query(
    `INSERT INTO applications (
       user_id, job_id, status, notes, follow_up_at, next_action, submission_result,
       autofill_session_id, updated_source, deleted_at, applied_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       CASE WHEN $3 = '已投递' THEN NOW() ELSE NULL END
     )
     ON CONFLICT(user_id, job_id) DO UPDATE SET
       status = EXCLUDED.status,
       notes = COALESCE(EXCLUDED.notes, applications.notes),
       follow_up_at = COALESCE(EXCLUDED.follow_up_at, applications.follow_up_at),
       next_action = COALESCE(EXCLUDED.next_action, applications.next_action),
       submission_result = COALESCE(EXCLUDED.submission_result, applications.submission_result),
       autofill_session_id = COALESCE(EXCLUDED.autofill_session_id, applications.autofill_session_id),
       updated_source = COALESCE(EXCLUDED.updated_source, applications.updated_source),
       deleted_at = EXCLUDED.deleted_at,
       applied_at = CASE
         WHEN EXCLUDED.status = '已投递' AND applications.applied_at IS NULL THEN NOW()
         ELSE applications.applied_at
       END
     RETURNING *`,
    [
      userId,
      jobId,
      status,
      normalizedDetails.notes ?? null,
      followUpAt,
      normalizedDetails.nextAction ?? null,
      normalizedDetails.submissionResult ?? null,
      normalizedDetails.autofillSessionId ?? null,
      normalizedDetails.updatedSource ?? null,
      normalizedDetails.deletedAt ?? null,
    ]
  );

  return result.rows[0];
}

async function saveFormMappings(runtime, userId, mappings = []) {
  await runtime.query(
    `INSERT INTO form_mappings (user_id, mappings_json)
     VALUES ($1, $2::jsonb)
     ON CONFLICT(user_id) DO UPDATE SET mappings_json = EXCLUDED.mappings_json`,
    [userId, stringifyJson(Array.isArray(mappings) ? mappings : [])]
  );
  return getFormMappings(runtime, userId);
}

async function syncStandardFormMappings(runtime, userId, options = {}) {
  const profile = await getProfile(runtime, userId);
  const latestResume = await getLatestResume(runtime, userId);
  const parsedProfile = latestResume?.parsedProfile || null;
  if (!parsedProfile) return getFormMappings(runtime, userId);

  const current = (await getFormMappings(runtime, userId)) || [];
  const learned = current.filter((item) => item.kind === 'learnedFieldMapping');
  const standard = buildStandardFormMappings(profile, parsedProfile, {
    resumeFileName: latestResume.fileName,
  }).map((item) => ({
    ...item,
    sourceResumeId: latestResume.id,
    sourceResumeFileName: latestResume.fileName,
  }));

  const alreadySynced = current.some(
    (item) => item.kind === 'standardFormMapping' && item.sourceResumeId === latestResume.id
  );
  if (alreadySynced && !options.force) return current;

  return saveFormMappings(runtime, userId, [...standard, ...learned]);
}

async function deleteFormMappings(runtime, userId) {
  await runtime.query('DELETE FROM form_mappings WHERE user_id = $1', [userId]);
  return null;
}

async function clearProfileData(runtime, userId) {
  const current = await getProfile(runtime, userId);
  const emptyProfile = buildEmptyProfile(current.email || '');
  await runtime.query('DELETE FROM resumes WHERE user_id = $1', [userId]);
  await runtime.query('DELETE FROM form_mappings WHERE user_id = $1', [userId]);
  await runtime.query('DELETE FROM applications WHERE user_id = $1', [userId]);
  await saveProfile(runtime, userId, emptyProfile);
  return {
    profile: await getProfile(runtime, userId),
    formMappings: null,
    resumes: [],
    applications: {},
    applicationDetails: {},
    latestResume: null,
  };
}

async function getFormMappings(runtime, userId) {
  const result = await runtime.query('SELECT mappings_json FROM form_mappings WHERE user_id = $1', [userId]);
  const mappings = parseJsonValue(result.rows[0]?.mappings_json, null);
  return Array.isArray(mappings) && mappings.length ? mappings : null;
}

async function findDuplicateJob(runtime, job = {}) {
  if (job.sourceUrl) {
    const byUrl = await runtime.query('SELECT * FROM jobs WHERE source_url = $1', [job.sourceUrl]);
    if (byUrl.rows[0]) return byUrl.rows[0];
  }

  const byIdentity = await runtime.query(
    'SELECT * FROM jobs WHERE title = $1 AND company_name = $2 AND location = $3',
    [job.title, job.company, job.city]
  );
  return byIdentity.rows[0] || null;
}

function mapPostgresJob(job) {
  return {
    id: Number(job.id),
    source: job.source,
    sourceUrl: job.source_url,
    title: job.title,
    company: job.company_name,
    city: job.location,
    salary: job.salary,
    description: job.jd_text,
    tags: parseJsonValue(job.tags, []),
    companyType: job.company_type,
    goal: job.recruitment_type,
    channel: job.channel,
    isDemo: Boolean(job.is_demo),
    publishedAt: toIsoString(job.published_at),
    deadline: toIsoString(job.deadline),
    sourceUpdatedAt: toIsoString(job.source_updated_at),
    fetchedAt: toIsoString(job.fetched_at),
  };
}

function mapPostgresResume(resume) {
  const parsedProfile = parseJsonValue(resume.parsed_profile_json, null);
  const parsedText = resume.parsed_text || '';
  return {
    id: Number(resume.id),
    fileName: resume.file_name,
    parsedProfile,
    textLength: parsedText.length,
    createdAt: toIsoString(resume.created_at),
    isDefault: Boolean(resume.is_default),
    parseStatus: resume.parse_status || (parsedProfile ? 'parsed' : 'pending'),
  };
}

function mapApplicationDetails(row) {
  const appliedAt = toIsoString(row.applied_at);
  const followUpAt = toIsoString(row.follow_up_at);
  return {
    status: row.status,
    notes: row.notes || '',
    followUpAt,
    nextAction: row.next_action || '',
    nextActionAt: followUpAt,
    appliedAt,
    submittedAt: appliedAt,
    submissionResult: row.submission_result || '',
    autofillSessionId: row.autofill_session_id || '',
    updatedSource: row.updated_source || '',
    deletedAt: toIsoString(row.deleted_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function stringifyJson(value) {
  return JSON.stringify(value ?? null);
}

function stringifyNullableJson(value) {
  return value === null || value === undefined ? null : stringifyJson(value);
}

function parseJsonValue(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIsoString(value) {
  if (!value) return value || '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function hashSecret(secret) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(secret), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifySecret(secret, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(String(secret), salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: Number(user.id),
    name: user.name || '',
    email: maskEmail(user.email || ''),
    phone: maskPhone(user.phone || ''),
    identity: user.identity || '',
    authProvider: user.auth_provider || 'local',
    createdAt: toIsoString(user.created_at),
  };
}

function maskPhone(phone) {
  return phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '';
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function unsupportedMutation(methodName) {
  return async () => {
    throw new Error(`PostgreSQL repository write method is not implemented yet: ${methodName}`);
  };
}
