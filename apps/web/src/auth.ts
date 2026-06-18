// Multi-wallet auth. EVM via SIWE-style personal_sign (verified with viem),
// Solana via signMessage (verified with tweetnacl). Sessions live in KV.
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { recoverMessageAddress } from 'viem';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type { Env, SessionUser } from './lib';

const SESSION_COOKIE = 'gg_session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const NONCE_TTL = 600;

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

// The exact message the wallet signs. Server rebuilds it at verify time so the
// user can only authenticate by signing the precise content we expect.
export function siweMessage(env: Env, address: string, chain: string, nonce: string): string {
  const host = (env.SITE_URL || 'https://goodgame.center').replace(/^https?:\/\//, '');
  return `${host} wants you to sign in with your ${chain === 'sol' ? 'Solana' : 'Ethereum'} account:\n` +
    `${address}\n\n` +
    `Sign in to GoodGame.center. This is free and does not move any funds.\n\n` +
    `Nonce: ${nonce}`;
}

export async function issueNonce(env: Env, address: string, chain: string): Promise<{ nonce: string; message: string }> {
  const nonce = rand(12);
  await env.KV.put(`nonce:${nonce}`, address.toLowerCase(), { expirationTtl: NONCE_TTL });
  return { nonce, message: siweMessage(env, address, chain, nonce) };
}

async function verifySignature(chain: string, message: string, address: string, signature: string): Promise<boolean> {
  try {
    if (chain === 'sol') {
      const ok = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        hexToBytes(signature),
        bs58.decode(address),
      );
      return ok;
    }
    const recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

async function getOrCreateUser(env: Env, address: string, chain: string): Promise<SessionUser> {
  const stored = chain === 'sol' ? address : address.toLowerCase();
  const existing = await env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.wallet_address, u.wallet_chain, p.avatar
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.wallet_address = ?`
  ).bind(stored).first<any>();
  if (existing) {
    return { id: existing.id, username: existing.username, display_name: existing.display_name,
      wallet_address: existing.wallet_address, wallet_chain: existing.wallet_chain, avatar: existing.avatar };
  }
  const id = 'usr_w' + rand(6);
  const short = chain === 'sol'
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : `${address.slice(0, 6)}…${address.slice(-4)}`;
  const username = (chain === 'sol' ? address.slice(0, 6) : address.slice(2, 10)).toLowerCase() + rand(2);
  const avatar = colorFor(stored);
  await env.DB.prepare(
    `INSERT INTO users (id, username, display_name, role, age_band, wallet_address, wallet_chain)
     VALUES (?, ?, ?, 'player', 'unknown', ?, ?)`
  ).bind(id, username, short, stored, chain).run();
  await env.DB.prepare(
    `INSERT INTO profiles (user_id, display_name, bio, follower_count, avatar) VALUES (?, ?, '', 0, ?)`
  ).bind(id, short, avatar).run();
  return { id, username, display_name: short, wallet_address: stored, wallet_chain: chain, avatar };
}

export async function verifyAndLogin(
  c: Context<{ Bindings: Env }>,
  body: { address: string; chain: string; signature: string; nonce: string }
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const { address, chain, signature, nonce } = body;
  if (!address || !signature || !nonce || (chain !== 'evm' && chain !== 'sol')) return { ok: false, error: 'Missing fields.' };
  const nonceOwner = await c.env.KV.get(`nonce:${nonce}`);
  if (!nonceOwner || nonceOwner !== address.toLowerCase()) return { ok: false, error: 'Invalid or expired sign-in request. Try again.' };
  const message = siweMessage(c.env, address, chain, nonce);
  if (!(await verifySignature(chain, message, address, signature))) return { ok: false, error: 'Signature did not verify.' };
  await c.env.KV.delete(`nonce:${nonce}`); // one-time use

  const user = await getOrCreateUser(c.env, address, chain);
  const token = rand(24);
  await c.env.KV.put(`sess:${token}`, user.id, { expirationTtl: SESSION_TTL });
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: SESSION_TTL });
  return { ok: true, user };
}

export async function getSession(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const userId = await c.env.KV.get(`sess:${token}`);
  if (!userId) return null;
  const u = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.wallet_address, u.wallet_chain, p.avatar
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`
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
