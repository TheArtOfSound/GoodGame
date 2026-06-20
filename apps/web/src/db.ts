import type { Env, Game, Clip, EventRow, Community, Article, Review, Creator } from './lib';

const GAME_COLS = `g.*, u.display_name owner_name, u.username owner_username,
  (SELECT ma.source_path FROM media_assets ma WHERE ma.game_id = g.id AND ma.type = 'capsule' AND ma.moderation_status = 'clear' ORDER BY ma.sort ASC LIMIT 1) cover_image`;
const GAME_FROM = `FROM games g JOIN users u ON u.id = g.owner_id`;
const GAME_PUB = `g.status = 'published' AND g.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'`;

export async function listGames(
  env: Env,
  opts: { engine?: string; build_class?: string; official?: boolean; sort?: string; limit?: number } = {}
): Promise<Game[]> {
  const where: string[] = [GAME_PUB];
  const binds: unknown[] = [];
  if (opts.engine) { where.push('g.engine = ?'); binds.push(opts.engine); }
  if (opts.build_class) { where.push('g.build_class = ?'); binds.push(opts.build_class); }
  if (opts.official) where.push('g.official = 1');
  const order =
    opts.sort === 'rating' ? 'g.rating_avg DESC, g.rating_count DESC'
    : opts.sort === 'new' ? 'g.updated_at DESC'
    : opts.sort === 'follows' ? 'g.follow_count DESC'
    : 'g.play_count DESC';
  const sql = `SELECT ${GAME_COLS} ${GAME_FROM} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${opts.limit ?? 60}`;
  const r = await env.DB.prepare(sql).bind(...binds).all<Game>();
  return r.results;
}

export async function getGame(env: Env, slug: string): Promise<Game | null> {
  return env.DB.prepare(`SELECT ${GAME_COLS} ${GAME_FROM} WHERE g.slug = ? AND g.deleted_at IS NULL`)
    .bind(slug).first<Game>();
}

export async function getGameById(env: Env, id: string): Promise<Game | null> {
  return env.DB.prepare(`SELECT ${GAME_COLS} ${GAME_FROM} WHERE g.id = ? AND g.deleted_at IS NULL`)
    .bind(id).first<Game>();
}

export async function relatedGames(env: Env, g: Game): Promise<Game[]> {
  const sql = `SELECT ${GAME_COLS} ${GAME_FROM}
    WHERE ${GAME_PUB} AND g.id != ?
    ORDER BY (g.engine = ?) DESC, (g.owner_id = ?) DESC, g.play_count DESC LIMIT 6`;
  const r = await env.DB.prepare(sql).bind(g.id, g.engine, g.owner_id).all<Game>();
  return r.results;
}

export async function gameReleases(env: Env, gameId: string) {
  const r = await env.DB.prepare(
    `SELECT * FROM releases WHERE game_id = ? ORDER BY is_current DESC, release_date DESC`
  ).bind(gameId).all();
  return r.results as any[];
}

export async function gameReviews(env: Env, gameId: string): Promise<Review[]> {
  const r = await env.DB.prepare(
    `SELECT rv.*, u.display_name author_name, u.username author_username
     FROM reviews rv JOIN users u ON u.id = rv.author_id
     WHERE rv.game_id = ? AND rv.status = 'published' ORDER BY rv.helpful_count DESC`
  ).bind(gameId).all<Review>();
  return r.results;
}

const CLIP_SELECT = `SELECT c.*, u.display_name author_name, u.username author_username,
  g.title game_title, g.slug game_slug, g.accent game_accent
  FROM clips c JOIN users u ON u.id = c.author_id LEFT JOIN games g ON g.id = c.game_id
  WHERE c.deleted_at IS NULL AND c.moderation_status = 'clear' AND (c.game_id IS NULL OR g.deleted_at IS NULL)`;

export async function listClips(env: Env, opts: { gameId?: string; authorId?: string; limit?: number } = {}): Promise<Clip[]> {
  let sql = CLIP_SELECT;
  const binds: unknown[] = [];
  if (opts.gameId) { sql += ' AND c.game_id = ?'; binds.push(opts.gameId); }
  if (opts.authorId) { sql += ' AND c.author_id = ?'; binds.push(opts.authorId); }
  sql += ` ORDER BY c.view_count DESC LIMIT ${opts.limit ?? 24}`;
  const r = await env.DB.prepare(sql).bind(...binds).all<Clip>();
  return r.results;
}

export async function getClipById(env: Env, id: string): Promise<Clip | null> {
  return env.DB.prepare(CLIP_SELECT + ' AND c.id = ?').bind(id).first<Clip>();
}

