import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { demoJobs, initialProfile } from '../src/data/demoData.js';
import { buildStandardFormMappings } from '../src/data/standardFormMappings.js';
import { db, getDatabaseInfo } from './db/index.js';
import { sendVerificationEmail } from './email.js';

export { db, getDatabaseInfo };

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
      identity TEXT,
      password_hash TEXT,
      auth_provider TEXT DEFAULT 'local',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sms_codes (
      phone TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      raw_text TEXT,
      parsed_profile_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      target_roles TEXT,
      goals TEXT,
      locations TEXT,
      salary_rules TEXT,
      industries TEXT,
      company_types TEXT,
      allow_resume_tailoring INTEGER DEFAULT 1,
      profile_json TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY,
      source TEXT NOT NULL,
      source_url TEXT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      salary TEXT,
      description TEXT,
      tags TEXT,
      company_type TEXT,
      goal TEXT,
      channel TEXT,
      is_demo INTEGER DEFAULT 0,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      reasons_json TEXT,
      risks_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      resume_version_id INTEGER,
      cover_letter_id INTEGER,
      applied_at TEXT,
      follow_up_at TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, job_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );

    CREATE TABLE IF NOT EXISTS form_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      mappings_json TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_url_unique
      ON jobs(source_url)
      WHERE source_url IS NOT NULL AND source_url != '';
  `);

  ensureDefaultUser();
  ensureUserColumns();
  ensureApplicationColumns();
  ensureResumeColumns();
  seedDemoJobs();
}

function ensureUserColumns() {
  const columns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
  const additions = {
    phone: 'ALTER TABLE users ADD COLUMN phone TEXT',
    password_hash: 'ALTER TABLE users ADD COLUMN password_hash TEXT',
    auth_provider: 'ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT "local"',
  };

  for (const [column, statement] of Object.entries(additions)) {
    if (!columns.includes(column)) db.exec(statement);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
      ON users(email)
      WHERE email IS NOT NULL AND email != '';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
      ON users(phone)
      WHERE phone IS NOT NULL AND phone != '';
  `);
}

function ensureApplicationColumns() {
  const columns = db.prepare('PRAGMA table_info(applications)').all().map((column) => column.name);
  const additions = {
    follow_up_at: 'ALTER TABLE applications ADD COLUMN follow_up_at TEXT',
    next_action: 'ALTER TABLE applications ADD COLUMN next_action TEXT',
    submission_result: 'ALTER TABLE applications ADD COLUMN submission_result TEXT',
    autofill_session_id: 'ALTER TABLE applications ADD COLUMN autofill_session_id TEXT',
    updated_source: 'ALTER TABLE applications ADD COLUMN updated_source TEXT',
    deleted_at: 'ALTER TABLE applications ADD COLUMN deleted_at TEXT',
  };

  for (const [column, statement] of Object.entries(additions)) {
    if (!columns.includes(column)) db.exec(statement);
  }
}

function ensureResumeColumns() {
  const columns = db.prepare('PRAGMA table_info(resumes)').all().map((column) => column.name);
  const additions = {
    is_default: 'ALTER TABLE resumes ADD COLUMN is_default INTEGER DEFAULT 0',
    parse_status: 'ALTER TABLE resumes ADD COLUMN parse_status TEXT DEFAULT "pending"',
  };

  for (const [column, statement] of Object.entries(additions)) {
    if (!columns.includes(column)) db.exec(statement);
  }

  const defaultResume = db.prepare('SELECT id FROM resumes WHERE is_default = 1 LIMIT 1').get();
  if (!defaultResume) {
    const latest = db.prepare('SELECT id FROM resumes ORDER BY id DESC LIMIT 1').get();
    if (latest) db.prepare('UPDATE resumes SET is_default = 1 WHERE id = ?').run(latest.id);
  }
}

export function ensureDefaultUser() {
  let user = db.prepare('SELECT * FROM users WHERE id = 1').get();

  if (!user) {
    db.prepare('INSERT INTO users (id, name, identity) VALUES (?, ?, ?)').run(1, 'Demo User', initialProfile.identity);
    user = db.prepare('SELECT * FROM users WHERE id = 1').get();
  }

  const preference = db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(user.id);
  if (!preference) {
    saveProfile(user.id, initialProfile);
  }

  return user;
}

