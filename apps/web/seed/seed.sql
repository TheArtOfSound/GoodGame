-- GoodGame.center launch seed content.
-- Idempotent-ish: clears core tables then repopulates. Safe to re-run.
DELETE FROM reviews;
DELETE FROM clips;
DELETE FROM posts;
DELETE FROM events;
DELETE FROM community_memberships;
DELETE FROM communities;
DELETE FROM builds;
DELETE FROM releases;
DELETE FROM news_articles;
DELETE FROM follows;
DELETE FROM games;
DELETE FROM creator_accounts;
DELETE FROM profiles;
DELETE FROM users;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
INSERT INTO users (id, email, username, display_name, role, age_band) VALUES
 ('usr_goodgame', 'studio@goodgame.center', 'goodgame', 'GoodGame Studio', 'publisher', 'adult'),
 ('usr_nova',     null, 'nova',      'Nova Mirrorball', 'verified_creator', 'adult'),
 ('usr_pixel',    null, 'pixelforge','PixelForge Collective', 'verified_creator', 'adult'),
 ('usr_aria',     null, 'aria',      'Aria Vance', 'creator', 'adult'),
 ('usr_kestrel',  null, 'kestrel',   'Kestrel', 'player', 'adult'),
 ('usr_juno',     null, 'juno',      'Juno', 'player', 'adult'),
 ('usr_bytes',    null, 'bytes',     'bytesize', 'player', 'teen');

INSERT INTO profiles (user_id, display_name, bio, links, follower_count, avatar) VALUES
 ('usr_goodgame','GoodGame Studio','First-party studio behind the official GG games. We build demos that prove what the platform can do.','[{"label":"Docs","url":"/docs"}]', 18420, '#5b8cff'),
 ('usr_nova','Nova Mirrorball','Racing and rhythm games with too much neon. Building in public.','[{"label":"Site","url":"https://example.com"}]', 3120, '#ec4899'),
 ('usr_pixel','PixelForge Collective','Small co-op making systems-driven sims. Currently shipping Starfarer Outpost.', null, 2040, '#22d3ee'),
 ('usr_aria','Aria Vance','Narrative pixel-art RPGs. Words first, then sprites.', null, 880, '#a3e635'),
 ('usr_kestrel','Kestrel','Arena player. Top 50 Blitz, occasional clip goblin.', null, 210, '#f0b323'),
 ('usr_juno','Juno','Puzzle daily streak: 140 days.', null, 95, '#34d399'),
 ('usr_bytes','bytesize','I review everything I play.', null, 64, '#8b5cf6');

INSERT INTO creator_accounts (user_id, verification_state, trust_tier, official) VALUES
 ('usr_goodgame','verified','studio',1),
 ('usr_nova','verified','pro',0),
 ('usr_pixel','verified','pro',0),
 ('usr_aria','none','starter',0);

