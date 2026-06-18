// Crypto payments core. Direct-transfer model: the buyer signs their OWN transfer
// in their wallet; we verify the transaction on-chain via a public JSON-RPC and
// grant an entitlement. No custody, no contract to deploy/audit.
// Rails: EVM (Base) + Solana — same order/entitlement backbone, per-kind verifier.
import type { Env, Game } from './lib';

type ChainCfg = { kind: 'evm' | 'solana'; chainId?: number; rpc: string; usdc: string; label: string; native: string };
export const CHAINS: Record<string, ChainCfg> = {
  'base': { kind: 'evm', chainId: 8453, rpc: 'https://mainnet.base.org', usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', label: 'Base', native: 'ETH' },
  'base-sepolia': { kind: 'evm', chainId: 84532, rpc: 'https://sepolia.base.org', usdc: '0x036cbd53842c5426634e7929541ec2318f3dcf7e', label: 'Base Sepolia', native: 'ETH' },
  'solana': { kind: 'solana', rpc: 'https://api.mainnet-beta.solana.com', usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', label: 'Solana', native: 'SOL' },
  'solana-devnet': { kind: 'solana', rpc: 'https://api.devnet.solana.com', usdc: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', label: 'Solana Devnet', native: 'SOL' },
};
const DECIMALS: Record<string, number> = { USDC: 6, ETH: 18, SOL: 9 };
const TRANSFER_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const rid = (p: string) => p + Array.from(crypto.getRandomValues(new Uint8Array(8))).map((x) => x.toString(16).padStart(2, '0')).join('');

export function parseUnits(value: string, decimals: number): string {
  const [whole, frac = ''] = String(value).trim().split('.');
  const f = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || '0') * (10n ** BigInt(decimals)) + BigInt(f || '0')).toString();
}

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json() as any;
  if (j.error) throw new Error(j.error.message || 'rpc error');
  return j.result;
}

export type Quote = { orderId: string; kind: string; chain: string; chainId?: number; rpc: string; token: string; amount: string; payTo: string; tokenContract?: string };

