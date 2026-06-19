import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env, Game, Creator, Clip, Community } from './lib';
import { fmtCount, initials, csv } from './lib';
import { CSS } from './styles';
import { page } from './components';
import { ogCard, favicon } from './og';
import { playDoc, TEMPLATE_IDS } from './play';
import { ingestZip } from './ingest';
import { issueNonce, verifyAndLogin, getSession, logout, loginPassword, onboardPassword } from './auth';
import { createOrder, confirmOrder, hasEntitlement } from './pay';
import * as db from './db';

import { Home } from './views/home';
import { GamesDirectory, GamePage, PlayPage } from './views/games';
import { CreatorsDirectory, CreatorPage, ClipsDirectory, ClipPage } from './views/people';
import { CommunitiesDirectory, CommunityPage, ArenaPage, EventPage } from './views/community';
import { NewsDirectory, ArticlePage, SearchPage, DocsPage, Shell, NotFound } from './views/news';
import { CreatePage } from './views/create';

const app = new Hono<{ Bindings: Env }>();
const ADMIN_COOKIE = 'gg_admin';
const ADMIN_TTL = 60 * 60 * 12;
const INDEXNOW_FALLBACK_KEY = 'a8df7c0d6f3b4ad2a6f9487c8f0b1d25';
const SITEMAP_NAMES = ['static', 'games', 'creators', 'clips', 'communities', 'tags'] as const;

app.use('*', async (c, next) => {
  await next();
  if (shouldNoindexHeader(new URL(c.req.url).pathname)) c.res.headers.set('X-Robots-Tag', 'noindex');
});

const svg = (body: string) =>
  new Response(body, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
const text = (body: string, ct = 'text/plain') =>
  new Response(body, { headers: { 'content-type': `${ct}; charset=utf-8`, 'cache-control': 'public, max-age=900' } });
const xml = (body: string) =>
  new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });

const shouldNoindexHeader = (path: string) => {
  if (path === '/healthz' || path === '/__version' || path === '/api/__version') return true;
  if (path.startsWith('/ugc/') || path.startsWith('/api/ugc/') || path.startsWith('/play/')) return true;
  if (path.startsWith('/api/game-media/') || path.startsWith('/api/profile-media/') || path.startsWith('/api/clip-media/')) return false;
  return path === '/api' || path.startsWith('/api/');
};
const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]!));
const isoLastmod = (value?: string | null) => {
  const source = value && /[-:T ]/.test(value) ? value.replace(' ', 'T') : '';
  const d = source ? new Date(source.endsWith('Z') ? source : `${source}Z`) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};
const sitemapUrl = (base: string, path: string, lastmod?: string | null) =>
  `<url><loc>${escapeXml(base + path)}</loc><lastmod>${isoLastmod(lastmod)}</lastmod></url>`;
const sitemapIndex = (env: Env) => {
  const lastmod = isoLastmod(env.BUILD_TIME);
  const rows = SITEMAP_NAMES.map((name) =>
    `<sitemap><loc>${escapeXml(`${env.SITE_URL}/sitemaps/${name}.xml`)}</loc><lastmod>${lastmod}</lastmod></sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</sitemapindex>`;
};
const sitemapUrlset = (urls: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
const indexNowKey = (env: Env) => env.INDEXNOW_KEY || INDEXNOW_FALLBACK_KEY;

const versionPayload = (env: Env) => ({
  ok: true,
  service: 'goodgame-web',
  provider: 'cloudflare-workers',
  build_sha: env.BUILD_SHA || 'dev',
  build_ref: env.BUILD_REF || 'main',
  build_time: env.BUILD_TIME || new Date().toISOString(),
  url: env.SITE_URL,
});

// ---------- health/version ----------
app.get('/healthz', (c) => c.json({ ok: true, service: 'goodgame-web' }));
app.get('/api/', (c) => c.json({ ok: true, service: 'goodgame-web' }));
app.get('/__version', (c) => c.json(versionPayload(c.env)));
app.get('/api/__version', (c) => c.json(versionPayload(c.env)));

// ---------- donations ----------
app.get('/api/donations/config', (c) => c.json({
  ok: true,
  publishable_key: c.env.STRIPE_PUBLISHABLE_KEY || null,
  currency: 'usd',
  min_amount: 1,
  max_amount: 10000,
}));

app.post('/api/donations/checkout', async (c) => {
  if (!c.env.STRIPE_SECRET_KEY) return c.json({ detail: 'Donation checkout is not configured yet.' }, 503);
  const body = await c.req.json().catch(() => ({}));
  const amountCents = centsFromDonationAmount(body.amount);
  if (amountCents < 100) return c.json({ detail: 'Minimum donation is $1.' }, 400);
  if (amountCents > 1_000_000) return c.json({ detail: 'Maximum donation is $10,000.' }, 400);
  const user = await getSession(c);
  const origin = c.env.SITE_URL || new URL(c.req.url).origin;
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('submit_type', 'donate');
  params.set('success_url', `${origin}/?donation=thanks&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/?donation=cancelled`);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][unit_amount]', String(amountCents));
  params.set('line_items[0][price_data][product_data][name]', 'Donation to GoodGame.center');
  params.set('line_items[0][price_data][product_data][description]', 'Support free browser-game hosting, creator tools, and community features.');
  params.set('metadata[source]', 'site_donation');
  if (user?.id) params.set('client_reference_id', user.id);
  if (user?.username) params.set('metadata[username]', user.username);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const stripe: any = await res.json().catch(() => ({}));
  if (!res.ok || !stripe?.url) {
    const message = stripe?.error?.message || 'Stripe could not create the checkout session.';
    return c.json({ detail: message }, 502);
  }
  return c.json({ ok: true, url: stripe.url });
});

// ---------- admin moderation ----------
app.get('/api/admin/session', async (c) => c.json({ logged_in: await isAdmin(c) }));

app.post('/api/admin/login', async (c) => {
  if (!c.env.ADMIN_PASSWORD) return c.json({ detail: 'Admin password is not configured.' }, 503);
  const body = await c.req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (!(await timingSafeTextEqual(password, c.env.ADMIN_PASSWORD))) {
    return c.json({ detail: 'Invalid admin password.' }, 401);
  }
  const token = randomToken();
  await c.env.KV.put(`admin:${token}`, '1', { expirationTtl: ADMIN_TTL });
  setCookie(c, ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: ADMIN_TTL });
  return c.json({ ok: true });
});