-- ---------------------------------------------------------------------------
-- Games (8 official GG titles + indie titles)
-- ---------------------------------------------------------------------------
INSERT INTO games
 (id, owner_id, slug, title, pitch, description, engine, tags, platforms, build_class, maturity, content_rating, official, verified, accent, play_count, follow_count, rating_avg, rating_count) VALUES
 ('gg_blitz','usr_goodgame','blitz-arena','GG Blitz Arena',
  'Two-minute arena battles with instant bot backfill and weekly cups.',
  'GG Blitz Arena is a browser-first competitive arena. Matches last two to five minutes, queues fill instantly with bots so you never wait, and every season ships new skin cosmetics and a weekly tournament ladder. Built to prove realtime play, Arena events, clip capture, and achievements on GoodGame.',
  'gg','arena,realtime,pvp,esports','web','browser','everyone','Everyone 10+',1,1,'#5b8cff', 184230, 22410, 4.6, 1840),
 ('gg_card','usr_goodgame','card-clash','GG Card Clash',
  'A turn-based card battler with daily quests and a seasonal ladder.',
  'GG Card Clash is a deckbuilding battler with async multiplayer, daily quests, creator-designed cards, and a seasonal ranked ladder. It proves inventory, progression, async multiplayer, events, and monetization guardrails — no random paid rewards, ever.',
  'gg','cards,strategy,deckbuilder,async','web','browser','everyone','Everyone',1,1,'#b06bff', 96120, 14300, 4.4, 980),
 ('gg_speed','usr_goodgame','speed-run','GG Speed Run',
  'Runner-racer with ghost replays and a fresh weekly track.',
  'GG Speed Run is a deterministic runner-racer. Race the ghost replays of friends and the global best, chase a new weekly track every Monday, and submit scores that are verified against replay evidence with anti-cheat review. Proves leaderboards, replay evidence, and challenge pages.',
  'gg','racing,runner,speedrun,ghosts','web','browser','everyone','Everyone',1,1,'#2dd4bf', 142880, 11920, 4.5, 1320),
 ('gg_horror','usr_goodgame','horror-nights','GG Horror Nights',
  'Short, tense horror exploration with community-made maps.',
  'GG Horror Nights is a bite-sized horror exploration game with community map support. Download player maps, share atmosphere and spoiler-flagged clips, and pull assets through GG Forge. Proves UGC maps, spoiler/mature flags, and Forge dependencies.',
  'godot','horror,exploration,ugc,atmospheric','web','browser','teen','Teen',1,1,'#8b5cf6', 73450, 9010, 4.3, 740),
 ('gg_builder','usr_goodgame','builder-jam','GG Builder Jam',
  'A creative sandbox where your builds are shareable and rankable.',
  'GG Builder Jam is a creative building sandbox with shareable builds and regular contests. Pull asset packs, vote on community creations, and enter Builder Jam events. Proves creator sharing, asset packs, and community voting.',
  'gg','sandbox,creative,building,social','web','browser','everyone','Everyone',1,1,'#f0b323', 58900, 8650, 4.2, 610),
 ('gg_puzzle','usr_goodgame','puzzle-league','GG Puzzle League',
  'One accessible daily puzzle, built for phones and quick wins.',
  'GG Puzzle League is a friendly daily puzzle with mobile-first play and social challenges. New puzzle every day, streaks, and head-to-head challenge links. Proves daily content pages, social challenges, and low-friction retention.',
  'gg','puzzle,daily,casual,mobile','web','browser','everyone','Everyone',1,1,'#34d399', 211400, 18230, 4.7, 2410),
 ('gg_grid','usr_goodgame','battle-grid','GG Battle Grid',
  'Top-down survival arena with authoritative rooms and squads.',
  'GG Battle Grid is a top-down survival arena with real matchmaking, parties, and an authoritative server path. Squad up, hold the grid, and run team events. Proves dedicated rooms, matchmaking, parties, and team events.',
  'unity','survival,arena,coop,multiplayer','web,windows','browser','teen','Teen',1,1,'#f97316', 64720, 7780, 4.1, 520),
 ('gg_devquest','usr_goodgame','devquest','GG DevQuest',
  'An interactive tutorial game that teaches you to ship on GoodGame.',
  'GG DevQuest is a playable onboarding game for creators. Complete quests to learn uploads, the GG SDK, leaderboards, and publishing — and earn real creator badges as you go. Proves docs, SDK, publishing education, and task completion.',
  'gg','tutorial,creator,onboarding,educational','web','browser','everyone','Everyone',1,1,'#38bdf8', 41260, 6120, 4.8, 430),
 -- indie / community titles
 ('gm_neon','usr_nova','neon-drift','Neon Drift',
  'Drift through a synthwave city against your own replays.',
  'Neon Drift is a stylish arcade racer set in an endless synthwave city. Chain drifts, beat your ghosts, and climb the weekly boards. A Nova Mirrorball joint.',
  'godot','racing,arcade,synthwave','web','browser','everyone','Everyone',0,1,'#ec4899', 28310, 4120, 4.4, 360),
 ('gm_star','usr_pixel','starfarer-outpost','Starfarer Outpost',
  'Build and balance a deep-space outpost on the edge of nowhere.',
  'Starfarer Outpost is a cozy-but-deep space management sim. Keep your crew alive, trade with passing ships, and survive the long dark. Browser demo now, full native build in progress.',
  'unity','sim,space,management,strategy','web,windows,macos','browser','everyone','Everyone',0,1,'#22d3ee', 19940, 5210, 4.5, 290),
 ('gm_ink','usr_aria','inkbound-tales','Inkbound Tales',
  'A hand-lettered pixel RPG about stories that rewrite themselves.',
  'Inkbound Tales is a narrative pixel-art RPG where the words on the page are the world. Choose carefully — the ink remembers. A solo project by Aria Vance.',
  'phaser','rpg,story,pixelart,narrative','web','browser','teen','Teen',0,0,'#a3e635', 9120, 1980, 4.2, 140),
 ('gm_grid2','usr_nova','gridlock','Gridlock',
  'A bite-size logic puzzler that gets mean in the best way.',
  'Gridlock is a minimalist logic puzzle game. Simple rules, devious boards, and a daily challenge that will absolutely humble you.',
  'gg','puzzle,logic,minimal','web','browser','everyone','Everyone',0,1,'#f43f5e', 33870, 3640, 4.6, 410);

