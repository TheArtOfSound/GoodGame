-- Creator-hosted games: instead of uploading a .zip, a creator can point GoodGame
-- at a game they already host (itch, Firebase, GitHub Pages, their own domain) and
-- we embed it live in the play frame. Nothing is stored or scanned by GoodGame for
-- these — the build runs on the creator's own origin.
--   embed_url        the external https URL we iframe (null = not a linked game)
--   embed_verified   1 once the creator has proven they control the domain
--   embed_token      the verification token they place (meta tag or /.well-known file)
--   embed_checked_at last time we fetched the URL to check framing / ownership
ALTER TABLE games ADD COLUMN embed_url TEXT;
ALTER TABLE games ADD COLUMN embed_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN embed_token TEXT;
ALTER TABLE games ADD COLUMN embed_checked_at TEXT;
