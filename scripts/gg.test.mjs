import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GG_MINT, validSolanaAddress, parseGGAccounts, ggBalance } from '../apps/web/src/gg.ts';
const owner = '11111111111111111111111111111111';
const account = (amount, decimals = 6, mint = GG_MINT) => ({ account: { data: { parsed: { info: { owner, mint, tokenAmount: { amount, decimals } } } } } });
test('Solana address validation checks decoded length and base58 characters', () => {
  assert.equal(validSolanaAddress(GG_MINT), true);
  assert.equal(validSolanaAddress(owner), true);
  for (const bad of ['bad', '0'.repeat(44), '1'.repeat(33), 'z'.repeat(44)]) assert.equal(validSolanaAddress(bad), false);
});
test('balance aggregates every account for the exact mint using raw integers', () => {
  assert.deepEqual(parseGGAccounts({ result: { value: [account('1234567'), account('1000000')] } }, owner), { balance: 2.234567, raw_amount: '2234567', decimals: 6 });
  assert.equal(parseGGAccounts({ result: { value: [] } }, owner).balance, 0);
});
test('RPC errors and mismatched mint, owner, decimals, and amounts cannot unlock holdings', () => {
  const invalid = [ { error: { code: 429 } }, { result: {} }, { result: { value: [account('1', 6, owner)] } }, { result: { value: [account('-2')] } }, { result: { value: [account('1', 6), account('2', 9)] } }, { result: { value: [account('1', 99)] } } ];
  for (const data of invalid) assert.throws(() => parseGGAccounts(data, owner));
  assert.throws(() => parseGGAccounts({ result: { value: [account('1')] } }, GG_MINT));
});
test('RPC request pins mainnet mint and confirmed jsonParsed encoding', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.mainnet-beta.solana.com');
      const body = JSON.parse(options.body);
      assert.equal(body.method, 'getTokenAccountsByOwner');
      assert.deepEqual(body.params, [owner, { mint: GG_MINT }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
      return new Response(JSON.stringify({ result: { value: [account('2000000')] } }));
    };
    const result = await ggBalance(owner);
    assert.equal(result.balance, 2); assert.equal(result.mint, GG_MINT);
  } finally { globalThis.fetch = original; }
});
