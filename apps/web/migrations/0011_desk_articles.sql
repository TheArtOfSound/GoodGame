-- Constantly ingested game-news desk. Original GoodGame write-ups,
-- sourced from public RSS. source_url is unique when present (wire items).
CREATE TABLE IF NOT EXISTS desk_articles (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  excerpt       TEXT NOT NULL,
  body          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'wire',
  accent        TEXT NOT NULL DEFAULT '#7ef0ff',
  source_url    TEXT,
  source_name   TEXT,
  source_title  TEXT,
  keywords      TEXT,
  status        TEXT NOT NULL DEFAULT 'published',
  published_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_desk_source_url
  ON desk_articles(source_url) WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_desk_published
  ON desk_articles(published_at DESC);