app.post('/api/admin/logout', async (c) => {
  const token = getCookie(c, ADMIN_COOKIE);
  if (token) await c.env.KV.delete(`admin:${token}`);
  deleteCookie(c, ADMIN_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

app.get('/api/admin/games', async (c) => {
  const admin = await requireAdmin(c);
  if ('error' in admin) return admin.error;
  const state = c.req.query('state') || 'active';
  const where =
    state === 'removed' ? `g.deleted_at IS NOT NULL OR g.status != 'published'`
    : state === 'all' ? `1=1`
    : `g.deleted_at IS NULL AND g.status = 'published'`;
  const r = await c.env.DB.prepare(
    `SELECT g.*, u.display_name owner_name, u.username owner_username,
      (SELECT ma.source_path FROM media_assets ma WHERE ma.game_id = g.id AND ma.type = 'capsule' AND ma.moderation_status = 'clear' ORDER BY ma.sort ASC LIMIT 1) cover_image
     FROM games g JOIN users u ON u.id = g.owner_id
     WHERE ${where}
     ORDER BY COALESCE(g.updated_at, g.created_at) DESC LIMIT 200`
  ).all<any>();
  const games = (r.results || []).map((g: any) => ({
    ...apiGame(g),
    deleted_at: g.deleted_at || null,
    moderation_status: g.moderation_status || 'clear',
    state: g.deleted_at || g.status !== 'published' ? 'removed' : 'active',
  }));
  const stats = await c.env.DB.prepare(
    `SELECT
      SUM(CASE WHEN deleted_at IS NULL AND status='published' THEN 1 ELSE 0 END) active,
      SUM(CASE WHEN deleted_at IS NOT NULL OR status!='published' THEN 1 ELSE 0 END) removed
     FROM games`
  ).first<any>();
  return c.json({ games, stats: { active: stats?.active || 0, removed: stats?.removed || 0 } });
});

app.post('/api/admin/games/:id/delete', async (c) => {
  const admin = await requireAdmin(c);
  if ('error' in admin) return admin.error;
  const gameId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const reason = cleanText(body.reason, 240) || 'admin_moderation';
  const game = await c.env.DB.prepare(`SELECT id, title FROM games WHERE id=?`).bind(gameId).first<any>();
  if (!game) return c.json({ detail: 'Game not found.' }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE games SET deleted_at=COALESCE(deleted_at, datetime('now')), status='unpublished', moderation_status='quarantined', updated_at=datetime('now') WHERE id=?`).bind(gameId),
    c.env.DB.prepare(`UPDATE clips SET deleted_at=COALESCE(deleted_at, datetime('now')) WHERE game_id=?`).bind(gameId),
    c.env.DB.prepare(`UPDATE posts SET deleted_at=COALESCE(deleted_at, datetime('now')) WHERE game_id=?`).bind(gameId),
    c.env.DB.prepare(`UPDATE reviews SET status='hidden' WHERE game_id=?`).bind(gameId),
    c.env.DB.prepare(`INSERT INTO audit_log (id, action, object_type, object_id, reason_code, metadata) VALUES (?, 'admin_delete_game', 'game', ?, ?, ?)`)
      .bind('audit_' + randomToken(8), gameId, reason, JSON.stringify({ title: game.title })),
  ]);
  return c.json({ ok: true });
});

app.post('/api/admin/games/:id/restore', async (c) => {
  const admin = await requireAdmin(c);
  if ('error' in admin) return admin.error;
  const gameId = c.req.param('id');
  const game = await c.env.DB.prepare(`SELECT id FROM games WHERE id=?`).bind(gameId).first<any>();
  if (!game) return c.json({ detail: 'Game not found.' }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE games SET deleted_at=NULL, status='published', moderation_status='clear', updated_at=datetime('now') WHERE id=?`).bind(gameId),
    c.env.DB.prepare(`INSERT INTO audit_log (id, action, object_type, object_id, reason_code) VALUES (?, 'admin_restore_game', 'game', ?, 'admin_restore')`)
      .bind('audit_' + randomToken(8), gameId),
  ]);
  return c.json({ ok: true });
});

// ---------- React/FastAPI compatibility API ----------
const nowIso = () => new Date().toISOString();
const cleanSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 44) || 'game';
const cleanTags = (s: unknown) => String(s ?? '').split(',').map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 -]/g, '')).filter(Boolean).slice(0, 8);
const cleanText = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max);
const cleanSlugWithSuffix = (s: string) => `${cleanSlug(s)}-${Math.random().toString(36).slice(2, 6)}`;
const safeId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
const mediaExt = (f: File, fallback = 'bin') => {
  const ct = (f.type || '').toLowerCase();
  if (ct === 'image/png') return 'png';
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'video/mp4') return 'mp4';
  if (ct === 'video/webm') return 'webm';
  if (ct === 'video/quicktime') return 'mov';
  return fallback;
};
const mediaHeaders = (obj: R2ObjectBody) => {
  const h = new Headers();
  h.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream');
  if (obj.httpMetadata?.contentEncoding) h.set('content-encoding', obj.httpMetadata.contentEncoding);
  h.set('cache-control', 'public, max-age=86400');
  h.set('x-content-type-options', 'nosniff');
  return h;
};
const authJson = (r: Awaited<ReturnType<typeof loginPassword>> | Awaited<ReturnType<typeof onboardPassword>>, c: any) =>
  r.ok ? c.json({ ok: true, user: r.user }) : c.json({ detail: r.error }, r.status || 400);
const centsFromDonationAmount = (amount: unknown): number => {
  const numeric = Number(String(amount ?? '').replace(/[$,\s]/g, ''));
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
};
const randomToken = (bytes = 24) => {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
};
const timingSafeTextEqual = async (a: string, b: string) => {
  const enc = new TextEncoder();
  const [ah, bh] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const av = new Uint8Array(ah);
  const bv = new Uint8Array(bh);
  let diff = av.length ^ bv.length;
  for (let i = 0; i < Math.min(av.length, bv.length); i++) diff |= av[i] ^ bv[i];
  return diff === 0;
};

async function isAdmin(c: any): Promise<boolean> {
  const token = getCookie(c, ADMIN_COOKIE);
  if (!token) return false;
  return (await c.env.KV.get(`admin:${token}`)) === '1';
}

async function requireAdmin(c: any) {
  if (!(await isAdmin(c))) return { error: c.json({ detail: 'Admin login required.' }, 401) };
  return { ok: true };
}

async function requireGameOwner(c: any, slug: string) {
  const user = await getSession(c);
  if (!user) return { error: c.json({ detail: 'Log in first.' }, 401) };
  const game = await db.getGame(c.env, slug);
  if (!game) return { error: c.json({ detail: 'Game not found.' }, 404) };
  if (game.owner_id !== user.id) return { error: c.json({ detail: 'You do not own this game.' }, 403) };
  return { user, game };
}

async function communityRole(c: any, communityId: string, userId?: string | null): Promise<string> {
  if (!userId) return 'guest';
  const row = await c.env.DB.prepare(`SELECT role, muted, banned FROM community_memberships WHERE community_id=? AND user_id=?`)
    .bind(communityId, userId).first();
  if (!row || row.banned) return 'guest';
  return row.role || 'member';
}

async function requireCommunityMod(c: any, slug: string) {
  const user = await getSession(c);
  if (!user) return { error: c.json({ detail: 'Log in first.' }, 401) };
  const community = await db.getCommunity(c.env, slug);
  if (!community) return { error: c.json({ detail: 'Community not found.' }, 404) };
  const role = await communityRole(c, community.id, user.id);
  if (role !== 'owner' && role !== 'moderator') return { error: c.json({ detail: 'Moderator access required.' }, 403) };
  return { user, community, role };
}

const apiGame = (g: Game) => ({
  ...g,
  pitch: g.pitch || '',
  description: g.description || g.pitch || '',
  tags: csv(g.tags),
  platforms: csv(g.platforms || 'web'),
  cover_image: g.cover_image || null,
  upload_entry: g.upload_entry || (g.play_template ? '__template.html' : null),
  upload_bytes: g.upload_bytes || 0,
  updated_at: g.updated_at || nowIso(),
});
const apiCreator = (c: Creator) => ({
  ...c,
  bio: c.bio || '',
  avatar: c.avatar || null,
  banner: c.banner || null,
  follower_count: c.follower_count || 0,
  following_count: 0,
});
const apiClip = (clip: Clip) => ({
  ...clip,
  caption: clip.caption || '',
  tags: csv(clip.tags),
  video_path: (clip as any).video_path || '',
  thumbnail_path: (clip as any).thumbnail_path || null,
  created_at: clip.created_at || nowIso(),
});
const apiCommunity = (community: Community) => ({
  ...community,
  description: community.description || '',
  member_count: community.member_count || 0,
});
const apiRelease = (r: any) => ({
  ...r,
  notes: r.release_notes || r.changelog || '',
  created_at: r.release_date || r.created_at || nowIso(),
});
const unsupported = (detail: string, status = 501) => (c: any) => c.json({ detail }, status);

app.get('/api/session', async (c) => {
  const user = await getSession(c);
  return c.json(user ? { ...user, logged_in: true } : { logged_in: false });
});
app.post('/api/logout', async (c) => {
  await logout(c);
  return c.json({ ok: true });
});
app.post('/api/login', async (c) => authJson(await loginPassword(c, await c.req.json().catch(() => ({}))), c));
app.post('/api/onboarding', async (c) => authJson(await onboardPassword(c, await c.req.json().catch(() => ({}))), c));

