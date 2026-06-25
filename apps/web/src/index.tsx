import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env, Game, Creator, Clip, Community } from './lib';
import { fmtCount, initials, csv, ld, siteLd, gameLd, breadcrumbLd } from './lib';
import { CSS } from './styles';
import { page } from './components';
import { ogCard, favicon } from './og';
import { playDoc, TEMPLATE_IDS } from './play';
import { ingestZip } from './ingest';
import { analyzeAndPrepare, type CompatReport } from './compat';
import { submitScore, getLeaderboard, putSave, getSave } from './sdk';
import { generateGameHtml, refineGameHtml } from './forge';
import { runtimeCheck } from './runtime';
import { newsList, newsArticle, newsSlugs } from './news';
import { togglePostLike, postLikes } from './social';
import { getSession, logout, loginPassword, onboardPassword, rateLimit } from './auth';
import { hasEntitlement } from './pay';
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

// Security headers applied to every Worker-handled response. The CSP allows the
// React (CRA) app's inline runtime/styles plus Google Fonts; tightening to a
// nonce/hash-based policy is a future step. Responses that set their own CSP
// (the sandboxed game documents) are left untouched.
const SECURITY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
function applySecurityHeaders(headers: Headers) {
  if (!headers.has('content-security-policy')) headers.set('content-security-policy', SECURITY_CSP);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
}

const clientIp = (c: any) => c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'anon';
// Returns a 429 Response when the caller is over the limit for `name`, else null.
async function tooMany(c: any, name: string, limit: number, windowSeconds: number): Promise<Response | null> {
  const ok = await rateLimit(c.env, `${name}:${clientIp(c)}`, limit, windowSeconds);
  return ok ? null : c.json({ detail: 'Too many requests. Please slow down and try again shortly.' }, 429);
}

app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (shouldServeReactShell(c.req.method, path, c.req.header('accept') || '')) {
    const shell = await reactShell(c as any, path);
    if (shouldNoindexHeader(path)) shell.headers.set('X-Robots-Tag', 'noindex');
    applySecurityHeaders(shell.headers);
    return shell;
  }
  await next();
  if (shouldNoindexHeader(path)) c.res.headers.set('X-Robots-Tag', 'noindex');
  applySecurityHeaders(c.res.headers);
});

