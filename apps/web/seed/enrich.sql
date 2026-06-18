-- GoodGame.center — per-game build-out (run AFTER seed.sql).
-- Rich descriptions, real release history, and reviews/clips for every title.
-- Additive + idempotent: clears its own rows first, then repopulates.
DELETE FROM reviews WHERE id LIKE 'rv2_%';
DELETE FROM releases WHERE id LIKE 'relx_%';
DELETE FROM clips WHERE id LIKE 'clx_%';
DELETE FROM profiles WHERE user_id LIKE 'usrx_%';
DELETE FROM users WHERE id LIKE 'usrx_%';

-- Extra players (reviewers + clippers) so faces and voices vary across pages.
INSERT INTO users (id, email, username, display_name, role, age_band) VALUES
 ('usrx_rook', null, 'rook',   'Rook',        'player', 'adult'),
 ('usrx_vex',  null, 'vexel',  'Vexel',       'player', 'adult'),
 ('usrx_mara', null, 'mara',   'Mara Quill',  'player', 'adult'),
 ('usrx_dash', null, 'dash',   'dashboard',   'player', 'teen'),
 ('usrx_iris', null, 'iris',   'Iris Okonkwo','player', 'adult'),
 ('usrx_finn', null, 'finn',   'Finn',        'player', 'adult'),
 ('usrx_sol',  null, 'solene', 'Solene',      'player', 'adult');
INSERT INTO profiles (user_id, display_name, bio, follower_count, avatar) VALUES
 ('usrx_rook','Rook','Arena grinder. I clip my own losses too.', 410, '#f0556b'),
 ('usrx_vex','Vexel','Speedrunner. Frames are everything.', 530, '#2dd4bf'),
 ('usrx_mara','Mara Quill','Cozy sim enjoyer, reluctant horror fan.', 280, '#22d3ee'),
 ('usrx_dash','dashboard','Daily puzzles before homework.', 70, '#34d399'),
 ('usrx_iris','Iris Okonkwo','Deckbuilder theorycrafter.', 360, '#b06bff'),
 ('usrx_finn','Finn','I will playtest anything once.', 150, '#f97316'),
 ('usrx_sol','Solene','Narrative games and good UI.', 190, '#a3e635');

-- Community creator — owner for games published from the /create flow.
INSERT OR IGNORE INTO users (id, email, username, display_name, role, age_band) VALUES
 ('usr_community', null, 'community', 'Community Creator', 'creator', 'adult');
INSERT OR IGNORE INTO profiles (user_id, display_name, bio, follower_count, avatar) VALUES
 ('usr_community','Community Creator','Games published straight from the GoodGame create flow.', 0, '#6b93ff');

-- Playable templates: wire browser games to a built-in, working game engine.
UPDATE games SET play_template='arena'  WHERE id IN ('gg_blitz','gg_grid');
UPDATE games SET play_template='runner' WHERE id='gg_speed';
UPDATE games SET play_template='racer'  WHERE id='gm_neon';
UPDATE games SET play_template='merge'  WHERE id='gg_puzzle';
UPDATE games SET play_template='logic'  WHERE id='gm_grid2';

-- ---------------------------------------------------------------------------
-- Rich, distinct descriptions (rendered as multi-paragraph prose on game pages)
-- ---------------------------------------------------------------------------
UPDATE games SET description =
'GG Blitz Arena is a browser-first competitive arena built entirely around the two-minute match. Queue up, get dropped straight into a fight thanks to instant bot backfill, and play a complete, swingy round before your coffee gets cold. Every match ends on a clip-worthy beat — and the capture button is right there waiting.

Under the hood it is the proving ground for everything realtime on GoodGame: authoritative round logic, a weekly tournament ladder, seasonal cosmetic-only progression, and verified result reporting for cup play. Season 4 adds the vertical map Foundry and disables bot backfill inside the bracket, so competitive integrity actually means something.

No pay-to-win, ever — cosmetics are earned or bought, never power. Follow the game for season drops and cup check-ins, then jump into the Blitz Arena community for strats and clip threads.'
WHERE id = 'gg_blitz';

