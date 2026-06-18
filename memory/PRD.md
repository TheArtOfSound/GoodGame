# GoodGame.center — PRD

## Original problem statement
Rebuild GoodGame.center as a browser-first game platform: account creation, real game upload (zip), thumbnails, patch notes, browsing, creator profiles, clips, communities, moderation, sandboxed play, legal pages. No fake catalog, no wallets, no crypto, no tokens.

Original repo (TheArtOfSound/GoodGame) is Cloudflare Workers + Hono + D1 + R2 + KV. This Emergent environment runs the equivalent on **React + FastAPI + MongoDB + Emergent Object Storage**.

## Architecture
- Frontend: React 19 + React Router 7 + Tailwind, served by CRA dev server on port 3000.
- Backend: FastAPI on 0.0.0.0:8001, all routes prefixed `/api`.
- DB: MongoDB via `motor`.
- File storage: Emergent managed object storage (zip game builds, thumbnails, video clips).
- Auth: PBKDF2-HMAC-SHA256 (600k iters) password & PIN hashes, random-UUID session ids in HttpOnly Secure SameSite=Lax cookie. Legacy SHA-256 hashes auto-rehash on first login.
- UGC safety: sandboxed iframe (no `allow-same-origin`); `Sec-Fetch-Dest: document` on `/api/ugc/...` redirects to `/games/:slug/play`; zip ingest blocks traversal, absolute paths, dangerous extensions, oversized files, zip-bomb compression ratios.
- HTML entry pages of UGC are served with an injected `<base href>` so the game's relative assets resolve correctly under its UGC prefix.

## User personas
- Visitor: browses the public catalog and plays games without an account.
- Creator: signs up (username/password/PIN), uploads zip builds, thumbnails, patch notes, clips, joins communities.
- Community owner/moderator: creates communities, manages posts (hide), promotes/demotes members.

## What's implemented (2026-02)
- Auth: onboarding, login, logout, session, PBKDF2, rate limiting.
- Games: list, detail, upload (zip with security validation), build replacement, patch notes, thumbnail, play counter, sandboxed UGC serving with base-href injection and Sec-Fetch-Dest gate.
- Clips: list, detail with `<video controls playsInline preload="metadata">`, upload (mp4/webm/mov ≤80MB), per-clip object storage path.
- Communities: list, create, join, view, post, hide-post (owner/mod), report endpoint.
- Creators: public profile (`/creators/:username`) with games tab + clips tab; owner sees drafts.
- Legal pages: Terms, Privacy, DMCA, Content Policy as long-form readable text (placeholder baseline; still flagged for counsel review).
- Brand & UI: black/gold cinematic theme; Outfit/IBM Plex Sans/JetBrains Mono fonts; sharp edges; logged-in vs logged-out nav.

## Backlog
P0: tests + screenshots / smoke after first deploy.
P1: avatar/banner upload UI; follow/unfollow; clip→game picker; per-route rate limits beyond auth.
P2: report moderation queue UI; community member list / promote / mute / ban UI; sitemap.xml; SEO meta; tag pages.

## Next tasks
- Run testing_agent_v3 for end-to-end QA.
- Implement avatar/banner upload + follow.
- Implement community moderation queue UI + member management.