app.get('/api/games', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 60) || 60, 120);
  const games = await db.listGames(c.env, { sort: c.req.query('sort') || undefined, limit });
  return c.json({ games: games.map(apiGame) });
});
app.post('/api/games', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in before publishing a game.' }, 401);
  const b = await c.req.parseBody();
  const title = String(b.title ?? '').trim().slice(0, 80);
  const pitch = String(b.pitch ?? '').trim().slice(0, 180);
  const description = String(b.description ?? '').trim().slice(0, 2000);
  const tags = cleanTags(b.tags).join(',');
  if (title.length < 2) return c.json({ detail: 'Title is required.' }, 400);

  const id = 'gmu_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const slug = `${cleanSlug(title)}-${Math.random().toString(36).slice(2, 6)}`;
  let uploadEntry: string | null = null;
  let uploadBytes: number | null = null;
  let engine = 'web';
  const build = b.build;
  if (build instanceof File && build.size > 0) {
    if (build.size > 95 * 1024 * 1024) return c.json({ detail: 'That build is over 90 MB.' }, 400);
    const res = ingestZip(new Uint8Array(await build.arrayBuffer()));
    if (!res.ok) return c.json({ detail: res.error }, 400);
    await Promise.all(res.files.map((f) =>
      c.env.UGC.put(`ugc/${id}/${f.path}`, f.bytes, { httpMetadata: { contentType: f.ct, contentEncoding: f.enc, cacheControl: 'public, max-age=3600' } })));
    uploadEntry = res.entry;
    uploadBytes = res.total;
    const paths = res.files.map((f) => f.path.toLowerCase()).join('\n');
    engine = paths.includes('.pck') ? 'godot' : (paths.includes('.data') || paths.includes('.unityweb') || paths.includes('.framework.js')) ? 'unity' : 'web';
  } else {
    return c.json({ detail: 'Build zip is required.' }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO games (id, owner_id, slug, title, pitch, description, engine, tags, platforms, build_class, status, maturity, content_rating, official, verified, accent, upload_entry, upload_bytes, play_count, follow_count, rating_avg, rating_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web', 'browser', 'published', 'everyone', 'Everyone', 0, 0, '#d4af37', ?, ?, 0, 0, 0, 0)`
  ).bind(id, user.id, slug, title, pitch, description || pitch, engine, tags, uploadEntry, uploadBytes).run();
  await c.env.DB.prepare(
    `INSERT INTO releases (id, game_id, version, changelog, channel, status, is_current, release_date) VALUES (?, ?, '1.0.0', 'Initial build uploaded to GoodGame.', 'public', 'published', 1, datetime('now'))`
  ).bind('rel_' + id, id).run();
  const game = await db.getGame(c.env, slug);
  return c.json({ game: game ? apiGame(game) : { id, slug, title } });
});
app.get('/api/games/:slug', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.json({ detail: 'Game not found' }, 404);
  const releases = await db.gameReleases(c.env, g.id);
  return c.json({ game: apiGame(g), releases: releases.map(apiRelease) });
});
app.post('/api/games/:slug/play', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (g) await c.env.DB.prepare(`UPDATE games SET play_count=play_count+1 WHERE id=?`).bind(g.id).run();
  return c.json({ ok: true });
});
app.post('/api/games/:slug/build', async (c) => {
  const owned = await requireGameOwner(c, c.req.param('slug'));
  if ('error' in owned) return owned.error;
  const { game } = owned;
  const b = await c.req.parseBody();
  const build = b.build;
  const version = cleanText(b.version, 40) || '1.0.1';
  const notes = cleanText(b.notes, 2000);
  if (!(build instanceof File) || build.size <= 0) return c.json({ detail: 'Build zip is required.' }, 400);
  if (build.size > 95 * 1024 * 1024) return c.json({ detail: 'That build is over 90 MB.' }, 400);
  const res = ingestZip(new Uint8Array(await build.arrayBuffer()));
  if (!res.ok) return c.json({ detail: res.error }, 400);
  await Promise.all(res.files.map((f) =>
    c.env.UGC.put(`ugc/${game.id}/${f.path}`, f.bytes, { httpMetadata: { contentType: f.ct, contentEncoding: f.enc, cacheControl: 'public, max-age=3600' } })));
  const paths = res.files.map((f) => f.path.toLowerCase()).join('\n');
  const engine = paths.includes('.pck') ? 'godot' : (paths.includes('.data') || paths.includes('.unityweb') || paths.includes('.framework.js')) ? 'unity' : 'web';
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE games SET upload_entry=?, upload_bytes=?, engine=?, play_template=NULL, updated_at=datetime('now') WHERE id=?`)
      .bind(res.entry, res.total, engine, game.id),
    c.env.DB.prepare(`UPDATE releases SET is_current=0 WHERE game_id=?`).bind(game.id),
    c.env.DB.prepare(`INSERT INTO releases (id, game_id, version, changelog, release_notes, channel, status, is_current, release_date) VALUES (?, ?, ?, ?, ?, 'public', 'published', 1, datetime('now'))`)
      .bind('rel_' + game.id + '_' + safeId(), game.id, version, notes || 'Build replaced.', notes || 'Build replaced.'),
  ]);
  return c.json({ ok: true, upload_entry: res.entry, upload_bytes: res.total });
});
app.post('/api/games/:slug/thumbnail', async (c) => {
  const owned = await requireGameOwner(c, c.req.param('slug'));
  if ('error' in owned) return owned.error;
  const { game, user } = owned;
  const b = await c.req.parseBody();
  const file = b.file || b.thumb;
  if (!(file instanceof File) || file.size <= 0) return c.json({ detail: 'Image file is required.' }, 400);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return c.json({ detail: 'Use PNG, JPEG, or WebP.' }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ detail: 'Image must be under 5 MB.' }, 400);
  const ext = mediaExt(file, 'png');
  const key = `media/games/${game.id}/cover.${ext}`;
  const url = `/api/game-media/${game.id}/cover.${ext}`;
  await c.env.UGC.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=86400' } });
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM media_assets WHERE game_id=? AND type='capsule'`).bind(game.id),
    c.env.DB.prepare(`INSERT INTO media_assets (id, owner_id, game_id, type, source_path, sort) VALUES (?, ?, ?, 'capsule', ?, 0)`)
      .bind('ma_' + safeId(), user.id, game.id, url),
    c.env.DB.prepare(`UPDATE games SET updated_at=datetime('now') WHERE id=?`).bind(game.id),
  ]);
  return c.json({ ok: true, cover_image: url });
});
app.post('/api/games/:slug/patch', async (c) => {
  const owned = await requireGameOwner(c, c.req.param('slug'));
  if ('error' in owned) return owned.error;
  const { game } = owned;
  const b = await c.req.parseBody();
  const version = cleanText(b.version, 40);
  const notes = cleanText(b.notes, 2000);
  if (!version || !notes) return c.json({ detail: 'Version and notes are required.' }, 400);
  await c.env.DB.prepare(
    `INSERT INTO releases (id, game_id, version, changelog, release_notes, channel, status, is_current, release_date)
     VALUES (?, ?, ?, ?, ?, 'public', 'published', 0, datetime('now'))`
  ).bind('rel_' + game.id + '_' + safeId(), game.id, version, notes, notes).run();
  await c.env.DB.prepare(`UPDATE games SET updated_at=datetime('now') WHERE id=?`).bind(game.id).run();
  return c.json({ ok: true });
});
app.get('/api/creator/games', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ games: [] });
  const games = (await db.listGames(c.env, { sort: 'new', limit: 120 })).filter((g) => g.owner_id === user.id);
  return c.json({ games: games.map(apiGame) });
});
app.get('/api/ugc/:gid/*', async (c) => {
  const gid = c.req.param('gid');
  const prefix = `/api/ugc/${gid}/`;
  const i = c.req.path.indexOf(prefix);
  let rest = i >= 0 ? c.req.path.slice(i + prefix.length) : '';
  try { rest = decodeURIComponent(rest); } catch { /* keep raw */ }
  if (!rest || rest.includes('..')) return c.notFound();
  const g = await db.getGameById(c.env, gid);
  if (g?.play_template && (rest === '__template.html' || rest === '__template')) {
    return new Response(playDoc({ slug: g.slug, title: g.title, accent: g.accent, template: g.play_template }), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'",
      },
    });
  }
  const obj = await c.env.UGC.get(`ugc/${gid}/${rest}`);
  if (!obj) return c.notFound();
  const h = new Headers();
  h.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream');
  if (obj.httpMetadata?.contentEncoding) h.set('content-encoding', obj.httpMetadata.contentEncoding);
  h.set('cache-control', 'public, max-age=3600');
  h.set('cross-origin-resource-policy', 'cross-origin');
  h.set('x-content-type-options', 'nosniff');
  return new Response(obj.body, { headers: h });
});
app.get('/api/game-media/:gid/:file', async (c) => {
  const file = c.req.param('file');
  if (!/^cover\.(png|jpg|webp)$/.test(file)) return c.notFound();
  const obj = await c.env.UGC.get(`media/games/${c.req.param('gid')}/${file}`);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: mediaHeaders(obj) });
});