export async function getClipBySlug(env: Env, slug: string): Promise<Clip | null> {
  return env.DB.prepare(CLIP_SELECT + ' AND c.slug = ?').bind(slug).first<Clip>();
}

const CREATOR_SELECT = `SELECT u.id, u.username, u.display_name, u.role,
  p.bio, p.avatar, p.banner, p.follower_count, p.links,
  ca.verification_state, ca.trust_tier, ca.official
  FROM users u JOIN creator_accounts ca ON ca.user_id = u.id
  LEFT JOIN profiles p ON p.user_id = u.id`;

export async function listCreators(env: Env, limit = 24): Promise<Creator[]> {
  const r = await env.DB.prepare(
    `${CREATOR_SELECT} WHERE u.deleted_at IS NULL AND u.status = 'active' ORDER BY ca.official DESC, p.follower_count DESC LIMIT ${limit}`
  ).all<Creator>();
  return r.results;
}

export async function getCreator(env: Env, username: string): Promise<Creator | null> {
  return env.DB.prepare(`${CREATOR_SELECT} WHERE u.username = ? AND u.deleted_at IS NULL AND u.status = 'active'`).bind(username).first<Creator>();
}

const COMMUNITY_SELECT = `SELECT c.*, g.title game_title, g.slug game_slug, u.display_name owner_name
  FROM communities c LEFT JOIN games g ON g.id = c.game_id JOIN users u ON u.id = c.owner_id
  WHERE c.deleted_at IS NULL AND c.visibility = 'public' AND u.deleted_at IS NULL AND u.status = 'active'`;

export async function listCommunities(env: Env, limit = 24): Promise<Community[]> {
  const r = await env.DB.prepare(`${COMMUNITY_SELECT} ORDER BY c.official DESC, c.member_count DESC LIMIT ${limit}`).all<Community>();
  return r.results;
}
export async function getCommunity(env: Env, slug: string): Promise<Community | null> {
  return env.DB.prepare(`${COMMUNITY_SELECT.replace('WHERE', 'WHERE c.slug = ? AND')}`).bind(slug).first<Community>();
}

const EVENT_SELECT = `SELECT e.*, g.title game_title, g.slug game_slug, u.display_name organizer_name
  FROM events e LEFT JOIN games g ON g.id = e.game_id JOIN users u ON u.id = e.organizer_id
  WHERE u.deleted_at IS NULL AND u.status = 'active' AND (e.game_id IS NULL OR g.deleted_at IS NULL)`;

export async function listEvents(env: Env, opts: { status?: string; limit?: number } = {}): Promise<EventRow[]> {
  let sql = EVENT_SELECT;
  const binds: unknown[] = [];
  if (opts.status) { sql += ' AND e.status = ?'; binds.push(opts.status); }
  sql += ` ORDER BY CASE e.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, e.start_at ASC LIMIT ${opts.limit ?? 24}`;
  const r = await env.DB.prepare(sql).bind(...binds).all<EventRow>();
  return r.results;
}
export async function getEvent(env: Env, slug: string): Promise<EventRow | null> {
  return env.DB.prepare(`${EVENT_SELECT} AND e.slug = ?`).bind(slug).first<EventRow>();
}

const NEWS_SELECT = `SELECT a.*, u.display_name author_name, g.title related_game_title, g.slug related_game_slug
  FROM news_articles a JOIN users u ON u.id = a.author_id LEFT JOIN games g ON g.id = a.related_game_id
  WHERE a.status = 'published' AND u.deleted_at IS NULL AND u.status = 'active' AND (a.related_game_id IS NULL OR g.deleted_at IS NULL)`;

export async function listNews(env: Env, opts: { category?: string; limit?: number } = {}): Promise<Article[]> {
  let sql = NEWS_SELECT;
  const binds: unknown[] = [];
  if (opts.category) { sql += ' AND a.category = ?'; binds.push(opts.category); }
  sql += ` ORDER BY a.published_at DESC LIMIT ${opts.limit ?? 24}`;
  const r = await env.DB.prepare(sql).bind(...binds).all<Article>();
  return r.results;
}
export async function getArticle(env: Env, slug: string): Promise<Article | null> {
  return env.DB.prepare(`${NEWS_SELECT} AND a.slug = ?`).bind(slug).first<Article>();
}

