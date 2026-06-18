-- Crypto payments: a game can be priced; buyers pay by signing their OWN transfer,
-- the server verifies the tx on-chain, then grants an entitlement. No custody.
ALTER TABLE games ADD COLUMN price_amount TEXT;   -- human decimal, e.g. "1.5" (null = free)
ALTER TABLE games ADD COLUMN price_token  TEXT;   -- USDC | ETH | SOL
ALTER TABLE games ADD COLUMN pay_chain    TEXT;   -- base | base-sepolia | solana
ALTER TABLE games ADD COLUMN pay_to       TEXT;   -- receiving address (creator/platform)

CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  game_id     TEXT NOT NULL,
  buyer_id    TEXT NOT NULL,
  chain       TEXT NOT NULL,
  token       TEXT NOT NULL,
  amount      TEXT NOT NULL,      -- smallest unit (wei / micro-USDC), as string
  pay_to      TEXT NOT NULL,
  tx_hash     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | failed
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);

CREATE TABLE IF NOT EXISTS entitlements (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  game_id    TEXT NOT NULL,
  order_id   TEXT,
  granted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlement_user_game ON entitlements(user_id, game_id);