// Per-IP rate limit on all mutating API calls (defense-in-depth; tighter limits
// are applied inline on the expensive upload/checkout/login endpoints below).
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const rl = await tooMany(c, `api:${c.req.method}:${new URL(c.req.url).pathname}`, 60, 600);
    if (rl) return rl;
  }
  await next();
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
const FRONTEND_PATHS = [
  /^\/$/, /^\/games(?:\/.*)?$/, /^\/clips(?:\/.*)?$/, /^\/communities(?:\/.*)?$/,
  /^\/creators(?:\/.*)?$/, /^\/tags(?:\/.*)?$/, /^\/legal(?:\/.*)?$/,
  /^\/activity$/, /^\/leaderboards$/,
  /^\/admin$/, /^\/login$/, /^\/onboarding$/, /^\/settings$/, /^\/create$/,
  /^\/console(?:\/.*)?$/, /^\/search$/, /^\/forge(?:\/.*)?$/, /^\/feed$/, /^\/news(?:\/.*)?$/,
];
const shouldServeReactShell = (method: string, path: string, accept: string) =>
  (method === 'GET' || method === 'HEAD') && (accept.includes('text/html') || accept.includes('*/*')) && FRONTEND_PATHS.some((re) => re.test(path));
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
type ShellMeta = {
  title: string;
  description: string;
  path: string;
  heading?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  jsonld?: unknown[];
};
const shellImage = (env: Env, image?: string) => image ? (image.startsWith('http') ? image : env.SITE_URL + image) : `${env.SITE_URL}/og/default.svg`;
const shellRobots = (meta: ShellMeta) => meta.noindex
  ? 'noindex,nofollow'
  : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const publicShellMeta = async (env: Env, path: string): Promise<{ meta: ShellMeta; status?: number }> => {
  const base = (title: string, description: string, route = path, noindex = false, heading?: string): ShellMeta => ({ title, description, path: route, noindex, heading });
  if (path === '/') {
    return { meta: { ...base('GoodGame.center — Free Browser Games, Creators, Clips, and Communities', 'Play free browser games, discover indie creators, watch game clips, join communities, and publish your own HTML5 game on GoodGame.center.', '/'), jsonld: [siteLd(env)] } };
  }
  if (path === '/games') return { meta: base('Free Browser Games — Play Indie Web Games on GoodGame.center', 'Browse free browser games from indie creators. Play arcade, puzzle, shooter, experimental, and HTML5 games instantly on GoodGame.center.', '/games') };
  if (path === '/games/browser') return { meta: base('Instant Browser Games — Play HTML5 Games on GoodGame.center', 'Play HTML5, WebGL, WASM, Godot Web, Unity WebGL, Phaser, and creator-uploaded builds directly in your browser.', '/games/browser') };
  if (path === '/clips') return { meta: base('GoodGame Clips — Gameplay Moments from Indie Browser Games', 'Watch short gameplay clips from GoodGame.center creators, including arcade runs, speed tech, scares, builds, and browser-game highlights.', '/clips') };
  if (path === '/communities') return { meta: base('GoodGame Communities — Indie Game Hubs and Creator Spaces', 'Join public communities around browser games, creators, game jams, genres, clips, and player-made worlds on GoodGame.center.', '/communities') };
  if (path === '/creators') return { meta: base('GoodGame Creators — Browser Games, Clips, and Communities', 'Discover indie creators publishing browser games, gameplay clips, updates, and communities on GoodGame.center.', '/creators') };
  if (path === '/activity') return { meta: base('Global Gaming Activity — Scores, Releases, Clips, and Posts', 'Follow real-time public activity from GoodGame.center: new browser games, player posts, gameplay clips, and persistent leaderboard scores.', '/activity', false, 'Global gaming activity') };
  if (path === '/leaderboards') return { meta: base('Browser Game Leaderboards — Global High Scores', 'View persistent player high scores and current champions across free browser games on GoodGame.center.', '/leaderboards', false, 'Browser game leaderboards') };
  if (path === '/admin') return { meta: base('Admin · GoodGame.center', 'Private moderation access for GoodGame.center operators.', '/admin', true) };
  if (path === '/search') return { meta: base('Search · GoodGame.center', 'Search games, creators, and communities on GoodGame.center.', '/search', true) };
  if (path === '/feed') return { meta: base('Your feed · GoodGame.center', 'Activity from the creators you follow on GoodGame.center.', '/feed', true) };
  if (path === '/news') return { meta: base('News & Guides · GoodGame.center', 'Browser-game news, creator guides, and how-tos: make a game with AI, publish HTML5 games, and play the best free browser games.', '/news') };
  const newsMatch = path.match(/^\/news\/([^/]+)$/);
  if (newsMatch) {
    const a = newsArticle(decodeURIComponent(newsMatch[1]));
    if (!a) return { status: 404, meta: base('Article not found · GoodGame.center', 'This article is not available on GoodGame.center.', path, true) };
    return { meta: { ...base(`${a.title} · GoodGame.center`, a.excerpt, `/news/${a.slug}`), type: 'article', jsonld: [{
      '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.excerpt,
      datePublished: a.date, dateModified: a.date, inLanguage: 'en',
      author: { '@type': 'Organization', name: 'GoodGame.center', url: env.SITE_URL },
      publisher: { '@type': 'Organization', name: 'GoodGame.center', url: env.SITE_URL },
      mainEntityOfPage: `${env.SITE_URL}/news/${a.slug}`, url: `${env.SITE_URL}/news/${a.slug}`,
      keywords: a.keywords.join(', '),
    }] } };
  }
  if (['/login', '/onboarding', '/settings', '/create'].includes(path) || path.startsWith('/console') || path.startsWith('/forge')) {
    return { meta: base('GoodGame.center', 'Account and creator tools on GoodGame.center.', path, true) };
  }
  if (path.startsWith('/legal/')) {
    const topic = path.split('/').pop() || 'legal';
    const labels: Record<string, string> = { terms: 'Terms', privacy: 'Privacy', dmca: 'DMCA', content: 'Content Policy' };
    const label = labels[topic] || 'Legal';
    return { meta: base(`${label} · GoodGame.center`, `${label} for GoodGame.center players, creators, games, clips, and communities.`, path) };
  }
  if (path.startsWith('/tags/')) {
    const tag = decodeURIComponent(path.slice('/tags/'.length)).toLowerCase();
    const matches = (await db.listGames(env, { limit: 120 })).filter((game) => csv(game.tags).includes(tag));
    const noindex = matches.length < 5;
    return {
      meta: base(
        `Free ${tag} Browser Games · GoodGame.center`,
        `Play ${matches.length} free browser games tagged ${tag}, with instant web play and creator pages on GoodGame.center.`,
        path,
        noindex,
        `${tag} browser games`,
      ),
    };
  }
  const gameMatch = path.match(/^\/games\/([^/]+)(?:\/play)?$/);
  if (gameMatch && !['browser', 'godot', 'unity', 'unreal', 'windows'].includes(gameMatch[1])) {
    const g = await db.getGame(env, decodeURIComponent(gameMatch[1]));
    if (!g || g.status !== 'published') return { status: 404, meta: base('Game not found · GoodGame.center', 'This game is not available on GoodGame.center.', path, true) };
    const noindex = path.endsWith('/play');
    return {
      meta: {
        title: g.seo_title || `${g.title} — Play Free Browser Game on GoodGame.center`,
        description: g.seo_description || `Play ${g.title}${g.owner_name ? `, a browser game by ${g.owner_name}` : ''}. ${g.pitch || g.description || 'Launch instantly on GoodGame.center.'}`,
        path: `/games/${g.slug}`,
        heading: g.title,
        type: 'game',
        image: g.cover_image || `/og/game/${g.slug}.svg`,
        noindex,
        jsonld: noindex ? [] : [gameLd(env, g), breadcrumbLd(env, [{ name: 'Games', path: '/games' }, { name: g.title, path: `/games/${g.slug}` }])],
      },
    };
  }
  const creatorMatch = path.match(/^\/creators\/([^/]+)$/);
  if (creatorMatch) {
    const creator = await db.getCreator(env, decodeURIComponent(creatorMatch[1]));
    if (!creator) return { status: 404, meta: base('Creator not found · GoodGame.center', 'This creator profile is not available on GoodGame.center.', path, true) };
    return { meta: base(`${creator.display_name} — Browser Games and Clips on GoodGame.center`, `View browser games, clips, updates, and communities from ${creator.display_name} on GoodGame.center.`, `/creators/${creator.username}`) };
  }
  const communityMatch = path.match(/^\/communities\/([^/]+)$/);
  if (communityMatch) {
    const community = await db.getCommunity(env, decodeURIComponent(communityMatch[1]));
    if (!community) return { status: 404, meta: base('Community not found · GoodGame.center', 'This community is not available on GoodGame.center.', path, true) };
    return { meta: base(`${community.name} — GoodGame.center Community`, `Join the ${community.name} community on GoodGame.center for browser games, clips, creator updates, and discussions.`, `/communities/${community.slug}`) };
  }
  const clipMatch = path.match(/^\/clips\/([^/]+)$/);
  if (clipMatch) {
    const id = decodeURIComponent(clipMatch[1]).split('-')[0];
    const clip = await db.getClipById(env, id);
    if (!clip) return { status: 404, meta: base('Clip not found · GoodGame.center', 'This clip is not available on GoodGame.center.', path, true) };
    return { meta: { ...base(`${clip.caption} — GoodGame.center Clip`, `Watch ${clip.caption}, a game clip${clip.game_title ? ` from ${clip.game_title}` : ''} by ${clip.author_name || 'a GoodGame creator'} on GoodGame.center.`, `/clips/${clip.id}-${clip.slug}`), type: 'video.other', image: `/og/clip/${clip.id}.svg` } };
  }
  return { status: 404, meta: base('Page not found · GoodGame.center', 'This page is not available on GoodGame.center.', path, true) };
};
const injectShellMeta = (html: string, env: Env, meta: ShellMeta) => {
  const canonical = env.SITE_URL + meta.path;
  const img = shellImage(env, meta.image);
  const head = [
    `<title>${escapeXml(meta.title)}</title>`,
    `<meta name="description" content="${escapeXml(meta.description)}">`,
    `<meta name="robots" content="${shellRobots(meta)}">`,
    `<link rel="canonical" href="${escapeXml(canonical)}">`,
    `<meta property="og:type" content="${escapeXml(meta.type || 'website')}">`,
    `<meta property="og:site_name" content="${escapeXml(env.SITE_NAME)}">`,
    `<meta property="og:title" content="${escapeXml(meta.title)}">`,
    `<meta property="og:description" content="${escapeXml(meta.description)}">`,
    `<meta property="og:url" content="${escapeXml(canonical)}">`,
    `<meta property="og:image" content="${escapeXml(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeXml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeXml(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeXml(img)}">`,
    ...(meta.jsonld || []).map((obj) => `<script type="application/ld+json">${ld(obj)}</script>`),
  ].join('');
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(/<head>/i, `<head>${head}`);
};
async function reactShellDocument(c: any, meta: ShellMeta) {
  const fallbackHeading = meta.heading || meta.title.replace(/\s+[—·-]\s+.*$/, '');
  const assetResponse = await c.env.ASSETS.fetch(new Request('https://assets.local/index.html'));
  if (!assetResponse.ok) throw new Error(`React asset shell unavailable: ${assetResponse.status}`);
  const assetHtml = await assetResponse.text();
  const htmlWithFallback = assetHtml.replace(
    '<div id="root"></div>',
    `<div id="root"><main><h1>${escapeXml(fallbackHeading)}</h1><p>${escapeXml(meta.description)}</p></main></div>`,
  );
  return injectShellMeta(
    htmlWithFallback,
    c.env,
    meta,
  );
}
async function reactShell(c: any, path: string) {
  const { meta, status } = await publicShellMeta(c.env, path);
  const html = await reactShellDocument(c, meta);
  const headers = new Headers();
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', status === 404 ? 'public, max-age=60' : 'public, max-age=0, must-revalidate');
  return new Response(html, { status: status || 200, headers });
}

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
  const rl = await tooMany(c, 'donate', 15, 3600); if (rl) return rl;
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
  const rl = await tooMany(c, 'admin-login', 10, 600); if (rl) return rl;
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
const rateGate = async (env: Env, key: string, limit: number, windowSeconds: number) => {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const kvKey = `rl:${key}:${bucket}`;
  const current = Number(await env.KV.get(kvKey) || '0');
  if (current >= limit) return false;
  await env.KV.put(kvKey, String(current + 1), { expirationTtl: windowSeconds + 30 });
  return true;
};
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

