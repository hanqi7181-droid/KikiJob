import '../env.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPostgresRuntimeAdapter } from '../db/postgres.js';

const projectRoot = join(import.meta.dirname, '..', '..');
const exportDir = process.env.MIGRATION_EXPORT_DIR || join(projectRoot, 'migration-exports');
const explicitFile = process.env.MIGRATION_IMPORT_FILE || process.argv.find((arg) => arg.endsWith('.json'));
const shouldWrite = process.argv.includes('--write');
const importFile = explicitFile || findLatestExportFile(exportDir);

if (!importFile || !existsSync(importFile)) {
  throw new Error('Migration import file not found. Run `npm run migration:sqlite:export` first or set MIGRATION_IMPORT_FILE.');
}

const payload = JSON.parse(readFileSync(importFile, 'utf8'));
const plan = buildImportPlan(payload);

if (!shouldWrite) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: true,
        source: payload.source || null,
        file: importFile,
        summary: plan.summary,
        warnings: payload.warnings || [],
        message: 'Dry run only. Re-run with `npm run postgres:import` to write rows.',
      },
      null,
      2
    )
  );
  process.exit(0);
}

const adapter = createPostgresRuntimeAdapter();

try {
  await adapter.query('BEGIN');
  await importUsers(adapter, plan.tables.users);
  await importUserProfiles(adapter, plan.tables.user_profiles);
  await importJobPreferences(adapter, plan.tables.job_preferences);
  await importCompanies(adapter, plan.tables.companies);
  await importJobs(adapter, plan.tables.jobs);
  await importResumes(adapter, plan.tables.resumes);
  await importApplications(adapter, plan.tables.applications);
  await importJobMatches(adapter, plan.tables.job_matches);
  await importFormMappings(adapter, plan.tables.form_mappings);
  await adapter.query('COMMIT');

  console.log(
    JSON.stringify(
      {
        ok: true,
        file: importFile,
        imported: plan.summary,
      },
      null,
      2
    )
  );
} catch (error) {
  await adapter.query('ROLLBACK');
  throw error;
} finally {
  await adapter.close();
}

function buildImportPlan(payload) {
  const tables = payload?.tables || {};
  const required = ['users', 'user_profiles', 'job_preferences', 'jobs', 'resumes', 'applications', 'form_mappings'];
  for (const tableName of required) {
    if (!Array.isArray(tables[tableName])) {
      throw new Error(`Migration payload is missing tables.${tableName}`);
    }
  }

  return {
    tables: {
      users: tables.users || [],
      user_profiles: tables.user_profiles || [],
      job_preferences: tables.job_preferences || [],
      companies: tables.companies || [],
      jobs: tables.jobs || [],
      resumes: tables.resumes || [],
      applications: tables.applications || [],
      job_matches: tables.job_matches || [],
      form_mappings: tables.form_mappings || [],
    },
    summary: Object.fromEntries(
      Object.entries(tables).map(([tableName, rows]) => [tableName, Array.isArray(rows) ? rows.length : 0])
    ),
  };
}

async function importUsers(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO users (id, auth_provider, auth_subject, name, email, phone, identity, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, NOW()))
       ON CONFLICT(id) DO UPDATE SET
         auth_provider = EXCLUDED.auth_provider,
         auth_subject = EXCLUDED.auth_subject,
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         identity = EXCLUDED.identity,
         password_hash = EXCLUDED.password_hash`,
      [
        row.id,
        row.auth_provider || 'local',
        row.auth_subject || row.email || null,
        row.name || null,
        row.email || null,
        row.phone || null,
        row.identity || null,
        row.password_hash || null,
        row.created_at || null,
      ]
    );
  }
}

async function importUserProfiles(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO user_profiles (
         user_id, name, email, phone, current_city, school, degree, major, graduation_date,
         education_json, experiences_json, projects_json, practice_json, skills_json, profile_json, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, COALESCE($16::timestamptz, NOW()))
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
        row.user_id,
        row.name || null,
        row.email || null,
        row.phone || null,
        row.current_city || null,
        row.school || null,
        row.degree || null,
        row.major || null,
        row.graduation_date || null,
        json(row.education_json, []),
        json(row.experiences_json, []),
        json(row.projects_json, []),
        json(row.practice_json, []),
        json(row.skills_json, {}),
        json(row.profile_json, {}),
        row.updated_at || null,
      ]
    );
  }
}

async function importJobPreferences(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO job_preferences (
         user_id, target_roles, goals, locations, salary_rules, industries, company_types,
         allow_resume_tailoring, preference_json, updated_at
       )
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::jsonb, COALESCE($10::timestamptz, NOW()))
       ON CONFLICT(user_id) DO UPDATE SET
         target_roles = EXCLUDED.target_roles,
         goals = EXCLUDED.goals,
         locations = EXCLUDED.locations,
         salary_rules = EXCLUDED.salary_rules,
         industries = EXCLUDED.industries,
         company_types = EXCLUDED.company_types,
         allow_resume_tailoring = EXCLUDED.allow_resume_tailoring,
         preference_json = EXCLUDED.preference_json`,
      [
        row.user_id,
        row.target_roles || null,
        json(row.goals, []),
        json(row.locations, []),
        json(row.salary_rules, {}),
        json(row.industries, []),
        json(row.company_types, []),
        Boolean(row.allow_resume_tailoring),
        json(row.preference_json, {}),
        row.updated_at || null,
      ]
    );
  }
}