app.get('/api/tags', async (c) => {
  const games = await db.listGames(c.env, { limit: 120 });
  const counts = new Map<string, number>();
  games.flatMap((g) => csv(g.tags)).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  return c.json({ tags: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count })) });
});
app.get('/api/tags/:tag', async (c) => {
  const tag = c.req.param('tag').toLowerCase();
  const games = (await db.listGames(c.env, { limit: 120 })).filter((g) => csv(g.tags).includes(tag));
  return c.json({ games: games.map(apiGame) });
});
app.get('/api/search', async (c) => {
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const r = q ? await db.search(c.env, q) : { games: [], creators: [], communities: [], events: [], news: [] };
  return c.json({
    results: r.games.map(apiGame),
    games: r.games.map(apiGame),
    creators: r.creators.map(apiCreator),
    communities: r.communities.map(apiCommunity),
    events: r.events,
    news: r.news,
  });
});

app.get('/api/creators/:username', async (c) => {
  const cr = await db.getCreator(c.env, c.req.param('username'));
  if (!cr) return c.json({ detail: 'Creator not found' }, 404);
  const [games, clips] = await Promise.all([
    db.listGames(c.env, { limit: 120 }).then((gs) => gs.filter((g) => g.owner_id === cr.id)),
    db.listClips(c.env, { authorId: cr.id, limit: 24 }),
  ]);
  return c.json({ creator: apiCreator(cr), games: games.map(apiGame), clips: clips.map(apiClip), is_self: false, is_following: false });
});
app.get('/api/creators/:username/followers', (c) => c.json({ followers: [] }));
app.get('/api/creators/:username/following', (c) => c.json({ following: [] }));

app.get('/api/clips', async (c) => {
  const gameSlug = c.req.query('game_slug') || c.req.query('game');
  let gameId: string | undefined;
  if (gameSlug) gameId = (await db.getGame(c.env, gameSlug))?.id;
  const clips = await db.listClips(c.env, { gameId, limit: Math.min(Number(c.req.query('limit') || 48) || 48, 96) });
  return c.json({ clips: clips.map(apiClip) });
});
app.post('/api/clips', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const b = await c.req.parseBody();
  const video = b.video;
  if (!(video instanceof File) || video.size <= 0) return c.json({ detail: 'Video file is required.' }, 400);
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(video.type)) return c.json({ detail: 'Use MP4, WebM, or MOV.' }, 400);
  if (video.size > 95 * 1024 * 1024) return c.json({ detail: 'Clip must be under 90 MB.' }, 400);
  const caption = cleanText(b.caption, 280) || 'Untitled clip';
  const tags = cleanTags(b.tags).join(',');
  const gameSlug = cleanText(b.game_slug, 80);
  const game = gameSlug ? await db.getGame(c.env, gameSlug) : null;
  const id = 'clip_' + safeId();
  const slug = cleanSlugWithSuffix(caption);
  const ext = mediaExt(video, 'mp4');
  const path = `/api/clip-media/${id}/video.${ext}`;
  await c.env.UGC.put(`media/clips/${id}/video.${ext}`, await video.arrayBuffer(), {
    httpMetadata: { contentType: video.type, cacheControl: 'public, max-age=86400' },
  });
  await c.env.DB.prepare(
    `INSERT INTO clips (id, slug, author_id, game_id, video_path, poster_accent, duration, caption, tags, view_count, moderation_status, visibility)
     VALUES (?, ?, ?, ?, ?, '#d4af37', 0, ?, ?, 0, 'clear', 'public')`
  ).bind(id, slug, user.id, game?.id || null, path, caption, tags).run();
  const clip = await db.getClipById(c.env, id);
  return c.json({ clip: clip ? apiClip(clip) : { id, slug, caption, video_path: path } });
});
app.get('/api/clips/:idslug', async (c) => {
  const idslug = c.req.param('idslug');
  const id = idslug.match(/^(clip_[a-z0-9]+)/i)?.[1];
  const clip = id ? await db.getClipById(c.env, id) : await db.getClipBySlug(c.env, idslug);
  if (!clip) return c.json({ detail: 'Clip not found' }, 404);
  return c.json({ clip: apiClip(clip) });
});
app.get('/api/clip-media/:id/:file', async (c) => {
  const file = c.req.param('file');
  if (!/^video\.(mp4|webm|mov)$/.test(file)) return c.notFound();
  const obj = await c.env.UGC.get(`media/clips/${c.req.param('id')}/${file}`);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: mediaHeaders(obj) });
});