UPDATE games SET description =
'GG Card Clash is a deckbuilding battler you can play one turn at a time. Build around creator-designed cards, take your turn whenever you have a spare minute, and let async multiplayer handle the rest — no waiting on an opponent, no ranked anxiety, just the next good decision.

It is the platform''s proof that progression and economy can run deep without turning predatory: an inventory you genuinely own, a seasonal ranked ladder, daily quests, and a hard rule against random paid rewards. The odds on a paid pack are easy to read, because there are none.

The new Embergrowth set reshaped the meta around explosive one-turn combos. Bring your spiciest list to the seasonal ladder, or theorycraft in the community before the next balance pass lands.'
WHERE id = 'gg_card';

UPDATE games SET description =
'GG Speed Run is a deterministic runner-racer where you are never really racing alone. Every attempt is shadowed by ghost replays — your friends, the global best, last week''s champion — so a personal best feels less like a number going down and more like winning a duel.

A brand-new track drops every Monday and locks Sunday night. Times are verified against full replay evidence with anti-cheat review on the top of the board, so a crown is a crown. The ghosts of the top ten ship to everyone the following week to chase.

It proves leaderboards, replay evidence, and challenge pages done properly. Chase Track #41, share a frame-perfect skip as a clip, and follow for the Monday drop.'
WHERE id = 'gg_speed';

UPDATE games SET description =
'GG Horror Nights is bite-sized dread. Each session is a short, tense exploration through a hand-built space where the lights, the audio, and the pacing do all the work — no bloat, no busywork, just the walk and the fear.

The real engine is the community: download player-made maps, pull atmosphere and props through GG Forge, and share spoiler-flagged clips of the best scares. It is GoodGame''s end-to-end proof of UGC maps, mature and spoiler flagging, and Forge dependencies working together.

Built in Godot and served from an isolated, cross-origin-isolated play origin so threaded WASM runs clean. Teen-rated, volume strongly recommended, and the elevator is not sorry.'
WHERE id = 'gg_horror';

UPDATE games SET description =
'GG Builder Jam is a creative sandbox where the entire point is to share. Snap together asset packs, wire up simple logic, and publish a build that anyone can open, remix, vote on, and build on top of.

Regular Builder Jam contests turn that into a rhythm: a theme drops, you get 72 hours, and the community plus a judge panel pick the winners. It proves creator sharing, asset packs, and community voting as first-class platform features rather than afterthoughts.

Win a jam and you land a homepage spotlight and a year of Creator Pro. Bring chaos — the tower that plays itself is currently winning hearts in the Summer Jam.'
WHERE id = 'gg_builder';

UPDATE games SET description =
'GG Puzzle League is the daily habit. One clean, mobile-first puzzle every single day, designed to be solved in a couple of minutes and to feel genuinely great the moment it clicks into place.

Streaks keep you honest, and head-to-head challenge links let you hand a friend the exact board you just beat. It is the platform''s proof that daily content, social challenges, and low-friction retention can live on a single calm page with nothing shouting at you.

No timers screaming, no clutter — just today''s puzzle, your streak, and the people you are quietly trying to out-solve. Come back tomorrow; you will.'
WHERE id = 'gg_puzzle';

UPDATE games SET description =
'GG Battle Grid is a top-down survival arena built for squads. Drop into a real lobby, hold ground against escalating waves, and coordinate with a party of four where smart positioning beats twitch reflexes every time.

It is the heaviest official demo by design: real matchmaking, parties, and an authoritative server path running on a Unity build that targets both the browser and native Windows. It proves dedicated rooms, matchmaking, parties, and team events at production weight.

Currently in open playtest — squads welcome, bugs expected, netcode appreciated. Join a Playtest Night, stress the server with us, and earn the Founder playtester badge.'
WHERE id = 'gg_grid';

UPDATE games SET description =
'GG DevQuest is an onboarding game that happens to teach you everything. Play through its quests and you will have uploaded a build, wired up the GG SDK, pushed a leaderboard score, and shipped a real page — without reading a single wall of documentation.

Each completed chapter grants an actual creator badge that carries onto your profile, so learning the platform and proving you know it become the same action. It proves docs, SDK, publishing education, and task completion as a single playable loop.

