import '../env.js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const sqlitePath = process.env.SQLITE_DATABASE_PATH || join(projectRoot, 'data', 'auto_cv.sqlite');
const exportDir = process.env.MIGRATION_EXPORT_DIR || join(projectRoot, 'migration-exports');
const shouldWrite = process.argv.includes('--write');

if (!existsSync(sqlitePath)) {
  throw new Error(`SQLite database not found: ${sqlitePath}`);
}

const db = new DatabaseSync(sqlitePath, { readOnly: true });
const payload = buildMigrationPayload();

if (shouldWrite) {
  mkdirSync(exportDir, { recursive: true });
  const outputPath = join(exportDir, `sqlite-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`Export written: ${outputPath}`);
} else {
  console.log(JSON.stringify(payload.summary, null, 2));
}

function buildMigrationPayload() {
  const users = tableRows('users').map((row) => ({
    id: row.id,
    name: row.name || null,
    email: normalizeEmail(row.email),
    phone: row.phone || null,
    identity: row.identity || null,
    password_hash: row.password_hash || null,
    auth_provider: row.auth_provider || 'local',
    created_at: row.created_at,
  }));

  const profiles = tableRows('preferences').map((row) => {
    const profile = parseJson(row.profile_json, {});
    return {
      user_id: row.user_id,
      name: profile.name || null,
      email: normalizeEmail(profile.email),
      phone: profile.phone || null,
      current_city: Array.isArray(profile.cities) ? profile.cities[0] || null : profile.city || null,
      school: firstValue(profile.education, 'school'),
      degree: firstValue(profile.education, 'degree'),
      major: firstValue(profile.education, 'major'),
      graduation_date: firstValue(profile.education, 'endDate'),
      education_json: safeArray(profile.education),
      experiences_json: safeArray(profile.experiences),
      projects_json: safeArray(profile.projects),
      practice_json: safeArray(profile.practice),
      skills_json: profile.skills && typeof profile.skills === 'object' ? profile.skills : {},
      profile_json: profile,
      updated_at: row.updated_at,
    };
  });

  const preferences = tableRows('preferences').map((row) => ({
    id: row.id,
    user_id: row.user_id,
    target_roles: row.target_roles || null,
    goals: parseJson(row.goals, []),
    locations: parseJson(row.locations, []),
    salary_rules: parseJson(row.salary_rules, {}),
    industries: parseJson(row.industries, []),
    company_types: parseJson(row.company_types, []),
    allow_resume_tailoring: Boolean(row.allow_resume_tailoring),
    preference_json: parseJson(row.profile_json, {}),
    updated_at: row.updated_at,
  }));

  const companiesByName = new Map();
  const jobs = tableRows('jobs').map((row) => {
    const companyName = row.company || '未知公司';
    if (!companiesByName.has(companyName.toLowerCase())) {
      companiesByName.set(companyName.toLowerCase(), {
        name: companyName,
        company_type: row.company_type || null,
        locations: row.location ? [row.location] : [],
      });
    }
    return {
      id: row.id,
      source: row.source,
      source_url: row.source_url || null,
      title: row.title,
      company_name: companyName,
      location: row.location || null,
      salary: row.salary || null,
      jd_text: row.description || null,
      tags: parseJson(row.tags, []),
      company_type: row.company_type || null,
      recruitment_type: row.goal || null,
      channel: row.channel || null,
      is_demo: Boolean(row.is_demo),
      fetched_at: row.fetched_at,
    };
  });

  const resumes = tableRows('resumes').map((row) => ({
    id: row.id,
    user_id: row.user_id,
    file_name: row.file_name,
    storage_path: null,
    file_type: inferFileType(row.file_name),
    file_size: null,
    parsed_text: row.raw_text || null,
    parsed_profile_json: parseJson(row.parsed_profile_json, null),
    is_default: Boolean(row.is_default),
    parse_status: row.parse_status || (row.parsed_profile_json ? 'parsed' : 'pending'),
    created_at: row.created_at,
  }));

  const applications = tableRows('applications').map((row) => ({
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    status: row.status,
    resume_id: row.resume_version_id || null,
    submitted_at: row.applied_at || null,
    applied_at: row.applied_at || null,
    follow_up_at: row.follow_up_at || null,
    next_action: row.next_action || null,
    notes: row.notes || null,
    submission_result: row.submission_result || null,
    autofill_session_id: row.autofill_session_id || null,
    updated_source: row.updated_source || null,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null,
  }));

  const formMappings = tableRows('form_mappings').map((row) => ({
    id: row.id,
    user_id: row.user_id,
    mappings_json: parseJson(row.mappings_json, []),
    updated_at: row.updated_at,
  }));

  const matches = tableRows('matches').map((row) => ({
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    score: row.score,
    reasons_json: parseJson(row.reasons_json, []),
    risks_json: parseJson(row.risks_json, []),
    created_at: row.created_at,
  }));

  const exportPayload = {
    version: 1,
    source: {
      provider: 'sqlite',
      path: sqlitePath,
      exportedAt: new Date().toISOString(),
    },
    tables: {
      users,
      user_profiles: profiles,
      job_preferences: preferences,
      companies: [...companiesByName.values()],
      jobs,
      resumes,
      applications,
      form_mappings: formMappings,
      job_matches: matches,
    },
  };

  exportPayload.summary = Object.fromEntries(
    Object.entries(exportPayload.tables).map(([tableName, rows]) => [tableName, rows.length])
  );
  exportPayload.warnings = buildWarnings(exportPayload);
  return exportPayload;
}

function tableRows(tableName) {
  if (!tableExists(tableName)) return [];
  return db.prepare(`SELECT * FROM ${tableName}`).all();
}

function tableExists(tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstValue(items, key) {
  return safeArray(items).find((item) => item?.[key])?.[key] || null;
}

function normalizeEmail(value) {
  return value ? String(value).trim().toLowerCase() : null;
}

function inferFileType(fileName = '') {
  const extension = String(fileName).split('.').pop()?.toLowerCase();
  if (!extension || extension === fileName) return null;
  return extension;
}

function buildWarnings(payload) {
  const warnings = [];
  const resumeWithoutStorage = payload.tables.resumes.filter((resume) => !resume.storage_path).length;
  if (resumeWithoutStorage) {
    warnings.push(`${resumeWithoutStorage} resumes need upload to Supabase Storage before production cutover.`);
  }

  const usersWithoutEmail = payload.tables.users.filter((user) => !user.email).length;
  if (usersWithoutEmail) {
    warnings.push(`${usersWithoutEmail} users do not have email and cannot use email-only production login yet.`);
  }

  return warnings;
}