app.get('/api/feed/global', async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query('limit') || 40) || 40, 1), 80);
  return c.json({ activity: await db.globalActivity(c.env, limit) });
});

app.post('/api/feed/posts', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in before posting.' }, 401);
  if (!(await rateGate(c.env, `global-post:${user.id}`, 8, 600))) return c.json({ detail: 'Posting too quickly. Try again shortly.' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const textBody = cleanText(body.body, 800);
  if (!textBody) return c.json({ detail: 'Post body is required.' }, 400);
  const gameSlug = cleanText(body.game_slug, 80);
  const game = gameSlug ? await db.getGame(c.env, gameSlug) : null;
  const id = 'post_' + safeId();
  await c.env.DB.prepare(
    `INSERT INTO posts (id, author_id, game_id, type, body, visibility, moderation_status)
     VALUES (?, ?, ?, 'status', ?, 'public', 'clear')`
  ).bind(id, user.id, game?.id || null, textBody).run();
  return c.json({ ok: true, id });
});

app.get('/api/leaderboards', async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query('limit') || 18) || 18, 1), 60);
  return c.json({ leaders: await db.globalLeaderboard(c.env, limit) });
});

app.get('/api/games', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 60) || 60, 120);
  const games = await db.listGames(c.env, { sort: c.req.query('sort') || undefined, limit });
  return c.json({ games: games.map(apiGame) });
});
app.post('/api/games', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in before publishing a game.' }, 401);
  const rl = await tooMany(c, 'game-create', 12, 3600); if (rl) return rl;
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
  let compat: CompatReport | null = null;
  const build = b.build;
  if (build instanceof File && build.size > 0) {
    if (build.size > 95 * 1024 * 1024) return c.json({ detail: 'That build is over 90 MB.' }, 400);
    const res = ingestZip(new Uint8Array(await build.arrayBuffer()));
    if (!res.ok) return c.json({ detail: res.error }, 400);
    const prepared = analyzeAndPrepare(res.files, res.entry);
    compat = prepared.report;
    await Promise.all(prepared.files.map((f) =>
      c.env.UGC.put(`ugc/${id}/${f.path}`, f.bytes, { httpMetadata: { contentType: f.ct, contentEncoding: f.enc, cacheControl: 'public, max-age=3600' } })));
    await c.env.UGC.put(`ugc/${id}/__gg_compat.json`, JSON.stringify(compat), { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
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
  return c.json({ game: game ? apiGame(game) : { id, slug, title }, compat });
});
app.get('/api/games/:slug', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.json({ detail: 'Game not found' }, 404);
  const user = await getSession(c);
  const [releases, leaderboard] = await Promise.all([
    db.gameReleases(c.env, g.id),
    db.gameLeaderboard(c.env, g.id, 25),
  ]);
  const personalBest = user
    ? leaderboard.entries.find((entry: any) => entry.user_id === user.id) || null
    : null;
  return c.json({ game: apiGame(g), releases: releases.map(apiRelease), leaderboard, personal_best: personalBest });
});
app.post('/api/games/:slug/play', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (g) await c.env.DB.prepare(`UPDATE games SET play_count=play_count+1 WHERE id=?`).bind(g.id).run();
  return c.json({ ok: true });
});

