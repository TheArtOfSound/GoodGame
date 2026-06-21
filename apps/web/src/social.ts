// Post likes, stored in KV (no schema migration: the posts table has no like
// column). Like state = gg:pl:<postId>:<userId>; per-post count = gg:plc:<postId>.
import type { Env } from './lib';

export async function togglePostLike(env: Env, postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const likeKey = `gg:pl:${postId}:${userId}`;
  const countKey = `gg:plc:${postId}`;
  const existing = await env.KV.get(likeKey);
  let count = Number((await env.KV.get(countKey)) || '0');
  if (existing) {
    count = Math.max(0, count - 1);
    await Promise.all([env.KV.delete(likeKey), env.KV.put(countKey, String(count))]);
    return { liked: false, count };
  }
  count = count + 1;
  await Promise.all([env.KV.put(likeKey, '1'), env.KV.put(countKey, String(count))]);
  return { liked: true, count };
}

export async function postLikes(env: Env, postIds: string[], userId?: string | null): Promise<Record<string, { count: number; liked: boolean }>> {
  const out: Record<string, { count: number; liked: boolean }> = {};
  await Promise.all(postIds.map(async (id) => {
    const [c, l] = await Promise.all([
      env.KV.get(`gg:plc:${id}`),
      userId ? env.KV.get(`gg:pl:${id}:${userId}`) : Promise.resolve(null),
    ]);
    out[id] = { count: Number(c || '0'), liked: !!l };
  }));
  return out;
}
