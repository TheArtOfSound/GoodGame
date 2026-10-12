export const GG_MINT = '5QNJ5DDnTPYW1gfNoxeXBGy85Ws5k5vH5Ass1KWYmoon';
export const GG_DESCRIPTION = 'Play free browser games, take the daily arcade challenge, and discover GOODGAME (GG) on Solana. No download or wallet required to play.';
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function validSolanaAddress(address: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false;
  let value = 0n;
  for (const ch of address) value = value * 58n + BigInt(ALPHABET.indexOf(ch));
  let bytes = 0;
  while (value > 0n) { value >>= 8n; bytes++; }
  const zeros = address.match(/^1*/)?.[0].length || 0;
  return bytes + zeros === 32;
}
export function parseGGAccounts(data: any, owner: string): { balance: number; raw_amount: string; decimals: number } {
  if (data.error || !Array.isArray(data.result?.value)) throw new Error('Invalid RPC result');
  let total = 0n, decimals: number | undefined;
  for (const row of data.result.value) {
    const info = row?.account?.data?.parsed?.info;
    if (info?.mint !== GG_MINT || info?.owner !== owner) throw new Error('Unexpected token account');
    const amount = info.tokenAmount;
    if (!amount || !/^\d+$/.test(amount.amount) || !Number.isInteger(amount.decimals) || amount.decimals < 0 || amount.decimals > 18) throw new Error('Invalid token amount');
    if (decimals !== undefined && decimals !== amount.decimals) throw new Error('Inconsistent token decimals');
    decimals = amount.decimals;
    total += BigInt(amount.amount);
  }
  const balance = Number(total) / 10 ** (decimals || 0);
  if (!Number.isFinite(balance)) throw new Error('Invalid balance');
  return { balance, raw_amount: total.toString(), decimals: decimals || 0 };
}
export async function ggBalance(address: string, rpc = 'https://api.mainnet-beta.solana.com') {
  const res = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner', params: [address, { mint: GG_MINT }, { encoding: 'jsonParsed', commitment: 'confirmed' }] }), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('RPC unavailable');
  return { mint: GG_MINT, address, network: 'solana-mainnet', ...parseGGAccounts(await res.json(), address), checked_at: new Date().toISOString() };
}
export function ggTokenLd(base: string) {
  return { '@context': 'https://schema.org', '@type': 'WebPage', name: 'GOODGAME (GG) on Solana', url: `${base}/gg`, description: `GOODGAME GG token connected to the GoodGame arcade. Solana mint: ${GG_MINT}. Wallet holdings activate a gold Moon Dash pilot cosmetic.`, about: { '@type': 'Thing', name: 'GOODGAME (GG)', identifier: GG_MINT, sameAs: `https://solscan.io/token/${GG_MINT}` } };
}
export function ggFaqLd() {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
    { '@type': 'Question', name: 'What is the GOODGAME token address?', acceptedAnswer: { '@type': 'Answer', text: `The GOODGAME (GG) Solana mint is ${GG_MINT}.` } },
    { '@type': 'Question', name: 'Does holding more GG improve my score?', acceptedAnswer: { '@type': 'Answer', text: 'No. Positive GG holdings unlock a cosmetic gold pilot only. Rules, difficulty, and scoring are identical for all players.' } },
    { '@type': 'Question', name: 'Can I earn real GG by playing?', acceptedAnswer: { '@type': 'Answer', text: 'The arcade awards free game points, device XP, and badges. They cannot be redeemed for GG or money.' } },
  ] };
}
