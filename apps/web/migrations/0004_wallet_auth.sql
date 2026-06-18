-- Wallet-based identity. A user can be created from any connected wallet
-- (EVM via SIWE, Solana via signed message). Sessions live in KV, not SQL.
ALTER TABLE users ADD COLUMN wallet_address TEXT;
ALTER TABLE users ADD COLUMN wallet_chain TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
