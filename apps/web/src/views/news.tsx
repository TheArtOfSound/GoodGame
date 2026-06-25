import { Document, NewsCard, GameCard, ClipCard, CommunityCard, CreatorCard, EventCard, Avatar, RailHead } from '../components';
import { artVars, fmtDate, relTime, breadcrumbLd, articleLd, type Env, type Article } from '../lib';
import type { search as searchFn } from '../db';

export function NewsDirectory(props: { env: Env; articles: Article[] }) {
  const { env } = props;
  const [lead, ...rest] = props.articles;
  return (
    <Document env={env} active="news"
      meta={{ title: 'Newsroom — GoodGame.center', description: 'Platform news, creator spotlights, patch notes, and guides from GoodGame.center.', path: '/news' }}
      jsonld={[breadcrumbLd(env, [{ name: 'News', path: '/news' }])]}>
      <div class="container">
        <div class="phead"><h1>Newsroom</h1><p>Launches, creator spotlights, patch notes, and guides.</p></div>
        {props.articles.length === 0 ? <div class="empty" style="margin-top:20px">No posts yet. Launch news and guides will appear here.</div> : null}
        {lead ? (
          <a href={`/news/${lead.slug}`} class="panel" style="display:grid;grid-template-columns:1.2fr 1fr;overflow:hidden;margin:8px 0 26px">
            <div class="art" style={artVars(lead.accent, lead.slug) + ';min-height:260px;position:relative'} />
            <div style="padding:30px;display:flex;flex-direction:column;justify-content:center">
              <span class="eyebrow" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-2)">{lead.category}</span>
              <h2 style="font-size:28px;margin:12px 0 10px;letter-spacing:-.03em">{lead.title}</h2>
              <p class="muted">{lead.excerpt}</p>
              <div class="row dim" style="font-size:12.5px;margin-top:16px"><b style="color:var(--text-2)">{lead.author_name}</b><span>· {relTime(lead.published_at)}</span></div>
            </div>
          </a>
        ) : null}
        <div class="grid g3">{rest.map((a) => <NewsCard a={a} />)}</div>
      </div>
    </Document>
  );
}

export function ArticlePage(props: { env: Env; a: Article; related: Article[] }) {
  const { env, a } = props;
  return (
    <Document env={env} active="news"
      meta={{ title: `${a.title} | GoodGame.center`, description: a.excerpt, path: `/news/${a.slug}`, type: 'article', image: `/og/news/${a.slug}.svg` }}
      jsonld={[articleLd(env, a), breadcrumbLd(env, [{ name: 'News', path: '/news' }, { name: a.title, path: `/news/${a.slug}` }])]}>
      <div class="art" style={'height:220px;position:relative;' + artVars(a.accent, a.slug)} />
      <div class="container">
        <article class="article" style="margin-top:34px">
          <a href="/news" class="dim" style="font-size:13px">← Newsroom</a>
          <div class="eyebrow" style="margin:16px 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-2)">{a.category}</div>
          <h1>{a.title}</h1>
          <div class="row" style="gap:10px;margin:16px 0 24px"><Avatar name={a.author_name} accent={a.accent} size={34} /><b>{a.author_name}</b><span class="dim">· {fmtDate(a.published_at)}</span></div>
          <p class="lede">{a.excerpt}</p>
          <div class="prose">{a.body.split('\n\n').map((para) => <p>{para}</p>)}</div>
          {a.related_game_title ? (
            <a href={`/games/${a.related_game_slug}`} class="panel" style="display:flex;gap:13px;align-items:center;padding:16px;margin-top:30px">
              <span class="ic art" style={artVars(a.accent, a.related_game_slug || a.slug)} />
              <div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Related game</div><b>{a.related_game_title}</b><div class="gold" style="font-size:12.5px">Play now →</div></div>
            </a>
          ) : null}
        </article>
        {props.related.length ? (
          <section class="block"><RailHead title="More from the newsroom" more="/news" /><div class="grid g3">{props.related.map((r) => <NewsCard a={r} />)}</div></section>
        ) : null}
      </div>
    </Document>
  );
}

export function SearchPage(props: { env: Env; q: string; r: Awaited<ReturnType<typeof searchFn>> }) {
  const { env, q, r } = props;
  const total = r.games.length + r.creators.length + r.communities.length + r.events.length + r.news.length;
  return (
    <Document env={env}
      meta={{ title: q ? `Search: ${q} — GoodGame.center` : 'Search — GoodGame.center', description: 'Search games, creators, communities, events, and news on GoodGame.center.', path: '/search', noindex: true }}>
      <div class="container">
        <div class="phead">
          <h1>Search</h1>
          <form action="/search" method="get" style="margin-top:16px;max-width:560px">
            <div class="search-mini" style="display:flex;width:100%;padding:13px 16px">
              <input name="q" value={q} placeholder="Search games, creators, communities, events…" autofocus={true} style="font-size:15px" />
            </div>
          </form>
        </div>
        {q ? <p class="dim" style="margin-bottom:24px">{total} result{total === 1 ? '' : 's'} for “{q}”</p> : null}
        {r.games.length ? <section class="block" style="margin-top:0"><RailHead title="Games" /><div class="grid g4">{r.games.map((g) => <GameCard g={g} />)}</div></section> : null}
        {r.creators.length ? <section class="block"><RailHead title="Creators" /><div class="grid g4">{r.creators.map((c) => <CreatorCard c={c} />)}</div></section> : null}
        {r.communities.length ? <section class="block"><RailHead title="Communities" /><div class="grid g3">{r.communities.map((c) => <CommunityCard c={c} />)}</div></section> : null}
        {r.events.length ? <section class="block"><RailHead title="Events" /><div class="grid g3">{r.events.map((e) => <EventCard e={e} />)}</div></section> : null}
        {r.news.length ? <section class="block"><RailHead title="News" /><div class="grid g3">{r.news.map((a) => <NewsCard a={a} />)}</div></section> : null}
        {q && total === 0 ? <div class="empty">No results for “{q}”. Try a game name, creator, or tag.</div> : null}
      </div>
    </Document>
  );
}