-- Current release + browser build per game
INSERT INTO releases (id, game_id, version, changelog, channel, status, is_current, release_date) VALUES
 ('rel_blitz','gg_blitz','3.2.0','Season 4 cosmetics, new map "Foundry", matchmaking tuning.','public','published',1, datetime('now','-3 days')),
 ('rel_card','gg_card','2.8.1','New "Embergrowth" card set, ladder reset, balance pass.','public','published',1, datetime('now','-6 days')),
 ('rel_speed','gg_speed','1.9.0','Weekly track #41, replay viewer improvements.','public','published',1, datetime('now','-1 days')),
 ('rel_horror','gg_horror','1.4.2','Community map browser, spoiler-flag clips, stability fixes.','public','published',1, datetime('now','-9 days')),
 ('rel_builder','gg_builder','2.1.0','Summer asset pack, contest mode, voting overhaul.','public','published',1, datetime('now','-2 days')),
 ('rel_puzzle','gg_puzzle','4.0.0','Daily streak rework, challenge links, mobile polish.','public','published',1, datetime('now','-4 days')),
 ('rel_grid','gg_grid','0.9.0','Open playtest build, party invites, region selection.','beta','published',1, datetime('now','-5 days')),
 ('rel_devquest','gg_devquest','1.1.0','New SDK quest line, leaderboard chapter, badge art.','public','published',1, datetime('now','-7 days')),
 ('rel_neon','gm_neon','1.2.0','Night City track, ghost sync fixes.','public','published',1, datetime('now','-10 days')),
 ('rel_star','gm_star','0.6.3','Trade routes, crew morale, autosave.','beta','published',1, datetime('now','-12 days')),
 ('rel_ink','gm_ink','0.4.0','Chapter 2, autosave, accessibility text options.','public','published',1, datetime('now','-15 days')),
 ('rel_grid2','gm_grid2','1.5.0','Daily challenge, colorblind palettes.','public','published',1, datetime('now','-8 days'));

INSERT INTO builds (id, release_id, game_id, class, platform, size_bytes, checksum, scan_status, smoke_test_status, entrypoint) VALUES
 ('bld_blitz','rel_blitz','gg_blitz','browser','web', 18400000,'sha256:9f2c…','passed','passed','index.html'),
 ('bld_card','rel_card','gg_card','browser','web', 9200000,'sha256:1a44…','passed','passed','index.html'),
 ('bld_speed','rel_speed','gg_speed','browser','web', 12100000,'sha256:77bd…','passed','passed','index.html'),
 ('bld_horror','rel_horror','gg_horror','browser','web', 41800000,'sha256:c0de…','passed','passed','index.html'),
 ('bld_builder','rel_builder','gg_builder','browser','web', 22600000,'sha256:55aa…','passed','passed','index.html'),
 ('bld_puzzle','rel_puzzle','gg_puzzle','browser','web', 4200000,'sha256:2bb9…','passed','passed','index.html'),
 ('bld_grid','rel_grid','gg_grid','browser','web', 58300000,'sha256:8e1f…','passed','passed','index.html'),
 ('bld_devquest','rel_devquest','gg_devquest','browser','web', 7700000,'sha256:3c7d…','passed','passed','index.html');

