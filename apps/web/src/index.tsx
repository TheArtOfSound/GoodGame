import { Hono } from 'hono';
import type { Env } from './lib';
import { fmtCount, initials, csv } from './lib';
import { CSS } from './styles';
import { page } from './components';
import { ogCard, favicon } from './og';
import { playDoc, TEMPLATE_IDS } from './play';
import { ingestZip } from './ingest';
import { issueNonce, verifyAndLogin, getSession, logout } from './auth';
import { createOrder, confirmOrder, hasEntitlement } from './pay';
import * as db from './db';

import { Home } from './views/home';
import { GamesDirectory, GamePage, PlayPage } from './views/games';
import { CreatorsDirectory, CreatorPage, ClipsDirectory, ClipPage } from './views/people';
import { CommunitiesDirectory, CommunityPage, ArenaPage, EventPage } from './views/community';
import { NewsDirectory, ArticlePage, SearchPage, DocsPage, Shell, NotFound } from './views/news';
import { CreatePage } from './views/create';

const app = new Hono<{ Bindings: Env }>();

const svg = (body: string) =>
  new Response(body, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
const text = (body: string, ct = 'text/plain') =>
  new Response(body, { headers: { 'content-type': `${ct}; charset=utf-8`, 'cache-control': 'public, max-age=900' } });

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

  // Publishing requires a connected wallet — that identity owns the game.
  const sessUser = await getSession(c);
  if (!sessUser) return fail('Connect a wallet first — that becomes your creator identity and is required to publish.');

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
Disallow: /dashboard
Disallow: /create
Disallow: /studio
Disallow: /admin
Disallow: /login
Disallow: /signup
Disallow: /search
Disallow: /api/
Disallow: /*/play

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${c.env.SITE_URL}/sitemap.xml
`));

app.get('/sitemap.xml', async (c) => {
  const base = c.env.SITE_URL;
  const r = await db.sitemapRows(c.env);
  const u = (loc: string, pri = '0.6', lastmod?: string) =>
    `<url><loc>${base}${loc}</loc>${lastmod ? `<lastmod>${(lastmod || '').slice(0, 10)}</lastmod>` : ''}<priority>${pri}</priority></url>`;
  const urls = [
    u('/', '1.0'), u('/games', '0.9'), u('/arena', '0.8'), u('/clips', '0.7'),
    u('/community', '0.7'), u('/creators', '0.7'), u('/news', '0.8'), u('/docs', '0.5'),
    ...r.games.map((g) => u(`/games/${g.slug}`, '0.8', g.updated_at)),
    ...r.creators.map((x) => u(`/creators/${x.slug}`, '0.6')),
    ...r.communities.map((x) => u(`/community/${x.slug}`, '0.6')),
    ...r.events.map((x) => u(`/arena/events/${x.slug}`, '0.6')),
    ...r.news.map((x) => u(`/news/${x.slug}`, '0.6', x.published_at)),
    ...r.clips.map((x) => u(`/clips/${x.id}-${x.slug}`, '0.5')),
  ].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
});

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
