import type { Context } from 'hono';
import type { Env, Meta, Game, Clip, EventRow, Community, Article, Creator } from './lib';
import { ld, artVars, initials, fmtCount, csv, dur, relTime } from './lib';
import { CSS_VERSION } from './styles';
import { gameArt } from './art';
import { keyart, brandMark } from './keyart';
import { WALLET_MODAL, WALLET_JS } from './wallet';

// Render a JSX tree as a full HTML document with a leading doctype.
// SSR catalog pages change with data — force browsers to revalidate so edits
// (and DB updates) show immediately rather than serving a stale cached page.
export const page = (c: Context, node: any): Response => {
  c.header('cache-control', 'public, max-age=0, must-revalidate');
  return c.html('<!DOCTYPE html>' + String(node));
};

export function Document(props: {
  env: Env; meta: Meta; active?: string; jsonld?: unknown[]; children?: any;
}) {
  const { env, meta } = props;
  const img = meta.image
    ? (meta.image.startsWith('http') ? meta.image : env.SITE_URL + meta.image)
    : env.SITE_URL + '/og/default.svg';
  const url = env.SITE_URL + meta.path;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={url} />
        {meta.noindex
          ? <meta name="robots" content="noindex,nofollow" />
          : <meta name="robots" content="index,follow,max-image-preview:large" />}
        <meta property="og:type" content={meta.type || 'website'} />
        <meta property="og:site_name" content={env.SITE_NAME} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={img} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={img} />
        <meta name="theme-color" content="#070a11" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate" type="application/rss+xml" title="GoodGame News" href="/feed.xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href={`/styles.css?v=${CSS_VERSION}`} />
        {(props.jsonld || []).map((obj) => (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(obj) }} />
        ))}
      </head>
      <body>
        <Nav active={props.active} />
        <main>{props.children}</main>
        <Footer env={env} />
        <div dangerouslySetInnerHTML={{ __html: WALLET_MODAL }} />
        <script dangerouslySetInnerHTML={{ __html: WALLET_JS }} />
      </body>
    </html>
  );
}

function Nav(props: { active?: string }) {
  const link = (href: string, label: string, key: string) => (
    <a href={href} class={props.active === key ? 'active' : ''}>{label}</a>
  );
  return (
    <header class="nav">
      <div class="container">
        <a href="/" class="brand"><span class="logo" dangerouslySetInnerHTML={{ __html: brandMark() }} />GoodGame<span>.center</span></a>
        <nav class="nav-links">
          {link('/', 'Discover', 'discover')}
          {link('/games', 'Games', 'games')}
          {link('/arena', 'Arena', 'arena')}
          {link('/clips', 'Clips', 'clips')}
          {link('/community', 'Community', 'community')}
          {link('/news', 'News', 'news')}
        </nav>
        <div class="nav-right">
          <form class="search-mini" action="/search" method="get">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input name="q" placeholder="Search…" aria-label="Search" />
          </form>
          <span id="wallet-cta"><button class="btn btn-accent btn-sm" id="wallet-connect-btn" type="button">Connect Wallet</button></span>
        </div>
      </div>
    </header>
  );
}

