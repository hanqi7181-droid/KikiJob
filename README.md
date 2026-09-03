# KikiJob

KikiJob is a job recommendation, application tracking, and assisted autofill MVP for candidates.

The product keeps a human-in-the-loop workflow: KikiJob can identify and prefill recruitment forms after the user opens a logged-in official application page, but the final submission is always completed manually by the user on the recruitment website.

## Current Capabilities

- Responsive web app with four main areas: Recommendations, Assisted Apply, Applications, and My Profile.
- First-use onboarding wizard: login, resume upload, profile confirmation, job preferences, autofill boundaries, and completion review.
- Resume PDF upload and rule-based parsing.
- Per-user profile, resume, field mapping, and application data after login.
- Recommendation page with company and job cards, filters, official apply links, notes, and save/delete actions.
- Assisted apply workflow that cooperates with the Chrome Autofill extension.
- Application CRM with list and board views.
- My Profile page combining basic profile, experiences, resume versions, preferences, autofill rules, learned field mappings, and privacy/data actions.
- Chrome Autofill extension with MokaHR adapter, generic scanner/matcher/filler, learned mappings, debug exports, and no auto-submit behavior.

## Data Policy

KikiJob should not display fake jobs as real jobs.

- Demo seed jobs are disabled by default.
- The job list API filters out demo rows.
- Imported official jobs must include a source URL and are deduplicated.
- The conservative career-site crawler only imports links that look like real job detail pages. If it cannot verify a page as a job detail, it skips it instead of polluting the recommendation list.

Email login is currently the active login surface:

- Email/password login works locally.
- Email verification-code login works locally; development uses code `123456`.
- Phone OTP, WeChat OAuth, GitHub OAuth, and Google OAuth are not exposed in the current UI.
- Production email delivery still needs a real email provider before public launch.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the API server:

```bash
npm run server
```

Start the web app:

```bash
npm run dev
```

Default local URLs:

- Web: `http://localhost:5174/` or the Vite port printed in the terminal.
- API health: `http://localhost:8787/api/health`

Environment:

- Copy `.env.example` to `.env.local` for local backend settings.
- Set `VITE_API_BASE_URL` for the Vite frontend when the backend is not `http://localhost:8787/api`.
- Update `chrome-extension/config.js` with the deployed backend API URL before packaging the Chrome extension.
- Follow [GitHub + Vercel Production Deploy](docs/github-vercel-production-deploy.md) before pushing a public repository.

## Useful Scripts

```bash
npm run lint
npm test
npm run build
```

## Main Project Structure

```text
src/
  api/                 Web API client
  data/                Shared seed/profile helpers and local view-model helpers
  onboarding/          First-use wizard state and step components
  styles.css           Global KikiJob theme and responsive styles
  main.jsx             Web app shell, routes, and page composition

server/
  index.js             API routes
  database.js          SQLite schema, persistence, sessions, mappings, jobs
  jobCrawler.js        Conservative official-career-page discovery
  jobImporter.js       Job import, normalization, and deduplication

chrome-extension/
  src/content/         Content-script scanner/filler runtime
  src/core/            Scanner, matcher, filler, profile normalization
  src/adapters/        MokaHR and generic ATS adapters
  src/popup/           Extension popup UI
```

## Chrome Autofill Safety

- The extension only operates after the user clicks.
- It does not read passwords or captcha fields.
- It does not bypass login, captcha, or platform risk controls.
- It does not click final submit buttons.
- Sensitive fields stay opt-in or manual-confirmation only.

## Git Hygiene

Ignored by default:

- `node_modules/`
- `dist/`
- SQLite database files under `data/`
- uploaded resumes under `uploads/`
- runtime logs
- local MokaHR filled/debug reports

Do not commit real resumes, local databases, phone numbers, email dumps, or filled application reports.

If any Supabase service role key, database password, JWT secret, or email provider key was pasted into chat, screenshots, logs, or a committed file, rotate it before public deployment.
