// Password + session auth for the React onboarding/login flow. Passwords are
// PBKDF2-SHA256 hashed; sessions live in KV. (Wallet sign-in was removed — the
// product is free and no longer uses crypto identities.)
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, SessionUser } from './lib';

const SESSION_COOKIE = 'gg_session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const PBKDF2_ITERATIONS = 100_000;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;
const RESERVED_USERNAMES = new Set([
  'admin', 'system', 'support', 'goodgame', 'root', 'moderator', 'mod',
  'staff', 'official', 'owner',
]);

const rand = (n = 16) => {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
};
const hexToBytes = (h: string) => {
  const s = h.startsWith('0x') ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const colorFor = (addr: string) => {
  let h = 0; for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
  const palette = ['#6b93ff', '#34d399', '#a855f7', '#ec4899', '#f59e0b', '#38bdf8', '#f43f5e', '#14b8a6'];
  return palette[h % palette.length];
};
const bytesToHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).map((x) => x.toString(16).padStart(2, '0')).join('');
const constantTimeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
};
const jsonError = (error: string) => ({ ok: false as const, error });

export async function rateLimit(env: Env, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const kvKey = `rl:${key}:${bucket}`;
  const current = Number(await env.KV.get(kvKey) || '0');
  if (current >= limit) return false;
  await env.KV.put(kvKey, String(current + 1), { expirationTtl: windowSeconds + 30 });
  return true;
}

async function hashPassword(plain: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored?.startsWith('pbkdf2$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;
  const salt = hexToBytes(parts[2]);
  const expected = hexToBytes(parts[3]);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), 'PBKDF2', false, ['deriveBits']);
  const derived = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    expected.length * 8,
  ));
  return constantTimeEqual(derived, expected);
}

async function issueSession(c: Context<{ Bindings: Env }>, user: SessionUser): Promise<void> {
  const token = rand(24);
  await c.env.KV.put(`sess:${token}`, user.id, { expirationTtl: SESSION_TTL });
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: SESSION_TTL });
}

export async function onboardPassword(
  c: Context<{ Bindings: Env }>,
  body: { username?: string; display_name?: string; password?: string; pin?: string }
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string; status?: number }> {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'anon';
  if (!(await rateLimit(c.env, `onboarding:${ip}`, 20, 600))) return { ...jsonError('Too many attempts. Try again later.'), status: 429 };

  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const pin = String(body.pin || '');
  const displayName = String(body.display_name || username).trim().slice(0, 60) || username;

  if (!USERNAME_RE.test(username)) return { ...jsonError('Username must be 3-24 characters: letters, numbers, or underscore.'), status: 400 };
  if (RESERVED_USERNAMES.has(username)) return { ...jsonError('That username is reserved.'), status: 400 };
  if (password.length < 8 || password.length > 128) return { ...jsonError('Password must be 8-128 characters.'), status: 400 };
  if (!/^[0-9]{4,8}$/.test(pin)) return { ...jsonError('PIN must be 4-8 digits.'), status: 400 };

  const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE username = ?`).bind(username).first<{ id: string }>();
  if (existing) return { ...jsonError('Username already taken.'), status: 409 };

  const id = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const avatar = colorFor(username);
  const [passwordHash, pinHash] = await Promise.all([hashPassword(password), hashPassword(pin)]);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO users (id, username, display_name, role, status, age_band, password_hash, pin_hash, last_login_at)
       VALUES (?, ?, ?, 'creator', 'active', 'unknown', ?, ?, datetime('now'))`
    ).bind(id, username, displayName, passwordHash, pinHash),
    c.env.DB.prepare(
      `INSERT INTO profiles (user_id, display_name, bio, follower_count, avatar) VALUES (?, ?, '', 0, ?)`
    ).bind(id, displayName, avatar),
    c.env.DB.prepare(
      `INSERT INTO creator_accounts (user_id, verification_state, trust_tier, payout_state, official) VALUES (?, 'none', 'starter', 'none', 0)`
    ).bind(id),
  ]);

  const user: SessionUser = { id, username, display_name: displayName, avatar };
  await issueSession(c, user);
  return { ok: true, user };
}

export async function loginPassword(
  c: Context<{ Bindings: Env }>,
  body: { username?: string; password?: string }
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string; status?: number }> {
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'anon';
  if (!(await rateLimit(c.env, `login:${ip}`, 20, 300))) return { ...jsonError('Too many attempts. Try again later.'), status: 429 };
  if (!(await rateLimit(c.env, `login-user:${username}`, 12, 300))) return { ...jsonError('Too many attempts. Try again later.'), status: 429 };
  if (!username || !password) return { ...jsonError('Invalid username or password.'), status: 401 };

  const row = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.password_hash, u.wallet_address, u.wallet_chain, p.avatar
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.username = ? AND u.deleted_at IS NULL AND u.status = 'active'`
  ).bind(username).first<any>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return { ...jsonError('Invalid username or password.'), status: 401 };
  }
  await c.env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).bind(row.id).run();
  const user: SessionUser = {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    wallet_address: row.wallet_address,
    wallet_chain: row.wallet_chain,
    avatar: row.avatar,
  };
  await issueSession(c, user);
  return { ok: true, user };
}

export async function getSession(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const userId = await c.env.KV.get(`sess:${token}`);
  if (!userId) return null;
  const u = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.wallet_address, u.wallet_chain, p.avatar
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ? AND u.deleted_at IS NULL AND u.status = 'active'`
  ).bind(userId).first<any>();
  if (!u) return null;
  return { id: u.id, username: u.username, display_name: u.display_name,
    wallet_address: u.wallet_address, wallet_chain: u.wallet_chain, avatar: u.avatar };
}

export async function logout(c: Context<{ Bindings: Env }>): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.KV.delete(`sess:${token}`);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}
