# JobAI 2.0

A CV scoring and job-matching application. It parses a CV the way an applicant
tracking system does, scores it against six explainable checks, compares it
against every job posting's keyword list, and gives the operator an admin
console over all of it.

Rebuilt from JobAI 1.0: new structure, new data layer, real authentication,
real résumé parsing, a full admin console, a design system and a responsive
shell.

---

## Running it

Requires **Node.js 20.9 or newer** (Next.js 16 minimum).

```bash
npm install          # installs dependencies
cp .env.example .env.local
npm run db:reset     # creates the database and fills it with demo data
npm run dev          # http://localhost:3000
```

`npm run db:reset` prints the sign-in details. By default:

| Account | Email            | Password     | Sees                       |
| ------- | ---------------- | ------------ | -------------------------- |
| Admin   | `admin@jobai.dev`| `Admin12345` | Everything, incl. `/admin` |
| Member  | `demo@jobai.dev` | `Demo12345`  | The member app             |

Three more member accounts (`nino.beridze@example.com`,
`giorgi.cheishvili@example.com`, `mariam.kapanadze@example.com`, all
`Member12345`) exist so the admin screens have real data in them.

### The session secret

Sessions are signed with `AUTH_SECRET`. If you do not set one, the app
generates a random secret on first run and saves it to `data/.auth-secret`
(mode 600, git-ignored), so a fresh clone works immediately and sessions
survive restarts.

For a real deployment — or anywhere running more than one instance — set it in
the environment instead, so every instance signs with the same key:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### The database driver

The app prefers **better-sqlite3**, which is fast and works on Node 20+. It is
a native module, so it is listed as an *optional* dependency: if no prebuilt
binary exists for your platform and you have no compiler, `npm install` still
succeeds and the app falls back to **`node:sqlite`**, built into Node 22.5 and
later. Both are tested; `/api/health` reports which one is in use.

### Scripts

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Development server                                  |
| `npm run build`     | Production build                                    |
| `npm start`         | Serve the production build                          |
| `npm run lint`      | ESLint (flat config, `eslint-config-next`)          |
| `npm run db:setup`  | Create the database and tables if missing           |
| `npm run db:seed`   | Fill it with demo data (wipes existing rows)        |
| `npm run db:reset`  | Delete the file, recreate it, re-seed               |
| `npm run test`      | Scoring, matching, parsing and validation checks    |
| `npm run test:db`   | Repository and auth checks against the seeded data  |

---

## What changed from 1.0

The review of the original turned up these, all of which are fixed here.

**Broken or missing**

- `/api/jobs` and `/api/jobs/apply` were called by the UI but **did not exist**,
  so the job list was always empty and applying silently failed.
- `lib/db.js` contained a second copy of the register route handler.
- `lib/ai.js` was empty.
- `job.tags` was stored as a comma-separated string but rendered with
  `tags.map()`, so tags never appeared.
- `matchScore` was rendered but never computed anywhere.
- The `Resume` table existed but nothing ever wrote to it — CVs lived only in
  `localStorage`, so they were lost on another device and invisible to the admin.
- CV upload called the parse endpoint and then overwrote the result with
  hard-coded strings.

**Security**

- The session token was kept in `localStorage` (readable by any script) and
  sent as a bearer header. It is now a signed **httpOnly cookie**.
- `/admin` and every `/api/admin/*` route were **completely unprotected** —
  any visitor could list applicants, post jobs and delete records. Admin access
  is now enforced in three places: the proxy, the page layout and every route
  handler.
- The JWT never carried a role, and the login route never checked one.
- `JWT_SECRET` fell back to `"fallback_secret_key"`. Production now refuses to
  start without a real `AUTH_SECRET`.
- There was no request validation, so any shape of JSON reached the database.
- Nothing rate-limited sign-in attempts.
- A user could read and edit another user's records through the API.

**Interface**

- The navbar always showed "Sign in / Get started", signed in or not.
- There was no sign-out, no session handling, no account screen.
- No mobile navigation: links were simply hidden below `md`.
- `globals.css` was the untouched create-next-app file, fighting the hard-coded
  `bg-slate-950` on `<body>` and forcing Arial over the configured font.
- The CV builder could only edit a name, headline and skill list.
- Every new user was shown a fabricated CV for "Alex Rivera" from San Francisco.
- The landing page quoted invented metrics ("94.2% ATS pass rate"). Every
  number shown now comes from the database or from the user's own CV.

---

## Structure