// ---------- reviews ----------
app.get('/api/games/:slug/reviews', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.json({ reviews: [], summary: { avg: 0, count: 0 } });
  const rows = await c.env.DB.prepare(
    `SELECT r.id, r.rating, r.body, r.created_at, r.author_id, u.username author_username, u.display_name author_name
     FROM reviews r JOIN users u ON u.id = r.author_id
     WHERE r.game_id = ? AND r.status = 'published' ORDER BY r.created_at DESC LIMIT 100`
  ).bind(g.id).all();
  return c.json({ reviews: rows.results || [], summary: { avg: g.rating_avg || 0, count: g.rating_count || 0 } });
});
app.post('/api/games/:slug/reviews', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to review.' }, 401);
  const rl = await tooMany(c, 'review', 30, 3600); if (rl) return rl;
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g) return c.json({ detail: 'Game not found.' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 0)));
  if (!rating) return c.json({ detail: 'Pick a rating from 1 to 5.' }, 400);
  const text = cleanText(body.body, 2000);
  const existing = await c.env.DB.prepare(`SELECT id FROM reviews WHERE game_id=? AND author_id=?`).bind(g.id, user.id).first<{ id: string }>();
  if (existing) {
    await c.env.DB.prepare(`UPDATE reviews SET rating=?, body=?, status='published', created_at=datetime('now') WHERE id=?`).bind(rating, text, existing.id).run();
  } else {
    await c.env.DB.prepare(`INSERT INTO reviews (id, game_id, author_id, rating, body, status) VALUES (?, ?, ?, ?, ?, 'published')`).bind('rev_' + safeId(), g.id, user.id, rating, text).run();
  }
  const agg = await c.env.DB.prepare(`SELECT AVG(rating) avg, COUNT(*) count FROM reviews WHERE game_id=? AND status='published'`).bind(g.id).first<any>();
  const avg = Math.round((agg?.avg || 0) * 10) / 10;
  await c.env.DB.prepare(`UPDATE games SET rating_avg=?, rating_count=? WHERE id=?`).bind(avg, agg?.count || 0, g.id).run();
  return c.json({ ok: true, summary: { avg, count: agg?.count || 0 } });
});

app.get('/api/games/:slug/leaderboard', async (c) => {
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g || g.status !== 'published') return c.json({ detail: 'Game not found.' }, 404);
  const limit = Math.min(Math.max(Number(c.req.query('limit') || 25) || 25, 1), 100);
  const leaderboard = await db.gameLeaderboard(c.env, g.id, limit);
  return c.json({ game: { id: g.id, slug: g.slug, title: g.title }, ...leaderboard });
});

app.post('/api/games/:slug/runs', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to submit leaderboard scores.' }, 401);
  if (!(await rateGate(c.env, `game-run:${user.id}`, 80, 3600))) return c.json({ detail: 'Too many game runs. Try again later.' }, 429);
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g || g.status !== 'published') return c.json({ detail: 'Game not found.' }, 404);
  const config = await c.env.DB.prepare(
    `SELECT enabled, max_run_ms FROM game_leaderboard_config WHERE game_id=?`
  ).bind(g.id).first<{ enabled: number; max_run_ms: number }>();
  if (!config?.enabled) return c.json({ detail: 'Leaderboard is not enabled for this game.' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const runId = 'run_' + safeId() + safeId();
  const maxRunMs = Math.min(Math.max(config.max_run_ms || 7200000, 60_000), 7_200_000);
  const expiresAt = new Date(Date.now() + maxRunMs).toISOString();
  await c.env.DB.prepare(
    `INSERT INTO game_runs (id, game_id, user_id, status, started_at, expires_at, client_build)
     VALUES (?, ?, ?, 'active', datetime('now'), ?, ?)`
  ).bind(runId, g.id, user.id, expiresAt, cleanText(body.client_build, 40) || null).run();
  return c.json({ ok: true, run_id: runId, expires_at: expiresAt });
});

