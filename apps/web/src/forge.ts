// GoodGame Forge: turn a text prompt into a playable game by choosing one of the
// built-in play.ts engine templates and writing the copy. The model only emits a
// constrained spec (template + text + theme) — never raw code — so the result is
// always a known-good, instantly playable game. Generation runs on Workers AI.
import type { Env } from './lib';
import { TEMPLATE_IDS, TEMPLATES } from './play';

// Tried in order until one works — resilient to Workers AI model deprecations.
const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/google/gemma-3-12b-it',
];
const ACCENTS = ['#6b93ff', '#34d399', '#2dd4bf', '#b06bff', '#ec4899', '#f0b323', '#f97316', '#f43f5e', '#8b5cf6', '#38bdf8'];

export type GameSpec = { template: string; title: string; pitch: string; description: string; accent: string; tags: string[] };

const clamp = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);

export async function generateGameSpec(env: Env, promptRaw: string): Promise<{ ok: true; spec: GameSpec } | { ok: false; error: string }> {
  if (!env.AI) return { ok: false, error: 'AI generation is not enabled on this deployment yet.' };
  const prompt = clamp(promptRaw, 500);
  if (prompt.length < 3) return { ok: false, error: 'Describe the game you want in a sentence or two.' };

  const templates = TEMPLATES.map((t) => `"${t.id}" (${t.name}: ${t.blurb})`).join('; ');
  const sys =
    `You turn a player's idea into a browser arcade game by picking ONE built-in engine template and writing the copy. ` +
    `Templates: ${templates}. ` +
    `Reply with ONLY a JSON object, no markdown, no text around it: ` +
    `{"template": one of [${TEMPLATE_IDS.join(', ')}], "title": catchy name up to 40 chars, "pitch": one-line hook up to 120 chars, ` +
    `"description": 2-4 sentences, "tags": up to 5 short lowercase tags, "accent": a hex like #6b93ff matching the mood}.`;

  let raw = '';
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const out: any = await env.AI.run(model, {
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        max_tokens: 400,
      });
      raw = String(out?.response ?? out?.result?.response ?? '');
      if (raw.trim()) break;
    } catch (e: any) {
      lastErr = String(e?.message || e);
    }
  }
  if (!raw.trim()) return { ok: false, error: 'AI is unavailable right now: ' + lastErr.slice(0, 180) };

  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: 'RAW[' + raw.length + ']: ' + raw.slice(0, 240) };
  let parsed: any;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); } catch (e: any) { return { ok: false, error: 'PARSE(' + String(e?.message || '').slice(0, 50) + '): ' + cleaned.slice(start, start + 200) }; }

  const template = TEMPLATE_IDS.includes(parsed.template) ? parsed.template : TEMPLATE_IDS[0];
  const title = clamp(parsed.title, 40) || 'Untitled Game';
  const pitch = clamp(parsed.pitch, 120) || 'A quick browser arcade game.';
  const description = clamp(parsed.description, 1200) || pitch;
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(parsed.accent)) ? String(parsed.accent) : ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((t: unknown) => clamp(t, 20).toLowerCase().replace(/[^a-z0-9 -]/g, '')).filter(Boolean).slice(0, 5)
    : [];

  return { ok: true, spec: { template, title, pitch, description, accent, tags } };
}
