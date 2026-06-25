-- Persistent, authenticated leaderboards plus a transparent first-party
-- catalog. Engagement is never seeded: every score, play, follow, and post
-- must be produced by a real user action.

ALTER TABLE games ADD COLUMN seo_title TEXT;
ALTER TABLE games ADD COLUMN seo_description TEXT;
ALTER TABLE games ADD COLUMN search_keywords TEXT;

CREATE TABLE IF NOT EXISTS game_leaderboard_config (
  game_id            TEXT PRIMARY KEY REFERENCES games(id),
  enabled            INTEGER NOT NULL DEFAULT 1,
  score_mode         TEXT NOT NULL DEFAULT 'high', -- high|low
  score_unit         TEXT NOT NULL DEFAULT 'points',
  min_run_ms         INTEGER NOT NULL DEFAULT 1500,
  max_run_ms         INTEGER NOT NULL DEFAULT 7200000,
  max_score_per_run  INTEGER NOT NULL DEFAULT 1000000000,
  trust_mode         TEXT NOT NULL DEFAULT 'client_reported', -- first_party|client_reported
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_runs (
  id            TEXT PRIMARY KEY,
  game_id       TEXT NOT NULL REFERENCES games(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'active', -- active|submitted|expired|rejected
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL,
  submitted_at  TEXT,
  score         INTEGER,
  client_build  TEXT
);
CREATE INDEX IF NOT EXISTS idx_game_runs_user ON game_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_runs_game ON game_runs(game_id, started_at DESC);

CREATE TABLE IF NOT EXISTS game_scores (
  id          TEXT PRIMARY KEY,
  game_id     TEXT NOT NULL REFERENCES games(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  run_id      TEXT NOT NULL UNIQUE REFERENCES game_runs(id),
  score       INTEGER NOT NULL,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_game_scores_rank ON game_scores(game_id, score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_game_scores_recent ON game_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id, created_at DESC);

INSERT OR IGNORE INTO game_leaderboard_config
  (game_id, enabled, score_mode, score_unit, min_run_ms, max_run_ms, max_score_per_run, trust_mode)
SELECT id, 1, 'high', 'points', 1500, 7200000, 1000000000,
       CASE WHEN verified = 1 AND official = 1 THEN 'first_party' ELSE 'client_reported' END
FROM games
WHERE status = 'published' AND deleted_at IS NULL;

INSERT OR IGNORE INTO users
  (id, username, display_name, role, status, age_band, created_at)
VALUES
  ('usr_goodgame_labs', 'goodgamelabs', 'GoodGame Labs', 'publisher', 'active', 'adult', datetime('now'));

INSERT OR IGNORE INTO profiles
  (user_id, display_name, bio, links, privacy, indexing_allowed, follower_count)
VALUES
  ('usr_goodgame_labs', 'GoodGame Labs',
   'Original browser games built and operated by the GoodGame.center platform team.',
   '[{"label":"GoodGame.center","url":"https://goodgame.center"}]',
   'public', 1, 0);

INSERT OR IGNORE INTO creator_accounts
  (user_id, verification_state, trust_tier, payout_state, support_links, official)
VALUES
  ('usr_goodgame_labs', 'verified', 'studio', 'none',
   '[{"label":"Support GoodGame","url":"https://goodgame.center"}]', 1);

INSERT OR IGNORE INTO games
  (id, owner_id, slug, title, pitch, description, engine, tags, platforms,
   build_class, status, maturity, content_rating, pricing, price_cents,
   official, verified, accent, play_count, follow_count, rating_avg,
   rating_count, moderation_status, scan_status, play_template,
   seo_title, seo_description, search_keywords, created_at, updated_at)
VALUES
  ('ggl_voidline', 'usr_goodgame_labs', 'voidline-survivor', 'Voidline Survivor',
   'A fast free browser arena shooter where movement is your only defense.',
   'Dodge a tightening swarm while your ship auto-targets the nearest threat. Voidline Survivor is a compact score-chasing arena game built for keyboard, mouse, touch, and short mobile sessions.',
   'goodgame-canvas', 'arena shooter,survival game,space game,free browser game,high score', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#68f5c3', 0, 0, 0, 0, 'clear', 'passed', 'arena',
   'Voidline Survivor - Free Browser Arena Shooter',
   'Play Voidline Survivor, a free browser arena shooter. Dodge enemy swarms, auto-fire, survive longer, and compete for the global high score.',
   'free browser arena shooter, online survival game, space shooter high score', datetime('now'), datetime('now')),

  ('ggl_rooftop', 'usr_goodgame_labs', 'rooftop-rush-runner', 'Rooftop Rush',
   'One button, one skyline, and an endless sequence of precision jumps.',
   'Sprint across a bright midnight skyline, clear rooftop hazards, and hold your nerve as the pace climbs. Rooftop Rush is a free one-button endless runner that works with Space, touch, or mobile landscape play.',
   'goodgame-canvas', 'endless runner,one button game,parkour game,free browser game,mobile game', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#ffcf4a', 0, 0, 0, 0, 'clear', 'passed', 'runner',
   'Rooftop Rush - Free One-Button Endless Runner',
   'Play Rooftop Rush, a free one-button endless runner online. Jump skyline hazards, build distance, and chase the global leaderboard.',
   'free endless runner online, one button browser game, rooftop parkour game', datetime('now'), datetime('now')),

  ('ggl_nightshift', 'usr_goodgame_labs', 'nightshift-lane-racer', 'Nightshift Lane',
   'Thread a three-lane neon highway and survive the traffic surge.',
   'Steer through a clean three-lane highway, read traffic patterns, and stay alive as speed rises. Nightshift Lane is a free browser driving game with keyboard and touch controls.',
   'goodgame-canvas', 'driving game,car game,neon racer,free browser game,mobile racing', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#ff5d73', 0, 0, 0, 0, 'clear', 'passed', 'racer',
   'Nightshift Lane - Free Neon Driving Game Online',
   'Play Nightshift Lane, a free neon driving game in your browser. Dodge traffic, survive rising speed, and rank your best distance.',
   'free driving game online, neon car game, browser traffic racer', datetime('now'), datetime('now')),

  ('ggl_sumforge', 'usr_goodgame_labs', 'sum-forge-number-puzzle', 'Sum Forge',
   'Slide, combine, and build the largest number before the board locks.',
   'Sum Forge is a clean number-merging puzzle for keyboard and touch. Plan each swipe, preserve open lanes, and compete for the best score in a familiar 2048-style challenge.',
   'goodgame-canvas', 'number puzzle,2048 style game,merge game,free puzzle game,brain game', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#8de969', 0, 0, 0, 0, 'clear', 'passed', 'merge',
   'Sum Forge - Free 2048-Style Number Puzzle',
   'Play Sum Forge, a free 2048-style number puzzle online. Merge tiles, plan every move, and put your highest score on the leaderboard.',
   'free 2048 style game, online number merge puzzle, browser brain game', datetime('now'), datetime('now')),

  ('ggl_blackout', 'usr_goodgame_labs', 'blackout-grid-logic-puzzle', 'Blackout Grid',
   'Switch every light off in six increasingly difficult logic boards.',
   'Each press flips one tile and its neighbors. Read the pattern, solve six boards, and finish in as few mistakes as possible. Blackout Grid is a free Lights Out-style logic puzzle.',
   'goodgame-canvas', 'logic puzzle,lights out game,brain teaser,free browser game,tile puzzle', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#66a7ff', 0, 0, 0, 0, 'clear', 'passed', 'logic',
   'Blackout Grid - Free Lights Out Logic Puzzle',
   'Play Blackout Grid, a free Lights Out-style logic puzzle. Clear six boards, test pattern recognition, and earn a leaderboard finish.',
   'free lights out puzzle, online logic grid game, browser brain teaser', datetime('now'), datetime('now')),

  ('ggl_breaker', 'usr_goodgame_labs', 'prism-breaker-arcade', 'Prism Breaker',
   'Break every prism with a responsive paddle and a steadily faster ball.',
   'Control the paddle with mouse, touch, or arrow keys. Clear layered prism walls, keep the ball alive, and turn each brick into points in this free browser brick breaker.',
   'goodgame-canvas', 'brick breaker,breakout game,arcade game,free browser game,paddle game', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#f08cff', 0, 0, 0, 0, 'clear', 'passed', 'breaker',
   'Prism Breaker - Free Online Brick Breaker Game',
   'Play Prism Breaker, a free online brick breaker. Move the paddle, clear every prism, and compete for the highest arcade score.',
   'free brick breaker online, browser breakout game, paddle arcade game', datetime('now'), datetime('now')),

  ('ggl_orbit', 'usr_goodgame_labs', 'orbit-catch-reflex-game', 'Orbit Catch',
   'Rotate around a live orbit and collect signals while avoiding red noise.',
   'Switch orbital direction at the right moment, collect incoming signals, and avoid hostile red pulses. Orbit Catch is a one-tap reflex game made for mobile and desktop.',
   'goodgame-canvas', 'reflex game,one tap game,orbit game,mobile browser game,high score', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#4fe1ff', 0, 0, 0, 0, 'clear', 'passed', 'orbit',
   'Orbit Catch - Free One-Tap Reflex Game',
   'Play Orbit Catch, a free one-tap reflex game online. Switch direction, collect signals, avoid hazards, and chase a global high score.',
   'free reflex game online, one tap browser game, mobile orbit game', datetime('now'), datetime('now')),

  ('ggl_snake', 'usr_goodgame_labs', 'signal-snake-grid-game', 'Signal Snake',
   'Guide a growing signal through a crisp grid without crossing your trail.',
   'Collect bright packets, grow longer, and route through tighter spaces. Signal Snake is a modern free snake game with arrow, WASD, swipe, and mobile controls.',
   'goodgame-canvas', 'snake game,grid game,classic arcade,free browser game,mobile snake', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#b8ff59', 0, 0, 0, 0, 'clear', 'passed', 'snake',
   'Signal Snake - Free Snake Game in Your Browser',
   'Play Signal Snake, a free snake game online. Collect packets, grow your trail, use swipe controls, and compete for the top score.',
   'free snake game online, browser snake game, mobile grid arcade', datetime('now'), datetime('now')),

  ('ggl_stack', 'usr_goodgame_labs', 'perfect-stack-timing-game', 'Perfect Stack',
   'Drop moving slabs, keep the tower aligned, and build for height.',
   'Tap or press Space to place each moving slab. Every overhang is cut away, so the tower gets harder to balance as it rises. Perfect Stack is a compact timing game for mobile and desktop.',
   'goodgame-canvas', 'stacking game,timing game,one button game,free browser game,tower game', 'web,mobile',
   'browser', 'published', 'everyone', 'Everyone', 'free', 0,
   1, 1, '#ff9f43', 0, 0, 0, 0, 'clear', 'passed', 'stack',
   'Perfect Stack - Free One-Button Tower Game',
   'Play Perfect Stack, a free one-button tower game online. Time each drop, preserve the platform, and build the highest leaderboard tower.',
   'free stacking game online, one button tower game, browser timing game', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO releases
  (id, game_id, version, changelog, release_notes, channel, status, is_current, release_date)
SELECT 'rel_' || id || '_100', id, '1.0.0',
       'First public release with keyboard, touch, fullscreen, and leaderboard support.',
       'First public release with keyboard, touch, fullscreen, and leaderboard support.',
       'public', 'published', 1, datetime('now')
FROM games
WHERE owner_id = 'usr_goodgame_labs';

INSERT OR IGNORE INTO game_leaderboard_config
  (game_id, enabled, score_mode, score_unit, min_run_ms, max_run_ms, max_score_per_run, trust_mode)
SELECT id, 1, 'high',
       CASE play_template
         WHEN 'runner' THEN 'distance'
         WHEN 'racer' THEN 'distance'
         WHEN 'logic' THEN 'boards'
         WHEN 'stack' THEN 'floors'
         ELSE 'points'
       END,
       CASE play_template WHEN 'logic' THEN 500 ELSE 1200 END,
       7200000,
       CASE play_template
         WHEN 'logic' THEN 6
         WHEN 'stack' THEN 10000
         ELSE 100000000
       END,
       'first_party'
FROM games
WHERE owner_id = 'usr_goodgame_labs';
