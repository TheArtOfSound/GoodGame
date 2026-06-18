-- GoodGame.center — foundation schema
-- First-class objects: user, profile, creator, game, release, build, media,
-- clip, post, review, community, event, news. Every public object carries a
-- canonical slug, visibility, moderation_status and soft-delete from day one.

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'player',   -- visitor|player|creator|verified_creator|publisher|community_admin|event_organizer|moderator|trust_admin|system
  status        TEXT NOT NULL DEFAULT 'active',   -- active|suspended|banned
  age_band      TEXT,                             -- under13|teen|adult|unknown
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  deleted_at    TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id          TEXT PRIMARY KEY REFERENCES users(id),
  display_name     TEXT NOT NULL,
  avatar           TEXT,
  banner           TEXT,
  bio              TEXT,
  links            TEXT,                  -- json array of {label,url}
  privacy          TEXT NOT NULL DEFAULT 'public',  -- public|followers|private
  indexing_allowed INTEGER NOT NULL DEFAULT 1,
  follower_count   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS creator_accounts (
  user_id            TEXT PRIMARY KEY REFERENCES users(id),
  verification_state TEXT NOT NULL DEFAULT 'none',  -- none|pending|verified
  trust_tier         TEXT NOT NULL DEFAULT 'starter', -- starter|verified|pro|studio
  payout_state       TEXT NOT NULL DEFAULT 'none',
  support_links      TEXT,                 -- json
  official           INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Games / releases / builds / media
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES users(id),
  slug           TEXT UNIQUE NOT NULL,
  title          TEXT NOT NULL,
  pitch          TEXT,                     -- short one-line
  description    TEXT,                     -- long
  engine         TEXT,                     -- gg|godot|unity|unreal|web|phaser
  tags           TEXT,                     -- comma separated
  platforms      TEXT,                     -- comma separated: web,windows,macos,linux
  build_class    TEXT NOT NULL DEFAULT 'browser', -- browser|native|server|cloud
  status         TEXT NOT NULL DEFAULT 'published', -- draft|review|published|quarantined|unpublished
  maturity       TEXT NOT NULL DEFAULT 'everyone',  -- everyone|teen|mature
  content_rating TEXT,
  pricing        TEXT NOT NULL DEFAULT 'free',      -- free|paid
  price_cents    INTEGER NOT NULL DEFAULT 0,
  official       INTEGER NOT NULL DEFAULT 0,
  verified       INTEGER NOT NULL DEFAULT 0,
  accent         TEXT NOT NULL DEFAULT '#5b8cff',   -- cover gradient seed
  play_count     INTEGER NOT NULL DEFAULT 0,
  follow_count   INTEGER NOT NULL DEFAULT 0,
  rating_avg     REAL NOT NULL DEFAULT 0,
  rating_count   INTEGER NOT NULL DEFAULT 0,
  moderation_status TEXT NOT NULL DEFAULT 'clear',  -- clear|flagged|quarantined
  scan_status    TEXT NOT NULL DEFAULT 'passed',    -- pending|passed|failed
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_games_engine ON games(engine);
CREATE INDEX IF NOT EXISTS idx_games_class ON games(build_class);

CREATE TABLE IF NOT EXISTS releases (
  id            TEXT PRIMARY KEY,
  game_id       TEXT NOT NULL REFERENCES games(id),
  version       TEXT NOT NULL,
  changelog     TEXT,
  release_notes TEXT,
  channel       TEXT NOT NULL DEFAULT 'public', -- private|beta|public
  status        TEXT NOT NULL DEFAULT 'published',
  is_current    INTEGER NOT NULL DEFAULT 0,
  release_date  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_releases_game ON releases(game_id);

CREATE TABLE IF NOT EXISTS builds (
  id                TEXT PRIMARY KEY,
  release_id        TEXT NOT NULL REFERENCES releases(id),
  game_id           TEXT NOT NULL REFERENCES games(id),
  class             TEXT NOT NULL DEFAULT 'browser',
  platform          TEXT NOT NULL DEFAULT 'web',
  file_path         TEXT,
  size_bytes        INTEGER NOT NULL DEFAULT 0,
  checksum          TEXT,
  scan_status       TEXT NOT NULL DEFAULT 'passed',
  smoke_test_status TEXT NOT NULL DEFAULT 'passed',
  entrypoint        TEXT,
  manifest          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_assets (
  id                TEXT PRIMARY KEY,
  owner_id          TEXT REFERENCES users(id),
  game_id           TEXT REFERENCES games(id),
  type              TEXT NOT NULL,         -- capsule|hero|screenshot|trailer|clip|avatar|banner
  source_path       TEXT,
  thumbnail_path    TEXT,
  width             INTEGER,
  height            INTEGER,
  duration          INTEGER,
  alt_text          TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'clear',
  sort              INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Social objects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clips (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL,
  author_id         TEXT NOT NULL REFERENCES users(id),
  game_id           TEXT REFERENCES games(id),
  event_id          TEXT,
  video_path        TEXT,
  thumbnail_path    TEXT,
  poster_accent     TEXT NOT NULL DEFAULT '#5b8cff',
  duration          INTEGER NOT NULL DEFAULT 0,
  caption           TEXT,
  tags              TEXT,
  view_count        INTEGER NOT NULL DEFAULT 0,
  moderation_status TEXT NOT NULL DEFAULT 'clear',
  visibility        TEXT NOT NULL DEFAULT 'public',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_clips_game ON clips(game_id);

CREATE TABLE IF NOT EXISTS posts (
  id                TEXT PRIMARY KEY,
  author_id         TEXT NOT NULL REFERENCES users(id),
  game_id           TEXT REFERENCES games(id),
  community_id      TEXT,
  event_id          TEXT,
  type              TEXT NOT NULL DEFAULT 'post', -- post|devlog|announcement|patchnote
  title             TEXT,
  body              TEXT,
  visibility        TEXT NOT NULL DEFAULT 'public',
  moderation_status TEXT NOT NULL DEFAULT 'clear',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_game ON posts(game_id);

CREATE TABLE IF NOT EXISTS reviews (
  id                TEXT PRIMARY KEY,
  game_id           TEXT NOT NULL REFERENCES games(id),
  author_id         TEXT NOT NULL REFERENCES users(id),
  rating            INTEGER NOT NULL,         -- 1..5
  body              TEXT,
  playtime_evidence TEXT,
  helpful_count     INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'published',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_game ON reviews(game_id);

CREATE TABLE IF NOT EXISTS follows (
  id          TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,   -- game|creator|community|event
  target_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Communities & Arena
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS communities (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  owner_id     TEXT NOT NULL REFERENCES users(id),
  game_id      TEXT REFERENCES games(id),
  description  TEXT,
  rules        TEXT,
  visibility   TEXT NOT NULL DEFAULT 'public',  -- public|private
  accent       TEXT NOT NULL DEFAULT '#5b8cff',
  official     INTEGER NOT NULL DEFAULT 0,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at   TEXT
);

CREATE TABLE IF NOT EXISTS community_memberships (
  community_id TEXT NOT NULL REFERENCES communities(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  role         TEXT NOT NULL DEFAULT 'member',
  joined_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  organizer_id  TEXT NOT NULL REFERENCES users(id),
  game_id       TEXT REFERENCES games(id),
  community_id  TEXT REFERENCES communities(id),
  type          TEXT NOT NULL DEFAULT 'tournament', -- tournament|jam|playtest|league|launch
  title         TEXT NOT NULL,
  description   TEXT,
  rules         TEXT,
  start_at      TEXT,
  end_at        TEXT,
  eligibility   TEXT,
  prize_policy  TEXT,
  prize_pool    TEXT,                 -- display string, e.g. "$500 + GG cosmetics"
  accent        TEXT NOT NULL DEFAULT '#f0b323',
  status        TEXT NOT NULL DEFAULT 'upcoming', -- upcoming|live|completed
  participants  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Newsroom
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_articles (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  author_id       TEXT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  excerpt         TEXT,
  body            TEXT,
  category        TEXT NOT NULL DEFAULT 'news', -- news|guide|spotlight|patchnotes
  related_game_id TEXT REFERENCES games(id),
  accent          TEXT NOT NULL DEFAULT '#5b8cff',
  status          TEXT NOT NULL DEFAULT 'published',
  published_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Trust / ops foundation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT,
  action      TEXT NOT NULL,
  object_type TEXT,
  object_id   TEXT,
  reason_code TEXT,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table (foundation for auth workstream)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT
);