app.post('/api/games/:slug/scores', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to submit leaderboard scores.' }, 401);
  if (!(await rateGate(c.env, `game-score:${user.id}`, 120, 3600))) return c.json({ detail: 'Too many score submissions. Try again later.' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const runId = cleanText(body.run_id, 80);
  const score = Number(body.score);
  if (!runId || !Number.isSafeInteger(score) || score < 0) return c.json({ detail: 'A valid run and non-negative integer score are required.' }, 400);
  const g = await db.getGame(c.env, c.req.param('slug'));
  if (!g || g.status !== 'published') return c.json({ detail: 'Game not found.' }, 404);
  const run = await c.env.DB.prepare(
    `SELECT r.*, cfg.min_run_ms, cfg.max_run_ms, cfg.max_score_per_run, cfg.score_mode
     FROM game_runs r JOIN game_leaderboard_config cfg ON cfg.game_id=r.game_id AND cfg.enabled=1
     WHERE r.id=? AND r.game_id=? AND r.user_id=?`
  ).bind(runId, g.id, user.id).first<any>();
  if (!run || run.status !== 'active') return c.json({ detail: 'This run is not active.' }, 409);
  const startedAt = Date.parse(String(run.started_at).replace(' ', 'T') + 'Z');
  const expiresAt = Date.parse(run.expires_at);
  const elapsedMs = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || !Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    await c.env.DB.prepare(`UPDATE game_runs SET status='expired' WHERE id=? AND status='active'`).bind(runId).run();
    return c.json({ detail: 'This run expired.' }, 409);
  }
  if (elapsedMs < Number(run.min_run_ms || 0)) return c.json({ detail: 'Run ended too quickly to rank.' }, 422);
  if (elapsedMs > Number(run.max_run_ms || 7200000)) return c.json({ detail: 'Run exceeded the ranking window.' }, 422);
  if (score > Number(run.max_score_per_run || 1000000000)) return c.json({ detail: 'Score exceeds this game’s ranking limit.' }, 422);
  const scoreId = 'score_' + safeId() + safeId();
  const details = JSON.stringify({ duration_ms: Math.round(elapsedMs), client_duration_ms: Math.max(0, Math.round(Number(body.duration_ms) || 0)) });
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO game_scores (id, game_id, user_id, run_id, score, details) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(scoreId, g.id, user.id, runId, score, details),
      c.env.DB.prepare(
        `UPDATE game_runs SET status='submitted', submitted_at=datetime('now'), score=? WHERE id=? AND status='active'`
      ).bind(score, runId),
    ]);
  } catch {
    return c.json({ detail: 'This run was already submitted.' }, 409);
  }
  const leaderboard = await db.gameLeaderboard(c.env, g.id, 100);
  const entry = leaderboard.entries.find((row: any) => row.user_id === user.id) || null;
  return c.json({ ok: true, score, personal_best: entry, leaderboard: leaderboard.entries.slice(0, 25) });
});
app.post('/api/games/:slug/build', async (c) => {
  const owned = await requireGameOwner(c, c.req.param('slug'));
  if ('error' in owned) return owned.error;
  const { game } = owned;
  const rl = await tooMany(c, 'game-build', 24, 3600); if (rl) return rl;
  const b = await c.req.parseBody();
  const build = b.build;
  const version = cleanText(b.version, 40) || '1.0.1';
  const notes = cleanText(b.notes, 2000);
  if (!(build instanceof File) || build.size <= 0) return c.json({ detail: 'Build zip is required.' }, 400);
  if (build.size > 95 * 1024 * 1024) return c.json({ detail: 'That build is over 90 MB.' }, 400);
  const res = ingestZip(new Uint8Array(await build.arrayBuffer()));
  if (!res.ok) return c.json({ detail: res.error }, 400);
  const prepared = analyzeAndPrepare(res.files, res.entry);
  await Promise.all(prepared.files.map((f) =>
    c.env.UGC.put(`ugc/${game.id}/${f.path}`, f.bytes, { httpMetadata: { contentType: f.ct, contentEncoding: f.enc, cacheControl: 'public, max-age=3600' } })));
  await c.env.UGC.put(`ugc/${game.id}/__gg_compat.json`, JSON.stringify(prepared.report), { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
  const paths = res.files.map((f) => f.path.toLowerCase()).join('\n');
  const engine = paths.includes('.pck') ? 'godot' : (paths.includes('.data') || paths.includes('.unityweb') || paths.includes('.framework.js')) ? 'unity' : 'web';
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE games SET upload_entry=?, upload_bytes=?, engine=?, play_template=NULL, updated_at=datetime('now') WHERE id=?`)
      .bind(res.entry, res.total, engine, game.id),
    c.env.DB.prepare(`UPDATE releases SET is_current=0 WHERE game_id=?`).bind(game.id),
    c.env.DB.prepare(`INSERT INTO releases (id, game_id, version, changelog, release_notes, channel, status, is_current, release_date) VALUES (?, ?, ?, ?, ?, 'public', 'published', 1, datetime('now'))`)
      .bind('rel_' + game.id + '_' + safeId(), game.id, version, notes || 'Build replaced.', notes || 'Build replaced.'),
  ]);
  return c.json({ ok: true, upload_entry: res.entry, upload_bytes: res.total, compat: prepared.report });
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

// ---------- Save/Score SDK (KV-backed; the parent app relays for the sandboxed game) ----------
app.post('/api/sdk/score', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to save scores.' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const g = await db.getGame(c.env, String(body.game_slug || ''));
  if (!g) return c.json({ detail: 'Game not found.' }, 404);
  const r = await submitScore(c.env, g.id, user, body.board, body.score);
  return c.json(r, r.ok ? 200 : 400);
});
app.get('/api/sdk/leaderboard', async (c) => {
  const g = await db.getGame(c.env, c.req.query('game') || '');
  if (!g) return c.json({ entries: [] });
  const board = c.req.query('board') || 'default';
  const limit = Math.min(Number(c.req.query('limit') || 20) || 20, 100);
  return c.json({ board, entries: await getLeaderboard(c.env, g.id, board, limit) });
});
app.post('/api/sdk/save', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to save progress.' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const g = await db.getGame(c.env, String(body.game_slug || ''));
  if (!g) return c.json({ detail: 'Game not found.' }, 404);
  const r = await putSave(c.env, g.id, user.id, body.data);
  return c.json(r, r.ok ? 200 : 400);
});
app.get('/api/sdk/save', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ data: null });
  const g = await db.getGame(c.env, c.req.query('game') || '');
  if (!g) return c.json({ data: null });
  const raw = await getSave(c.env, g.id, user.id);
  let data: unknown = null;
  if (raw != null) { try { data = JSON.parse(raw); } catch { data = raw; } }
  return c.json({ data });
});

// ---------- Forge: prompt -> iterative HTML5 game (Workers AI), kept as a draft ----------
async function storeForgeHtml(env: Env, gameId: string, html: string) {
  const prepared = analyzeAndPrepare([{ path: 'index.html', bytes: new TextEncoder().encode(html), ct: 'text/html; charset=utf-8' }], 'index.html');
  await Promise.all(prepared.files.map((f) =>
    env.UGC.put(`ugc/${gameId}/${f.path}`, f.bytes, { httpMetadata: { contentType: f.ct, cacheControl: 'public, max-age=30' } })));
}

app.post('/api/forge', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to generate a game.' }, 401);
  const rl = await tooMany(c, 'forge', 12, 3600); if (rl) return rl;
  const body = await c.req.json().catch(() => ({}));
  const gen = await generateGameHtml(c.env, String(body.prompt || ''));
  if (!gen.ok) return c.json({ detail: gen.error }, 400);
  const id = 'gmu_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const slug = `${cleanSlug(gen.title)}-${Math.random().toString(36).slice(2, 6)}`;
  await storeForgeHtml(c.env, id, gen.html);
  await c.env.DB.prepare(
    `INSERT INTO games (id, owner_id, slug, title, pitch, description, engine, tags, platforms, build_class, status, maturity, content_rating, official, verified, accent, upload_entry, upload_bytes, play_count, follow_count, rating_avg, rating_count)
     VALUES (?, ?, ?, ?, ?, ?, 'forge', '', 'web', 'browser', 'draft', 'everyone', 'Everyone', 0, 0, '#6b93ff', 'index.html', ?, 0, 0, 0, 0)`
  ).bind(id, user.id, slug, gen.title, cleanText(body.prompt, 120), 'Generated with GoodGame Forge from a prompt — refine it in the workspace.', gen.html.length).run();
  await c.env.DB.prepare(
    `INSERT INTO releases (id, game_id, version, changelog, channel, status, is_current, release_date) VALUES (?, ?, '0.1.0', 'Forge draft created.', 'public', 'published', 1, datetime('now'))`
  ).bind('rel_' + id, id).run();
  return c.json({ slug, title: gen.title });
});

app.post('/api/games/:slug/forge-refine', async (c) => {
  const owned = await requireGameOwner(c, c.req.param('slug'));
  if ('error' in owned) return owned.error;
  const { game } = owned;
  const rl = await tooMany(c, 'forge-refine', 40, 3600); if (rl) return rl;
  const body = await c.req.json().catch(() => ({}));
  const obj = await c.env.UGC.get(`ugc/${game.id}/index.html`);
  if (!obj) return c.json({ detail: 'No Forge draft to edit here.' }, 400);
  const current = await obj.text();
  const r = await refineGameHtml(c.env, current, String(body.prompt || ''));
  if (!r.ok) return c.json({ detail: r.error }, 400);
  await storeForgeHtml(c.env, game.id, r.html);
  await c.env.DB.prepare(`UPDATE games SET upload_bytes=?, updated_at=datetime('now') WHERE id=?`).bind(r.html.length, game.id).run();
  return c.json({ ok: true });
});

app.post('/api/games/:slug/publish', async (c) => {
  const owned = await requireGameOwner(c, c.req.param('slug'));
  if ('error' in owned) return owned.error;
  await c.env.DB.prepare(`UPDATE games SET status='published', updated_at=datetime('now') WHERE id=?`).bind(owned.game.id).run();
  return c.json({ ok: true });
});

// ---------- Runtime check via Browser Rendering (owner-only) ----------
app.post('/api/games/:slug/runtime-check', async (c) => {
  const owned = await requireGameOwner(c, c.req.param('slug'));
  if ('error' in owned) return owned.error;
  const { game } = owned;
  const rl = await tooMany(c, 'runtime-check', 10, 3600); if (rl) return rl;
  const entry = game.upload_entry || (game.play_template ? '__template.html' : null);
  if (!entry) return c.json({ detail: 'No playable build to check yet.' }, 400);
  const report = await runtimeCheck(c.env, `${c.env.SITE_URL}/api/ugc/${game.id}/${entry}`);
  await c.env.KV.put(`gg:runtime:${game.id}`, JSON.stringify(report));
  return c.json({ report });
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
  // Uploaded HTML runs only in a sandboxed, opaque-origin context — even on a
  // direct visit — so it can never touch a first-party GoodGame session.
  if ((obj.httpMetadata?.contentType || '').includes('text/html')) h.set('content-security-policy', "sandbox allow-scripts allow-pointer-lock allow-forms allow-fullscreen");
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

app.get('/api/creators', async (c) => {
  const creators = await db.listCreators(c.env, 60);
  return c.json({ creators: creators.map(apiCreator) });
});
app.get('/api/creators/:username', async (c) => {
  const cr = await db.getCreator(c.env, c.req.param('username'));
  if (!cr) return c.json({ detail: 'Creator not found' }, 404);
  const user = await getSession(c);
  const [games, clips, isFollowing, followingCount] = await Promise.all([
    db.listGames(c.env, { limit: 120 }).then((gs) => gs.filter((g) => g.owner_id === cr.id)),
    db.listClips(c.env, { authorId: cr.id, limit: 24 }),
    user ? c.env.DB.prepare(`SELECT 1 FROM follows WHERE follower_id=? AND target_type='creator' AND target_id=?`).bind(user.id, cr.id).first().then((r) => !!r) : Promise.resolve(false),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM follows WHERE follower_id=? AND target_type='creator'`).bind(cr.id).first<any>().then((r) => r?.n || 0),
  ]);
  return c.json({ creator: { ...apiCreator(cr), following_count: followingCount }, games: games.map(apiGame), clips: clips.map(apiClip), is_self: user?.id === cr.id, is_following: isFollowing });
});
app.post('/api/creators/:username/follow', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to follow.' }, 401);
  const rl = await tooMany(c, 'follow', 120, 600); if (rl) return rl;
  const cr = await db.getCreator(c.env, c.req.param('username'));
  if (!cr) return c.json({ detail: 'Creator not found.' }, 404);
  if (cr.id === user.id) return c.json({ detail: "You can't follow yourself." }, 400);
  const existing = await c.env.DB.prepare(`SELECT id FROM follows WHERE follower_id=? AND target_type='creator' AND target_id=?`).bind(user.id, cr.id).first<{ id: string }>();
  if (existing) {
    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM follows WHERE id=?`).bind(existing.id),
      c.env.DB.prepare(`UPDATE profiles SET follower_count=MAX(0, follower_count-1) WHERE user_id=?`).bind(cr.id),
    ]);
    return c.json({ following: false });
  }
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO follows (id, follower_id, target_type, target_id) VALUES (?, ?, 'creator', ?)`).bind(crypto.randomUUID(), user.id, cr.id),
    c.env.DB.prepare(`UPDATE profiles SET follower_count=follower_count+1 WHERE user_id=?`).bind(cr.id),
  ]);
  return c.json({ following: true });
});
app.get('/api/creators/:username/followers', async (c) => {
  const cr = await db.getCreator(c.env, c.req.param('username'));
  if (!cr) return c.json({ followers: [] });
  const r = await c.env.DB.prepare(
    `SELECT u.username, u.display_name, p.avatar FROM follows f JOIN users u ON u.id=f.follower_id LEFT JOIN profiles p ON p.user_id=u.id
     WHERE f.target_type='creator' AND f.target_id=? ORDER BY f.created_at DESC LIMIT 100`
  ).bind(cr.id).all();
  return c.json({ followers: r.results || [] });
});
app.get('/api/creators/:username/following', async (c) => {
  const cr = await db.getCreator(c.env, c.req.param('username'));
  if (!cr) return c.json({ following: [] });
  const r = await c.env.DB.prepare(
    `SELECT u.username, u.display_name, p.avatar FROM follows f JOIN users u ON u.id=f.target_id LEFT JOIN profiles p ON p.user_id=u.id
     WHERE f.follower_id=? AND f.target_type='creator' ORDER BY f.created_at DESC LIMIT 100`
  ).bind(cr.id).all();
  return c.json({ following: r.results || [] });
});

