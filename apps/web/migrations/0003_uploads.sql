-- Uploaded web builds: entrypoint path (relative) + total size. Files live in R2
-- under prefix ugc/<gameId>/. When upload_entry is set, the game serves its own build.
ALTER TABLE games ADD COLUMN upload_entry TEXT;
ALTER TABLE games ADD COLUMN upload_bytes INTEGER;
