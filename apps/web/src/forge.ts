// GoodGame Forge: generate and iteratively refine a self-contained HTML5 game
// from natural-language prompts (Workers AI). The result is a single index.html
// (canvas + inline JS, no external deps) stored as a private draft the creator
// keeps refining, testing, and finally publishes. Never raw-executes anything
// server-side; the game runs only in the sandboxed play iframe.
import type { Env } from './lib';

// Tried in order until one works — resilient to Workers AI model deprecations.
const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/google/gemma-3-12b-it',
];

const clamp = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
const stripFences = (s: string) => s.replace(/```(?:html|json)?/gi, '').trim();

async function callModel(env: Env, system: string, user: string, maxTokens: number): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!env.AI) return { ok: false, error: 'AI generation is not enabled on this deployment yet.' };
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const out: any = await env.AI.run(model, {
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: maxTokens,
      });
      const v = out?.response ?? out?.result?.response ?? out?.result ?? out;
      const text = typeof v === 'string' ? v : JSON.stringify(v ?? '');
      if (text && text.trim() && text.trim() !== '""') return { ok: true, text };
    } catch (e: any) { lastErr = String(e?.message || e); }
  }
  void lastErr;
  return { ok: false, error: 'AI is unavailable right now — try again in a moment.' };
}

// Pull the HTML document out of a model response (handles fences / stray prose).
const extractHtml = (raw: string): string => {
  const s = stripFences(raw);
  const lower = s.toLowerCase();
  let start = lower.indexOf('<!doctype');
  if (start < 0) start = lower.indexOf('<html');
  const end = lower.lastIndexOf('</html>');
  if (start >= 0 && end > start) return s.slice(start, end + 7);
  return s.trim().startsWith('<') ? s.trim() : '';
};

const GAME_SYS =
  `You are an expert HTML5 game developer. Write a COMPLETE, self-contained, single-file HTML5 game from the user's idea.\n` +
  `Rules: one HTML document with ALL html/css/js inline; a <canvas> sized to fill the viewport (handle window resize); ` +
  `playable with BOTH keyboard AND touch/pointer; NO external libraries, CDNs, fonts, or asset files — draw everything on the canvas; ` +
  `include a start prompt, a visible score, and a game-over state with restart; mobile-friendly; use requestAnimationFrame. ` +
  `If the game has a score, on game over call: if(window.GoodGame)window.GoodGame.submitScore('default', score).\n` +
  `Output ONLY the HTML document starting with <!doctype html>. No markdown, no commentary.`;

const REFINE_SYS =
  `You are editing an existing single-file HTML5 game. You receive the CURRENT full HTML and an INSTRUCTION. ` +
  `Apply the change and return the COMPLETE updated HTML document. Keep everything that already works; change only what the instruction asks. ` +
  `Keep it self-contained (no external deps).\n` +
  `Output ONLY the full HTML document starting with <!doctype html>. No markdown, no commentary.`;

export async function generateGameHtml(env: Env, promptRaw: string): Promise<{ ok: true; html: string; title: string } | { ok: false; error: string }> {
  const prompt = clamp(promptRaw, 600);
  if (prompt.length < 3) return { ok: false, error: 'Describe the game you want in a sentence or two.' };
  const r = await callModel(env, GAME_SYS, prompt, 4000);
  if (!r.ok) return r;
  const html = extractHtml(r.text);
  if (!html || html.length < 200) return { ok: false, error: 'The generator did not return a valid game. Try rephrasing.' };
  const m = html.match(/<title>([^<]{1,60})<\/title>/i);
  const title = ((m ? m[1].trim() : prompt) || 'Untitled Game').slice(0, 40);
  return { ok: true, html, title };
}

export async function refineGameHtml(env: Env, currentHtml: string, promptRaw: string): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const prompt = clamp(promptRaw, 600);
  if (prompt.length < 2) return { ok: false, error: 'Tell me what to change.' };
  const user = `INSTRUCTION:\n${prompt}\n\nCURRENT HTML:\n${currentHtml.slice(0, 24000)}`;
  const r = await callModel(env, REFINE_SYS, user, 4000);
  if (!r.ok) return r;
  const html = extractHtml(r.text);
  if (!html || html.length < 200) return { ok: false, error: 'The edit did not return a valid game. Try rephrasing.' };
  return { ok: true, html };
}
