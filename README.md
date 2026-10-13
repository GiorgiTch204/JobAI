<div align="center">

# JobAI

**See your CV the way an applicant tracking system sees it.**

Parse a CV, score it against six explainable checks, and match it to job postings by keyword — with an admin console over all of it. No external AI service, no API keys: every number traces back to the rule that produced it.

[**Live demo →**](https://jobai-app.onrender.com)

![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)
![Node](https://img.shields.io/badge/Node-%E2%89%A5%2020.9-339933?logo=nodedotjs&logoColor=white)

</div>

---

## Features

**For members**
- **CV import** — upload a PDF, DOCX or plain text file; JobAI extracts contact details, roles, dates, achievement bullets, education, skills and languages. Fields it can't find are left empty and flagged, never guessed, and you review everything before it's saved.
- **ATS score out of 100** — six checks, each telling you exactly what to fix to earn the missing points.
- **CV builder** — edit every section, preview the printable résumé and print or save it as PDF.
- **Bullet and summary optimiser** — rewrites weak lines ("responsible for…") into verb → action → tool → result, and tells you when a number is missing instead of inventing one.
- **Job board with match percentage** — filter by seniority, work mode and employment type; see matched and missing keywords per posting.
- **Applications and saved jobs** — apply with a chosen CV, follow your status through the pipeline, read the reviewer's notes.
- **Account security** — see every signed-in device, sign out any of them, change your password.

**For admins**
- **Overview** — 14-day signup/application chart, application funnel, most-applied postings, skill distribution across all CVs.
- **Members** — searchable, sortable; a full profile per member with CVs, applications, sessions and activity. Suspend, promote or delete.
- **Job postings** — create, edit, open/close and delete, with view and application counts.
- **Applications** — filter by stage, read the CV exactly as submitted, change the decision and leave a note.
- **Activity log** — every sign-in, failed attempt, CV change and admin action, with source IP.
- **CSV export** for members, applications and postings.

---

## How the scoring works

Nothing about a CV leaves the server. "AI" here means deterministic, explainable text analysis.

### ATS score — `lib/ats.js`

| Check              | Points | What earns them                                                  |
| ------------------ | -----: | ---------------------------------------------------------------- |
| Contact block      |     15 | Name, headline, email, phone, location                           |
| Summary            |     15 | Present, 25–90 words, no unprovable filler                       |
| Skills keywords    |     20 | 8–18 distinct tools, no duplicates                               |
| Experience depth   |     25 | Dated, titled roles with ≥ 2 achievement lines that open on a verb |
| Measurable results |     15 | At least half the achievement lines contain a number             |
| Formatting hygiene |     10 | Sensible line lengths, full name, education present, no buzzwords |

Each check returns the points it withheld **and the sentence that earns them back**.

### Job match — `lib/match.js`

| Signal                    | Weight |
| ------------------------- | -----: |
| Keyword coverage          |     55 |
| Title alignment           |     15 |
| Seniority fit             |     15 |
| Location and work mode    |     15 |

Keywords come from a posting's tags first, then its requirements and description, filtered through a technical vocabulary so words like "basic" or "experience" never count. Synonyms resolve, so a CV saying "JavaScript" matches a posting asking for "JS".

### CV parsing — `lib/resume-parse.js`

Text is extracted with `pdf-parse` (PDF), `mammoth` (DOCX) or read directly (TXT). Heuristics then locate the contact block, split on section headings, and read roles, dates, bullets, education, skills and languages.

---

## Tech stack

| Layer        | Choice                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, `proxy.js` route protection), React 19          |
| Styling      | Tailwind CSS v4, CSS-variable design tokens, light/dark themes          |
| Database     | SQLite — `better-sqlite3`, falling back to Node's built-in `node:sqlite` |
| Auth         | bcryptjs, `jose` (HS256 JWT) in an httpOnly cookie, DB-backed sessions  |
| Validation   | Zod on every endpoint                                                   |
| Parsing      | `pdf-parse`, `mammoth`                                                  |
| Type & icons | Fontsource (self-hosted, no Google Fonts), lucide-react                 |

---

## Getting started

**Requirements:** Node.js 20.9 or newer.

```bash
git clone https://github.com/<your-username>/JobAI.git
cd JobAI

npm install
cp .env.example .env.local
npm run db:reset      # creates the database and fills it with demo data
npm run dev           # http://localhost:3000
```

### Demo accounts (created by `npm run db:reset`)

| Role   | Email             | Password      |
| ------ | ----------------- | ------------- |
| Admin  | `admin@jobai.dev` | `Admin12345`  |
| Member | `demo@jobai.dev`  | `Demo12345`   |

Three more members (`nino.beridze@example.com`, `giorgi.cheishvili@example.com`, `mariam.kapanadze@example.com`, all `Member12345`) are seeded so the admin screens have data to show.

> These credentials are for local development only. Change or remove them before exposing a real deployment.

### Environment variables

| Variable          | Required        | Description                                                              |
| ----------------- | --------------- | ------------------------------------------------------------------------ |
| `AUTH_SECRET`     | In production   | ≥ 32 random characters used to sign session tokens. If unset locally, one is generated into `data/.auth-secret`. |
| `DATABASE_FILE`   | No              | SQLite file path relative to the project root. Default `data/jobai.db`.  |
| `SESSION_TTL_DAYS`| No              | How long a session stays valid. Default `7`.                             |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | No | Admin account created by `db:seed`.                      |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`   | No | Demo member created by `db:seed`.                        |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Scripts

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Development server                                   |
| `npm run build`     | Production build                                     |
| `npm start`         | Serve the production build                           |
| `npm run lint`      | ESLint                                               |
| `npm run db:setup`  | Create the database and tables if missing            |
| `npm run db:seed`   | Fill with demo data (wipes existing rows)            |
| `npm run db:reset`  | Delete the file, recreate it, re-seed                |
| `npm test`          | Scoring, matching, parsing and validation checks     |
| `npm run test:db`   | Repository and auth checks on a throwaway database   |
| `npm run test:api`  | Every endpoint over HTTP against a running server    |

---

## Deploying to Render

1. Create a **Web Service** from your GitHub repo.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. **Environment variables:** set `AUTH_SECRET` (generate one as above). Optionally set `NODE_VERSION=22`.
5. Make sure `tailwindcss` and `@tailwindcss/postcss` are in `dependencies`, not `devDependencies` — Render installs with `NODE_ENV=production`, which skips dev dependencies, and the CSS build fails without them.

**Persistence:** the database is a single SQLite file. On Render, the filesystem is wiped on every deploy and restart unless you attach a **persistent disk** (paid plans). Mount it at e.g. `/var/data` and set `DATABASE_FILE=/var/data/jobai.db`. On the free tier, expect accounts and CVs to reset.

The health endpoint `/api/health` reports status and which SQLite driver is in use.

---

## Project structure

```
app/
  page.jsx                 landing page
  (auth)/                  sign in and register
  (member)/                dashboard, jobs, applications, saved, cv, settings
  admin/                   overview, users, jobs, applications, activity
  api/                     route handlers (auth, jobs, resumes, applications, cv, admin, health)
components/
  ui/                      Button, Panel, Field, Table, Modal, Toast…
  layout/ loader/          app shell, navigation, boot loader
  jobs/ cv/ admin/         feature components
lib/
  db/                      schema.sql + one repository per table
  auth/                    password hashing, JWT, sessions
  ats.js  match.js         scoring and matching
  resume-parse.js          PDF / DOCX / text extraction
  optimize.js              bullet and summary rewriting
  validation.js            Zod schemas
proxy.js                   optimistic route protection (Next 16 "middleware")
scripts/                   db setup, seed, test suites
```

---

## API

Every endpoint responds with `{ ok: true, … }` or `{ ok: false, error: { message, code, fields? } }`.

| Area         | Routes                                                                   | Access              |
| ------------ | ------------------------------------------------------------------------ | ------------------- |
| Auth         | `POST /api/auth/register`, `/login`, `/logout`; `GET/PATCH /api/auth/me`; `PATCH /api/auth/password`; `GET/DELETE /api/auth/sessions[/id]` | public / session |
| Jobs         | `GET /api/jobs`, `GET /api/jobs/[id]`                                    | public              |
|              | `POST /api/jobs`, `PATCH/DELETE /api/jobs/[id]`                          | admin               |
|              | `POST /api/jobs/[id]/apply`, `GET/POST/DELETE /api/jobs/[id]/save`       | session             |
| Résumés      | `GET/POST /api/resumes`, `GET/PATCH/DELETE /api/resumes/[id]`, `POST /api/resumes/[id]/primary` | session, owner only |
| Applications | `GET /api/applications`, `GET/PATCH /api/applications/[id]`              | session, owner only |
| CV tools     | `POST /api/cv/parse`, `/score`, `/optimize`, `/summary`                  | session             |
| Admin        | `/api/admin/overview`, `/users[/id]`, `/applications`, `/activity`, `/export?dataset=` | admin |
| Health       | `GET /api/health`                                                        | public              |

---

## Security

- Passwords hashed with bcrypt; never returned by the API.
- Session JWT in an **httpOnly, SameSite=Lax cookie** — not readable by scripts.
- The token carries a **session id** that is checked against the database on every protected page, so "sign out this device" and "suspend this account" take effect immediately.
- Admin access is enforced in three places: the proxy, the page layout and each route handler.
- Members can only read and modify their own résumés and applications.
- Failed sign-ins don't reveal whether an email exists; repeated failures are rate-limited.
- Changing a password revokes all other sessions. Admins can't demote, suspend or delete themselves, or remove the last admin.
- Production refuses to start without a real `AUTH_SECRET`.
- Every request body is validated with Zod.

---

## Testing

```bash
npm test             # ATS scoring, matching, parsing, validation
npm run test:db      # repositories, sessions, JWT, rate limiting (own throwaway DB)
npm start &          # then, against a disposable instance:
npm run test:api     # every endpoint over HTTP, including permission boundaries
```

`test:api` writes to the database the server is using (it registers accounts and applies to jobs on purpose), so point it at a disposable instance and run `npm run db:reset` afterwards.

---

## Design

Built as *paper under a scanner*: a cool paper ground, navy ink, hairline rules, and a single highlighter colour reserved for keyword matches, scores and the active item. Light and dark themes with no flash on load, a fixed side rail on desktop and a drawer on mobile, visible focus rings, `role="meter"` on scores, reduced-motion support, and status never conveyed by colour alone.

---

## Roadmap

- PostgreSQL option for multi-instance deployments (the repository layer in `lib/db/` is the only code that knows about SQLite)
- Email notifications on application status changes
- Cover-letter checks alongside the CV score
- Georgian-language CV parsing and keyword vocabulary

---

## License

Add a license of your choice (MIT is a common default) as `LICENSE` and reference it here.