If you have ever bounced off a developer portal, start here. It is the friendliest path there is from "I have an idea" to "it is live on GoodGame."'
WHERE id = 'gg_devquest';

UPDATE games SET description =
'Neon Drift is a stylish arcade racer set in an endless synthwave city that never stops glowing. Chain drifts through neon canyons, feather the racing line, and let a soundtrack of pure 1984 carry you around the next bend.

Like GG Speed Run, your real opponent is a ghost — your own best run replayed beside you, plus the weekly community boards. Nova Mirrorball builds it in public, and the devlog on getting ghost-sync to feel like a duel is worth the read.

A Godot web build, free to play, with a new Night City track in the latest update. Find the perfect drift line, hold it, and clip it.'
WHERE id = 'gm_neon';

UPDATE games SET description =
'Starfarer Outpost is a cozy-but-deep space management sim about keeping a fragile outpost alive on the edge of nowhere. Balance power, oxygen, and crew morale against the slow, patient creep of the long dark.

Trade with passing ships, automate the routine, and make genuinely hard calls when the supplies run thin. PixelForge are shipping the browser demo now, with a full native build for Windows and macOS in progress.

Even in beta it carries more heart than most finished sims. Wishlist-follow it for the native release, and read the trade-routes devlog over in the Creators Lounge.'
WHERE id = 'gm_star';

UPDATE games SET description =
'Inkbound Tales is a hand-lettered pixel RPG where the words on the page are the world. Read carefully — every choice is written in ink, and the ink remembers exactly what you decided three chapters ago.

It is a quiet, narrative-first game: story before systems, sprites in service of sentences. A solo project by Aria Vance, now through Chapter 2 with full accessibility text options and a save system that respects your time.

Teen-rated and best played slowly, with the sound on. Follow Aria for chapter drops and the occasional behind-the-words devlog.'
WHERE id = 'gm_ink';

UPDATE games SET description =
'Gridlock is a minimalist logic puzzler that is mean in the best possible way. The rules fit on a napkin; the boards will keep you up at night arguing with yourself about a single tile.

A fresh daily challenge resets the humility every morning, with colorblind-friendly palettes and a clean single-screen layout. No tutorials longer than the game itself, no clutter — just you and the grid and a growing suspicion that you are not as clever as you thought.

If you like your puzzles sharp and your interface calm, this is the one. Bring a streak, lose it spectacularly, and come back tomorrow.'
WHERE id = 'gm_grid2';

-- ---------------------------------------------------------------------------
-- Release history (prior versions; current release already seeded)
-- ---------------------------------------------------------------------------
INSERT INTO releases (id, game_id, version, changelog, channel, status, is_current, release_date) VALUES
 ('relx_blitz_b','gg_blitz','3.1.0','Spectator mode for cup matches, ping display, audio mix pass.','public','published',0, datetime('now','-24 days')),
 ('relx_blitz_c','gg_blitz','3.0.0','Season 3 launch: new ranked tiers, replay export, anti-smurf checks.','public','published',0, datetime('now','-58 days')),
 ('relx_card_b','gg_card','2.7.0','Daily quest rework, deck import/export codes, mobile drag fixes.','public','published',0, datetime('now','-31 days')),
 ('relx_card_c','gg_card','2.5.0','Seasonal ladder added, creator-card submission tools.','public','published',0, datetime('now','-72 days')),
 ('relx_speed_b','gg_speed','1.8.0','Ghost opacity options, leaderboard filters, track #38-40.','public','published',0, datetime('now','-18 days')),
 ('relx_speed_c','gg_speed','1.5.0','Replay sharing, challenge links, anti-cheat review queue.','public','published',0, datetime('now','-49 days')),
 ('relx_horror_b','gg_horror','1.4.0','Forge asset hot-loading, new lighting model, two official maps.','public','published',0, datetime('now','-26 days')),
 ('relx_horror_c','gg_horror','1.2.0','Community map browser beta, spoiler-flag system.','public','published',0, datetime('now','-61 days')),
 ('relx_builder_b','gg_builder','2.0.0','Logic blocks, remixable builds, voting overhaul.','public','published',0, datetime('now','-20 days')),
 ('relx_builder_c','gg_builder','1.6.0','Asset pack marketplace preview, contest mode beta.','public','published',0, datetime('now','-55 days')),
 ('relx_puzzle_b','gg_puzzle','3.9.0','Streak insurance, share cards, dark mode polish.','public','published',0, datetime('now','-22 days')),
 ('relx_puzzle_c','gg_puzzle','3.5.0','Head-to-head challenge links, daily archive.','public','published',0, datetime('now','-66 days')),
 ('relx_grid_b','gg_grid','0.8.0','Party invites, region selection, server browser.','beta','published',0, datetime('now','-21 days')),
 ('relx_grid_c','gg_grid','0.7.0','Authoritative server path, first matchmaking pass.','beta','published',0, datetime('now','-44 days')),
 ('relx_dq_b','gg_devquest','1.0.0','Launch: upload, SDK, and publishing quest lines.','public','published',0, datetime('now','-40 days')),
 ('relx_neon_b','gm_neon','1.1.0','Weekly boards, drift-scoring tuning, two new cars.','public','published',0, datetime('now','-34 days')),
 ('relx_star_b','gm_star','0.6.0','Crew morale system, save slots, UI calm pass.','beta','published',0, datetime('now','-38 days')),
 ('relx_ink_b','gm_ink','0.3.0','Chapter 1 full, branching save system.','public','published',0, datetime('now','-52 days')),
 ('relx_grid2_b','gm_grid2','1.4.0','Daily challenge, streaks, colorblind palettes.','public','published',0, datetime('now','-30 days'));