app.get('/api/communities', async (c) => {
  const communities = await db.listCommunities(c.env, 48);
  return c.json({ communities: communities.map(apiCommunity) });
});
app.post('/api/communities', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const name = cleanText(body.name, 48);
  const description = cleanText(body.description, 240);
  if (name.length < 3) return c.json({ detail: 'Community name must be at least 3 characters.' }, 400);
  const id = 'com_' + safeId();
  const slug = cleanSlugWithSuffix(name);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO communities (id, slug, name, owner_id, description, visibility, accent, official, member_count)
       VALUES (?, ?, ?, ?, ?, 'public', '#d4af37', 0, 1)`
    ).bind(id, slug, name, user.id, description),
    c.env.DB.prepare(
      `INSERT INTO community_memberships (community_id, user_id, role) VALUES (?, ?, 'owner')`
    ).bind(id, user.id),
  ]);
  const community = await db.getCommunity(c.env, slug);
  return c.json({ community: community ? apiCommunity(community) : { id, slug, name, description, member_count: 1 } });
});
app.get('/api/communities/:slug', async (c) => {
  const community = await db.getCommunity(c.env, c.req.param('slug'));
  if (!community) return c.json({ detail: 'Community not found' }, 404);
  const user = await getSession(c);
  const role = await communityRole(c, community.id, user?.id);
  const posts = await c.env.DB.prepare(
    `SELECT p.*, u.username author_username, u.display_name author_name
     FROM posts p JOIN users u ON u.id=p.author_id
     WHERE p.community_id=? AND p.deleted_at IS NULL AND p.visibility='public' AND p.moderation_status='clear'
     ORDER BY p.created_at DESC LIMIT 50`
  ).bind(community.id).all();
  return c.json({ community: apiCommunity(community), role, posts: posts.results });
});
app.post('/api/communities/:slug/join', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const community = await db.getCommunity(c.env, c.req.param('slug'));
  if (!community) return c.json({ detail: 'Community not found.' }, 404);
  const existing = await c.env.DB.prepare(`SELECT role, banned FROM community_memberships WHERE community_id=? AND user_id=?`)
    .bind(community.id, user.id).first<any>();
  if (existing?.banned) return c.json({ detail: 'You cannot join this community.' }, 403);
  if (!existing) {
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO community_memberships (community_id, user_id, role) VALUES (?, ?, 'member')`).bind(community.id, user.id),
      c.env.DB.prepare(`UPDATE communities SET member_count=member_count+1 WHERE id=?`).bind(community.id),
    ]);
  }
  return c.json({ ok: true, role: existing?.role || 'member' });
});
app.post('/api/communities/:slug/posts', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const community = await db.getCommunity(c.env, c.req.param('slug'));
  if (!community) return c.json({ detail: 'Community not found.' }, 404);
  const member = await c.env.DB.prepare(`SELECT role, muted, banned FROM community_memberships WHERE community_id=? AND user_id=?`)
    .bind(community.id, user.id).first<any>();
  if (!member || member.banned) return c.json({ detail: 'Join before posting.' }, 403);
  if (member.muted) return c.json({ detail: 'You are muted in this community.' }, 403);
  const b = await c.req.parseBody();
  const body = cleanText(b.body, 2000);
  if (body.length < 1) return c.json({ detail: 'Post body is required.' }, 400);
  const id = 'post_' + safeId();
  await c.env.DB.prepare(
    `INSERT INTO posts (id, author_id, community_id, type, body, visibility, moderation_status)
     VALUES (?, ?, ?, 'post', ?, 'public', 'clear')`
  ).bind(id, user.id, community.id, body).run();
  return c.json({ ok: true, id });
});
app.post('/api/communities/:slug/posts/:post_id/hide', async (c) => {
  const mod = await requireCommunityMod(c, c.req.param('slug'));
  if ('error' in mod) return mod.error;
  await c.env.DB.prepare(`UPDATE posts SET deleted_at=datetime('now'), moderation_status='hidden' WHERE id=? AND community_id=?`)
    .bind(c.req.param('post_id'), mod.community.id).run();
  return c.json({ ok: true });
});
app.get('/api/communities/:slug/members', async (c) => {
  const community = await db.getCommunity(c.env, c.req.param('slug'));
  if (!community) return c.json({ detail: 'Community not found' }, 404);
  const user = await getSession(c);
  const viewerRole = await communityRole(c, community.id, user?.id);
  const members = await c.env.DB.prepare(
    `SELECT m.user_id, m.role, m.muted, m.banned, u.username, u.display_name, p.avatar
     FROM community_memberships m JOIN users u ON u.id=m.user_id LEFT JOIN profiles p ON p.user_id=u.id
     WHERE m.community_id=? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, u.username`
  ).bind(community.id).all();
  return c.json({ community: apiCommunity(community), viewer_role: viewerRole, members: members.results });
});
app.get('/api/communities/:slug/reports', async (c) => {
  const mod = await requireCommunityMod(c, c.req.param('slug'));
  if ('error' in mod) return mod.error;
  const reports = await c.env.DB.prepare(`SELECT * FROM reports WHERE community_id=? AND status='open' ORDER BY created_at DESC LIMIT 100`)
    .bind(mod.community.id).all();
  return c.json({ reports: reports.results });
});
app.post('/api/communities/:slug/members/:user_id/role', async (c) => {
  const mod = await requireCommunityMod(c, c.req.param('slug'));
  if ('error' in mod) return mod.error;
  if (mod.role !== 'owner') return c.json({ detail: 'Owner access required.' }, 403);
  const body = await c.req.parseBody();
  const role = cleanText(body.role, 20);
  if (role !== 'member' && role !== 'moderator') return c.json({ detail: 'Invalid role.' }, 400);
  await c.env.DB.prepare(`UPDATE community_memberships SET role=? WHERE community_id=? AND user_id=? AND role!='owner'`)
    .bind(role, mod.community.id, c.req.param('user_id')).run();
  return c.json({ ok: true });
});
for (const action of ['mute', 'unmute', 'ban', 'unban'] as const) {
  app.post(`/api/communities/:slug/members/:user_id/${action}`, async (c) => {
    const mod = await requireCommunityMod(c, c.req.param('slug'));
    if ('error' in mod) return mod.error;
    const col = action.includes('mute') ? 'muted' : 'banned';
    const value = action.startsWith('un') ? 0 : 1;
    await c.env.DB.prepare(`UPDATE community_memberships SET ${col}=? WHERE community_id=? AND user_id=? AND role!='owner'`)
      .bind(value, mod.community.id, c.req.param('user_id')).run();
    return c.json({ ok: true });
  });
}
app.post('/api/communities/:slug/members/:user_id/remove', async (c) => {
  const mod = await requireCommunityMod(c, c.req.param('slug'));
  if ('error' in mod) return mod.error;
  const r = await c.env.DB.prepare(`DELETE FROM community_memberships WHERE community_id=? AND user_id=? AND role!='owner'`)
    .bind(mod.community.id, c.req.param('user_id')).run();
  if ((r.meta as any)?.changes) await c.env.DB.prepare(`UPDATE communities SET member_count=MAX(0, member_count-1) WHERE id=?`).bind(mod.community.id).run();
  return c.json({ ok: true });
});
app.post('/api/reports', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const b = await c.req.parseBody();
  const targetType = cleanText(b.target_type, 64);
  const targetId = cleanText(b.target_id, 128);
  const reason = cleanText(b.reason, 1000);
  const communitySlug = cleanText(b.community_slug, 80);
  if (!targetType || !targetId || !reason) return c.json({ detail: 'Target and reason are required.' }, 400);
  const community = communitySlug ? await db.getCommunity(c.env, communitySlug) : null;
  const id = 'rep_' + safeId();
  await c.env.DB.prepare(
    `INSERT INTO reports (id, reporter_id, target_type, target_id, community_id, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, 'open')`
  ).bind(id, user.id, targetType, targetId, community?.id || null, reason).run();
  return c.json({ ok: true, id });
});
app.post('/api/reports/:report_id/resolve', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const b = await c.req.parseBody();
  const resolution = cleanText(b.resolution, 80) || 'resolved';
  await c.env.DB.prepare(`UPDATE reports SET status='resolved', resolution=?, resolved_by=?, resolved_at=datetime('now') WHERE id=?`)
    .bind(resolution, user.id, c.req.param('report_id')).run();
  return c.json({ ok: true });
});
app.patch('/api/me/profile', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const displayName = cleanText(body.display_name, 60) || user.username;
  const bio = cleanText(body.bio, 600);
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET display_name=? WHERE id=?`).bind(displayName, user.id),
    c.env.DB.prepare(`UPDATE profiles SET display_name=?, bio=? WHERE user_id=?`).bind(displayName, bio, user.id),
  ]);
  return c.json({ ok: true });
});
app.post('/api/me/avatar', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const b = await c.req.parseBody();
  const file = b.file || b.avatar;
  if (!(file instanceof File) || file.size <= 0) return c.json({ detail: 'Image file is required.' }, 400);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return c.json({ detail: 'Use PNG, JPEG, or WebP.' }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ detail: 'Image must be under 5 MB.' }, 400);
  const ext = mediaExt(file, 'png');
  const path = `/api/profile-media/${user.id}/avatar.${ext}`;
  await c.env.UGC.put(`media/profiles/${user.id}/avatar.${ext}`, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=86400' } });
  await c.env.DB.prepare(`UPDATE profiles SET avatar=? WHERE user_id=?`).bind(path, user.id).run();
  return c.json({ ok: true, avatar_url: path });
});
app.post('/api/me/banner', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  const b = await c.req.parseBody();
  const file = b.file || b.banner;
  if (!(file instanceof File) || file.size <= 0) return c.json({ detail: 'Image file is required.' }, 400);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return c.json({ detail: 'Use PNG, JPEG, or WebP.' }, 400);
  if (file.size > 8 * 1024 * 1024) return c.json({ detail: 'Image must be under 8 MB.' }, 400);
  const ext = mediaExt(file, 'png');
  const path = `/api/profile-media/${user.id}/banner.${ext}`;
  await c.env.UGC.put(`media/profiles/${user.id}/banner.${ext}`, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=86400' } });
  await c.env.DB.prepare(`UPDATE profiles SET banner=? WHERE user_id=?`).bind(path, user.id).run();
  return c.json({ ok: true, banner_url: path });
});
app.get('/api/profile-media/:uid/:file', async (c) => {
  const file = c.req.param('file');
  if (!/^(avatar|banner)\.(png|jpg|webp)$/.test(file)) return c.notFound();
  const obj = await c.env.UGC.get(`media/profiles/${c.req.param('uid')}/${file}`);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: mediaHeaders(obj) });
});
app.get('/api/sitemap.xml', (c) => c.redirect('/sitemap.xml', 302));

// ---------- assets ----------
app.get('/styles.css', () =>
  new Response(CSS, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } }));
app.get('/favicon.svg', () => svg(favicon()));

// ---------- home ----------
app.get('/', async (c) => page(c, <Home env={c.env} data={await db.homeData(c.env)} />));

// ---------- games ----------
const FILTER_META: Record<string, { heading: string; sub: string }> = {
  browser: { heading: 'Browser games', sub: 'Play instantly — no install. HTML5, WebGL, and WASM games that run in a sandboxed tab.' },
  godot: { heading: 'Godot games', sub: 'Games built and exported with Godot.' },
  unity: { heading: 'Unity games', sub: 'Unity WebGL and native builds on GoodGame.' },
  unreal: { heading: 'Unreal games', sub: 'Unreal Engine games, including cloud-streamed builds.' },
  windows: { heading: 'Native games', sub: 'Downloadable Windows, macOS, and Linux builds.' },
};

app.get('/games', async (c) => {
  const sort = c.req.query('sort');
  const tag = c.req.query('tag');
  let games = await db.listGames(c.env, { sort, limit: 60 });
  if (tag) games = games.filter((g) => csv(g.tags).includes(tag));
  return page(c, <GamesDirectory env={c.env} games={games} path="/games" sort={sort}
    heading={tag ? `#${tag} games` : 'All games'}
    sub={tag ? `Games tagged ${tag}.` : 'Every game on GoodGame — browser-playable, native, and cloud-streamed.'} />);
});