// ---- simple content + app placeholder pages (keep every nav/footer link real) ----
export function Shell(props: { env: Env; active?: string; title: string; desc: string; path: string; noindex?: boolean; children?: any }) {
  return (
    <Document env={props.env} active={props.active}
      meta={{ title: `${props.title} | GoodGame.center`, description: props.desc, path: props.path, noindex: props.noindex }}>
      <div class="container"><div class="phead"><h1>{props.title}</h1><p>{props.desc}</p></div>{props.children}</div>
    </Document>
  );
}

const GG_BUILD_JSON = `{
  "schema": "gg-build/v1",
  "gameId": "game_123",
  "version": "1.2.0",
  "buildClass": "browser",
  "platforms": ["web"],
  "entrypoint": "index.html",
  "engine": "godot",
  "engineVersion": "4.x",
  "requiresCrossOriginIsolation": true,
  "sdk": { "enabled": true, "version": "0.1.0", "scopes": ["profile:read", "leaderboards:write", "achievements:write"] },
  "permissions": ["fullscreen", "pointer-lock", "gamepad"],
  "content": { "mature": false, "aiGenerated": false },
  "files": [{ "path": "index.html" }, { "path": "game.wasm" }, { "path": "game.pck" }]
}`;

export function DocsPage(props: { env: Env; slug?: string }) {
  const { env } = props;
  const docs: Record<string, { title: string; description: string; body: any }> = {
    'upload-browser-game': {
      title: 'How to upload a browser game',
      description: 'Export, validate, upload, publish, and index an HTML5, WebGL, WASM, Godot Web, or Unity WebGL game on GoodGame.center.',
      body: <>
        <div class="prose">
          <p>Export a web build (HTML5, WebGL, WASM, Godot Web, or Unity WebGL), place its entrypoint at index.html, zip the build, and upload it through the creator flow. GoodGame validates archive paths, rejects obvious native executable formats, enforces file and archive limits, and serves the build inside a restricted sandboxed iframe.</p>
          <p>Add a title, short pitch, description, and tags before publishing. The live game page receives a canonical URL, structured game metadata, a sitemap entry, patch notes, fullscreen play, and an optional authenticated leaderboard score bridge.</p>
        </div>
        <h3 style="margin:26px 0 12px">Example gg-build.json</h3>
        <div class="codeblock">{GG_BUILD_JSON}</div>
      </>,
    },
    sdk: {
      title: 'GG SDK overview',
      description: 'Use GoodGame’s current browser message contract for run lifecycle and authenticated leaderboard score submission.',
      body: <div class="prose">
        <p>The current browser integration uses parent-window messages. A game can announce a run with goodgame:run-start and report its final integer score with goodgame:score. The parent page creates an authenticated, expiring run record and submits one score for that run.</p>
        <p>Scores are client-reported unless a game is first-party, and server-authoritative anti-cheat is not claimed. Achievements, cloud saves, engine plugins, and broader SDK scopes are future work and are not presented as live APIs.</p>
      </div>,
    },
  };
  const doc = props.slug ? docs[props.slug] : null;
  if (doc) {
    return <Document env={env} active="discover" meta={{ title: `${doc.title} — GG Docs`, description: doc.description, path: `/docs/${props.slug}` }}>
      <div class="container"><article class="article" style="margin-top:34px"><a href="/docs" class="dim" style="font-size:13px">← Docs</a><h1 style="margin-top:16px">{doc.title}</h1><div style="margin-top:20px">{doc.body}</div></article></div>
    </Document>;
  }
  return <Shell env={env} active="discover" title="Developer docs" desc="Guides and references for publishing games, using the GG SDK, and running events on GoodGame.center." path="/docs">
    <div class="grid g3" style="margin-top:8px">
      {[['upload-browser-game', 'Upload a browser game', 'From a zipped web build to a live, indexable game page.'],
        ['sdk', 'GG SDK overview', 'Identity, leaderboards, achievements, cloud saves, and clips.'],
        ['godot', 'Releasing a Godot game', 'Web exports and cross-origin isolation.'],
        ['unity', 'Unity WebGL builds', 'Export settings and SDK integration.'],
        ['unreal', 'Unreal pixel streaming', 'Cloud-streamed games over WebRTC.']].map(([slug, t, d]) => (
        <a class="card" href={`/docs/${slug}`} style="background:var(--panel);border:1px solid var(--line-soft)"><div class="body" style="padding:18px"><b>{t}</b><p class="muted" style="font-size:13.5px;margin-top:6px">{d}</p></div></a>
      ))}
    </div>
  </Shell>;
}

export function NotFound(props: { env: Env }) {
  return <Document env={props.env} meta={{ title: 'Not found — GoodGame.center', description: 'Page not found.', path: '/404', noindex: true }}>
    <div class="container"><div class="empty" style="padding:110px 20px"><h1 style="font-size:58px">404</h1><p style="margin:12px 0 22px">That page wandered off. Let’s get you back in the game.</p><a class="btn btn-primary" href="/">Back to Discover</a></div></div>
  </Document>;
}
