-- User requested a clean production slate: no old games, demos, placeholders,
-- clips, posts, reviews, or game-linked events/news should remain public.
UPDATE games
SET deleted_at = COALESCE(deleted_at, datetime('now')),
    status = 'unpublished'
WHERE deleted_at IS NULL;

UPDATE clips
SET deleted_at = COALESCE(deleted_at, datetime('now'))
WHERE deleted_at IS NULL;

UPDATE posts
SET deleted_at = COALESCE(deleted_at, datetime('now'))
WHERE deleted_at IS NULL;

UPDATE reviews
SET status = 'hidden'
WHERE status = 'published';

UPDATE communities
SET deleted_at = COALESCE(deleted_at, datetime('now')),
    visibility = 'private'
WHERE deleted_at IS NULL;

UPDATE news_articles
SET status = 'draft'
WHERE status = 'published';