for (const key of Object.keys(FILTER_META)) {
  app.get(`/games/${key}`, async (c) => {
    const sort = c.req.query('sort');
    const m = FILTER_META[key];
    let games: any[];
    if (key === 'windows') games = (await db.listGames(c.env, { sort, limit: 60 })).filter((g) => /windows|macos|linux/.test(g.platforms));
    else if (key === 'browser') games = await db.listGames(c.env, { build_class: 'browser', sort, limit: 60 });
    else games = await db.listGames(c.env, { engine: key, sort, limit: 60 });
    return page(c, <GamesDirectory env={c.env} games={games} path={`/games/${key}`} sort={sort} heading={m.heading} sub={m.sub} />);
  });
}

app.get('/games/:slug/play', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.notFound();
  const user = await getSession(c);
  const owned = user ? await hasEntitlement(c.env, user.id, g) : false;
  const locked = !!(g.price_amount && g.pay_to) && !owned;
  return page(c, <PlayPage env={c.env} g={g} locked={locked} />);
});

// Sandboxed playable game (embedded in the play page via iframe).
app.get('/play/:slug', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.notFound();
  if (!g.play_template) return c.redirect(`/games/${g.slug}`, 302);
  return new Response(playDoc({ slug: g.slug, title: g.title, accent: g.accent, template: g.play_template }), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      // NOTE: no `frame-ancestors 'self'` — the iframe is sandboxed to an opaque
      // origin, so 'self' can never match the parent and the browser blanks the frame.
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'",
    },
  });
});

// Real gameplay screenshot used as a game's cover art.
app.get('/cover/:slug', async (c) => {
  const obj = await c.env.UGC.get(`covers/${c.req.param('slug')}.png`);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'image/png', 'cache-control': 'public, max-age=86400' } });
});

// Serve an uploaded creator build's files from R2 (the game runs in a sandboxed
// iframe pointed at /ugc/:gid/<entry>; relative assets resolve under this prefix).
app.get('/ugc/:gid/*', async (c) => {
  const gid = c.req.param('gid');
  const prefix = `/ugc/${gid}/`;
  const i = c.req.path.indexOf(prefix);
  let rest = i >= 0 ? c.req.path.slice(i + prefix.length) : '';
  try { rest = decodeURIComponent(rest); } catch { /* keep raw */ }
  if (!rest || rest.includes('..')) return c.notFound();
  const obj = await c.env.UGC.get(`ugc/${gid}/${rest}`);
  if (!obj) return c.notFound();
  const h = new Headers();
  h.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream');
  if (obj.httpMetadata?.contentEncoding) h.set('content-encoding', obj.httpMetadata.contentEncoding);
  h.set('cache-control', 'public, max-age=3600');
  h.set('cross-origin-resource-policy', 'cross-origin');
  h.set('x-content-type-options', 'nosniff');
  return new Response(obj.body, { headers: h });
});

app.get('/games/:slug', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.notFound();
  const user = await getSession(c);
  const [releases, reviews, clips, related, owned, following] = await Promise.all([
    db.gameReleases(c.env, g.id), db.gameReviews(c.env, g.id),
    db.listClips(c.env, { gameId: g.id, limit: 8 }), db.relatedGames(c.env, g),
    user ? hasEntitlement(c.env, user.id, g) : Promise.resolve(false),
    user ? c.env.DB.prepare(`SELECT 1 FROM follows WHERE follower_id=? AND target_type='game' AND target_id=?`).bind(user.id, g.id).first().then((r) => !!r) : Promise.resolve(false),
  ]);
  return page(c, <GamePage env={c.env} g={g} releases={releases} reviews={reviews} clips={clips} related={related} owned={owned} following={following} />);
});

// Follow / unfollow a game (wallet-gated, stored in follows + real count).
app.post('/api/follow/:slug', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ error: 'connect' }, 401);
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.json({ error: 'notfound' }, 404);
  const existing = await c.env.DB.prepare(`SELECT id FROM follows WHERE follower_id=? AND target_type='game' AND target_id=?`).bind(user.id, g.id).first<{ id: string }>();
  if (existing) {
    await c.env.DB.prepare(`DELETE FROM follows WHERE id=?`).bind(existing.id).run();
    await c.env.DB.prepare(`UPDATE games SET follow_count=MAX(0,follow_count-1) WHERE id=?`).bind(g.id).run();
    return c.json({ following: false });
  }
  await c.env.DB.prepare(`INSERT INTO follows (id, follower_id, target_type, target_id) VALUES (?, ?, 'game', ?)`).bind(crypto.randomUUID(), user.id, g.id).run();
  await c.env.DB.prepare(`UPDATE games SET follow_count=follow_count+1 WHERE id=?`).bind(g.id).run();
  return c.json({ following: true });
});

// ---------- creators ----------
app.get('/creators', async (c) => page(c, <CreatorsDirectory env={c.env} creators={await db.listCreators(c.env, 36)} />));
app.get('/u/:username', (c) => c.redirect(`/creators/${c.req.param('username')}`, 301));
app.get('/creators/:username', async (c) => {
  const cr = await db.getCreator(c.env, c.req.param('username'));
  if (!cr) return c.notFound();
  const [games, clips] = await Promise.all([
    db.listGames(c.env, {}).then((gs) => gs.filter((g) => g.owner_id === cr.id)),
    db.listClips(c.env, { authorId: cr.id, limit: 12 }),
  ]);
  return page(c, <CreatorPage env={c.env} c={cr} games={games} clips={clips} />);
});

// ---------- clips ----------
app.get('/clips', async (c) => {
  const gameSlug = c.req.query('game');
  let gameId: string | undefined;
  if (gameSlug) { const g = await db.getGame(c.env, gameSlug); gameId = g?.id; }
  return page(c, <ClipsDirectory env={c.env} clips={await db.listClips(c.env, { gameId, limit: 48 })} />);
});
app.get('/clips/:idslug', async (c) => {
  const m = c.req.param('idslug').match(/^(clip_[a-z0-9]+)/i);
  if (!m) return c.notFound();
  const clip = await db.getClipById(c.env, m[1]);
  if (!clip) return c.notFound();
  const related = (await db.listClips(c.env, { limit: 8 })).filter((x) => x.id !== clip.id);
  return page(c, <ClipPage env={c.env} c={clip} related={related} />);
});

// ---------- communities ----------
app.get('/communities', (c) => c.redirect('/community', 301));
app.get('/community', async (c) => page(c, <CommunitiesDirectory env={c.env} communities={await db.listCommunities(c.env, 48)} />));
for (const base of ['/community', '/communities']) {
  app.get(`${base}/:slug`, async (c) => {
    const cm = await db.getCommunity(c.env, c.req.param('slug'));
    if (!cm) return c.notFound();
    const events = cm.game_id ? await db.listEvents(c.env, {}).then((es) => es.filter((e) => e.game_id === cm.game_id)) : [];
    return page(c, <CommunityPage env={c.env} c={cm} events={events} />);
  });
}

// ---------- arena ----------
app.get('/arena', async (c) => page(c, <ArenaPage env={c.env} events={await db.listEvents(c.env, { limit: 48 })} />));
app.get('/arena/events', (c) => c.redirect('/arena', 301));
for (const base of ['/arena/events', '/arena/tournaments']) {
  app.get(`${base}/:slug`, async (c) => {
    const e = await db.getEvent(c.env, c.req.param('slug'));
    if (!e) return c.notFound();
    return page(c, <EventPage env={c.env} e={e} />);
  });
}

// ---------- news ----------
app.get('/news', async (c) => page(c, <NewsDirectory env={c.env} articles={await db.listNews(c.env, { limit: 24 })} />));
app.get('/news/:slug', async (c) => {
  const a = await db.getArticle(c.env, c.req.param('slug'));
  if (!a) return c.notFound();
  const related = (await db.listNews(c.env, { limit: 4 })).filter((x) => x.id !== a.id).slice(0, 3);
  return page(c, <ArticlePage env={c.env} a={a} related={related} />);
});

