-- Opt-in public recipient settings only. No treasury, custody, balances, or payouts.
CREATE TABLE IF NOT EXISTS gg_creator_support (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  wallet_address TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
