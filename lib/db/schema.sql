-- ---------------------------------------------------------------------------
-- JobAI schema (SQLite)
--
-- Conventions
--   * ids are prefixed strings generated in JS (usr_, job_, app_ ...)
--   * timestamps are ISO-8601 UTC strings  ("2026-10-12T14:05:00.000Z")
--   * list/object columns hold JSON text and are parsed in the repositories
--   * every statement is idempotent so the file doubles as the migration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  name            TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  password_hash   TEXT    NOT NULL,
  role            TEXT    NOT NULL DEFAULT 'USER',      -- USER | ADMIN
  status          TEXT    NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE | SUSPENDED
  headline        TEXT,
  phone           TEXT,
  location        TEXT,
  website         TEXT,
  bio             TEXT,
  avatar_tone     INTEGER NOT NULL DEFAULT 0,
  last_login_at   TEXT,
  login_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS users_created_idx ON users (created_at DESC);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  ip              TEXT,
  user_agent      TEXT,
  device          TEXT,
  created_at      TEXT    NOT NULL,
  last_seen_at    TEXT    NOT NULL,
  expires_at      TEXT    NOT NULL,
  revoked_at      TEXT
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS resumes (
  id              TEXT PRIMARY KEY,
  user_id         TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title           TEXT    NOT NULL DEFAULT 'My CV',
  full_name       TEXT    NOT NULL DEFAULT '',
  headline        TEXT,
  email           TEXT,
  phone           TEXT,
  location        TEXT,
  website         TEXT,
  summary         TEXT,
  skills          TEXT    NOT NULL DEFAULT '[]',        -- JSON string[]
  experience      TEXT    NOT NULL DEFAULT '[]',        -- JSON object[]
  education       TEXT    NOT NULL DEFAULT '[]',        -- JSON object[]
  projects        TEXT    NOT NULL DEFAULT '[]',        -- JSON object[]
  languages       TEXT    NOT NULL DEFAULT '[]',        -- JSON object[]
  certifications  TEXT    NOT NULL DEFAULT '[]',        -- JSON object[]
  ats_score       INTEGER NOT NULL DEFAULT 0,
  ats_report      TEXT,                                 -- JSON object
  source          TEXT    NOT NULL DEFAULT 'builder',   -- builder | upload
  source_file     TEXT,
  is_primary      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS resumes_user_idx ON resumes (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
  id              TEXT PRIMARY KEY,
  title           TEXT    NOT NULL,
  company         TEXT    NOT NULL,
  location        TEXT    NOT NULL,
  work_mode       TEXT    NOT NULL DEFAULT 'ONSITE',    -- REMOTE | HYBRID | ONSITE
  employment_type TEXT    NOT NULL DEFAULT 'FULL_TIME', -- FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP
  seniority       TEXT    NOT NULL DEFAULT 'MID',       -- INTERN | JUNIOR | MID | SENIOR | LEAD
  salary_min      INTEGER,
  salary_max      INTEGER,
  salary_currency TEXT    NOT NULL DEFAULT 'USD',
  description     TEXT    NOT NULL,
  requirements    TEXT    NOT NULL DEFAULT '[]',        -- JSON string[]
  benefits        TEXT    NOT NULL DEFAULT '[]',        -- JSON string[]
  tags            TEXT    NOT NULL DEFAULT '[]',        -- JSON string[]
  status          TEXT    NOT NULL DEFAULT 'OPEN',      -- OPEN | CLOSED | DRAFT
  views           INTEGER NOT NULL DEFAULT 0,
  external_url    TEXT,
  posted_by       TEXT    REFERENCES users (id) ON DELETE SET NULL,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_company_idx ON jobs (company);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS applications (
  id              TEXT PRIMARY KEY,
  job_id          TEXT    NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  user_id         TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  resume_id       TEXT    REFERENCES resumes (id) ON DELETE SET NULL,
  resume_snapshot TEXT,                                 -- JSON object
  cover_letter    TEXT,
  match_score     INTEGER NOT NULL DEFAULT 0,
  ats_score       INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED | IN_REVIEW | INTERVIEW | OFFER | REJECTED | WITHDRAWN
  note            TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  reviewed_at     TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS applications_user_job_key ON applications (user_id, job_id);
CREATE INDEX IF NOT EXISTS applications_user_idx ON applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_job_idx ON applications (job_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications (status);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS application_events (
  id              TEXT PRIMARY KEY,
  application_id  TEXT    NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  from_status     TEXT,
  to_status       TEXT    NOT NULL,
  actor_id        TEXT    REFERENCES users (id) ON DELETE SET NULL,
  actor_name      TEXT,
  note            TEXT,
  created_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS application_events_app_idx
  ON application_events (application_id, created_at DESC);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saved_jobs (
  id              TEXT PRIMARY KEY,
  user_id         TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  job_id          TEXT    NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  created_at      TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_jobs_key ON saved_jobs (user_id, job_id);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity_log (
  id              TEXT PRIMARY KEY,
  user_id         TEXT    REFERENCES users (id) ON DELETE SET NULL,
  actor_name      TEXT,
  actor_role      TEXT,
  action          TEXT    NOT NULL,                     -- user.login, job.create ...
  entity          TEXT,                                 -- user | job | application | resume
  entity_id       TEXT,
  summary         TEXT,
  meta            TEXT,                                 -- JSON object
  ip              TEXT,
  user_agent      TEXT,
  created_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_created_idx ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_user_idx ON activity_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_action_idx ON activity_log (action);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS login_attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  key             TEXT    NOT NULL,                     -- email|ip bucket
  success         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS login_attempts_key_idx ON login_attempts (key, created_at DESC);