// ---------- search ----------
app.get('/search', async (c) => {
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const r = q ? await db.search(c.env, q) : { games: [], creators: [], communities: [], events: [], news: [] };
  return page(c, <SearchPage env={c.env} q={q} r={r} />);
});

// ---------- docs ----------
app.get('/docs', async (c) => page(c, <DocsPage env={c.env} />));
app.get('/docs/:slug', async (c) => page(c, <DocsPage env={c.env} slug={c.req.param('slug')} />));

// ---------- app placeholders (real pages, noindex) ----------
const placeholder = (active: string | undefined, title: string, desc: string, path: string, body: any, noindex = true) =>
  (c: any) => page(c, <Shell env={c.env} active={active} title={title} desc={desc} path={path} noindex={noindex}>{body}</Shell>);

// ---------- wallet auth ----------
app.get('/auth/nonce', async (c) => {
  const address = (c.req.query('address') || '').trim();
  const chain = c.req.query('chain') === 'sol' ? 'sol' : 'evm';
  if (!address) return c.json({ error: 'address required' }, 400);
  return c.json(await issueNonce(c.env, address, chain));
});
app.post('/auth/verify', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const r = await verifyAndLogin(c, body);
  return c.json(r, r.ok ? 200 : 400);
});
app.post('/auth/logout', async (c) => { await logout(c); return c.json({ ok: true }); });
app.get('/auth/me', async (c) => c.json({ user: await getSession(c) }));

// ---------- crypto payments ----------
app.post('/buy/create', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ error: 'Connect a wallet first.' }, 401);
  const { gameSlug } = await c.req.json().catch(() => ({}));
  const g = await db.getGame(c.env, String(gameSlug || ''));
  if (!g) return c.json({ error: 'Game not found.' }, 404);
  const quote = await createOrder(c.env, g, user.id);
  return c.json(quote, 'error' in quote ? 400 : 200);
});
app.post('/buy/confirm', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ error: 'Connect a wallet first.' }, 401);
  const { orderId, txHash } = await c.req.json().catch(() => ({}));
  const r = await confirmOrder(c.env, String(orderId || ''), user.id, String(txHash || ''));
  return c.json(r, r.ok ? 200 : 400);
});

app.get('/create', (c) => page(c, <CreatePage env={c.env} />));
app.post('/create', async (c) => {
  const b = await c.req.parseBody();
  const clean = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max);
  const title = clean(b.title, 60);
  const pitch = clean(b.pitch, 120);
  const description = clean(b.description, 1200);
  const tags = clean(b.tags, 80).split(',').map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 -]/g, '')).filter(Boolean).slice(0, 6).join(',');
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(b.accent)) ? String(b.accent) : '#6b93ff';
  let template = TEMPLATE_IDS.includes(String(b.template)) ? String(b.template) : '';
  const values: Record<string, string> = { title, pitch, description, tags, accent, template };
  const fail = (msg: string) => page(c, <CreatePage env={c.env} error={msg} values={values} />);
  if (title.length < 2 || pitch.length < 4) return fail('Add a title (at least 2 characters) and a short pitch.');

  const sessUser = await getSession(c);
  if (!sessUser) return fail('Log in first — that account becomes the creator identity for this game.');

  const id = 'gmu_' + Math.random().toString(36).slice(2, 10);
  const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'game') + '-' + Math.random().toString(36).slice(2, 6);

  // An uploaded build (real web/WebGL/Unity/Godot export) takes precedence over a template.
  let uploadEntry: string | null = null, uploadBytes: number | null = null, engine = 'gg';
  const build = b.build;
  if (build instanceof File && build.size > 0) {
    if (build.size > 95 * 1024 * 1024) return fail('That build is over 90 MB. Trim it (or wait for large-build support).');
    const res = ingestZip(new Uint8Array(await build.arrayBuffer()));
    if (!res.ok) return fail(res.error);
    try {
      await Promise.all(res.files.map((f) =>
        c.env.UGC.put(`ugc/${id}/${f.path}`, f.bytes, { httpMetadata: { contentType: f.ct, contentEncoding: f.enc, cacheControl: 'public, max-age=3600' } })));
    } catch {
      return fail('Storing the build failed — a build with hundreds of files can exceed limits on the current plan. Try a smaller build.');
    }
    uploadEntry = res.entry; uploadBytes = res.total; template = '';
    const paths = res.files.map((f) => f.path.toLowerCase()).join('\n');
    engine = paths.includes('.pck') ? 'godot' : (paths.includes('.data') || paths.includes('.unityweb') || paths.includes('.framework.js')) ? 'unity' : 'web';
  }

  const ownerId = sessUser.id;
  await c.env.DB.prepare(
    `INSERT INTO games (id, owner_id, slug, title, pitch, description, engine, tags, platforms, build_class, status, maturity, content_rating, official, verified, accent, play_template, upload_entry, upload_bytes, play_count, follow_count, rating_avg, rating_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'web', 'browser', 'published', 'everyone', 'Everyone', 0, 0, ?, ?, ?, ?, 0, 0, 0, 0)`
  ).bind(id, ownerId, slug, title, pitch, description || pitch, engine, tags, accent, template || null, uploadEntry, uploadBytes).run();
  await c.env.DB.prepare(
    `INSERT INTO releases (id, game_id, version, changelog, channel, status, is_current, release_date) VALUES (?, ?, '1.0.0', ?, 'public', 'published', 1, datetime('now'))`
  ).bind('rel_' + id, id, uploadEntry ? 'Initial build uploaded to GoodGame.' : 'First release on GoodGame.').run();
  return c.redirect('/games/' + slug, 303);
});
app.get('/studio', placeholder('create', 'GG Studio', 'A serious creation suite: projects, scenes, assets, scripting, visual logic, and one-click publish into the same release pipeline.', '/studio',
  <div class="notice">GG Studio is on the roadmap as a layered platform — web editor first, then native. See the build sequence in the product blueprint.</div>));
app.get('/forge', placeholder('create', 'GG Forge', 'A UGC marketplace for mods, maps, templates, plugins, and assets — built for games that keep growing.', '/forge',
  <div class="notice">GG Forge opens after the creator economy workstream. Items, manifests, dependencies, and compatibility are modeled now.</div>));
app.get('/login', placeholder(undefined, 'Sign in', 'Sign in to GoodGame.center.', '/login',
  <div class="panel" style="max-width:380px;padding:24px"><p class="muted" style="margin-bottom:14px">Email/password and OAuth (Google, Discord, Twitch, GitHub) land with the auth workstream. Sessions, 2FA, and device management are already in the schema.</p><a class="btn btn-primary btn-block" href="/">Continue browsing</a></div>));
app.get('/signup', placeholder(undefined, 'Create your account', 'Join GoodGame.center.', '/signup',
  <div class="panel" style="max-width:380px;padding:24px"><p class="muted" style="margin-bottom:14px">Account creation (email verification, username reservation, age declaration) is the first auth task. For now, explore the live catalog.</p><a class="btn btn-primary btn-block" href="/games">Explore games</a></div>));
app.get('/dashboard', placeholder(undefined, 'Your dashboard', 'Profile, library, messages, and settings.', '/dashboard',
  <div class="notice">This is a private surface (profile, library, messages, settings). It unlocks with auth.</div>));

const SAFETY: Record<string, string> = {
  '': 'Community guidelines, content policy, and how moderation works on GoodGame.center.',
  dmca: 'Copyright, takedown, counter-notice, and repeat-infringer policy.',
  ratings: 'Age and content ratings, mature filters, and how we gate prize and economy flows.',
  privacy: 'What we collect, why, and your export/delete controls.',
  terms: 'The rules of the road for using GoodGame.center.',
};
app.get('/safety', placeholder('discover', 'Trust & safety', SAFETY[''], '/safety',
  <div class="prose"><p>Trust is a product pillar. Every public release ships version history, a build scan date, a checksum, and a report button. Uploaded games run on an isolated origin in a sandboxed iframe. Reviews require evidence. Prize pools are age-, location-, and rules-gated.</p></div>, false));
