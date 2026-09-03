# KikiJob GitHub + Vercel Production Deploy

This checklist prepares KikiJob for public deployment without committing local secrets or private user data.

## 1. Never Commit These Files

Already protected by `.gitignore`:

- `.env`, `.env.local`, `.env.production`
- `data/*.sqlite`
- `uploads/`
- `migration-exports/`
- `debug-reports/`
- local resume PDFs
- local preview screenshots
- `yxt-image-prototype/`

Before every push, run:

```bash
git status --short
```

Verify no secret file, SQLite database, uploaded resume, migration export, or private PDF appears.

## 2. Local Verification

Run:

```bash
npm run lint
npm test
npm run build
npm run postgres:check
```

If `DATABASE_PROVIDER=postgres` is enabled, also run:

```bash
npm run postgres:migrate
npm run postgres:import:dry-run
npm run postgres:verify-migration
```

## 3. GitHub First Push

Create a GitHub repo named `KikiJob` or `KikiPilot`, then run:

```bash
git add .
git status --short
git commit -m "Initial production-ready KikiJob commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/KikiJob.git
git push -u origin main
```

Do not paste real secrets into GitHub files, issue comments, README screenshots, or commit messages.

## 4. Supabase

Required:

- PostgreSQL project.
- Private Storage bucket named `resumes`.
- Rotated service role key if an old key was ever exposed.

Backend-only environment variables:

```text
DATABASE_PROVIDER=postgres
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=resumes
POSTGRES_SSL=require
POSTGRES_SSL_REJECT_UNAUTHORIZED=false
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` to Vite.

## 5. Backend Deployment

Use Railway or Render for the Node API.

Build command:

```bash
npm install
```

Start command:

```bash
npm run server
```

Backend environment variables:

```text
NODE_ENV=production
PORT=8787
FRONTEND_URL=https://YOUR_VERCEL_DOMAIN
CORS_ORIGIN=https://YOUR_VERCEL_DOMAIN
DATABASE_PROVIDER=postgres
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=resumes
EMAIL_PROVIDER=resend
EMAIL_FROM=
EMAIL_PROVIDER_API_KEY=
AUTH_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_MAX=12
RATE_LIMIT_WINDOW_MS=60000
MAX_RESUME_UPLOAD_BYTES=8388608
AI_API_KEY=
```

Health check:

```text
/api/health
```

Expected production response should include:

```json
{
  "ok": true,
  "database": "postgres"
}
```

## 6. Vercel Frontend Deployment

Import the GitHub repo into Vercel.

Framework preset:

```text
Vite
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Vercel environment variables:

```text
VITE_API_BASE_URL=https://YOUR_BACKEND_DOMAIN/api
```

Do not add backend-only secrets to Vercel.

## 7. Chrome Extension

The Chrome extension is not deployed through Vercel.

For local testing:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked.
4. Select the `chrome-extension/` directory.

For production release, package and publish it separately through Chrome Web Store after privacy review.

## 8. Current Production Gaps

- Historical resume files from local `uploads/` still need a one-time Supabase Storage migration.
- Production email delivery requires Resend domain/API key configuration.
- Phone OTP and OAuth are intentionally not enabled.
- Exposed Supabase keys/passwords should be rotated before public launch.
- Backend should be deployed before setting Vercel `VITE_API_BASE_URL`.