```
app/
  layout.jsx              root: fonts, theme, providers, boot loader
  page.jsx                landing page
  (auth)/                 sign in + register, split-screen layout
  (member)/               everything behind sign-in, in the app shell
    dashboard/  jobs/  jobs/[id]/  applications/  saved/
    cv/  cv/upload/  cv/preview/  settings/
  admin/                  admin console, role-guarded in its layout
    page  users/  users/[id]/  jobs/  applications/  activity/
  api/                    27 route handlers (see below)
components/
  ui/                     the component kit: Button, Panel, Field, Table…
  layout/                 AppShell, SideNav, headers, footer
  loader/                 BootLoader (the JobAI sweep), RouteProgress
  jobs/  cv/  admin/      feature components
  providers/              theme, auth, inline theme script
lib/
  db/                     schema.sql + one repository per table
  auth/                   password hashing, JWT, session, request metadata
  ats.js                  the six ATS checks
  match.js                CV ↔ job keyword matching
  resume-parse.js         PDF / DOCX / text extraction and field parsing
  optimize.js             bullet rewriting, summary drafting
  validation.js           Zod schemas for every endpoint
  http.js                 response envelope + withUser / withAdmin guards
proxy.js                  route protection (Next 16 renamed middleware → proxy)
scripts/                  db setup, seed, and the test suites
```

### Stack

Next.js 16.4 (App Router, Turbopack) · React 19.3 · Tailwind CSS v4 ·
SQLite via better-sqlite3 · jose (JWT) · bcryptjs · Zod · lucide-react.

Fonts are self-hosted through Fontsource — no request to Google Fonts, so the
app works offline and behind a restricted network.

---

## How the scoring works

Nothing here calls an external AI service. There is no API key to buy and
nothing about a user's CV leaves the server. "AI" in this project means
deterministic, explainable text analysis, which has the advantage that every
number can be traced to the rule that produced it.

**`lib/ats.js` — the score out of 100**

| Check              | Points | What earns them                                               |
| ------------------ | -----: | ------------------------------------------------------------- |
| Contact block      |     15 | Name, headline, email, phone, location                        |
| Summary            |     15 | Present, 25–90 words, no unprovable filler                    |
| Skills keywords    |     20 | 8–18 distinct tools, no duplicates                            |
| Experience depth   |     25 | Dated, titled roles with ≥2 achievement lines opening on a verb|
| Measurable results |     15 | Half the achievement lines carry a number                     |
| Formatting hygiene |     10 | Line lengths, complete name, education present, no buzzwords  |

Each check returns the points it withheld **and the sentence that earns them**,
which is what the builder and the dashboard display.

**`lib/match.js` — the match percentage**

Keyword coverage (55) + title alignment (15) + seniority fit (15) + location
and work mode (15). Keywords are read from the posting's tags first, then from
its requirements and description, filtered through a technical vocabulary so
"basic" and "experience" never become keywords. Synonyms are resolved, so a CV
saying "JavaScript" matches a posting asking for "JS".

**`lib/resume-parse.js` — reading an uploaded file**

Text comes out of PDFs (`pdf-parse`), DOCX (`mammoth`) or plain text, then
heuristics find the contact block, split the document on section headings, and
read roles, dates, achievement bullets, education, skills and languages.

A field it cannot find is left **empty** and reported as missing rather than
guessed, and the result is shown for review before anything is saved.

---

## API

Every endpoint answers in one shape — `{ ok: true, ... }` or
`{ ok: false, error: { message, code, fields? } }` — so the client never has to
guess, and form errors land on the right field.

| Method | Route | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public, rate limited |
| POST | `/api/auth/logout` | session |
| GET / PATCH | `/api/auth/me` | session |
| PATCH | `/api/auth/password` | session |
| GET / DELETE | `/api/auth/sessions` | session |
| DELETE | `/api/auth/sessions/[id]` | session, owner only |
| GET | `/api/jobs` | public (match data added when signed in) |
| POST | `/api/jobs` | admin |
| GET | `/api/jobs/[id]` | public |
| PATCH / DELETE | `/api/jobs/[id]` | admin |
| POST | `/api/jobs/[id]/apply` | session |
| GET / POST / DELETE | `/api/jobs/[id]/save` | session |
| GET / POST | `/api/resumes` | session |
| GET / PATCH / DELETE | `/api/resumes/[id]` | session, owner only |
| POST | `/api/resumes/[id]/primary` | session, owner only |
| GET | `/api/applications` | session |
| GET / PATCH | `/api/applications/[id]` | session, owner only |
| POST | `/api/cv/parse` | session, multipart |
| POST | `/api/cv/score` | session |
| POST | `/api/cv/optimize` | session |
| POST | `/api/cv/summary` | session |
| GET | `/api/admin/overview` | admin |
| GET | `/api/admin/users` | admin |
| GET / PATCH / DELETE | `/api/admin/users/[id]` | admin |
| GET / PATCH | `/api/admin/applications` | admin |
| GET | `/api/admin/activity` | admin |
| GET | `/api/admin/export?dataset=` | admin, returns CSV |
| GET | `/api/health` | public |

---

## Authentication

