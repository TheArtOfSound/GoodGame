// Game-news desk: ingest public RSS, write original GoodGame copy, publish daily.
import type { Env } from './lib';
import { newsList, newsArticle, type NewsArticle } from './news';

export type PublicArticle = {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  accent: string;
  date: string;
  keywords: string[];
  source_url?: string | null;
  source_name?: string | null;
  source_title?: string | null;
  kind: 'guide' | 'wire' | 'desk';
};

type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
};

const FEEDS: { name: string; url: string }[] = [
  { name: 'itch.io', url: 'https://blog.itch.io/feed' },
  { name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed' },
  { name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
  { name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml' },
  { name: 'Eurogamer', url: 'https://www.eurogamer.net/feed' },
  { name: 'Godot', url: 'https://godotengine.org/rss.xml' },
  { name: 'Indie Games Plus', url: 'https://indiegamesplus.com/feed' },
  { name: 'Destructoid', url: 'https://www.destructoid.com/feed/' },
];

const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
];

const INDEXNOW_KEY = 'a8df7c0d6f3b4ad2a6f9487c8f0b1d25';
const MAX_WIRE_PER_RUN = 8;
const UA = 'GoodGameDesk/1.0 (+https://goodgame.center/news)';

const stripTags = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

const tag = (block: string, name: string) => {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? stripTags(m[1]) : '';
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'wire';

const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);

export function parseFeed(xml: string, source: string): FeedItem[] {
  const items: FeedItem[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const entries = chunks.length ? chunks : xml.split(/<entry[\s>]/i).slice(1);
  for (const raw of entries.slice(0, 12)) {
    const title = tag(raw, 'title');
    const link = tag(raw, 'link') || (raw.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || '');
    const description = tag(raw, 'description') || tag(raw, 'summary') || tag(raw, 'content');
    const pubDate = tag(raw, 'pubDate') || tag(raw, 'updated') || tag(raw, 'published') || new Date().toUTCString();
    if (!title || !link) continue;
    if (!/^https?:\/\//i.test(link)) continue;
    items.push({ title, link, description: description.slice(0, 400), pubDate, source });
  }
  return items;
}

async function fetchFeed(feed: { name: string; url: string }): Promise<FeedItem[]> {
  const res = await fetch(feed.url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
  });
  if (!res.ok) return [];
  const xml = (await res.text()).slice(0, 400_000);
  return parseFeed(xml, feed.name);
}

async function alreadyHave(env: Env, sourceUrl: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT slug FROM desk_articles WHERE source_url = ?`).bind(sourceUrl).first();
  return !!row;
}

async function callModel(env: Env, system: string, user: string): Promise<string | null> {
  if (!env.AI) return null;
  for (const model of MODELS) {
    try {
      const out: any = await env.AI.run(model, {
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 700,
      });
      const v = out?.response ?? out?.result?.response ?? out?.result ?? out;
      const text = typeof v === 'string' ? v : JSON.stringify(v ?? '');
      if (text && text.trim()) return text.trim();
    } catch {
      /* next model */
    }
  }
  return null;
}

function fallbackCopy(item: FeedItem): { title: string; excerpt: string; paragraphs: string[] } {
  const title = `${item.title} — what it means for browser games`;
  const excerpt = `The game press is talking about “${item.title}.” Here’s the GoodGame alley read, and how it lands for people who play in the browser.`;
  return {
    title: title.slice(0, 110),
    excerpt: excerpt.slice(0, 200),
    paragraphs: [
      `${item.source} circulated a story headed “${item.title}.” We do not reprint that piece. This is the alley’s own take: what a player who lives in a browser tab should actually do with the news.`,
      item.description
        ? `The report points at a live moment in games. The useful part for GoodGame is not the rumor cycle — it is whether something new is playable without an install, and whether a small creator can ship a web build this week.`
        : `Headlines like this usually mean a launch, a tool, or a platform shift. GoodGame stays useful when those shifts still end in a URL you can click and play.`,
      `If you make games: treat this as a reminder to keep a browser build. Upload a zip to GoodGame or link the hosted play page so people can try it the same day they read the news.`,
      `If you play: skip the storefront queue. The alley is already open — walk the cabinets, leave a score, and come back tomorrow. The desk updates as the feeds do.`,
      `Source: ${item.source}. Read the original reporting, then come play something that runs in this tab.`,
    ],
  };
}

function parseModelJson(raw: string): { title: string; excerpt: string; paragraphs: string[] } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    const title = String(obj.title || '').trim();
    const excerpt = String(obj.excerpt || '').trim();
    const paragraphs = Array.isArray(obj.paragraphs)
      ? obj.paragraphs.map((p: unknown) => String(p || '').trim()).filter(Boolean)
      : [];
    if (title.length < 12 || paragraphs.length < 3) return null;
    return { title: title.slice(0, 110), excerpt: excerpt.slice(0, 220), paragraphs: paragraphs.slice(0, 8) };
  } catch {
    return null;
  }
}

async function writeWire(env: Env, item: FeedItem): Promise<PublicArticle | null> {
  if (await alreadyHave(env, item.link)) return null;
  const system = 'You write original news-desk copy for GoodGame.center, a free browser-game alley. Never copy a source article. Use the headline only as a news hook. Output JSON only: {"title":"...","excerpt":"...","paragraphs":["..."]}. Title under 90 chars. Excerpt under 180 chars. 4 to 6 short paragraphs. Mention playing or publishing HTML5/browser games on GoodGame.center. Name the source once.';
  const user = `Source: ${item.source}\nHeadline: ${item.title}\nBlurb: ${item.description || '(none)'}\nWrite the GoodGame desk item.`;
  const raw = await callModel(env, system, user);
  const copy = (raw && parseModelJson(raw)) || fallbackCopy(item);
  const day = isoDay(new Date(item.pubDate || Date.now()));
  const slug = `wire-${day}-${slugify(item.title)}-${crypto.randomUUID().slice(0, 4)}`;
  const id = 'desk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const body = JSON.stringify(copy.paragraphs);
  const published = new Date(item.pubDate || Date.now()).toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO desk_articles (id, slug, title, excerpt, body, category, accent, source_url, source_name, source_title, keywords, status, published_at)
       VALUES (?, ?, ?, ?, ?, 'wire', '#7ef0ff', ?, ?, ?, ?, 'published', ?)`
    ).bind(
      id, slug, copy.title, copy.excerpt, body,
      item.link, item.source, item.title,
      'browser games, indie games, html5, game news',
      published,
    ).run();
  } catch {
    return null;
  }
  return {
    slug, title: copy.title, excerpt: copy.excerpt, body: copy.paragraphs,
    category: 'wire', accent: '#7ef0ff', date: published,
    keywords: ['browser games', 'indie games', 'game news'],
    source_url: item.link, source_name: item.source, source_title: item.title, kind: 'wire',
  };
}

async function writeDailyDesk(env: Env, wires: PublicArticle[]): Promise<PublicArticle | null> {
  const day = isoDay();
  const slug = `desk-${day}`;
  const existing = await env.DB.prepare(`SELECT slug FROM desk_articles WHERE slug = ?`).bind(slug).first();
  const pretty = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const title = `Today in games — ${pretty}`;
  const excerpt = `The GoodGame desk for ${pretty}: browser-game headlines, indie launches, and what you can play in a tab today.`;
  const paragraphs = [
    `This is the alley desk for ${pretty}. It is written here, for people who play and publish in the browser — not a reprint of anyone else’s homepage.`,
    wires.length
      ? `On the wire today: ${wires.slice(0, 8).map((w) => w.source_title || w.title).join('; ')}.`
      : `The feeds were quiet this pass. The cabinets are not — new HTML5 builds still go live on GoodGame the same day a creator uploads them.`,
    `If a headline is about a store, a console, or a launcher, ask the useful question: is there a web build? If yes, it belongs in the alley. If you made it, host the zip on GoodGame and get a play page in minutes.`,
    `Come back tomorrow. This desk URL is unique for the day, so search engines can find each morning’s briefing, and players can catch up without a newsletter.`,
  ];
  const body = JSON.stringify(paragraphs);
  const published = `${day}T14:00:00.000Z`;
  if (existing) {
    await env.DB.prepare(
      `UPDATE desk_articles SET title=?, excerpt=?, body=?, published_at=? WHERE slug=?`
    ).bind(title, excerpt, body, published, slug).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO desk_articles (id, slug, title, excerpt, body, category, accent, keywords, status, published_at)
       VALUES (?, ?, ?, ?, ?, 'desk', '#e8a54b', ?, 'published', ?)`
    ).bind(
      'desk_' + day.replace(/-/g, ''),
      slug, title, excerpt, body,
      'daily game news, browser games, indie, html5',
      published,
    ).run();
  }
  return {
    slug, title, excerpt, body: paragraphs, category: 'desk', accent: '#e8a54b',
    date: published, keywords: ['daily game news', 'browser games'], kind: 'desk',
  };
}

async function pingIndexNow(env: Env, slugs: string[]) {
  if (!slugs.length) return;
  const urls = slugs.map((s) => `${env.SITE_URL}/news/${s}`);
  urls.push(`${env.SITE_URL}/news`, `${env.SITE_URL}/rss.xml`);
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        host: 'goodgame.center',
        key: INDEXNOW_KEY,
        keyLocation: `https://goodgame.center/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch {
    /* non-fatal */
  }
}

export async function runNewsDesk(env: Env): Promise<{ ok: boolean; fetched: number; wrote: number; slugs: string[]; error?: string }> {
  const collected: FeedItem[] = [];
  for (const feed of FEEDS) {
    try {
      collected.push(...await fetchFeed(feed));
    } catch {
      /* skip dead feed */
    }
  }
  const seen = new Set<string>();
  const fresh: FeedItem[] = [];
  for (const item of collected) {
    const key = item.link.replace(/\/+$/, '').split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    if (await alreadyHave(env, item.link)) continue;
    fresh.push(item);
    if (fresh.length >= MAX_WIRE_PER_RUN) break;
  }
  const wrote: PublicArticle[] = [];
  for (const item of fresh) {
    const article = await writeWire(env, item);
    if (article) wrote.push(article);
  }
  const todayWires = await listDeskArticles(env, 16);
  const digest = await writeDailyDesk(env, todayWires.filter((a) => a.kind === 'wire' && a.date.slice(0, 10) === isoDay()));
  const slugs = wrote.map((a) => a.slug);
  if (digest) slugs.push(digest.slug);
  await pingIndexNow(env, slugs);
  return { ok: true, fetched: collected.length, wrote: wrote.length, slugs };
}

function rowToArticle(row: any): PublicArticle {
  let body: string[] = [];
  try { body = JSON.parse(row.body || '[]'); } catch { body = [String(row.body || '')]; }
  if (!Array.isArray(body)) body = [String(body)];
  const category = String(row.category || 'wire');
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body,
    category,
    accent: row.accent || '#7ef0ff',
    date: row.published_at || row.created_at,
    keywords: String(row.keywords || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    source_url: row.source_url || null,
    source_name: row.source_name || null,
    source_title: row.source_title || null,
    kind: category === 'desk' ? 'desk' : 'wire',
  };
}

export async function listDeskArticles(env: Env, limit = 60): Promise<PublicArticle[]> {
  try {
    const r = await env.DB.prepare(
      `SELECT * FROM desk_articles WHERE status='published' ORDER BY datetime(published_at) DESC LIMIT ?`
    ).bind(limit).all();
    return (r.results || []).map(rowToArticle);
  } catch {
    return [];
  }
}

export async function getDeskArticle(env: Env, slug: string): Promise<PublicArticle | null> {
  try {
    const row = await env.DB.prepare(
      `SELECT * FROM desk_articles WHERE slug = ? AND status='published'`
    ).bind(slug).first();
    return row ? rowToArticle(row) : null;
  } catch {
    return null;
  }
}

export function guideToPublic(a: NewsArticle): PublicArticle {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    category: a.category,
    accent: a.accent,
    date: a.date,
    keywords: a.keywords,
    kind: 'guide',
  };
}

export async function allPublicArticles(env: Env): Promise<PublicArticle[]> {
  const desk = await listDeskArticles(env, 80);
  const guides = newsList().map((m) => {
    const full = newsArticle(m.slug);
    return full ? guideToPublic(full) : null;
  }).filter(Boolean) as PublicArticle[];
  return [...desk, ...guides].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function findPublicArticle(env: Env, slug: string): Promise<PublicArticle | null> {
  const guide = newsArticle(slug);
  if (guide) return guideToPublic(guide);
  return getDeskArticle(env, slug);
}