app.get('/safety/:s', async (c) => {
  const s = c.req.param('s');
  return page(c, <Shell env={c.env} active="discover" title={`Trust & safety — ${s}`} desc={SAFETY[s] || SAFETY['']} path={`/safety/${s}`} noindex={false}>
    <div class="prose"><p>{SAFETY[s] || SAFETY['']}</p></div>
  </Shell>);
});

// ---------- OG images ----------
const strip = (s: string) => s.replace(/\.svg$/, '');
app.get('/og/default.svg', () => svg(ogCard({ accent: '#5b8cff', eyebrow: 'Instant browser arcade', title: 'GoodGame.center', sub: 'Instant browser games and creator-uploaded web builds.', mark: 'GG' })));
app.get('/og/game/:slug', async (c) => {
  const g = await db.getGame(c.env, strip(c.req.param('slug')));
  if (!g) return svg(ogCard({ accent: '#5b8cff', eyebrow: 'GoodGame.center', title: 'Game', mark: 'GG' }));
  return svg(ogCard({ accent: g.accent, eyebrow: g.official ? 'Official GG game' : (g.owner_name || 'GoodGame'), title: g.title, sub: g.pitch, mark: initials(g.title), footer: `${g.engine.toUpperCase()} · ${g.rating_avg.toFixed(1)}★ · ${fmtCount(g.play_count)} plays` }));
});
app.get('/og/event/:slug', async (c) => {
  const e = await db.getEvent(c.env, strip(c.req.param('slug')));
  if (!e) return svg(ogCard({ accent: '#f0b323', eyebrow: 'GG Arena', title: 'Event', mark: 'GG' }));
  return svg(ogCard({ accent: e.accent, eyebrow: `GG Arena · ${e.type}`, title: e.title, sub: `Prize: ${e.prize_pool}`, mark: initials(e.title) }));
});
app.get('/og/news/:slug', async (c) => {
  const a = await db.getArticle(c.env, strip(c.req.param('slug')));
  if (!a) return svg(ogCard({ accent: '#5b8cff', eyebrow: 'Newsroom', title: 'News', mark: 'GG' }));
  return svg(ogCard({ accent: a.accent, eyebrow: `Newsroom · ${a.category}`, title: a.title, sub: a.excerpt }));
});
app.get('/og/clip/:id', async (c) => {
  const clip = await db.getClipById(c.env, strip(c.req.param('id')));
  if (!clip) return svg(ogCard({ accent: '#5b8cff', eyebrow: 'Clip', title: 'Clip', mark: 'GG' }));
  return svg(ogCard({ accent: clip.poster_accent || '#5b8cff', eyebrow: clip.game_title || 'Clip', title: clip.caption, sub: `by ${clip.author_name}`, mark: '▶' }));
});

// ---------- SEO files ----------
app.get('/robots.txt', (c) => text(
`# GoodGame.center
User-agent: *
Allow: /
Allow: /api/game-media/
Allow: /api/profile-media/
Allow: /api/clip-media/
Disallow: /api/
Disallow: /api/ugc/
Disallow: /auth/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /profile/edit
Disallow: /create
Disallow: /studio
Disallow: /login
Disallow: /signup
Disallow: /healthz
Disallow: /__version
Disallow: /internal/
Disallow: /search
Disallow: /ugc/
Disallow: /uploads/raw/
Disallow: /*/play

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${c.env.SITE_URL}/sitemap.xml
Sitemap: ${c.env.SITE_URL}/sitemap-index.xml
`));

const staticSitemapPaths = [
  '/', '/games', '/games/browser', '/clips', '/community', '/creators',
  '/arena', '/news', '/docs', '/docs/upload-browser-game',
  '/safety', '/safety/terms', '/safety/privacy', '/safety/dmca',
  '/safety/ratings',
];

app.get('/sitemap.xml', (c) => xml(sitemapIndex(c.env)));
app.get('/sitemap-index.xml', (c) => xml(sitemapIndex(c.env)));
app.get('/sitemaps/static.xml', (c) => {
  const base = c.env.SITE_URL;
  return xml(sitemapUrlset(staticSitemapPaths.map((path) => sitemapUrl(base, path, c.env.BUILD_TIME))));
});
app.get('/sitemaps/games.xml', async (c) => {
  const rows = await db.sitemapRows(c.env);
  return xml(sitemapUrlset(rows.games.map((g) => sitemapUrl(c.env.SITE_URL, `/games/${encodeURIComponent(g.slug)}`, g.updated_at))));
});
app.get('/sitemaps/creators.xml', async (c) => {
  const rows = await db.sitemapRows(c.env);
  return xml(sitemapUrlset(rows.creators.map((x) => sitemapUrl(c.env.SITE_URL, `/creators/${encodeURIComponent(x.slug)}`))));
});
app.get('/sitemaps/clips.xml', async (c) => {
  const rows = await db.sitemapRows(c.env);
  return xml(sitemapUrlset(rows.clips.map((x) => sitemapUrl(c.env.SITE_URL, `/clips/${encodeURIComponent(`${x.id}-${x.slug}`)}`))));
});
app.get('/sitemaps/communities.xml', async (c) => {
  const rows = await db.sitemapRows(c.env);
  return xml(sitemapUrlset(rows.communities.map((x) => sitemapUrl(c.env.SITE_URL, `/community/${encodeURIComponent(x.slug)}`))));
});
app.get('/sitemaps/tags.xml', async (c) => {
  const rows = await db.sitemapRows(c.env);
  return xml(sitemapUrlset(rows.tags.map((x) => sitemapUrl(c.env.SITE_URL, `/tags/${encodeURIComponent(x.slug)}`))));
});

app.get('/indexnow-key.txt', (c) => text(indexNowKey(c.env), 'text/plain'));
app.get(`/${INDEXNOW_FALLBACK_KEY}.txt`, (c) => text(indexNowKey(c.env), 'text/plain'));

app.get('/llms.txt', (c) => text(
`# GoodGame.center

> An instant browser arcade and creator upload lab: play web games immediately, publish zipped web builds, and layer clips, communities, events, wallet features, and creator tools around the playable core.

## What this site is
GoodGame.center is a web-native arcade layer where the first loop is simple: open a game, play it in the browser, and share it. Creator uploads turn a zipped web export into a hosted playable page, with clips, communities, events, and monetization layered on top.

## Public content
- /games — game catalog (browser, native, cloud-streamed). Canonical game pages at /games/{slug}
- /creators — creator profiles at /creators/{username}
- /clips — shareable gameplay clips at /clips/{id}-{slug}
- /community — public community hubs at /community/{slug}
- /arena — tournaments, jams, leagues; events at /arena/events/{slug}
- /news — newsroom, guides, and creator spotlights at /news/{slug}
- /docs — creator and SDK documentation

## For creators
Publish browser-first games by uploading a zipped web build that contains index.html. Every release is versioned and designed to expose trust surfaces such as scan status, report tools, structured metadata, and a shareable URL.

## Crawling
Public entity pages are server-rendered with canonical URLs and schema.org structured data. Private surfaces (/dashboard, /create, /admin, /login, /search) are not indexed. See /robots.txt and /sitemap.xml.

## Not available to crawlers
User dashboards, the creator console, admin tools, auth flows, search result pages, internal APIs, and isolated game-play runtimes.
`, 'text/plain'));

app.get('/:key.txt', (c) => {
  const key = c.req.param('key');
  if (key !== indexNowKey(c.env)) return c.notFound();
  return text(key, 'text/plain');
});

app.get('/feed.xml', async (c) => {
  const base = c.env.SITE_URL;
  const news = await db.listNews(c.env, { limit: 20 });
  const items = news.map((a) =>
    `<item><title>${a.title.replace(/&/g, '&amp;')}</title><link>${base}/news/${a.slug}</link><guid>${base}/news/${a.slug}</guid><pubDate>${new Date((a.published_at || '').replace(' ', 'T') + 'Z').toUTCString()}</pubDate><description>${(a.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</description></item>`).join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>GoodGame.center News</title><link>${base}/news</link><description>Platform news, creator spotlights, and guides.</description>${items}</channel></rss>`,
    { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=1800' } });
});

// ---------- 404 ----------
app.notFound((c) => {
  c.status(404);
  return page(c, <NotFound env={c.env} />);
});

export default app;
