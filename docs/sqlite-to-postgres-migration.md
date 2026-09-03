# SQLite to Supabase PostgreSQL Migration Draft

This is the draft migration path for moving KikiJob from local SQLite to Supabase PostgreSQL.

## Files

- Schema draft: `server/db/migrations/postgres/001_initial_schema.sql`
- SQLite export dry-run script: `server/scripts/export_sqlite_for_postgres.js`
- PostgreSQL import script: `server/scripts/import_sqlite_export_to_postgres.js`
- PostgreSQL migration verification script: `server/scripts/verify_postgres_migration.js`

## Current Local Source

Default SQLite path:

```text
data/auto_cv.sqlite
```

Override with:

```text
SQLITE_DATABASE_PATH=/absolute/path/to/auto_cv.sqlite
```

## Dry Run

Run:

```bash
npm run migration:sqlite:dry-run
```

This prints table counts and warnings only. It does not write files and does not connect to PostgreSQL.

## Export

Run:

```bash
npm run migration:sqlite:export
```

This writes a local JSON export to:

```text
migration-exports/
```

The export directory is ignored by Git because it can contain user data, resume text, emails, phone numbers, and private application records.

## Mapping Draft

| SQLite table | PostgreSQL target | Notes |
| --- | --- | --- |
| `users` | `users` | Preserves integer IDs during first migration. |
| `sessions` | `auth_sessions` | Production should store token hashes, not raw tokens. |
| `email_codes` | `email_codes` | Add rate limiting and real email delivery before public launch. |
| `preferences.profile_json` | `user_profiles.profile_json` | Compatibility JSON is preserved. |
| `preferences` columns | `job_preferences` | Goals, locations, salaries, industries, and company types become JSONB. |
| `resumes` | `resumes` | `raw_text` becomes `parsed_text`; original files still need Supabase Storage upload. |
| `jobs` | `companies` + `jobs` | Companies are derived by normalized company name. |
| `applications` | `applications` | Keeps `UNIQUE(user_id, job_id)` to prevent duplicates. |
| `matches` | `job_matches` | Keeps reasons and risks as JSONB. |
| `form_mappings` | `form_mappings` | Preserves existing standard and learned mappings as JSONB. |

## Supabase Manual Setup

Create a Supabase project, then:

1. Open SQL Editor.
2. Put the Supabase PostgreSQL connection string in `.env.local` as `DATABASE_URL`.
3. Run `npm run postgres:check`.
4. Run `npm run postgres:migrate:dry-run`.
5. Run `npm run postgres:migrate`.
6. Create a private Storage bucket named `resumes`.
7. Add backend environment variables:

```text
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=resumes
JWT_SECRET=
FRONTEND_URL=
CORS_ORIGIN=
```

Do not expose `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, or AI keys to Vite.

## PostgreSQL Runtime Commands

Check database connectivity:

```bash
npm run postgres:check
```

List unapplied migrations:

```bash
npm run postgres:migrate:dry-run
```

Apply migrations:

```bash
npm run postgres:migrate
```

Preview importing the latest SQLite export:

```bash
npm run postgres:import:dry-run
```

Import the latest SQLite export into PostgreSQL:

```bash
npm run postgres:import
```

Verify PostgreSQL row counts against the latest export:

```bash
npm run postgres:verify-migration
```

The runtime adapter currently supports PostgreSQL connection health and schema migration. PostgreSQL repository batches are available for profile/preferences, jobs, resumes, application maps/status history, form mappings, and email-based authentication/session persistence. Existing business APIs still default to SQLite until production email delivery, storage migration, and final deployment checks are complete.

## Latest Local Dry Run

On the current local SQLite database, export dry-run reported:

| Table | Rows |
| --- | ---: |
| users | 4 |
| user_profiles | 4 |
| job_preferences | 4 |
| companies | 6 |
| jobs | 6 |
| resumes | 7 |
| applications | 0 |
| form_mappings | 1 |
| job_matches | 0 |

Import dry-run warnings:

- 7 resumes still need Supabase Storage upload before production cutover.
- 1 user has no email and cannot use email-only production login yet.

## Migration Safety Checks

Before writing into PostgreSQL:

1. Run SQLite dry-run and review counts.
2. Export JSON locally.
3. Verify every user-owned row has `user_id`.
4. Verify resume files under `uploads/` are uploaded to private Supabase Storage.
5. Verify `applications` keeps one row per `(user_id, job_id)`.
6. Verify `form_mappings` still contains both standard mappings and learned mappings.
7. Verify jobs with empty or duplicate `source_url` are handled intentionally.

## Known Open Work

- PostgreSQL write/import script is not implemented yet.
- Phone/SMS auth and OAuth providers are not implemented for PostgreSQL production mode.
- Production email delivery is not wired yet; development mode still returns the email code for local testing.
- Supabase Storage upload is not implemented yet.
- Existing local session tokens are exported only for analysis; production should require login again or migrate token hashes intentionally.
- Phone/SMS tables are legacy and not exposed in the current login UI.
