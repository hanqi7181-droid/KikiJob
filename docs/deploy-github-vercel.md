# KikiJob GitHub + Vercel Deployment Notes

This file is kept for legacy links. Use the production checklist instead:

[GitHub + Vercel Production Deploy](github-vercel-production-deploy.md)

## Before Uploading

Do not commit private runtime data:

- `.env`
- API keys or OAuth secrets
- `data/*.sqlite`
- uploaded resumes under `uploads/`
- local debug reports
- runtime logs

The current `.gitignore` already excludes the common local files.

## First GitHub Upload

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-github-username>/KikiPilot.git
git push -u origin main
```

After this, future changes only need:

```bash
git add .
git commit -m "Update KikiJob"
git push
```

## Vercel Frontend Deployment

For the Vite frontend:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
- Environment variable: `VITE_API_BASE_URL=https://<your-backend-domain>/api`

Vercel will redeploy automatically after every GitHub push.

## Backend Note

The current API server uses Node.js with local SQLite. This is fine for local MVP testing, but a normal Vercel frontend deployment does not provide persistent local SQLite storage.

Production options:

- Deploy the frontend on Vercel and host the API separately.
- Replace local SQLite with a hosted database before public multi-user use.
- Configure OAuth providers with real callback URLs before enabling GitHub, Google, or WeChat login.

## Required Production Secrets

Set these only in the hosting provider dashboard, not in Git:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
EMAIL_PROVIDER_API_KEY
AI_API_KEY
FRONTEND_URL
CORS_ORIGIN
```

Only expose `VITE_API_BASE_URL` to the frontend. Do not put `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JWT_SECRET`, or AI provider keys in any `VITE_*` variable.

## Chrome Extension Backend URL

Before packaging the extension for a deployed backend, update:

```text
chrome-extension/config.js
```

Set `window.JobPilotConfig.API_BASE_URL` to the production API URL. The popup and content scripts should continue to operate only after the user clicks.

## Public Demo Safety

For a public portfolio demo:

- Use test accounts.
- Do not upload real resumes.
- Keep fake/demo data clearly labeled if you add demo content.
- Do not present unverified crawler results as real jobs.