export function seedDemoJobs() {
  if (process.env.KIKIJOB_SEED_DEMO_JOBS !== 'true') return;
  const statement = db.prepare(`
    INSERT OR IGNORE INTO jobs (
      id, source, title, company, location, salary, tags, company_type, goal, channel, is_demo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const job of demoJobs) {
    statement.run(
      job.id,
      job.source,
      job.title,
      job.company,
      job.city,
      job.salary,
      JSON.stringify(job.tags),
      job.companyType,
      job.goal,
      job.channel
    );
  }
}

export function getProfile(userId = 1) {
  const preference = db.prepare('SELECT profile_json FROM preferences WHERE user_id = ?').get(userId);
  return preference ? JSON.parse(preference.profile_json) : initialProfile;
}

export function saveProfile(userId = 1, profile) {
  db.prepare('UPDATE users SET identity = ? WHERE id = ?').run(profile.identity || null, userId);
  db.prepare(`
    INSERT INTO preferences (
      user_id, target_roles, goals, locations, salary_rules, industries, company_types,
      allow_resume_tailoring, profile_json, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      target_roles = excluded.target_roles,
      goals = excluded.goals,
      locations = excluded.locations,
      salary_rules = excluded.salary_rules,
      industries = excluded.industries,
      company_types = excluded.company_types,
      allow_resume_tailoring = excluded.allow_resume_tailoring,
      profile_json = excluded.profile_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId,
    profile.roles || '',
    JSON.stringify(profile.goals || []),
    JSON.stringify(profile.cities || []),
    JSON.stringify({
      intern: profile.salaryIntern || '',
      graduate: profile.salaryGraduate || '',
    }),
    JSON.stringify(profile.industries || []),
    JSON.stringify(profile.companyTypes || []),
    profile.allowTailor ? 1 : 0,
    JSON.stringify(profile)
  );

  return getProfile(userId);
}

export function addResume(userId = 1, fileName, rawText = null, parsedProfile = null, metadata = {}) {
  void metadata;
  db.prepare('UPDATE resumes SET is_default = 0 WHERE user_id = ?').run(userId);
  const result = db
    .prepare(
      'INSERT INTO resumes (user_id, file_name, raw_text, parsed_profile_json, is_default, parse_status) VALUES (?, ?, ?, ?, 1, ?)'
    )
    .run(userId, fileName, rawText, parsedProfile ? JSON.stringify(parsedProfile) : null, parsedProfile ? 'parsed' : 'pending');
  const profile = { ...getProfile(userId), resumeName: fileName };
  saveProfile(userId, profile);
  syncStandardFormMappings(userId, { force: true });
  return db.prepare('SELECT * FROM resumes WHERE id = ?').get(result.lastInsertRowid);
}

export function getLatestResume(userId = 1) {
  const resume = db.prepare('SELECT * FROM resumes WHERE user_id = ? ORDER BY is_default DESC, id DESC LIMIT 1').get(userId);
  if (!resume) return null;

  return {
    id: resume.id,
    fileName: resume.file_name,
    parsedProfile: resume.parsed_profile_json ? JSON.parse(resume.parsed_profile_json) : null,
    textLength: resume.raw_text?.length || 0,
    createdAt: resume.created_at,
    isDefault: Boolean(resume.is_default),
    parseStatus: resume.parse_status || (resume.parsed_profile_json ? 'parsed' : 'pending'),
  };
}

export function listResumes(userId = 1) {
  return db
    .prepare('SELECT * FROM resumes WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(userId)
    .map((resume) => ({
      id: resume.id,
      fileName: resume.file_name,
      textLength: resume.raw_text?.length || 0,
      createdAt: resume.created_at,
      isDefault: Boolean(resume.is_default),
      parseStatus: resume.parse_status || (resume.parsed_profile_json ? 'parsed' : 'pending'),
    }));
}

export function setDefaultResume(userId = 1, resumeId) {
  const resume = db.prepare('SELECT * FROM resumes WHERE user_id = ? AND id = ?').get(userId, resumeId);
  if (!resume) return { updated: false, reason: 'not_found' };
  db.prepare('UPDATE resumes SET is_default = 0 WHERE user_id = ?').run(userId);
  db.prepare('UPDATE resumes SET is_default = 1 WHERE user_id = ? AND id = ?').run(userId, resumeId);
  const profile = { ...getProfile(userId), resumeName: resume.file_name };
  saveProfile(userId, profile);
  syncStandardFormMappings(userId, { force: true });
  return { updated: true, resume: getLatestResume(userId), profile: getProfile(userId) };
}

export function deleteResume(userId = 1, resumeId) {
  const resume = db.prepare('SELECT * FROM resumes WHERE user_id = ? AND id = ?').get(userId, resumeId);
  if (!resume) return { deleted: false, reason: 'not_found' };
  db.prepare('DELETE FROM resumes WHERE user_id = ? AND id = ?').run(userId, resumeId);
  const latest = db.prepare('SELECT id, file_name FROM resumes WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId);
  if (latest) {
    db.prepare('UPDATE resumes SET is_default = 1 WHERE user_id = ? AND id = ?').run(userId, latest.id);
    saveProfile(userId, { ...getProfile(userId), resumeName: latest.file_name });
  } else {
    saveProfile(userId, { ...getProfile(userId), resumeName: '' });
  }
  syncStandardFormMappings(userId, { force: true });
  return { deleted: true, resumes: listResumes(userId), latestResume: getLatestResume(userId), profile: getProfile(userId) };
}

export function listJobs() {
  return db
    .prepare('SELECT * FROM jobs WHERE is_demo = 0 ORDER BY fetched_at DESC, id ASC')
    .all()
    .map((job) => ({
      id: job.id,
      source: job.source,
      sourceUrl: job.source_url,
      title: job.title,
      company: job.company,
      city: job.location,
      salary: job.salary,
      description: job.description,
      tags: JSON.parse(job.tags || '[]'),
      companyType: job.company_type,
      goal: job.goal,
      channel: job.channel,
      isDemo: Boolean(job.is_demo),
      fetchedAt: job.fetched_at,
    }));
}

export function getUserFromToken(token = '') {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return null;
  const row = db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ? AND sessions.expires_at > CURRENT_TIMESTAMP`
    )
    .get(cleanToken);
  return row || null;
}

export function revokeSession(token = '') {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return { revoked: false, reason: 'missing_token' };
  const result = db.prepare('DELETE FROM sessions WHERE token = ?').run(cleanToken);
  return { revoked: result.changes > 0 };
}

export function createPasswordSession(account, password) {
  const rawAccount = String(account || '').trim();
  const cleanAccount = rawAccount.includes('@') ? normalizeEmail(rawAccount) : rawAccount;
  const cleanPassword = String(password || '');
  if (!cleanAccount || cleanPassword.length < 6) {
    throw new Error('请输入账号和至少 6 位密码');
  }

  const isPhone = /^1[3-9]\d{9}$/.test(cleanAccount);
  const user =
    db
      .prepare(isPhone ? 'SELECT * FROM users WHERE phone = ?' : 'SELECT * FROM users WHERE email = ?')
      .get(cleanAccount) || createLocalUser(cleanAccount, isPhone, cleanPassword);

  if (!user.password_hash) {
    const passwordHash = hashSecret(cleanPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
    user.password_hash = passwordHash;
  }

  if (!verifySecret(cleanPassword, user.password_hash)) {
    throw new Error('账号或密码不正确');
  }

  return buildSessionPayload(user.id);
}

export function requestSmsCode(phone) {
  const cleanPhone = String(phone || '').trim();
  if (!/^1[3-9]\d{9}$/.test(cleanPhone)) throw new Error('请输入有效的手机号');
  const code = process.env.NODE_ENV === 'production' ? String(randomInt(100000, 999999)) : '123456';
  db.prepare(
    `INSERT INTO sms_codes (phone, code_hash, expires_at)
     VALUES (?, ?, datetime('now', '+10 minutes'))
     ON CONFLICT(phone) DO UPDATE SET
       code_hash = excluded.code_hash,
       created_at = CURRENT_TIMESTAMP,
       expires_at = excluded.expires_at`
  ).run(cleanPhone, hashSecret(code));

  return {
    phone: maskPhone(cleanPhone),
    expiresInSeconds: 600,
    devCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
}

export function createSmsSession(phone, code) {
  const cleanPhone = String(phone || '').trim();
  const cleanCode = String(code || '').trim();
  const row = db
    .prepare('SELECT * FROM sms_codes WHERE phone = ? AND expires_at > CURRENT_TIMESTAMP')
    .get(cleanPhone);
  if (!row || !verifySecret(cleanCode, row.code_hash)) throw new Error('验证码不正确或已过期');

  db.prepare('DELETE FROM sms_codes WHERE phone = ?').run(cleanPhone);
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone) || createLocalUser(cleanPhone, true, null);
  return buildSessionPayload(user.id);
}

export async function requestEmailCode(email) {
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) throw new Error('请输入有效邮箱');
  const code = process.env.NODE_ENV === 'production' ? String(randomInt(100000, 999999)) : '123456';
  db.prepare(
    `INSERT INTO email_codes (email, code_hash, expires_at)
     VALUES (?, ?, datetime('now', '+10 minutes'))
     ON CONFLICT(email) DO UPDATE SET
       code_hash = excluded.code_hash,
       created_at = CURRENT_TIMESTAMP,
     expires_at = excluded.expires_at`
  ).run(cleanEmail, hashSecret(code));
  await sendVerificationEmail({ to: cleanEmail, code, purpose: 'login' });

  return {
    email: maskEmail(cleanEmail),
    expiresInSeconds: 600,
    devCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
}

export function createEmailSession(email, code) {
  const cleanEmail = normalizeEmail(email);
  const cleanCode = String(code || '').trim();
  const row = db
    .prepare('SELECT * FROM email_codes WHERE email = ? AND expires_at > CURRENT_TIMESTAMP')
    .get(cleanEmail);
  if (!row || !verifySecret(cleanCode, row.code_hash)) throw new Error('验证码不正确或已过期');

  db.prepare('DELETE FROM email_codes WHERE email = ?').run(cleanEmail);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) || createLocalUser(cleanEmail, false, null);
  return buildSessionPayload(user.id);
}

export function getAuthProviders() {
  return {
    password: true,
    emailCode: true,
  };
}

function createLocalUser(account, isPhone, password) {
  const result = db
    .prepare('INSERT INTO users (name, email, phone, identity, password_hash, auth_provider) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      isPhone ? `用户${account.slice(-4)}` : account.split('@')[0],
      isPhone ? null : account,
      isPhone ? account : null,
      initialProfile.identity,
      password ? hashSecret(password) : null,
      'local'
    );
  saveProfile(result.lastInsertRowid, { ...initialProfile, email: isPhone ? '' : account, phone: isPhone ? account : '' });
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

function buildSessionPayload(userId) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime(\'now\', \'+30 days\'))').run(token, userId);
  const user = db.prepare('SELECT id, name, email, phone, identity, auth_provider, created_at FROM users WHERE id = ?').get(userId);
  return { token, user: sanitizeUser(user) };
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name || '',
    email: maskEmail(user.email || ''),
    phone: maskPhone(user.phone || ''),
    identity: user.identity || '',
    authProvider: user.auth_provider || 'local',
    createdAt: user.created_at,
  };
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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

export function addImportedJob(job) {
  const duplicate = findDuplicateJob(job);
  if (duplicate) {
    return { job: mapJob(duplicate), duplicate: true };
  }

  const result = db
    .prepare(`
      INSERT INTO jobs (
        source, source_url, title, company, location, salary, description,
        tags, company_type, goal, channel, is_demo, fetched_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `)
    .run(
      job.source,
      job.sourceUrl,
      job.title,
      job.company,
      job.city,
      job.salary,
      job.description,
      JSON.stringify(job.tags || []),
      job.companyType,
      job.goal,
      job.channel
    );

  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  return { job: mapJob(row), duplicate: false };
}

export function deleteImportedJob(jobId) {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return { deleted: false, reason: 'not_found' };
  }

  if (job.is_demo) {
    return { deleted: false, reason: 'demo_job' };
  }

  db.prepare('DELETE FROM applications WHERE job_id = ?').run(jobId);
  db.prepare('DELETE FROM matches WHERE job_id = ?').run(jobId);
  db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
  return { deleted: true, job: mapJob(job) };
}

function findDuplicateJob(job) {
  if (job.sourceUrl) {
    const byUrl = db.prepare('SELECT * FROM jobs WHERE source_url = ?').get(job.sourceUrl);
    if (byUrl) return byUrl;
  }

  return db
    .prepare('SELECT * FROM jobs WHERE title = ? AND company = ? AND location = ?')
    .get(job.title, job.company, job.city);
}

function mapJob(job) {
  return {
    id: job.id,
    source: job.source,
    sourceUrl: job.source_url,
    title: job.title,
    company: job.company,
    city: job.location,
    salary: job.salary,
    description: job.description,
    tags: JSON.parse(job.tags || '[]'),
    companyType: job.company_type,
    goal: job.goal,
    channel: job.channel,
    isDemo: Boolean(job.is_demo),
    fetchedAt: job.fetched_at,
  };
}

export function getApplicationStatusMap(userId = 1) {
  const rows = db
    .prepare(
      `SELECT applications.job_id, applications.status
       FROM applications
       INNER JOIN jobs ON jobs.id = applications.job_id
       WHERE applications.user_id = ? AND jobs.is_demo = 0`
    )
    .all(userId);
  return Object.fromEntries(rows.map((row) => [row.job_id, row.status]));
}

export function clearApplicationHistory(userId = 1) {
  db.prepare('DELETE FROM applications WHERE user_id = ?').run(userId);
  return {};
}

export function getApplicationMap(userId = 1) {
  const rows = db
    .prepare(
      `SELECT applications.job_id, applications.status, applications.notes, applications.applied_at,
        applications.follow_up_at, applications.next_action, applications.submission_result,
        applications.autofill_session_id, applications.updated_source, applications.deleted_at,
        applications.updated_at
       FROM applications
       INNER JOIN jobs ON jobs.id = applications.job_id
       WHERE applications.user_id = ? AND jobs.is_demo = 0`
    )
    .all(userId);
  return Object.fromEntries(
    rows.map((row) => [
      row.job_id,
      {
        status: row.status,
        notes: row.notes || '',
        followUpAt: row.follow_up_at || '',
        nextAction: row.next_action || '',
        nextActionAt: row.follow_up_at || '',
        appliedAt: row.applied_at || '',
        submittedAt: row.applied_at || '',
        submissionResult: row.submission_result || '',
        autofillSessionId: row.autofill_session_id || '',
        updatedSource: row.updated_source || '',
        deletedAt: row.deleted_at || '',
        updatedAt: row.updated_at || '',
      },
    ])
  );
}

export function saveApplicationStatus(userId = 1, jobId, status, details = undefined, legacyFollowUpAt = undefined) {
  const normalizedDetails =
    details && typeof details === 'object'
      ? details
      : {
          notes: details,
          followUpAt: legacyFollowUpAt,
        };
  const followUpAt = normalizedDetails.followUpAt || normalizedDetails.nextActionAt;

  db.prepare(`
    INSERT INTO applications (
      user_id, job_id, status, notes, follow_up_at, next_action, submission_result,
      autofill_session_id, updated_source, deleted_at, applied_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = '已投递' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, job_id) DO UPDATE SET
      status = excluded.status,
      notes = COALESCE(excluded.notes, applications.notes),
      follow_up_at = COALESCE(excluded.follow_up_at, applications.follow_up_at),
      next_action = COALESCE(excluded.next_action, applications.next_action),
      submission_result = COALESCE(excluded.submission_result, applications.submission_result),
      autofill_session_id = COALESCE(excluded.autofill_session_id, applications.autofill_session_id),
      updated_source = COALESCE(excluded.updated_source, applications.updated_source),
      deleted_at = excluded.deleted_at,
      applied_at = CASE
        WHEN excluded.status = '已投递' AND applications.applied_at IS NULL THEN CURRENT_TIMESTAMP
        ELSE applications.applied_at
      END,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId,
    jobId,
    status,
    normalizedDetails.notes ?? null,
    followUpAt ?? null,
    normalizedDetails.nextAction ?? null,
    normalizedDetails.submissionResult ?? null,
    normalizedDetails.autofillSessionId ?? null,
    normalizedDetails.updatedSource ?? null,
    normalizedDetails.deletedAt ?? null,
    status
  );

  return db.prepare('SELECT * FROM applications WHERE user_id = ? AND job_id = ?').get(userId, jobId);
}

export function getFormMappings(userId = 1) {
  const row = db.prepare('SELECT mappings_json FROM form_mappings WHERE user_id = ?').get(userId);
  if (!row) return null;

  const mappings = JSON.parse(row.mappings_json);
  return Array.isArray(mappings) && mappings.length ? mappings : null;
}

export function syncStandardFormMappings(userId = 1, options = {}) {
  const profile = getProfile(userId);
  const latestResume = getLatestResume(userId);
  const parsedProfile = latestResume?.parsedProfile || null;
  if (!parsedProfile) return getFormMappings(userId);

  const current = getFormMappings(userId) || [];
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

  return saveFormMappings(userId, [...standard, ...learned]);
}

export function saveFormMappings(userId = 1, mappings = []) {
  db.prepare(`
    INSERT INTO form_mappings (user_id, mappings_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      mappings_json = excluded.mappings_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, JSON.stringify(Array.isArray(mappings) ? mappings : []));

  return getFormMappings(userId);
}

export function deleteFormMappings(userId = 1) {
  db.prepare('DELETE FROM form_mappings WHERE user_id = ?').run(userId);
  return null;
}

export function clearProfileData(userId = 1) {
  const emptyProfile = {
    ...initialProfile,
    resumeName: '',
    name: '',
    email: '',
    phone: '',
    education: [],
    experiences: [],
    projects: [],
    practice: [],
    skills: {},
  };
  db.prepare('DELETE FROM resumes WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM form_mappings WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM applications WHERE user_id = ?').run(userId);
  saveProfile(userId, emptyProfile);
  return { profile: getProfile(userId), formMappings: null, resumes: [], applications: {}, applicationDetails: {}, latestResume: null };
}
