Original prompt: Make as many custom games as practical on GoodGame.center, give each custom SEO/indexing, add persistent leaderboards, fill out the site, and make the social feed more global without fake data.

## 2026-06-25

- Audited the live Cloudflare Worker, D1 schema, R2 game runtime, React routes, SEO shell, and production catalog.
- Production had four public user-uploaded games, three public posts, and no leaderboard tables.
- Decision: preserve real uploads; publish new games under a transparent GoodGame Labs first-party publisher; seed no scores, posts, follows, ratings, or play counts.
- Added migration 0009 with authenticated runs, persistent scores, leaderboard policies, custom SEO fields, and nine original GoodGame Labs games.
- Expanded the canvas runtime to nine distinct templates with keyboard/touch controls, fullscreen, deterministic test hooks, run-start messages, and final score messages.
- Added global activity, global posting, per-game leaderboards, global champions APIs, and corresponding React surfaces.
- Local game automation passed for arena, runner, racer, merge, logic interactions, and brick breaker; visual review found and fixed a clipped Blackout Grid level label.
- Deterministic automation now pauses the normal animation clock during tests; all nine engines render without console errors, and Perfect Stack reached score 3 in a repeatable timing sequence.
- Browser QA passed for login, iframe game-over score persistence, personal rank display, global champions, global post composer, mobile activity layout, and exact 812x375 immersive sizing.
- Replaced generated/stock card fallbacks for the new catalog with nine real 1280x720 gameplay captures stored as optimized WebP static assets.
- Live crawl reached 35 indexed URLs with zero critical failures; corrected the remaining tag-title duplication and replaced older overclaimed scan/SDK documentation with descriptions of the actual live behavior.
- In progress: type/build fixes, local migrations, browser/game verification, production migration/deploy, gameplay covers, crawl, and live validation.

## TODO

- Add and apply migration 0009.
- Add score/run and activity APIs.
- Wire iframe score events and leaderboard UI.
- Add dedicated leaderboard/activity routes.
- Publish and visually verify the first-party game batch.
- Run local game automation, build/typecheck, deploy, crawl, and live browser verification.