// ---------- social feed: activity from followed creators (global discover fallback) ----------
app.get('/api/feed', async (c) => {
  const user = await getSession(c);
  const safeAll = async (stmt: { all: () => Promise<any> }): Promise<any[]> => {
    try { return (await stmt.all()).results || []; } catch { return []; }
  };
  let followed: string[] = [];
  if (user) {
    followed = (await safeAll(c.env.DB.prepare(`SELECT target_id FROM follows WHERE follower_id=? AND target_type='creator' LIMIT 200`).bind(user.id))).map((r: any) => r.target_id);
  }
  const personalized = followed.length > 0;
  const ph = followed.map(() => '?').join(',');
  const gamesSql = `SELECT g.*, u.username owner_username, u.display_name owner_name FROM games g JOIN users u ON u.id=g.owner_id
    WHERE g.status='published' AND g.deleted_at IS NULL${personalized ? ` AND g.owner_id IN (${ph})` : ''} ORDER BY g.created_at DESC LIMIT 24`;
  const clipsSql = `SELECT c.id, c.slug, c.caption, c.created_at, u.username author_username, u.display_name author_name FROM clips c JOIN users u ON u.id=c.author_id
    WHERE c.deleted_at IS NULL AND c.moderation_status='clear'${personalized ? ` AND c.author_id IN (${ph})` : ''} ORDER BY c.created_at DESC LIMIT 24`;
  const gameRows = await safeAll(c.env.DB.prepare(gamesSql).bind(...(personalized ? followed : [])));
  const clipRows = await safeAll(c.env.DB.prepare(clipsSql).bind(...(personalized ? followed : [])));
  const reviewRows = personalized
    ? await safeAll(c.env.DB.prepare(
        `SELECT r.id, r.rating, r.body, r.created_at, u.username author_username, u.display_name author_name, g.slug game_slug, g.title game_title
         FROM reviews r JOIN users u ON u.id=r.author_id JOIN games g ON g.id=r.game_id
         WHERE r.status='published' AND r.author_id IN (${ph}) ORDER BY r.created_at DESC LIMIT 24`).bind(...followed))
    : [];
  const meId = user?.id;
  const postWhere = personalized ? ` AND p.author_id IN (${followed.map(() => '?').join(',')}${meId ? ',?' : ''})` : '';
  const postBinds = personalized ? [...followed, ...(meId ? [meId] : [])] : [];
  const postRows = await safeAll(c.env.DB.prepare(
    `SELECT p.id, p.body, p.created_at, p.author_id, u.username author_username, u.display_name author_name
     FROM posts p JOIN users u ON u.id=p.author_id
     WHERE p.deleted_at IS NULL AND p.community_id IS NULL AND p.visibility='public' AND p.moderation_status='clear'${postWhere}
     ORDER BY p.created_at DESC LIMIT 24`).bind(...postBinds));
  const likeMap = await postLikes(c.env, postRows.map((p: any) => p.id), meId);
  const items = [
    ...postRows.map((p: any) => ({ type: 'post', at: p.created_at, id: p.id, actor: { username: p.author_username, name: p.author_name }, post: { body: p.body || '', mine: p.author_id === meId }, likes: likeMap[p.id]?.count || 0, liked: likeMap[p.id]?.liked || false })),
    ...gameRows.map((g: any) => ({ type: 'game', at: g.created_at, actor: { username: g.owner_username, name: g.owner_name }, game: apiGame(g) })),
    ...clipRows.map((cl: any) => ({ type: 'clip', at: cl.created_at, actor: { username: cl.author_username, name: cl.author_name }, clip: { slug: cl.slug, caption: cl.caption || 'Clip' } })),
    ...reviewRows.map((r: any) => ({ type: 'review', at: r.created_at, actor: { username: r.author_username, name: r.author_name }, review: { rating: r.rating, body: r.body || '', game_slug: r.game_slug, game_title: r.game_title } })),
  ].sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 50);
  return c.json({ personalized, items });
});