-- ---------------------------------------------------------------------------
-- Reviews — every title carries a populated, evidence-gated reviews section
-- ---------------------------------------------------------------------------
INSERT INTO reviews (id, game_id, author_id, rating, body, playtime_evidence, helpful_count) VALUES
 ('rv2_blitz1','gg_blitz','usrx_rook',5,'Foundry changed the whole meta — vertical play rewards aggression now. The fact that cup matches drop bot backfill is the only reason I take ranked seriously.','120h played', 64),
 ('rv2_card1','gg_card','usrx_iris',5,'Async means I get a full game in during meetings (sorry). Embergrowth is the best set design they have shipped — combo-y without being uninteractive.','64h played', 52),
 ('rv2_card2','gg_card','usrx_dash',4,'Free progression is generous and the no-random-rewards thing is real. Wish the ladder reset was monthly not seasonal.','19h played', 18),
 ('rv2_speed1','gg_speed','usrx_vex',5,'The replay verification is the whole game for me. I have been burned by fake leaderboards before — here the top times actually hold up to scrutiny.','210h played', 91),
 ('rv2_speed2','gg_speed','usrx_finn',4,'New track every Monday keeps it fresh. Ghost sync is buttery now after the 1.8 patch.','27h played', 23),
 ('rv2_horror1','gg_horror','usrx_mara',4,'I do not even like horror and I finished every official map. The community maps are a coin flip but the best ones are better than the originals.','9h played', 31),
 ('rv2_builder1','gg_builder','usrx_finn',5,'The logic blocks are deceptively powerful. Built a working calculator. The voting + remix loop is genuinely addictive.','48h played', 44),
 ('rv2_builder2','gg_builder','usrx_sol',4,'Calmest creation UI I have used. Asset packs save so much time. Contests are what keep me coming back.','22h played', 16),
 ('rv2_puzzle1','gg_puzzle','usrx_dash',5,'Solved every day for two months. The challenge links are how my whole class trash-talks each other now.','62 day streak', 58),
 ('rv2_grid1','gg_grid','usrx_finn',4,'For a playtest the netcode is shockingly stable. 1v3 clutches actually feel fair. Squad UI needs work but the foundation is there.','14h played', 29),
 ('rv2_grid2','gg_grid','usrx_rook',4,'Authoritative server means no more host-advantage nonsense. Played four Playtest Nights, zero rubber-banding.','11h played', 14),
 ('rv2_dq1','gg_devquest','usrx_sol',5,'I shipped my first game because of this. Did not realize I was learning the SDK until I had already used it. The badges are a great hook.','6h played', 47),
 ('rv2_dq2','gg_devquest','usrx_iris',5,'Best onboarding I have seen on any platform. The leaderboard chapter clicked instantly.','4h played', 22),
 ('rv2_neon1','gm_neon','usrx_vex',5,'Pure vibes and a surprisingly deep drift model. The Night City track is gorgeous. Ghosts make solo play feel alive.','31h played', 33),
 ('rv2_neon2','gm_neon','usrx_mara',4,'Synthwave overload in the best way. Could use more tracks, but what is here is polished.','12h played', 11),
 ('rv2_star1','gm_star','usrx_mara',5,'The long dark sequences are genuinely tense. Trade routes added a whole strategy layer. Buying the native build day one.','34h played', 40),
 ('rv2_ink1','gm_ink','usrx_sol',5,'Writing this good in a pixel RPG is rare. Choices actually echo. Chapter 2 ending wrecked me.','15h played', 26),
 ('rv2_ink2','gm_ink','usrx_iris',4,'Slow burn, but the ink-memory mechanic is clever and the accessibility options are thoughtful.','8h played', 9),
 ('rv2_grid2a','gm_grid2','usrx_dash',5,'Deceptively brutal. I have rage-quit and come back daily for a month. The colorblind palettes are appreciated.','41 day streak', 35),
 ('rv2_grid2b','gm_grid2','usrx_finn',4,'Perfect commute game. Rules are dead simple, solutions are not. Lost a 20-day streak and immediately started again.','19h played', 12);