export async function homeData(env: Env) {
  const [official, popular, trending, events, creators, news, communities, newReleases] = await Promise.all([
    listGames(env, { official: true, limit: 8 }),
    listGames(env, { sort: 'play', limit: 12 }),
    listClips(env, { limit: 8 }),
    listEvents(env, { limit: 6 }),
    listCreators(env, 4),
    listNews(env, { limit: 4 }),
    listCommunities(env, 6),
    listGames(env, { sort: 'new', limit: 6 }),
  ]);
  return { featured: official[0], official, popular, trending, events, creators, news, communities, newReleases };
}

export async function search(env: Env, q: string) {
  const like = `%${q}%`;
  // Each subquery is isolated so one failure (e.g. an empty/legacy table) can't 500 the whole search.
  const run = async <T>(sql: string, ...binds: unknown[]): Promise<T[]> => {
    try { return (await env.DB.prepare(sql).bind(...binds).all<T>()).results; } catch { return []; }
  };
  const [games, creators, communities, events, news] = await Promise.all([
    run<Game>(`SELECT ${GAME_COLS} ${GAME_FROM} WHERE ${GAME_PUB} AND (g.title LIKE ? OR g.tags LIKE ? OR g.pitch LIKE ?) ORDER BY g.play_count DESC LIMIT 12`, like, like, like),
    run<Creator>(`${CREATOR_SELECT} WHERE u.display_name LIKE ? OR u.username LIKE ? LIMIT 8`, like, like),
    run<Community>(`${COMMUNITY_SELECT} AND (c.name LIKE ? OR c.description LIKE ?) LIMIT 8`, like, like),
    run<EventRow>(`${EVENT_SELECT} WHERE e.title LIKE ? OR e.description LIKE ? LIMIT 8`, like, like),
    run<Article>(`${NEWS_SELECT} AND (a.title LIKE ? OR a.excerpt LIKE ?) LIMIT 8`, like, like),
  ]);
  return { games, creators, communities, events, news };
}

// For sitemap generation
export async function sitemapRows(env: Env) {
  const [games, creators, communities, events, news, clips] = await Promise.all([
    env.DB.prepare(`SELECT g.slug, g.updated_at, g.tags FROM games g JOIN users u ON u.id = g.owner_id WHERE ${GAME_PUB}`).all<{ slug: string; updated_at: string; tags: string | null }>(),
    env.DB.prepare(
      `SELECT u.username slug
       FROM users u JOIN creator_accounts ca ON ca.user_id = u.id
       WHERE u.deleted_at IS NULL AND u.status = 'active'
       AND (
         EXISTS (SELECT 1 FROM games g WHERE g.owner_id = u.id AND g.status = 'published' AND g.deleted_at IS NULL)
         OR EXISTS (SELECT 1 FROM clips c WHERE c.author_id = u.id AND c.deleted_at IS NULL AND c.moderation_status = 'clear')
         OR EXISTS (SELECT 1 FROM communities cm WHERE cm.owner_id = u.id AND cm.deleted_at IS NULL AND cm.visibility = 'public')
       )`
    ).all<{ slug: string }>(),
    env.DB.prepare(`SELECT slug FROM communities WHERE deleted_at IS NULL AND visibility='public'`).all<{ slug: string }>(),
    env.DB.prepare(`SELECT e.slug FROM events e LEFT JOIN games g ON g.id=e.game_id JOIN users u ON u.id=e.organizer_id WHERE u.deleted_at IS NULL AND u.status='active' AND (e.game_id IS NULL OR g.deleted_at IS NULL)`).all<{ slug: string }>(),
    env.DB.prepare(`SELECT a.slug, a.published_at FROM news_articles a JOIN users u ON u.id=a.author_id LEFT JOIN games g ON g.id=a.related_game_id WHERE a.status='published' AND u.deleted_at IS NULL AND u.status='active' AND (a.related_game_id IS NULL OR g.deleted_at IS NULL)`).all<{ slug: string; published_at: string }>(),
    env.DB.prepare(`SELECT c.id, c.slug FROM clips c LEFT JOIN games g ON g.id=c.game_id WHERE c.deleted_at IS NULL AND c.moderation_status='clear' AND (c.game_id IS NULL OR g.deleted_at IS NULL)`).all<{ id: string; slug: string }>(),
  ]);
  const tagCounts = new Map<string, number>();
  for (const g of games.results) {
    for (const tag of (g.tags || '').split(',')) {
      const t = tag.trim().toLowerCase();
      if (t) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }
  const tags = Array.from(tagCounts.entries())
    .filter(([, count]) => count >= 5)
    .map(([slug, count]) => ({ slug, count }));
  return {
    games: games.results, creators: creators.results, communities: communities.results,
    events: events.results, news: news.results, clips: clips.results, tags,
  };
}