-- ---------------------------------------------------------------------------
-- Communities
-- ---------------------------------------------------------------------------
INSERT INTO communities (id, slug, name, owner_id, game_id, description, rules, visibility, accent, official, member_count) VALUES
 ('com_official','goodgame','GoodGame HQ','usr_goodgame',null,'The official home base. Platform news, launches, AMAs, and where the GG team hangs out.','Be decent. No spam. Report, do not retaliate.','public','#5b8cff',1, 41200),
 ('com_blitz','blitz-arena','Blitz Arena','usr_goodgame','gg_blitz','Strats, clips, and weekly cup talk for GG Blitz Arena.','Keep it competitive, keep it kind.','public','#5b8cff',1, 12840),
 ('com_jams','game-jams','GoodGame Game Jams','usr_goodgame',null,'Every jam, deadline, and team-up post in one place. Find a teammate, ship a game.','One self-promo thread per jam.','public','#f0b323',1, 8930),
 ('com_horror','horror-mapmakers','Horror Nights Mapmakers','usr_goodgame','gg_horror','UGC map sharing, Forge assets, and spoiler-flagged scares.','Spoiler-flag everything. Credit asset authors.','public','#8b5cf6',1, 5410),
 ('com_creators','creators-lounge','Creators Lounge','usr_nova',null,'For people shipping games on GoodGame. Devlogs, feedback swaps, and release-day support.','Give feedback to get feedback.','public','#22d3ee',0, 6720);

INSERT INTO community_memberships (community_id, user_id, role) VALUES
 ('com_official','usr_goodgame','owner'),
 ('com_official','usr_nova','member'),
 ('com_blitz','usr_kestrel','moderator'),
 ('com_creators','usr_nova','owner'),
 ('com_creators','usr_aria','member'),
 ('com_creators','usr_pixel','member');

-- ---------------------------------------------------------------------------
-- Arena events
-- ---------------------------------------------------------------------------
INSERT INTO events (id, slug, organizer_id, game_id, community_id, type, title, description, rules, start_at, end_at, eligibility, prize_pool, accent, status, participants) VALUES
 ('ev_blitz_cup','blitz-weekly-cup','usr_goodgame','gg_blitz','com_blitz','tournament','Blitz Arena Weekly Cup',
  'The flagship weekly. Single elimination, best-of-three, bot backfill disabled in bracket play. Check in 15 minutes before your match.',
  'Single elimination. BO3. Verified accounts only for payout. Disputes resolved with signed match results.',
  datetime('now','+1 days'), datetime('now','+1 days','+4 hours'),'Verified players, 16+','$500 + GG cosmetics','#f0b323','upcoming', 248),
 ('ev_builder_jam','summer-builder-jam','usr_goodgame','gg_builder','com_jams','jam','Summer Builder Jam',
  'A 72-hour theme jam inside GG Builder Jam. Build, publish, and the community votes. Winners get a homepage spotlight and a year of Creator Pro.',
  'Solo or teams of up to 4. Theme revealed at start. Community voting plus a judge panel.',
  datetime('now','-1 days'), datetime('now','+2 days'),'Open to all creators','Spotlight + Creator Pro (1 yr)','#f0b323','live', 612),
 ('ev_speed_weekly','speed-weekly-track','usr_goodgame','gg_speed',null,'league','Speed Run Weekly Track #41',
  'A new deterministic track every Monday. Best verified time on Sunday night takes the crown. Ghosts of the top 10 ship to everyone.',
  'Replay-verified times only. Anti-cheat review on top results before they lock.',
  datetime('now','-2 days'), datetime('now','+5 days'),'Open','GG cosmetics + leaderboard crown','#2dd4bf','live', 1390),
 ('ev_grid_playtest','battle-grid-playtest','usr_goodgame','gg_grid',null,'playtest','Battle Grid Playtest Night',
  'Help us stress the authoritative server. Squads of four, full lobbies, and a feedback form that actually gets read.',
  'Open playtest. Bugs welcome. Be cool to the netcode.',
  datetime('now','+3 days'), datetime('now','+3 days','+3 hours'),'Open','Founder playtester badge','#f97316','upcoming', 420);