1. The password is hashed with bcrypt (10 rounds) and never leaves the server.
2. A row in `sessions` records the device, IP and expiry.
3. A JWT (HS256, via `jose`) holding the user id, role and **session id** is
   written to an httpOnly, SameSite=Lax cookie.
4. `proxy.js` verifies the signature on every page request and redirects — an
   optimistic check only.
5. The page layout then re-verifies against the database: the session row must
   be live and the account must not be suspended.
6. API routes guard themselves through `withUser` / `withAdmin`.

Because the session id is in the token and checked against the table, "sign out
this device" and "suspend this account" take effect **immediately**, which a
stateless JWT cannot do.

Also enforced: a failed sign-in never reveals whether the email exists; eight
failures in fifteen minutes throttles the pair; changing a password revokes
every other session; and an admin cannot demote, suspend or delete themselves,
nor remove the last admin.

---

## The admin console

- **Overview** — counts, a 14-day chart of signups and applications, the
  application funnel, most-applied postings, the skill spread across all CVs,
  platform counters and recent activity.
- **Members** — searchable and sortable table; each member has a page holding
  every stored field, their CVs with scores and skills, every application,
  saved jobs, every session with device and IP, and their activity history.
- **Job postings** — create, edit, open/close and delete, with application and
  view counts per posting.
- **Applications** — filter by stage, read the CV exactly as it was sent,
  change the decision and leave a note the applicant can read.
- **Activity log** — every sign-in, failed attempt, CV change, application and
  admin action, searchable, with the address it came from.
- **CSV export** for members, applications and postings.

---

## The loader

The brief asked for a loader that writes "JobAI" and fills from left to right
in the site's colour. `components/loader/BootLoader.jsx` does this with a
ghosted outline of the wordmark and a highlighter sweep clipped by a `--fill`
custom property.

It is server-rendered, so the sweep starts before any JavaScript arrives (CSS
keyframes run on their own). Once hydrated, JavaScript takes the fill over and
ties it to real readiness — fonts loaded, document complete — so the percentage
and the sweep never disagree. It shows once per tab; an inline script marks
repeat visits before first paint so navigating back never flashes it again.
`prefers-reduced-motion` gets the finished state immediately, and if JavaScript
never runs at all, a CSS fallback clears the overlay after two seconds.

---

## Design

The interface is built as paper under a scanner, because that is what the
product does: a cool paper ground, navy ink, hairline rules, and one
highlighter colour that only ever marks a keyword match, a score or the active
item. The wordmark carries the same device.

- **Type**: Archivo (with Archivo Black for display), IBM Plex Mono reserved
  for machine output — parsed keywords, identifiers, counts.
- **Tokens**: every colour is a CSS variable in `app/globals.css`; the dark
  theme restates them rather than inverting, and chart colours are stepped
  separately per theme and validated for colour-vision deficiency and contrast.
- **Themes**: light and dark, chosen by the toggle or the OS, with no flash.
- **Responsive**: a fixed rail from 1024px, a slide-over drawer below that,
  tables that scroll rather than collapse, and layouts verified at 390, 820,
  1440 and 1600px.
- **Accessibility**: visible focus rings, labelled controls, `role="meter"` on
  scores, a table view behind the chart, reduced-motion support, and status
  never communicated by colour alone.

---

## Testing

```bash
npm run test       # 27 checks: ATS scoring, matching, parsing, validation
npm run test:db    # 29 checks: repositories, sessions, JWT, rate limiting
npm run test:api   # 86 checks: every endpoint over HTTP, against a running server
```

`npm run test:db` seeds its own throwaway database, so it neither depends on
nor disturbs your data.

`npm run test:api` needs a server running, and it does write to whatever
database that server is using — it registers accounts, applies to jobs and
changes statuses on purpose, because that is what it is checking. Point it at a
disposable instance:

```bash
npm start &
npm run test:api                               # defaults to localhost:3000
npm run test:api -- http://localhost:3000      # or pass the URL
npm run db:reset                               # tidy up afterwards
```

It covers the boundaries that matter: a member cannot read another member's CV
or application, cannot reach any admin route, cannot apply twice; an admin
cannot demote, suspend or delete themselves; a revoked session stops working
immediately; a suspended account cannot sign in; and repeated failed sign-ins
are throttled.

---

## Notes

- The database is a single file, `data/jobai.db` (git-ignored). Delete it and
  run `npm run db:reset` to start over.
- `better-sqlite3` is a native module; `npm install` fetches a prebuilt binary
  for your platform.
- The build prints one Turbopack warning about dynamic filesystem access in
  `lib/db/client.js`. That is the database path being resolved at runtime, which
  is intentional; it only affects file tracing for standalone output.
- To move to PostgreSQL or MySQL, replace `lib/db/client.js` and the repository
  modules. Nothing above them knows which database is underneath.