async function importCompanies(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO companies (name, company_type, locations)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT((LOWER(name))) DO UPDATE SET
         company_type = COALESCE(EXCLUDED.company_type, companies.company_type),
         locations = EXCLUDED.locations`,
      [row.name, row.company_type || null, json(row.locations, [])]
    );
  }
}

async function importJobs(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO jobs (
         id, source, source_url, title, company_name, location, salary, jd_text, tags,
         company_type, recruitment_type, channel, is_demo, fetched_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, COALESCE($14::timestamptz, NOW()))
       ON CONFLICT(id) DO UPDATE SET
         source = EXCLUDED.source,
         source_url = EXCLUDED.source_url,
         title = EXCLUDED.title,
         company_name = EXCLUDED.company_name,
         location = EXCLUDED.location,
         salary = EXCLUDED.salary,
         jd_text = EXCLUDED.jd_text,
         tags = EXCLUDED.tags,
         company_type = EXCLUDED.company_type,
         recruitment_type = EXCLUDED.recruitment_type,
         channel = EXCLUDED.channel,
         is_demo = EXCLUDED.is_demo`,
      [
        row.id,
        row.source,
        row.source_url || null,
        row.title,
        row.company_name,
        row.location || null,
        row.salary || null,
        row.jd_text || null,
        json(row.tags, []),
        row.company_type || null,
        row.recruitment_type || null,
        row.channel || null,
        Boolean(row.is_demo),
        row.fetched_at || null,
      ]
    );
  }
}

async function importResumes(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO resumes (
         id, user_id, file_name, storage_path, file_type, file_size, parsed_text,
         parsed_profile_json, is_default, parse_status, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, COALESCE($11::timestamptz, NOW()))
       ON CONFLICT(id) DO UPDATE SET
         file_name = EXCLUDED.file_name,
         storage_path = EXCLUDED.storage_path,
         file_type = EXCLUDED.file_type,
         file_size = EXCLUDED.file_size,
         parsed_text = EXCLUDED.parsed_text,
         parsed_profile_json = EXCLUDED.parsed_profile_json,
         is_default = EXCLUDED.is_default,
         parse_status = EXCLUDED.parse_status`,
      [
        row.id,
        row.user_id,
        row.file_name,
        row.storage_path || null,
        row.file_type || null,
        row.file_size || null,
        row.parsed_text || null,
        nullableJson(row.parsed_profile_json),
        Boolean(row.is_default),
        row.parse_status || 'pending',
        row.created_at || null,
      ]
    );
  }
}

async function importApplications(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO applications (
         id, user_id, job_id, status, resume_id, submitted_at, applied_at, follow_up_at,
         next_action, notes, submission_result, autofill_session_id, updated_source, updated_at, deleted_at
       )
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8::timestamptz, $9, $10, $11, $12, $13, COALESCE($14::timestamptz, NOW()), $15::timestamptz)
       ON CONFLICT(user_id, job_id) DO UPDATE SET
         status = EXCLUDED.status,
         resume_id = EXCLUDED.resume_id,
         submitted_at = EXCLUDED.submitted_at,
         applied_at = EXCLUDED.applied_at,
         follow_up_at = EXCLUDED.follow_up_at,
         next_action = EXCLUDED.next_action,
         notes = EXCLUDED.notes,
         submission_result = EXCLUDED.submission_result,
         autofill_session_id = EXCLUDED.autofill_session_id,
         updated_source = EXCLUDED.updated_source,
         deleted_at = EXCLUDED.deleted_at`,
      [
        row.id,
        row.user_id,
        row.job_id,
        row.status,
        row.resume_id || null,
        row.submitted_at || null,
        row.applied_at || null,
        row.follow_up_at || null,
        row.next_action || null,
        row.notes || null,
        row.submission_result || null,
        row.autofill_session_id || null,
        row.updated_source || null,
        row.updated_at || null,
        row.deleted_at || null,
      ]
    );
  }
}

async function importJobMatches(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO job_matches (id, user_id, job_id, score, reasons_json, risks_json, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, COALESCE($7::timestamptz, NOW()))
       ON CONFLICT(id) DO NOTHING`,
      [row.id, row.user_id, row.job_id, row.score, json(row.reasons_json, []), json(row.risks_json, []), row.created_at || null]
    );
  }
}

async function importFormMappings(adapter, rows) {
  for (const row of rows) {
    await adapter.query(
      `INSERT INTO form_mappings (user_id, mappings_json, updated_at)
       VALUES ($1, $2::jsonb, COALESCE($3::timestamptz, NOW()))
       ON CONFLICT(user_id) DO UPDATE SET mappings_json = EXCLUDED.mappings_json`,
      [row.user_id, json(row.mappings_json, []), row.updated_at || null]
    );
  }
}

function findLatestExportFile(directory) {
  if (!existsSync(directory)) return '';
  const files = readdirSync(directory)
    .filter((fileName) => /^sqlite-export-.*\.json$/.test(fileName))
    .sort();
  const latest = files.at(-1);
  return latest ? join(directory, latest) : '';
}

function json(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function nullableJson(value) {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

export { buildImportPlan };