-- ---------------------------------------------------------------------------
-- Clips
-- ---------------------------------------------------------------------------
INSERT INTO clips (id, slug, author_id, game_id, event_id, poster_accent, duration, caption, tags, view_count) VALUES
 ('clip_1','reverse-sweep-foundry','usr_kestrel','gg_blitz','ev_blitz_cup','#5b8cff', 24,'Down 0-2 and pulled it back on Foundry. Best comeback of my life.','blitz,clutch,cup', 38210),
 ('clip_2','frame-perfect-skip','usr_juno','gg_speed','ev_speed_weekly','#2dd4bf', 11,'Frame-perfect wall skip on Track 41. Shaved 0.4s.','speedrun,tech', 21940),
 ('clip_3','the-haunted-elevator','usr_bytes','gg_horror',null,'#8b5cf6', 33,'I was NOT ready for the elevator. Volume warning.','horror,scare,spoiler', 17630),
 ('clip_4','64x-tower','usr_nova','gg_builder','ev_builder_jam','#f0b323', 41,'My Builder Jam entry: a tower that plays itself. Vote if you like chaos.','builderjam,creative', 15120),
 ('clip_5','daily-140-streak','usr_juno','gg_puzzle',null,'#34d399', 9,'140-day streak solved in under 20 seconds. Brain fully online.','puzzle,daily', 9840),
 ('clip_6','last-stand-grid','usr_kestrel','gg_grid','ev_grid_playtest','#f97316', 28,'1v3 last stand on the playtest server. Netcode held!','battlegrid,clutch', 8120),
 ('clip_7','perfect-drift-line','usr_nova','gm_neon',null,'#ec4899', 19,'Found the perfect drift line through Night City. So smooth.','neondrift,racing', 6610),
 ('clip_8','embergrowth-otk','usr_bytes','gg_card',null,'#b06bff', 22,'Embergrowth one-turn-kill combo. The new set is busted (affectionate).','cardclash,combo', 7430);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
INSERT INTO reviews (id, game_id, author_id, rating, body, playtime_evidence, helpful_count) VALUES
 ('rev_1','gg_blitz','usr_kestrel',5,'The two-minute match length is perfect. Bot backfill means I never sit in a queue, and the weekly cup gives me a reason to come back. Cosmetics only, no pay-to-win.','42h played', 128),
 ('rev_2','gg_blitz','usr_bytes',4,'Fantastic core loop. I wish ranked had more tiers, but for a browser game this is shockingly tight.','11h played', 41),
 ('rev_3','gg_puzzle','usr_juno',5,'The daily puzzle is my morning coffee now. Mobile play is flawless and the challenge links are a great way to bully friends.','140 days streak', 96),
 ('rev_4','gg_speed','usr_juno',5,'Ghost replays make every run feel like a duel. Anti-cheat on the leaderboard actually works — top times feel legit.','60h played', 73),
 ('rev_5','gg_card','usr_bytes',4,'Deckbuilding is deep and the no-random-rewards promise is real. Embergrowth set shook up the meta in a good way.','30h played', 38),
 ('rev_6','gm_star','usr_aria',5,'Even the beta has more heart than most finished sims. The long dark genuinely got tense. Can not wait for the native build.','18h played', 27),
 ('rev_7','gg_horror','usr_bytes',4,'Short, sharp, and the community maps keep it alive. Some maps are rough but the good ones are genuinely scary.','9h played', 22);

