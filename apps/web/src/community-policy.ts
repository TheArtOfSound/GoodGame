// Pure policy shared by the hosted coordinator and its tests.
export const BOT_MINT = '5QNJ5DDnTPYW1gfNoxeXBGy85Ws5k5vH5Ass1KWYmoon';
export const BOT_DID = 'did:plc:ltjgdwvd3heccn6oh6hifrnz';
export const BOT_HANDLE = 'ggcenterhub.bsky.social';
export type Channel = 'telegram' | 'bluesky';
export type Candidate = { topic: string; text: string; claimLinks: string[] };
export type MissionSnapshot = { qualified_creators: number; published_creators: number; games_available: number; games: { slug: string; title: string; username: string; feedback_count: number }[] };
export const PROMPTS = [
  'Could you find the controls without guessing? Tell the creator where you got stuck.',
  'Try the first minute. What made you want another run, and what interrupted it?',
  'Test it on your phone. Mention your browser and any buttons that were hard to reach.',
  'Watch the first failure. Did the game explain what happened and how to retry?',
  'Check the sound and readability. What one change would make the game easier to follow?',
  'Describe one enjoyable moment and one specific change you would try next.',
];
const clean = (s: string) => s.replace(/[\r\n<>#@]/g, ' ').replace(/https?:\S+/gi, '').replace(/\s+/g, ' ').trim();
export function candidates(mission: MissionSnapshot, channel: Channel): Candidate[] {
  const out: Candidate[] = [];
  for (const g of mission.games) {
    if (!/^[a-z0-9-]{1,100}$/.test(g.slug)) continue;
    for (let i = 0; i < PROMPTS.length; i++) {
      const link = `https://goodgame.center/games/${g.slug}`;
      const title = clean(g.title).slice(0, 48);
      out.push({ topic: `playtest:${g.slug}:${i}`, text: `${channel === 'telegram' ? 'A small playtest can help a creator.\n\n' : ''}${title}: ${PROMPTS[i]}\n\nPlay, then leave useful written feedback. Free participation; no GG purchase needed.\n${link}\n#BrowserGames #Playtesting`, claimLinks: [link, 'https://goodgame.center/api/gg/mission'] });
    }
  }
  out.push(
    {topic:'creator:publish-browser-build',text:'Making a browser game? Give players a direct playable page. Publish your build on GoodGame, then ask for one specific piece of feedback. Free participation needs no GG purchase.\nhttps://goodgame.center/create\n#GameDev #IndieGames',claimLinks:['https://goodgame.center/create']},
    {topic:'arena:three-lanes',text:'A tiny arcade challenge: try GG Moon Dash, then share your score with a friend. Three lanes, a 30-second run, and free browser play. Game points have no cash value.\nhttps://goodgame.center/arena\n#BrowserGames #Arcade',claimLinks:['https://goodgame.center/arena']},
    {topic:'gg:cosmetic-only',text:'Where GG fits: optional direct creator tip requests and a gold Moon Dash pilot cosmetic. Free play needs no tokens; device points are not money. Check the exact Solana mint and live features.\nhttps://goodgame.center/gg\n#Solana #BrowserGames',claimLinks:['https://goodgame.center/gg']},
  );
  return out.filter(c => validCandidate(c, channel));
}
export function validCandidate(c: Candidate, channel: Channel): boolean {
  if (!c || typeof c.text !== 'string' || typeof c.topic !== 'string') return false;
  if ([...c.text].length > (channel === 'bluesky' ? 300 : 1000)) return false;
  const tags = c.text.match(/#[\p{L}\p{N}_]+/gu) || [];
  if (tags.length < 1 || tags.length > 3) return false;
  const urls = c.text.match(/https?:\/\/[^\s]+/g) || [];
  return urls.length > 0 && urls.every(u => {try { const v = new URL(u);return v.origin === 'https://goodgame.center' && !v.username && !v.password; } catch {return false;} }) && c.claimLinks.every(u => {try {return new URL(u).origin === 'https://goodgame.center';}catch{return false;}});
}
export const normalizePost = (text: string) => text.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
// A per-bot counter cannot guarantee free usage on a shared paid account.
// No AI inference is allowed until the account's hard Free-plan limit is verified.
export const freeAIEnabled = (env: { COMMUNITY_AI_FREE_PLAN_VERIFIED?: string; COMMUNITY_AI_ENABLED?: string }) =>
  env.COMMUNITY_AI_ENABLED === 'true' && env.COMMUNITY_AI_FREE_PLAN_VERIFIED === 'true';
export function parseCommand(text: unknown, username: string): string | null {
  if (typeof text !== 'string' || text.length > 256) return null;
  const match = text.match(/^\/(start|help|play|mission|gg|publish|privacy)(?:@([a-z0-9_]+))?(?:\s+[a-z0-9_-]{1,64})?\s*$/i);
  if (!match || (match[2] && match[2].toLowerCase() !== username.toLowerCase())) return null;
  return match[1].toLowerCase();
}
export function commandReply(command: string, mission: MissionSnapshot): string {
  if (command === 'privacy') return 'GoodGame stores Telegram update IDs temporarily to prevent duplicate replies, plus short-lived hashed chat rate counters. It does not store your messages or Telegram profile. Commands are sent through Telegram. https://goodgame.center/legal/privacy';
  if (command === 'mission') return `GG First 100: ${mission.qualified_creators}/100 creators have an eligible release with five qualifying written reviews. ${mission.published_creators} creators have eligible games. Accounts are not independently verified people. Play free and give useful feedback: https://goodgame.center/mission`;
  if (command === 'gg') return `GOODGAME (GG) on Solana\n${BOT_MINT}\nOptional direct creator tip requests and a gold Moon Dash pilot cosmetic. Free play needs no tokens. Game points are not money. https://goodgame.center/gg`;
  if (command === 'publish') return 'Have a browser game? Publish a playable build, then ask players one clear feedback question. Free participation needs no GG purchase. https://goodgame.center/create';
  if (command === 'play') {
    const g = mission.games[0];
    return g ? `Try ${clean(g.title).slice(0,100)}. ${PROMPTS[0]}\nPlay, then sign in on the game page to leave a specific written review. No GG purchase needed.\nhttps://goodgame.center/games/${encodeURIComponent(g.slug)}` : 'Try GG Moon Dash free: https://goodgame.center/arena\nDevice points have no cash value.';
  }
  return 'GG! I am GoodGame’s automated game and playtest guide.\n/play — find a game\n/mission — live creator progress\n/gg — verified token facts\n/publish — bring your game\n/privacy — data use\nhttps://goodgame.center/playtest';
}
// Atomic conditional insert: a concurrent scheduler cannot bypass any cap.
export const RESERVE_SQL = `INSERT INTO community_bot_posts(id,channel,topic,text,hash,claim_links,state,reserved_at)
 SELECT ?,?,?,?,?,?,'pending',? WHERE
 NOT EXISTS(SELECT 1 FROM community_bot_posts WHERE channel=? AND state='pending')
 AND NOT EXISTS(SELECT 1 FROM community_bot_posts WHERE channel=? AND state='published' AND published_at>?)
 AND (SELECT COUNT(*) FROM community_bot_posts WHERE channel=? AND state='published' AND published_at>?)<4
 AND NOT EXISTS(SELECT 1 FROM community_bot_posts WHERE channel=? AND topic=? AND state='published' AND published_at>?)
 AND NOT EXISTS(SELECT 1 FROM community_bot_posts WHERE channel=? AND hash=? AND state!='failed')`;
