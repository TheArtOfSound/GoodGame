-- Password-backed accounts for the React onboarding/login flow.
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN pin_hash TEXT;

CREATE TABLE IF NOT EXISTS reports (
  id             TEXT PRIMARY KEY,
  reporter_id    TEXT NOT NULL REFERENCES users(id),
  target_type    TEXT NOT NULL,
  target_id      TEXT NOT NULL,
  community_id   TEXT,
  reason         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open',
  resolution     TEXT,
  resolved_by    TEXT,
  resolved_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_community ON reports(community_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

ALTER TABLE community_memberships ADD COLUMN muted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_memberships ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;