// ---------- posts (status updates) ----------
app.post('/api/posts', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to post.' }, 401);
  const rl = await tooMany(c, 'post', 40, 3600); if (rl) return rl;
  const body = await c.req.json().catch(() => ({}));
  const text = cleanText(body.body, 600);
  if (text.length < 1) return c.json({ detail: 'Write something first.' }, 400);
  const id = 'post_' + safeId();
  await c.env.DB.prepare(
    `INSERT INTO posts (id, author_id, type, body, visibility, moderation_status) VALUES (?, ?, 'status', ?, 'public', 'clear')`
  ).bind(id, user.id, text).run();
  return c.json({ post: { type: 'post', id, at: nowIso(), actor: { username: user.username, name: user.display_name }, post: { body: text, mine: true }, likes: 0, liked: false } });
});
app.post('/api/posts/:id/like', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in to like.' }, 401);
  const rl = await tooMany(c, 'like', 240, 600); if (rl) return rl;
  return c.json(await togglePostLike(c.env, c.req.param('id'), user.id));
});
app.post('/api/posts/:id/delete', async (c) => {
  const user = await getSession(c);
  if (!user) return c.json({ detail: 'Log in first.' }, 401);
  await c.env.DB.prepare(`UPDATE posts SET deleted_at=datetime('now') WHERE id=? AND author_id=?`).bind(c.req.param('id'), user.id).run();
  return c.json({ ok: true });
});

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
  // Uploaded HTML runs only in a sandboxed, opaque-origin context — even on a
  // direct visit — so it can never touch a first-party GoodGame session.
  if ((obj.httpMetadata?.contentType || '').includes('text/html')) h.set('content-security-policy', "sandbox allow-scripts allow-pointer-lock allow-forms allow-fullscreen");
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

