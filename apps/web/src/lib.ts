// Shared types, formatting, SEO + JSON-LD helpers.

export type Env = {
  DB: D1Database;
  UGC: R2Bucket;
  KV: KVNamespace;
  SITE_URL: string;
  SITE_NAME: string;
  BUILD_SHA?: string;
  BUILD_REF?: string;
  BUILD_TIME?: string;
  CAPTURE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  ADMIN_PASSWORD?: string;
};

export type SessionUser = {
  id: string; username: string; display_name: string;
  wallet_address?: string | null; wallet_chain?: string | null; avatar?: string | null;
};

export type Game = {
  id: string; slug: string; title: string; pitch: string; description: string;
  engine: string; tags: string; platforms: string; build_class: string;
  status: string; maturity: string; content_rating: string; pricing: string;
  price_cents: number; official: number; verified: number; accent: string;
  play_count: number; follow_count: number; rating_avg: number; rating_count: number;
  owner_id: string; owner_name?: string; owner_username?: string; updated_at?: string;
  play_template?: string | null;
  upload_entry?: string | null; upload_bytes?: number | null;
  price_amount?: string | null; price_token?: string | null; pay_chain?: string | null; pay_to?: string | null;
  cover_image?: string | null;
};
export type Clip = {
  id: string; slug: string; caption: string; tags: string; duration: number;
  view_count: number; poster_accent: string; author_id: string; game_id: string;
  author_name?: string; author_username?: string; game_title?: string; game_slug?: string;
  game_accent?: string; created_at?: string;
};
export type EventRow = {
  id: string; slug: string; title: string; description: string; rules: string;
  type: string; status: string; start_at: string; end_at: string; eligibility: string;
  prize_pool: string; accent: string; participants: number; game_id: string;
  game_title?: string; game_slug?: string; organizer_name?: string;
};
export type Community = {
  id: string; slug: string; name: string; description: string; rules: string;
  visibility: string; accent: string; official: number; member_count: number;
  game_id: string; game_title?: string; game_slug?: string; owner_name?: string;
};
export type Article = {
  id: string; slug: string; title: string; excerpt: string; body: string;
  category: string; accent: string; published_at: string; author_name?: string;
  related_game_id?: string; related_game_title?: string; related_game_slug?: string;
};
export type Review = {
  id: string; rating: number; body: string; playtime_evidence: string;
  helpful_count: number; created_at: string; author_name?: string; author_username?: string;
};
export type Creator = {
  id: string; username: string; display_name: string; role: string; bio?: string;
  avatar?: string; banner?: string; follower_count?: number; verification_state?: string;
  trust_tier?: string; official?: number; links?: string;
};

// ---------- formatting ----------
export const fmtCount = (n: number): string => {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 10_000) return Math.round(n / 1000) + 'K';
  if (n >= 1_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

export const fmtDate = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const relTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z')).getTime();
  const now = Date.now();
  const diff = Math.round((d - now) / 1000);
  const abs = Math.abs(diff);
  const fut = diff > 0;
  const u = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'} ${fut ? 'from now' : 'ago'}`;
  if (abs < 60) return fut ? 'soon' : 'just now';
  if (abs < 3600) return u(Math.round(abs / 60), 'min');
  if (abs < 86400) return u(Math.round(abs / 3600), 'hour');
  if (abs < 604800) return u(Math.round(abs / 86400), 'day');
  return fmtDate(iso);
};

export const stars = (rating: number): string => {
  const r = Math.round(rating);
  return '★★★★★☆☆☆☆☆'.slice(5 - r, 10 - r);
};

export const initials = (name: string): string =>
  (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

// Generative cover art: set --accent + a seeded light position; the `.art`/`.cover`
// CSS classes render layered gradients, a soft motif, and grain from these vars.
export const seedPos = (s: string): { gx: number; gy: number } => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return { gx: 52 + (h % 38), gy: 8 + ((h >> 6) % 26) };
};
export const artVars = (accent: string, seed = ''): string => {
  const { gx, gy } = seedPos(seed || accent);
  return `--accent:${accent};--gx:${gx}%;--gy:${gy}%`;
};
// back-compat alias (returns the same custom-property string)
export const coverStyle = (accent: string, seed = ''): string => artVars(accent, seed);

export const dur = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const csv = (s?: string): string[] => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- SEO ----------
export type Meta = {
  title: string;
  description: string;
  path: string;            // canonical path (no host)
  image?: string;          // absolute or path
  type?: 'website' | 'article' | 'video.other' | 'profile';
  noindex?: boolean;
};

export const playClass = (g: Game): { label: string; kind: string } => {
  switch (g.build_class) {
    case 'native': return { label: 'Download', kind: 'native' };
    case 'server': return { label: 'Play Online', kind: 'server' };
    case 'cloud': return { label: 'Cloud Stream', kind: 'cloud' };
    default: return { label: 'Play Now', kind: 'browser' };
  }
};

// ---------- JSON-LD ----------
export const ld = (obj: unknown): string =>
  JSON.stringify(obj).replace(/</g, '\\u003c');

export const gameLd = (env: Env, g: Game) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: g.title,
  applicationCategory: 'GameApplication',
  operatingSystem: csv(g.platforms).join(', ') || 'Web',
  description: g.pitch || g.description,
  url: `${env.SITE_URL}/games/${g.slug}`,
  image: `${env.SITE_URL}/og/game/${g.slug}.svg`,
  ...(g.owner_name ? {
    author: { '@type': 'Organization', name: g.owner_name, url: `${env.SITE_URL}/creators/${g.owner_username}` },
  } : {}),
  ...(g.rating_count > 0 ? {
    aggregateRating: { '@type': 'AggregateRating', ratingValue: g.rating_avg, ratingCount: g.rating_count, bestRating: 5 },
  } : {}),
  offers: { '@type': 'Offer', price: (g.price_cents / 100).toFixed(2), priceCurrency: 'USD' },
});

export const articleLd = (env: Env, a: Article) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.title,
  description: a.excerpt,
  url: `${env.SITE_URL}/news/${a.slug}`,
  datePublished: a.published_at,
  author: { '@type': 'Organization', name: a.author_name || 'GoodGame.center' },
  publisher: { '@type': 'Organization', name: 'GoodGame.center' },
});

export const eventLd = (env: Env, e: EventRow) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: e.title,
  description: e.description,
  url: `${env.SITE_URL}/arena/events/${e.slug}`,
  startDate: e.start_at,
  endDate: e.end_at,
  eventStatus: e.status === 'completed' ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  organizer: { '@type': 'Organization', name: e.organizer_name || 'GoodGame.center' },
});

export const breadcrumbLd = (env: Env, items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name, item: `${env.SITE_URL}${it.path}`,
  })),
});

export const siteLd = (env: Env) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: env.SITE_NAME,
  url: env.SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${env.SITE_URL}/search?q={query}`,
    'query-input': 'required name=query',
  },
});
