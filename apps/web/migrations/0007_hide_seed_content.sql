-- Remove prototype/seed catalog content from public production surfaces while
-- keeping genuine user-owned uploads intact.
UPDATE games
SET deleted_at = COALESCE(deleted_at, datetime('now')),
    status = 'unpublished'
WHERE owner_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community');

UPDATE clips
SET deleted_at = COALESCE(deleted_at, datetime('now'))
WHERE author_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community')
   OR game_id IN (SELECT id FROM games WHERE owner_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community'));

UPDATE posts
SET deleted_at = COALESCE(deleted_at, datetime('now'))
WHERE author_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community')
   OR game_id IN (SELECT id FROM games WHERE owner_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community'));

UPDATE reviews
SET status = 'hidden'
WHERE author_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community')
   OR game_id IN (SELECT id FROM games WHERE owner_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community'));

UPDATE communities
SET deleted_at = COALESCE(deleted_at, datetime('now')),
    visibility = 'private'
WHERE owner_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community');

UPDATE news_articles
SET status = 'draft'
WHERE author_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community')
   OR related_game_id IN (SELECT id FROM games WHERE owner_id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community'));

UPDATE users
SET deleted_at = COALESCE(deleted_at, datetime('now')),
    status = 'suspended'
WHERE id IN ('usr_goodgame', 'usr_nova', 'usr_pixel', 'usr_aria', 'usr_community');
