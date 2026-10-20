-- Isolated state for the hosted GoodGame bot. Existing site tables are untouched.
CREATE TABLE IF NOT EXISTS community_bot_runs (
  id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, state TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS community_bot_posts (
  id TEXT PRIMARY KEY, channel TEXT NOT NULL, topic TEXT NOT NULL,
  text TEXT NOT NULL, hash TEXT NOT NULL, claim_links TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','published','failed')),
  reserved_at INTEGER NOT NULL, published_at INTEGER, url TEXT,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS community_bot_history ON community_bot_posts(channel, reserved_at);
CREATE UNIQUE INDEX IF NOT EXISTS community_bot_one_pending ON community_bot_posts(channel) WHERE state='pending';
CREATE UNIQUE INDEX IF NOT EXISTS community_bot_no_repeat ON community_bot_posts(channel, hash) WHERE state!='failed';
CREATE TABLE IF NOT EXISTS community_bot_updates (
  id INTEGER PRIMARY KEY, received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS community_bot_limits (
  bucket TEXT PRIMARY KEY, used INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