-- ---------------------------------------------------------------------------
-- Clips — every title has a few shareable moments
-- ---------------------------------------------------------------------------
INSERT INTO clips (id, slug, author_id, game_id, event_id, poster_accent, duration, caption, tags, view_count) VALUES
 ('clx_dq1','shipped-my-first-game','usrx_sol','gg_devquest',null,'#38bdf8', 16,'The moment DevQuest published my first real game page. Genuinely emotional.','devquest,creator', 5120),
 ('clx_grid2a','gridlock-daily-humbling','usrx_dash','gm_grid2',null,'#f43f5e', 12,'Today''s Gridlock daily took me 9 minutes. NINE. For four tiles.','gridlock,daily,puzzle', 4310),
 ('clx_star1','the-long-dark-survived','usrx_mara','gm_star',null,'#22d3ee', 37,'Made it through the long dark with one crew member and zero power. Barely.','starfarer,sim,clutch', 6740),
 ('clx_ink1','the-ink-remembers','usrx_sol','gm_ink',null,'#a3e635', 28,'Chapter 2 callback to a choice I made in the first ten minutes. No spoilers.','inkbound,story', 3920),
 ('clx_puzzle2','blindfold-daily','usrx_dash','gg_puzzle',null,'#34d399', 14,'Solved the daily without looking at the board. Do not ask why.','puzzle,daily,challenge', 7210),
 ('clx_speed2','new-track-wr','usrx_vex','gg_speed','ev_speed_weekly','#2dd4bf', 18,'New track #41 world record run, fully replay-verified. 1:02.4.','speedrun,wr,verified', 18430),
 ('clx_horror2','community-map-gem','usrx_mara','gg_horror',null,'#8b5cf6', 31,'This community map "The Tenants" is better than anything I expected. Spoiler-flagged.','horror,ugc,spoiler', 9240),
 ('clx_card2','iris-combo-line','usrx_iris','gg_card',null,'#b06bff', 24,'Full Embergrowth combo line explained. Yes it is fair. Mostly.','cardclash,combo,guide', 8830),
 ('clx_blitz2','foundry-vertical-play','usrx_rook','gg_blitz','ev_blitz_cup','#5b8cff', 21,'Using Foundry''s top route to flank the whole lobby. Vertical play is here.','blitz,strats,foundry', 12610),
 ('clx_builder2','tower-that-plays-itself','usrx_finn','gg_builder','ev_builder_jam','#f0b323', 44,'Full tour of the self-playing tower. It even keeps score. Vote Builder Jam!','builderjam,logic,creative', 10120);
