-- Real Sessions durable schema.
--
-- Redis keeps what is in flight: the live interview and the rate-limit
-- counters. Everything here is what a candidate expects to still be true
-- tomorrow — the transcript with its timings, the metrics derived from it,
-- and the progress those metrics add up to.
--
-- Applied idempotently at boot by `migrate()` in db/index.ts. Every statement
-- is IF NOT EXISTS so a restart is a no-op, and columns are added rather than
-- tables recreated so no deploy ever drops a transcript.

CREATE TABLE IF NOT EXISTS sectors (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  -- Domain vocabulary and the metrics this sector actually interrogates.
  -- Injected into the interviewer prompt, which is why it lives in the
  -- database rather than in a frontend constant.
  focus       TEXT NOT NULL,
  metrics     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  sector_id   TEXT NOT NULL REFERENCES sectors(id),
  culture     TEXT NOT NULL,
  -- Shown in the picker: what this interviewer is like to sit across from.
  description TEXT NOT NULL,
  tint        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS companies_sector_idx ON companies (sector_id);

-- One row per interview that reached evaluation. `owner_id` is the identity
-- from the cookie — a guest id or an account id — never a foreign key, so a
-- guest's work exists before an account does and survives the transfer onto
-- one.
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  company       TEXT NOT NULL,
  sector_id     TEXT REFERENCES sectors(id),
  role          TEXT NOT NULL,
  stage         TEXT NOT NULL,
  -- "practice" shows live coaching, "real" withholds it. Kept per session
  -- because only "real" sessions are an honest progress signal.
  mode          TEXT NOT NULL DEFAULT 'practice',
  -- Interviewer archetype (see personas.ts). Nullable: rows written before
  -- personas existed have none, and the reader falls back to the company's.
  persona_id    TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  score         INTEGER,
  evaluation    JSONB
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS persona_id TEXT;

CREATE INDEX IF NOT EXISTS sessions_owner_idx ON sessions (owner_id, started_at DESC);

-- The raw material. Timings are what separate this from a chat log: they are
-- the only source for words-per-minute, pause length, and how long someone
-- took to start talking.
CREATE TABLE IF NOT EXISTS turns (
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,
  speaker     TEXT NOT NULL CHECK (speaker IN ('interviewer', 'candidate')),
  text        TEXT NOT NULL,
  -- Milliseconds from the start of the session. Null when the turn was typed:
  -- a typed answer has no speech timing, and inventing one would corrupt every
  -- metric derived from it.
  t_start_ms  INTEGER,
  t_end_ms    INTEGER,
  PRIMARY KEY (session_id, idx)
);

-- One row per session. Derived entirely from `turns` by pure functions in
-- metrics.ts — recomputable, never authoritative.
--
-- Split deliberately into two groups. The text columns can be derived from any
-- transcript; the timing columns need real speech and are null for a typed
-- session. Nothing here is estimated from the other half — a words-per-minute
-- inferred from an assumed speaking rate would look like a measurement and
-- silently poison every trend built on it.
CREATE TABLE IF NOT EXISTS metrics (
  session_id        UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,

  -- From the text alone.
  words             INTEGER NOT NULL,
  filler_per_100    REAL,
  -- Moving-average type-token ratio. Plain TTR falls as a transcript grows,
  -- so it cannot compare a long session against a short one.
  vocabulary_range  REAL,
  -- Candidate words over all words. How much of the interview you filled.
  word_share        REAL,

  -- From turn timings, null unless the answers were spoken.
  speaking_ms       INTEGER,
  wpm               REAL,
  -- Gap between the interviewer finishing and the candidate starting: thinking
  -- time, not a pause inside a sentence. Turn timings cannot see inside a turn.
  avg_response_ms   REAL,
  long_pauses       INTEGER,
  time_to_first_ms  REAL,

  from_speech       BOOLEAN NOT NULL DEFAULT FALSE
);

-- Append-only. Level and total are derived by folding this, never stored as a
-- counter: a mutable total silently goes wrong the first time the scoring
-- rules change, and cannot be recomputed.
CREATE TABLE IF NOT EXISTS xp_events (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  kind        TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS xp_owner_idx ON xp_events (owner_id, created_at DESC);

-- The unique constraint is the whole anti-duplicate mechanism: awarding a
-- badge is an idempotent insert, so a retried evaluation cannot grant it twice.
CREATE TABLE IF NOT EXISTS badges (
  owner_id    TEXT NOT NULL,
  badge_id    TEXT NOT NULL,
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, badge_id)
);

-- What the candidate has told us about themselves: an uploaded CV or
-- portfolio, plus the links they consider part of their work.
--
-- One row per identity, not per session — you write your CV once and it
-- informs every interview after it. `brief` is a model-written summary of the
-- raw text; the interviewer prompt gets the brief rather than a whole CV,
-- because a full document would dominate the context window and push the
-- persona and sector instructions out of the model's attention.
CREATE TABLE IF NOT EXISTS profiles (
  owner_id    TEXT PRIMARY KEY,
  -- Extracted text of the most recent upload. Kept so the brief can be
  -- regenerated when the prompt changes, without asking for the file again.
  source_text TEXT,
  source_name TEXT,
  brief       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Links are separate rows because there are several of them and their kind
-- matters: a GitHub URL tells the interviewer something different from a
-- Figma one.
CREATE TABLE IF NOT EXISTS profile_links (
  owner_id   TEXT NOT NULL,
  url        TEXT NOT NULL,
  kind       TEXT NOT NULL,
  label      TEXT,
  PRIMARY KEY (owner_id, url)
);

-- Plan grants.
--
-- One row per grant, not one column on an account. A person can be granted
-- premium more than once and for different reasons — an early-access cohort,
-- a paid subscription, a manual comp — and the effective plan is the best
-- unexpired grant. Storing a single mutable `plan` column loses why someone
-- has access and makes an expiry impossible to reason about after the fact.
CREATE TABLE IF NOT EXISTS entitlements (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  plan        TEXT NOT NULL CHECK (plan IN ('free', 'premium')),
  -- 'early-access', 'subscription', 'manual'. Kept for support and for
  -- knowing which cohort to talk to when a grant lapses.
  source      TEXT NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Null means it does not expire.
  expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS entitlements_owner_idx ON entitlements (owner_id, expires_at);

-- Early-adopter sign-ups from the landing page.
--
-- Keyed by email because it is captured before anyone has an account — the
-- grant is redeemed later, when someone signs up with the same address.
CREATE TABLE IF NOT EXISTS early_access (
  email        TEXT PRIMARY KEY,
  role         TEXT,
  company      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_until TIMESTAMPTZ NOT NULL,
  -- Set when an account with this address claimed the grant, so a shared
  -- address cannot be redeemed repeatedly.
  redeemed_at  TIMESTAMPTZ
);

-- Questions people report having actually been asked.
--
-- Deliberately not linked to a person. `contributor_hash` is a salted hash of
-- the identity, kept only so one contributor cannot flood a company with
-- submissions and so duplicates can be collapsed — it cannot be reversed into
-- who wrote what, which is what makes the promise of anonymity real rather
-- than a UI label.
CREATE TABLE IF NOT EXISTS question_reports (
  id               BIGSERIAL PRIMARY KEY,
  company_id       TEXT NOT NULL REFERENCES companies(id),
  stage            TEXT,
  role             TEXT,
  question         TEXT NOT NULL,
  contributor_hash TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'pending' until a human confirms it. The intended reviewers are working
  -- recruiters and hiring managers; until that exists, nothing here reaches
  -- an interview prompt.
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by      TEXT,
  verified_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS question_reports_company_idx
  ON question_reports (company_id, status);

-- One contributor, one report of the same question for the same company.
CREATE UNIQUE INDEX IF NOT EXISTS question_reports_dedupe_idx
  ON question_reports (company_id, contributor_hash, md5(question));

-- Subscriptions, one row per payer.
--
-- Separate from `entitlements` on purpose: an entitlement is "this identity has
-- premium until then", a subscription is "this identity has a billing
-- relationship in this state". A cancelled subscription still has a grant
-- running to the end of the period it paid for, and collapsing the two would
-- either cut someone off early or leave them premium forever.
--
-- `external_id` is the provider's own id. It is unique because a webhook
-- arrives carrying only that, and two rows sharing one would make the owner
-- ambiguous.
CREATE TABLE IF NOT EXISTS subscriptions (
  owner_id    TEXT PRIMARY KEY,
  provider    TEXT NOT NULL DEFAULT 'mercadopago',
  external_id TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL,
  -- End of the period already paid for. Null while the first payment is still
  -- pending; access is granted from the status, never from this.
  period_end  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_external_idx ON subscriptions (external_id);
