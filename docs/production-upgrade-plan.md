# KikiJob Production Upgrade Plan

## Current Runtime

- Frontend: React/Vite, deployed locally by `npm run dev`.
- Backend: Node.js native `http`, started by `npm run server`.
- Database: local SQLite at `data/auto_cv.sqlite` through `node:sqlite`.
- File storage: local `uploads/`.
- Auth: local password sessions and email-code sessions stored in SQLite.
- Chrome extension: static MV3 extension with content scripts and popup.

## Current SQLite Tables

- `users`
- `sessions`
- `sms_codes`
- `email_codes`
- `resumes`
- `preferences`
- `jobs`
- `matches`
- `applications`
- `form_mappings`

## Target Production Architecture

```text
Browser
  -> Vercel React/Vite frontend
  -> Railway/Render Node API
  -> Supabase PostgreSQL
  -> Supabase Storage private resume bucket
```

Chrome Autofill remains a user-triggered browser extension and talks to the same Node API.

## Phase 1: Configuration Foundation

Implemented:

- Frontend API base reads `VITE_API_BASE_URL`.
- Backend reads `.env.local` and `.env` without requiring a new dependency.
- Backend exposes `/health` and `/api/health`.
- Backend CORS origin is configurable through `CORS_ORIGIN` or `FRONTEND_URL`.
- Chrome extension popup API base is isolated in `chrome-extension/config.js`.
- `.env.example` documents required environment variables.

## Phase 2: Database Adapter

Create a small DB adapter layer without changing API behavior:

- `server/db/sqlite.js`
- `server/db/postgres.js`
- `server/db/index.js`

Implemented:

- SQLite connection creation now lives in `server/db/sqlite.js`.
- Runtime database selection now lives in `server/db/index.js`.
- `server/database.js` keeps the existing business persistence functions and imports the selected adapter.
- `GET /health` and `GET /api/health` report the active database provider.

Current behavior:

- `DATABASE_PROVIDER=sqlite` uses local SQLite.
- `DATABASE_URL` alone does not switch the existing business API away from SQLite.
- PostgreSQL runtime adapter supports connection pooling, health checks, and migration execution through scripts.
- A repository facade now keeps API handlers on one persistence contract while SQLite remains the default implementation.
- PostgreSQL repository first readonly batch is implemented for profile, jobs, resumes, auth provider metadata, application maps, and database info.
- PostgreSQL repository first write batch is implemented for profile/preferences, resume metadata, imported jobs, application status/history, form mappings, and profile-data clearing.
- PostgreSQL auth/session repository is implemented for email + password login, email verification-code login, hashed session-token lookup, and provider metadata.
- `DATABASE_PROVIDER=postgres` is reserved for incremental repository verification; phone auth, OAuth, Supabase Auth handoff, and production email delivery are still explicit future work.
- SQLite remains the local fallback. PostgreSQL business persistence should only be enabled after API repository functions have been ported and regression-tested.

Useful commands:

```bash
npm run postgres:check
npm run postgres:migrate:dry-run
npm run postgres:migrate
```

## Phase 3: PostgreSQL Schema

Recommended production entities:

- `users`
- `user_profiles`
- `job_preferences`
- `resumes`
- `companies`
- `jobs`
- `saved_jobs`
- `applications`
- `job_matches`
- `resume_analyses`
- `form_mappings`
- `auth_sessions` or Supabase-auth-linked session metadata

Every user-owned table must include `user_id`, `created_at`, and `updated_at`.

Implemented:

- Draft migration: `server/db/migrations/postgres/001_initial_schema.sql`.
- PostgreSQL runtime adapter: `server/db/postgres.js`.
- Repository facade: `server/repositories/index.js`.
- PostgreSQL readonly repository batch: `server/repositories/postgresRepository.js`.
- PostgreSQL write repository batch: profile/preferences, resume metadata, job import/delete, application status/history, and form mappings.
- PostgreSQL auth/session batch: email + password, email verification code, hashed session tokens, and current-user lookup.

## Phase 4: SQLite to PostgreSQL Migration

Migration script should:

1. Read current SQLite rows.
2. Transform JSON blobs into normalized PostgreSQL records where needed.
3. Preserve original JSON in compatibility columns during the first migration.
4. Insert users before user-owned tables.
5. Insert jobs before applications and matches.
6. Verify row counts and user ownership.
7. Run dry-run mode before writing.

Do not delete `data/auto_cv.sqlite` until the production database has been manually verified.

## Phase 5: Storage Migration

Move uploaded resume files from `uploads/` to a private Supabase Storage bucket.

Database should store:

- `resume_id`
- `user_id`
- `file_name`
- `storage_path`
- `file_type`
- `file_size`
- `parsed_text`
- `parsed_profile_json`
- `parse_status`

Downloads should use authenticated access or signed URLs, never a public bucket.

## Phase 6: Auth Hardening

Production must remove default-user fallback for private APIs.

Required behavior:

- Unauthenticated private API access returns `401`.
- Every profile, resume, application, and mapping query is scoped by authenticated `user_id`.
- Passwords are never stored in plain text.
- PostgreSQL auth stores password hashes and verification-code hashes. Development still returns the email code in API response; production email delivery must use a real provider before public launch.
- Rate limit login and verification-code endpoints.

Future Supabase Auth integration can map Supabase user IDs to backend profile records, while keeping Node as the business API layer.