function Footer(props: { env: Env }) {
  const col = (title: string, links: [string, string][]) => (
    <div>
      <h4>{title}</h4>
      {links.map(([href, label]) => <a href={href}>{label}</a>)}
    </div>
  );
  return (
    <footer class="footer">
      <div class="container">
        <div class="cols">
          <div>
            <a href="/" class="brand"><span class="logo" dangerouslySetInnerHTML={{ __html: brandMark() }} />GoodGame<span>.center</span></a>
            <p class="tag">Instant browser games and creator-uploaded web builds — play, publish, clip, and grow from the playable core.</p>
          </div>
          {col('Explore', [['/games', 'Games'], ['/arena', 'Arena'], ['/clips', 'Clips'], ['/community', 'Communities'], ['/creators', 'Creators'], ['/news', 'News']])}
          {col('Create', [['/create', 'Upload a game'], ['/create', 'Creator console'], ['/docs/sdk', 'GG SDK'], ['/studio', 'GG Studio'], ['/forge', 'GG Forge']])}
          {col('Platform', [['/docs', 'Docs'], ['/news', 'Newsroom'], ['/docs/upload-browser-game', 'Guides'], ['/llms.txt', 'llms.txt']])}
          {col('Trust', [['/safety', 'Guidelines'], ['/safety/dmca', 'DMCA'], ['/safety/ratings', 'Ratings'], ['/safety/privacy', 'Privacy'], ['/safety/terms', 'Terms']])}
        </div>
        <div class="legal">
          <span>© 2026 GoodGame.center · Every public release ships version history, scan status, and report tools.</span>
          <span class="row">
            <a href="/sitemap.xml">Sitemap</a><a href="/robots.txt">robots.txt</a><a href="/llms.txt">llms.txt</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

// ---------- primitives ----------
export const Avatar = (p: { name?: string; accent?: string; size?: number }) => {
  const s = p.size || 30;
  const a = p.accent || '#6b93ff';
  return (
    <span class="avatar" style={`width:${s}px;height:${s}px;font-size:${s * 0.4}px;background:linear-gradient(140deg, color-mix(in srgb,${a},#fff 18%), color-mix(in srgb,${a},#05070d 42%))`}>{initials(p.name || '?')}</span>
  );
};

// Cover art. Games pass a `kind` → an illustrated scene that depicts the actual
// game (2048 grid, runner, arena, road, lights-out, or abstract). Everything else
// falls back to the layered-gradient look.
export const Cover = (p: { accent: string; seed?: string; kind?: string; img?: string; ratio?: string; corner?: any; cornerR?: any; veil?: boolean; children?: any }) => {
  const scene = !p.img && p.kind ? gameArt(p.kind, p.accent, p.seed || '') : null;
  return (
    <div class={'cover' + (p.img || scene ? ' has-scene' : '')} style={artVars(p.accent, p.seed) + (p.ratio ? `;aspect-ratio:${p.ratio}` : '')}>
      {p.img ? <img class="scene-art" src={p.img} alt="" loading="lazy" /> : scene ? <div class="scene-art" dangerouslySetInnerHTML={{ __html: scene }} /> : null}
      {p.veil !== false ? <span class="veil" /> : null}
      {p.corner ? <div class="corner">{p.corner}</div> : null}
      {p.cornerR ? <div class="corner-r">{p.cornerR}</div> : null}
      {p.children}
    </div>
  );
};

const genreOf = (tags: string): string => {
  const t = csv(tags)[0] || '';
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Game';
};
export const VerifiedTick = () => <span class="ofc" title="Verified">✔</span>;
const Star = () => <span class="ofc" title="Official GG game"> ★</span>;

// ---------- cards (one image, one title, one quiet meta line) ----------
export function GameCard(p: { g: Game }) {
  const g = p.g;
  const price = g.price_amount && g.price_token
    ? `${g.price_amount} ${g.price_token}`
    : 'Free to Play';
  const free = !(g.price_amount && g.price_token);
  const art = keyart(g.slug);
  return (
    <a class="capsule" href={`/games/${g.slug}`}>
      {art
        ? <div class="cover has-scene" style="aspect-ratio:460/215"><div class="scene-art" dangerouslySetInnerHTML={{ __html: art }} /></div>
        : <Cover accent={g.accent} seed={g.slug} kind={g.play_template || 'default'} img={g.cover_image || undefined} ratio="460/215"><div class="capsule-name">{g.title}</div></Cover>}
      <div class="capsule-meta">
        <span class="capsule-tags">{g.official ? <Star /> : null} {g.engine === 'gg' ? genreOf(g.tags) : g.engine.toUpperCase()}</span>
        <span class={'capsule-price' + (free ? ' free' : '')}>{price}</span>
      </div>
    </a>
  );
}

export function ClipCard(p: { c: Clip }) {
  const c = p.c;
  return (
    <a class="card clip" href={`/clips/${c.id}-${c.slug}`}>
      <Cover accent={c.poster_accent || c.game_accent || '#6b93ff'} seed={c.slug} ratio="16/9">
        <span class="play"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span></span>
        <span class="dur">{dur(c.duration)}</span>
      </Cover>
      <div class="body">
        <div class="title" style="font-weight:600">{c.caption}</div>
        <div class="meta"><b>{c.author_name}</b><span>·</span><span>{fmtCount(c.view_count)} views</span></div>
      </div>
    </a>
  );
}

export function EventCard(p: { e: EventRow }) {
  const e = p.e;
  return (
    <a class="card" href={`/arena/events/${e.slug}`}>
      <Cover accent={e.accent} seed={e.slug} ratio="16/10"
        corner={e.status === 'live'
          ? <span class="badge live"><span class="dot" />LIVE</span>
          : <span class="badge">{e.type}</span>} />
      <div class="body">
        <div class="title">{e.title}</div>
        <div class="meta"><span class="gold">🏆 {e.prize_pool}</span><span>·</span><span>{e.status === 'upcoming' ? relTime(e.start_at) : e.status === 'live' ? 'Live now' : 'Ended'}</span></div>
      </div>
    </a>
  );
}

export function CommunityCard(p: { c: Community }) {
  const c = p.c;
  return (
    <a class="card" href={`/community/${c.slug}`}>
      <Cover accent={c.accent} seed={c.slug} ratio="16/8" corner={c.official ? <span class="badge gold">Official</span> : null} />
      <div class="body">
        <div class="title">{c.name}</div>
        <div class="meta"><b>{fmtCount(c.member_count)}</b><span>members</span></div>
      </div>
    </a>
  );
}

export function CreatorCard(p: { c: Creator }) {
  const c = p.c;
  const verified = c.official || c.verification_state === 'verified';
  return (
    <a class="card" href={`/creators/${c.username}`} style="align-items:center;text-align:center">
      <div class="body" style="align-items:center;text-align:center;gap:9px;padding:22px 14px 6px">
        <Avatar name={c.display_name} accent={c.avatar || '#6b93ff'} size={68} />
        <div class="title" style="margin-top:4px">{c.display_name} {verified ? <VerifiedTick /> : null}</div>
        <div class="meta" style="justify-content:center">{c.official ? 'Official studio' : 'Creator'}</div>
      </div>
    </a>
  );
}

export function NewsCard(p: { a: Article }) {
  const a = p.a;
  return (
    <a class="card" href={`/news/${a.slug}`}>
      <Cover accent={a.accent} seed={a.slug} ratio="16/9" />
      <div class="body">
        <div class="eyebrow" style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)">{a.category}</div>
        <div class="title" style="font-weight:650;white-space:normal;-webkit-line-clamp:2">{a.title}</div>
        <div class="meta"><b>{a.author_name}</b><span>·</span><span>{relTime(a.published_at)}</span></div>
      </div>
    </a>
  );
}

export function RailHead(p: { eyebrow?: string; title: string; more?: string }) {
  return (
    <div class="rail-head">
      <div>
        {p.eyebrow ? <div class="eyebrow">{p.eyebrow}</div> : null}
        <h2>{p.title}</h2>
      </div>
      {p.more ? <a class="more" href={p.more}>View all →</a> : null}
    </div>
  );
}
