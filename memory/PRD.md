# GoodGame.center — PRD

## Original problem statement
Rebuild GoodGame.center as a browser-first game platform on the Emergent stack (React + FastAPI + MongoDB + Emergent object storage). Replaces the user's Cloudflare Workers + Hono + D1 + R2 + KV repo only at the application layer — the security/auth/zip-ingest patterns can be ported back if the user keeps Cloudflare.

## Architecture
- Frontend: React 19 + React Router 7 + Tailwind + react-helmet-async on port 3000 (CRA dev server).
- Backend: FastAPI on 0.0.0.0:8001, all routes prefixed `/api`.
- DB: MongoDB via `motor`.
- File storage: Emergent managed object storage (zip game builds, thumbnails, video clips, avatars, banners).
- Auth: PBKDF2-HMAC-SHA256 (600k iters) password & PIN, random-UUID session ids in HttpOnly Secure SameSite=Lax cookie. Legacy SHA-256 auto-rehash on login.
- UGC safety: sandboxed iframe (no `allow-same-origin`), `Sec-Fetch-Dest: document` redirect, `<base href>` injection, zip-ingest path/extension/size/zip-bomb checks.

## User personas
- Visitor: browses public catalog and plays games without an account.
- Creator: signs up, uploads zip builds, thumbnails, patch notes, clips, follows other creators.
- Community owner/moderator: creates communities, moderates posts (hide/promote/demote/mute/ban/remove/resolve reports).

## Implemented (2026-02)
**MVP (iteration 1):**
- Onboarding/login/logout/session with PBKDF2 + random session id + legacy rehash + per-IP rate limits.
- Games: upload (zip with security validation), thumbnails, build replacement, patch notes, sandboxed iframe play, public catalog of real owners.
- Clips: upload, list, detail with `<video controls playsInline preload="metadata">`.
- Communities: create, join, post, hide-post, reports endpoint.
- Creator profiles, legal pages (Terms / Privacy / DMCA / Content Policy).

**P1 + P2 (iteration 2):**
- Avatar / banner / bio / display-name editing at `/settings`, stored under `/api/user-media/<random-id>/...` (never exposes user id in path).
- Follow / unfollow + follower/following counts on creator profile.
- Search (`/api/search?q=`) used by clip-upload `GamePicker` autocomplete component.
- Tag pages (`/tags/:tag`) + popular tags endpoint (`/api/tags`) + clickable tag chips on game detail.
- Sitemap (`/api/sitemap.xml`) + `/robots.txt` pointing to it.
- Community moderation panel (`/communities/:slug/moderate`) with member list, promote/demote (owner), mute/unmute, ban/unban, remove (moderator+), reports queue with resolve action.
- Reports include `community_slug` for proper scoping.
- Per-route rate limits: game create, game update, clip upload, community post, community create, follow, report.
- SEO via `react-helmet-async` on home, browse, game-detail, creator, tag, clips pages.

## Backlog
P0: none blocking.
P1 (later): in-app following feed; clip→game picker → reverse "clips on this game" rail on game detail page.
P2 (later): moderator promotion notifications; site-wide search bar; community discovery (trending); creator analytics; storage GC for deleted assets.

## Next tasks
- Decide deploy path: switch goodgame.center to Emergent hosting, OR port these patterns into the Cloudflare repo manually.
- Add Playwright browser tests for: signup → upload game zip → upload thumbnail → upload clip → follow another creator → moderate community.
- Persist rate-limit buckets in MongoDB (currently in-memory; lost on restart, not multi-worker safe).
