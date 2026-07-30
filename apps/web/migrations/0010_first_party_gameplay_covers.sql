-- Real gameplay captures for the first-party catalog. The image files are
-- versioned under frontend/public/game-covers and served as static assets.

INSERT OR REPLACE INTO media_assets
  (id, owner_id, game_id, type, source_path, thumbnail_path, width, height, alt_text, moderation_status, sort)
VALUES
  ('ma_ggl_voidline_cover', 'usr_goodgame_labs', 'ggl_voidline', 'capsule', '/game-covers/voidline-survivor.webp', '/game-covers/voidline-survivor.webp', 1280, 720, 'Voidline Survivor arena gameplay with the player dodging an enemy swarm', 'clear', 0),
  ('ma_ggl_rooftop_cover', 'usr_goodgame_labs', 'ggl_rooftop', 'capsule', '/game-covers/rooftop-rush-runner.webp', '/game-covers/rooftop-rush-runner.webp', 1280, 720, 'Rooftop Rush gameplay with a runner jumping skyline obstacles', 'clear', 0),
  ('ma_ggl_nightshift_cover', 'usr_goodgame_labs', 'ggl_nightshift', 'capsule', '/game-covers/nightshift-lane-racer.webp', '/game-covers/nightshift-lane-racer.webp', 1280, 720, 'Nightshift Lane gameplay on a three-lane neon highway', 'clear', 0),
  ('ma_ggl_sumforge_cover', 'usr_goodgame_labs', 'ggl_sumforge', 'capsule', '/game-covers/sum-forge-number-puzzle.webp', '/game-covers/sum-forge-number-puzzle.webp', 1280, 720, 'Sum Forge number puzzle board with merged tiles', 'clear', 0),
  ('ma_ggl_blackout_cover', 'usr_goodgame_labs', 'ggl_blackout', 'capsule', '/game-covers/blackout-grid-logic-puzzle.webp', '/game-covers/blackout-grid-logic-puzzle.webp', 1280, 720, 'Blackout Grid logic puzzle with illuminated blue tiles', 'clear', 0),
  ('ma_ggl_breaker_cover', 'usr_goodgame_labs', 'ggl_breaker', 'capsule', '/game-covers/prism-breaker-arcade.webp', '/game-covers/prism-breaker-arcade.webp', 1280, 720, 'Prism Breaker brick wall and paddle gameplay', 'clear', 0),
  ('ma_ggl_orbit_cover', 'usr_goodgame_labs', 'ggl_orbit', 'capsule', '/game-covers/orbit-catch-reflex-game.webp', '/game-covers/orbit-catch-reflex-game.webp', 1280, 720, 'Orbit Catch reflex gameplay with signals circling a central orbit', 'clear', 0),
  ('ma_ggl_snake_cover', 'usr_goodgame_labs', 'ggl_snake', 'capsule', '/game-covers/signal-snake-grid-game.webp', '/game-covers/signal-snake-grid-game.webp', 1280, 720, 'Signal Snake grid gameplay with a growing green trail', 'clear', 0),
  ('ma_ggl_stack_cover', 'usr_goodgame_labs', 'ggl_stack', 'capsule', '/game-covers/perfect-stack-timing-game.webp', '/game-covers/perfect-stack-timing-game.webp', 1280, 720, 'Perfect Stack gameplay with aligned orange tower slabs', 'clear', 0);