export async function createOrder(env: Env, game: Game, buyerId: string): Promise<Quote | { error: string }> {
  if (!game.price_amount || !game.price_token || !game.pay_chain || !game.pay_to) return { error: 'This game is not for sale.' };
  const chain = CHAINS[game.pay_chain];
  if (!chain) return { error: 'Unsupported payment chain.' };
  const token = game.price_token.toUpperCase();
  const amount = parseUnits(game.price_amount, DECIMALS[token] ?? 18);
  const orderId = rid('ord_');
  await env.DB.prepare(
    `INSERT INTO orders (id, game_id, buyer_id, chain, token, amount, pay_to, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(orderId, game.id, buyerId, game.pay_chain, token, amount, game.pay_to).run();
  return { orderId, kind: chain.kind, chain: game.pay_chain, chainId: chain.chainId, rpc: chain.rpc, token, amount, payTo: game.pay_to, tokenContract: token === 'USDC' ? chain.usdc : undefined };
}

export async function verifyEvmTx(rpcUrl: string, want: { token: string; amount: string; payTo: string; usdc: string }, txHash: string): Promise<{ ok: boolean; reason?: string }> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: 'Bad tx hash.' };
  const receipt = await rpc(rpcUrl, 'eth_getTransactionReceipt', [txHash]);
  if (!receipt) return { ok: false, reason: 'Transaction not found yet — wait for confirmation.' };
  if (receipt.status !== '0x1') return { ok: false, reason: 'Transaction failed on-chain.' };
  const payTo = want.payTo.toLowerCase(); const need = BigInt(want.amount);
  if (want.token === 'USDC') {
    for (const log of receipt.logs || []) {
      if ((log.address || '').toLowerCase() !== want.usdc.toLowerCase()) continue;
      if (!log.topics || log.topics[0].toLowerCase() !== TRANSFER_SIG) continue;
      if ('0x' + log.topics[2].slice(-40).toLowerCase() !== payTo) continue;
      if (BigInt(log.data) >= need) return { ok: true };
    }
    return { ok: false, reason: 'No matching USDC transfer to the seller found.' };
  }
  const tx = await rpc(rpcUrl, 'eth_getTransactionByHash', [txHash]);
  if (!tx) return { ok: false, reason: 'Transaction not found.' };
  if ((tx.to || '').toLowerCase() !== payTo) return { ok: false, reason: 'Payment went to the wrong address.' };
  if (BigInt(tx.value) < need) return { ok: false, reason: 'Amount paid is too low.' };
  return { ok: true };
}

export async function verifySolanaTx(rpcUrl: string, want: { token: string; amount: string; payTo: string; usdcMint: string }, signature: string): Promise<{ ok: boolean; reason?: string }> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(signature)) return { ok: false, reason: 'Bad transaction signature.' };
  const tx = await rpc(rpcUrl, 'getTransaction', [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
  if (!tx || !tx.meta) return { ok: false, reason: 'Transaction not found yet — wait for confirmation.' };
  if (tx.meta.err) return { ok: false, reason: 'Transaction failed on-chain.' };
  const need = BigInt(want.amount);
  if (want.token === 'SOL') {
    const keys = (tx.transaction.message.accountKeys || []).map((k: any) => (typeof k === 'string' ? k : k.pubkey));
    const i = keys.indexOf(want.payTo);
    if (i < 0) return { ok: false, reason: 'Recipient not in transaction.' };
    const delta = BigInt(tx.meta.postBalances[i]) - BigInt(tx.meta.preBalances[i]);
    return delta >= need ? { ok: true } : { ok: false, reason: 'Amount paid is too low.' };
  }
  // SPL USDC: token balance increase for owner=payTo, mint=USDC
  const bal = (arr: any[]) => { for (const b of arr || []) if (b.owner === want.payTo && b.mint === want.usdcMint) return BigInt(b.uiTokenAmount.amount); return null; };
  const pre = bal(tx.meta.preTokenBalances) ?? 0n;
  const post = bal(tx.meta.postTokenBalances);
  if (post === null) return { ok: false, reason: 'No USDC received by the seller in this transaction.' };
  return post - pre >= need ? { ok: true } : { ok: false, reason: 'Amount paid is too low.' };
}

export async function confirmOrder(env: Env, orderId: string, buyerId: string, txHash: string): Promise<{ ok: boolean; error?: string }> {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ? AND buyer_id = ?`).bind(orderId, buyerId).first<any>();
  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.status === 'paid') return { ok: true };
  const chain = CHAINS[order.chain];
  if (!chain) return { ok: false, error: 'Unsupported chain.' };
  const res = chain.kind === 'solana'
    ? await verifySolanaTx(chain.rpc, { token: order.token, amount: order.amount, payTo: order.pay_to, usdcMint: chain.usdc }, txHash).catch((e) => ({ ok: false, reason: String(e?.message || e) }))
    : await verifyEvmTx(chain.rpc, { token: order.token, amount: order.amount, payTo: order.pay_to, usdc: chain.usdc }, txHash).catch((e) => ({ ok: false, reason: String(e?.message || e) }));
  if (!res.ok) return { ok: false, error: res.reason || 'Could not verify payment.' };
  await env.DB.prepare(`UPDATE orders SET status='paid', tx_hash=?, verified_at=datetime('now') WHERE id=?`).bind(txHash, orderId).run();
  await env.DB.prepare(`INSERT OR IGNORE INTO entitlements (id, user_id, game_id, order_id) VALUES (?, ?, ?, ?)`).bind(rid('ent_'), buyerId, order.game_id, orderId).run();
  return { ok: true };
}

export async function hasEntitlement(env: Env, userId: string, game: Game): Promise<boolean> {
  if (game.owner_id === userId) return true;
  const row = await env.DB.prepare(`SELECT 1 FROM entitlements WHERE user_id = ? AND game_id = ?`).bind(userId, game.id).first();
  return !!row;
}
