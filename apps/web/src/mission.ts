import type { Env } from './lib';
import { GG_MINT, validSolanaAddress } from './gg';
import { PublicKey } from '@solana/web3.js';

export const MISSION_GOAL = 100;
export const MISSION_DESCRIPTION = 'GG First 100: help 100 independent creators publish a playable browser game and receive five independent written playtest reviews.';
export const ELIGIBLE_GAMES_SQL = `
  SELECT g.id, g.owner_id, g.slug, g.title, g.pitch, g.updated_at,
    u.username, u.display_name,
    (SELECT ma.source_path FROM media_assets ma WHERE ma.game_id=g.id AND ma.type='capsule' AND ma.moderation_status='clear' ORDER BY ma.sort ASC LIMIT 1) cover_image,
    (SELECT COUNT(DISTINCT r.author_id) FROM reviews r JOIN users ru ON ru.id=r.author_id
      WHERE r.game_id=g.id AND r.status='published' AND r.author_id!=g.owner_id
      AND LENGTH(TRIM(COALESCE(r.body,'')))>=40 AND ru.status='active' AND ru.deleted_at IS NULL) feedback_count
  FROM games g JOIN users u ON u.id=g.owner_id
  WHERE g.official=0 AND g.status='published' AND g.deleted_at IS NULL
    AND g.moderation_status='clear' AND g.scan_status='passed'
    AND u.status='active' AND u.deleted_at IS NULL
    AND (NULLIF(g.play_template,'') IS NOT NULL OR NULLIF(g.upload_entry,'') IS NOT NULL
      OR (NULLIF(g.embed_url,'') IS NOT NULL AND g.embed_verified=1))
`;
export async function missionData(env: Env) {
  const [summary, result] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) games_available, COUNT(DISTINCT owner_id) published_creators,
      COUNT(DISTINCT CASE WHEN feedback_count>=5 THEN owner_id END) qualified_creators FROM (${ELIGIBLE_GAMES_SQL})`).first<any>(),
    env.DB.prepare(ELIGIBLE_GAMES_SQL + ' ORDER BY feedback_count ASC, g.updated_at DESC LIMIT 12').all<any>(),
  ]);
  const games = result.results;
  return {
    goal: MISSION_GOAL, published_creators: Number(summary?.published_creators || 0), qualified_creators: Number(summary?.qualified_creators || 0),
    games_available: Number(summary?.games_available || 0),
    review_target: 5, minimum_review_characters: 40,
    definition: 'A creator completes the mission when at least one published playable release has written reviews of 40+ characters from five different active accounts, excluding the creator.',
    games: games.filter(g => g.feedback_count < 5).slice(0, 12).map(({ owner_id, ...g }) => g),
    updated_at: new Date().toISOString(),
  };
}
export function validSupportWallet(address: string): boolean {
  if (!validSolanaAddress(address) || address === GG_MINT || address === '11111111111111111111111111111111') return false;
  return PublicKey.isOnCurve(new PublicKey(address).toBytes());
}
export function isNativeRecipientAccount(account: any): boolean {
  return account === null || (account?.owner === '11111111111111111111111111111111' && account?.executable === false && Array.isArray(account.data) && account.data[0] === '');
}
export async function checkSupportWallet(address: string): Promise<boolean> {
  const response = await fetch('https://solana-rpc.publicnode.com', { method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[address,{encoding:'base64',commitment:'confirmed'}]}), signal:AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Recipient check unavailable');
  const data = await response.json() as any;
  if (data.error || !data.result || !('value' in data.result)) throw new Error('Recipient check unavailable');
  return isNativeRecipientAccount(data.result.value);
}
export function supportUri(address: string, creator: string, amount = ''): string {
  if (!validSupportWallet(address)) throw new Error('Use a personal Solana wallet address, not a mint or program address.');
  if (amount && (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(amount) || Number(amount) <= 0 || !Number.isFinite(Number(amount)))) throw new Error('Use a positive GG amount with at most six decimals.');
  const params = new URLSearchParams({ 'spl-token': GG_MINT, label: `GoodGame creator @${creator.slice(0,24)}`, message: 'Optional GG creator tip — no goods, prize, or investment return' });
  if (amount) params.set('amount', amount);
  return `solana:${address}?${params.toString()}`;
}
