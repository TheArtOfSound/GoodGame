// Save/Score SDK backend, stored in KV (no schema migration required). Games run
// in a sandboxed, opaque-origin iframe and cannot send the first-party session
// cookie, so the in-iframe adapter (see compat.ts) posts messages to the parent
// React app, which calls these endpoints with the player's credentials.
//
// Scores are client-reported and therefore spoofable — these are casual
// leaderboards, not anti-cheat-grade. Higher score wins.
import type { Env, SessionUser } from './lib';

const MAX_SAVE_BYTES = 100 * 1024; // 100 KB per save slot
const LB_SCAN = 100;               // entries scanned per board (KV list cap)

export type LeaderboardEntry = { rank: number; score: number; username: string; display_name: string };

const cleanBoard = (b: unknown) =>
  String(b ?? 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) || 'default';

export async function submitScore(env: Env, gameId: string, user: SessionUser, boardRaw: unknown, scoreRaw: unknown): Promise<{ ok: boolean; best: number; error?: string }> {
  const board = cleanBoard(boardRaw);
  const score = Number(scoreRaw);
  if (!Number.isFinite(score)) return { ok: false, best: 0, error: 'Score must be a number.' };
  const clamped = Math.max(-1e15, Math.min(1e15, Math.round(score)));
  const key = `gg:lb:${gameId}:${board}:${user.id}`;
  const prev = await env.KV.get(key);
  let prevScore = -Infinity;
  if (prev) { try { prevScore = JSON.parse(prev).score ?? -Infinity; } catch { /* ignore */ } }
  const best = Math.max(prevScore, clamped);
  if (best !== prevScore) {
    await env.KV.put(key, JSON.stringify({ score: best, username: user.username, display_name: user.display_name, at: Date.now() }));
  }
  return { ok: true, best };
}

export async function getLeaderboard(env: Env, gameId: string, boardRaw: unknown, limit = 20): Promise<LeaderboardEntry[]> {
  const board = cleanBoard(boardRaw);
  const list = await env.KV.list({ prefix: `gg:lb:${gameId}:${board}:`, limit: LB_SCAN });
  const rows = await Promise.all(list.keys.map((k) => env.KV.get(k.name)));
  return rows
    .map((r) => { try { return r ? JSON.parse(r) : null; } catch { return null; } })
    .filter((e): e is { score: number; username: string; display_name: string } => !!e && Number.isFinite(e.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(limit, 100))
    .map((e, i) => ({ rank: i + 1, score: e.score, username: e.username || 'player', display_name: e.display_name || e.username || 'Player' }));
}

export async function putSave(env: Env, gameId: string, userId: string, dataRaw: unknown): Promise<{ ok: boolean; error?: string }> {
  const data = typeof dataRaw === 'string' ? dataRaw : JSON.stringify(dataRaw ?? null);
  if (data.length > MAX_SAVE_BYTES) return { ok: false, error: `Save data exceeds ${Math.round(MAX_SAVE_BYTES / 1024)} KB.` };
  await env.KV.put(`gg:save:${gameId}:${userId}`, data);
  return { ok: true };
}

export async function getSave(env: Env, gameId: string, userId: string): Promise<string | null> {
  return env.KV.get(`gg:save:${gameId}:${userId}`);
}