-- ---------------------------------------------------------------------------
-- Devlog / community posts
-- ---------------------------------------------------------------------------
INSERT INTO posts (id, author_id, game_id, community_id, type, title, body) VALUES
 ('post_1','usr_goodgame','gg_blitz','com_blitz','patchnote','Season 4 is live',
  'Foundry is in the map pool, matchmaking got a tuning pass, and the cup bracket now disables bot backfill. Patch notes in releases.'),
 ('post_2','usr_pixel','gm_star','com_creators','devlog','Starfarer Outpost: trade routes devlog',
  'This week we shipped passing-ship trade. The hard part was not the economy — it was making the UI calm. Progressive disclosure won again.'),
 ('post_3','usr_nova','gm_neon','com_creators','devlog','Neon Drift: getting ghost sync right',
  'Ghost replays desynced on slow connections. Fix was deterministic input recording instead of position sampling. Clips attached.');

-- ---------------------------------------------------------------------------
-- Newsroom
-- ---------------------------------------------------------------------------
INSERT INTO news_articles (id, slug, author_id, title, excerpt, body, category, related_game_id, accent, published_at) VALUES
 ('news_launch','goodgame-center-opens','usr_goodgame','GoodGame.center opens its doors',
  'Games become communities, and communities become distribution. Today we open the hub.',
  'GoodGame.center is live. It is a place to discover games worth playing and people worth playing with — a storefront, a social feed, an events arena, and a creator platform that all reinforce one loop: discover a game, play it, clip a moment, follow the creator, join the community, and come back. Eight official GG games are live today to prove what the platform can do, from realtime arenas to daily puzzles. Creators can start publishing now.',
  'news', null, '#5b8cff', datetime('now','-1 days')),
 ('news_upload_guide','how-to-upload-a-browser-game','usr_goodgame','How to upload a browser game in 10 minutes',
  'From a zipped HTML5 build to a live, indexable game page — start to finish.',
  'This guide walks through publishing a browser game on GoodGame: exporting a web build, the resumable upload, the automatic smoke test in an isolated sandbox, filling out your game page metadata for SEO, previewing the Open Graph card, and hitting publish. Your game gets an immutable release URL, a sitemap entry, and a clip-capture hook out of the box.',
  'guide', null, '#34d399', datetime('now','-2 days')),
 ('news_spotlight_nova','creator-spotlight-nova-mirrorball','usr_goodgame','Creator spotlight: Nova Mirrorball',
  'Neon, drift lines, and building in public — meet the creator behind Neon Drift.',
  'Nova Mirrorball builds racing and rhythm games with, in their words, too much neon. We talked about getting ghost replays to feel like a duel, why the Creators Lounge community matters on launch day, and what is next after Neon Drift.',
  'spotlight', 'gm_neon', '#ec4899', datetime('now','-3 days')),
 ('news_blitz_s4','blitz-arena-season-4','usr_goodgame','GG Blitz Arena Season 4 kicks off',
  'New map Foundry, fresh cosmetics, and a retuned weekly cup bracket.',
  'Season 4 of GG Blitz Arena is here. The new map Foundry pushes vertical play, the cup bracket now disables bot backfill for real competitive integrity, and Season 4 cosmetics are earnable through play. The Weekly Cup prize pool is $500 plus GG cosmetics.',
  'patchnotes', 'gg_blitz', '#5b8cff', datetime('now','-3 days')),
 ('news_godot_guide','releasing-a-godot-game','usr_goodgame','Releasing a Godot game on GoodGame',
  'Cross-origin isolation, web exports, and getting GG Horror Nights-grade performance in the browser.',
  'Godot web exports can need cross-origin isolation headers for threaded builds. This guide covers exporting for the web, when you need COOP/COEP, how GoodGame configures the isolated play origin for you, and how to wire the GG SDK for leaderboards and achievements.',
  'guide', 'gg_horror', '#8b5cf6', datetime('now','-5 days'));

-- Follows (drive a couple of real counts; display counts already seeded on rows)
INSERT INTO follows (id, follower_id, target_type, target_id) VALUES
 ('flw_1','usr_kestrel','game','gg_blitz'),
 ('flw_2','usr_juno','game','gg_puzzle'),
 ('flw_3','usr_bytes','creator','usr_nova'),
 ('flw_4','usr_aria','community','com_creators');