// ---------- communities (legacy SSR paths → React /communities) ----------
app.get('/community', (c) => c.redirect('/communities', 301));
app.get('/community/:slug', (c) => c.redirect(`/communities/${c.req.param('slug')}`, 301));

// ---------- arena (no React equivalent yet → browse) ----------
app.get('/arena', (c) => c.redirect('/games', 301));
app.get('/arena/*', (c) => c.redirect('/games', 301));

// ---------- news (curated SEO articles) ----------
app.get('/api/news', (c) => c.json({ articles: newsList() }));
app.get('/api/news/:slug', (c) => {
  const a = newsArticle(c.req.param('slug'));
  if (!a) return c.json({ detail: 'Article not found' }, 404);
  return c.json({ article: a });
});

// ---------- search ----------
app.get('/search', async (c) => {
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const r = q ? await db.search(c.env, q) : { games: [], creators: [], communities: [], events: [], news: [] };
  return page(c, <SearchPage env={c.env} q={q} r={r} />);
});

// ---------- docs (no React equivalent yet → home) ----------
app.get('/docs', (c) => c.redirect('/', 301));
app.get('/docs/*', (c) => c.redirect('/', 301));

// ---------- app placeholders (real pages, noindex) ----------
const placeholder = (active: string | undefined, title: string, desc: string, path: string, body: any, noindex = true) =>
  (c: any) => page(c, <Shell env={c.env} active={active} title={title} desc={desc} path={path} noindex={noindex}>{body}</Shell>);

// Wallet sign-in and crypto-payment routes were removed — the product is free
// and no longer uses crypto identities. Password auth lives at /api/login,
// /api/onboarding, /api/session, and /api/logout.

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
// Legacy trust/safety SSR pages → the React /legal pages.
app.get('/safety', (c) => c.redirect('/legal/terms', 301));
app.get('/safety/:s', (c) => {
  const map: Record<string, string> = { dmca: 'dmca', privacy: 'privacy', terms: 'terms' };
  return c.redirect(`/legal/${map[c.req.param('s')] || 'terms'}`, 301);
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
  '/', '/games', '/games/browser', '/clips', '/communities', '/creators', '/news',
  '/legal/terms', '/legal/privacy', '/legal/dmca',
  ...newsSlugs().map((s) => `/news/${s}`),
  '/activity', '/leaderboards',
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
  return xml(sitemapUrlset(rows.communities.map((x) => sitemapUrl(c.env.SITE_URL, `/communities/${encodeURIComponent(x.slug)}`))));
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
