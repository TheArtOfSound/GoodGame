// GoodGame Forge: design → mechanics-first HTML5 game (Workers AI).
// Never executes game code server-side; runs only in sandboxed play iframe.
import type { Env } from './lib';
import { recipeToPromptBlock, type RecipePicks } from './forge-recipes';

const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/google/gemma-3-12b-it',
];

const clamp = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
const stripFences = (s: string) => s.replace(/```(?:html|json|javascript)?/gi, '').trim();

async function callModel(
  env: Env,
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!env.AI) return { ok: false, error: 'AI generation is not enabled on this deployment yet.' };
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const out: any = await env.AI.run(model, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
      });
      const v = out?.response ?? out?.result?.response ?? out?.result ?? out;
      const text = typeof v === 'string' ? v : JSON.stringify(v ?? '');
      if (text && text.trim() && text.trim() !== '""') return { ok: true, text };
    } catch (e: any) {
      lastErr = String(e?.message || e);
    }
  }
  void lastErr;
  return { ok: false, error: 'AI is unavailable right now — try again in a moment.' };
}

const extractHtml = (raw: string): string => {
  const s = stripFences(raw);
  const lower = s.toLowerCase();
  let start = lower.indexOf('<!doctype');
  if (start < 0) start = lower.indexOf('<html');
  const end = lower.lastIndexOf('</html>');
  if (start >= 0 && end > start) return s.slice(start, end + 7);
  return s.trim().startsWith('<') ? s.trim() : '';
};

const extractJson = (raw: string): string => {
  const s = stripFences(raw);
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) return s.slice(a, b + 1);
  return s;
};

/** Static smoke checks — catch black-screen shells before we store them. */
export function smokeValidateHtml(html: string): { ok: boolean; fails: string[] } {
  const fails: string[] = [];
  const h = html.toLowerCase();
  if (html.length < 2800) fails.push('html_too_short');
  if (!h.includes('<canvas')) fails.push('missing_canvas');
  if (!h.includes('requestanimationframe')) fails.push('missing_game_loop');
  if (!/fillrect|filltext|\.arc\s*\(|strokerect|beginpath/i.test(html)) fails.push('no_canvas_drawing');
  if (!/addeventlistener\s*\(\s*['"](click|keydown|keyup|pointerdown|pointermove|touchstart)/i.test(html)
    && !/\bonclick\s*=/i.test(html)) {
    fails.push('no_input_handlers');
  }
  // Must move or spawn something over time — not only UI chrome
  if (!/(player\.|velocity|speed|enemies|obstacles|spawn|dx\s*[+\-]=|dy\s*[+\-]=|\.x\s*[+\-]=|\.y\s*[+\-]=)/i.test(html)) {
    fails.push('no_movement_or_spawn');
  }
  if (!/playing|gameover|game_over|'play'|"play"|state\s*=/i.test(html)) fails.push('no_state_machine');
  // Empty black shells often only draw score text
  const drawHeavy = (html.match(/fillRect|fillText|arc\(/gi) || []).length;
  if (drawHeavy < 4) fails.push('too_little_drawing');
  return { ok: fails.length === 0, fails };
}

const DESIGN_SYS =
  `You design tiny browser arcade games that are FUN in 30 seconds.\n` +
  `Output ONLY valid JSON (no markdown):\n` +
  `{"title":"max 28 chars","hook":"one line fun","core_loop":"what player does each second",` +
  `"player":"how player looks and moves","hazards":"what kills or scores against you",` +
  `"goal":"win/score condition","controls":"keys + touch","palette":["#bg","#player","#hazard","#ui"]}\n` +
  `Scope tiny: 1 player, 1–2 hazard types, clear motion. No open worlds.`;

const GAME_SYS =
  `You write COMPLETE playable single-file HTML5 canvas games.\n` +
  `PRIORITY ORDER (never skip 1–5):\n` +
  `1) Visible playfield: draw a contrasting background (not pure black only) + grid/lanes/ground.\n` +
  `2) Visible player rectangle/circle (bright color, size >= 24px) that MOVES every frame from input.\n` +
  `3) Spawning hazards/targets that move; collision changes score or lives.\n` +
  `4) requestAnimationFrame loop calling update+draw always.\n` +
  `5) Title screen with a real clickable PLAY button (HTML button or canvas hitbox).\n` +
  `Then: score HUD, simple game over + retry. Keyboard AND pointer/touch.\n` +
  `Hard rules: ONE html file; ALL css/js inline; NO external URLs/fonts/images/audio; canvas 2D only.\n` +
  `Size canvas to window.innerWidth/Height AFTER declaring canvas, then on resize.\n` +
  `Wrap localStorage in try/catch (or skip best-score) — never crash if storage is blocked.\n` +
  `On game over: if(window.GoodGame)window.GoodGame.submitScore('default', score);\n` +
  `NO empty shells (score+pause only). Player must be obvious within 1 second of PLAY.\n` +
  `Output ONLY HTML starting with <!doctype html>.`;

const REPAIR_SYS =
  `You repair a broken single-file HTML5 canvas game so it is ACTUALLY PLAYABLE.\n` +
  `Smoke failures are listed. Fix them completely.\n` +
  `Must have: moving player, hazards/targets, collision, rAF loop, PLAY to start, visible graphics with contrast.\n` +
  `Keep one self-contained HTML file. try/catch localStorage. Output ONLY full HTML.`;

const REFINE_SYS =
  `You edit a single-file HTML5 canvas game. Apply the instruction but KEEP it playable:\n` +
  `moving player, hazards, collision, rAF loop, PLAY/retry. try/catch localStorage.\n` +
  `Return COMPLETE HTML only.`;

function parseDesign(text: string, fallbackTitle: string): Record<string, unknown> {
  try {
    const j = JSON.parse(extractJson(text));
    if (j && typeof j === 'object') {
      if (!j.title) j.title = fallbackTitle;
      return j as Record<string, unknown>;
    }
  } catch { /* fall through */ }
  return {
    title: fallbackTitle.slice(0, 28),
    hook: fallbackTitle,
    core_loop: 'move, avoid hazards, score points',
    player: 'bright square, 8-dir or drag move',
    hazards: 'falling or chasing blocks',
    goal: 'survive and high score',
    controls: 'arrows/WASD + touch drag',
    palette: ['#1a1a2e', '#e94560', '#0f3460', '#ffffff'],
  };
}

function ensureTitle(html: string, title: string): string {
  const safe = title.replace(/</g, '').slice(0, 40);
  if (!/<title>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}<title>${safe}</title>`);
  }
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${safe}</title>`);
}

export type GenResult =
  | {
      ok: true;
      html: string;
      title: string;
      design: Record<string, unknown>;
      stages: string[];
      recipe_fingerprint?: string;
      smoke_fails?: string[];
    }
  | { ok: false; error: string };

export async function generateGameHtml(
  env: Env,
  promptRaw: string,
  recipe?: RecipePicks | null,
): Promise<GenResult> {
  const prompt = clamp(promptRaw, 800);
  if (prompt.length < 3) return { ok: false, error: 'Describe the game you want in a sentence or two.' };

  const dna = recipeToPromptBlock(recipe);
  const stages: string[] = [];

  stages.push('design');
  const designRes = await callModel(
    env,
    DESIGN_SYS,
    `PLAYER IDEA:\n${prompt}\n\n${dna}\n\nDesign a tiny arcade that is fun in 30 seconds.`,
    1200,
  );
  if (!designRes.ok) return designRes;
  const design = parseDesign(designRes.text, prompt.slice(0, 28));
  const titleFromDesign = String(design.title || prompt).slice(0, 40);

  stages.push('code');
  const codeUser =
    `PLAYER IDEA:\n${prompt}\n\n${dna}\n\n` +
    `DESIGN:\n${JSON.stringify(design)}\n\n` +
    `Implement a COMPLETE playable game now. <title>${titleFromDesign.replace(/"/g, '')}</title>\n` +
    `Critical: after PLAY, player moves, hazards spawn, score changes, graphics are visible.`;
  const codeRes = await callModel(env, GAME_SYS, codeUser, 7000);
  if (!codeRes.ok) return codeRes;
  let html = extractHtml(codeRes.text);
  let smoke = smokeValidateHtml(html || '');

  // Repair pass if smoke fails
  if (!smoke.ok) {
    stages.push('repair');
    const repairUser =
      `SMOKE FAILURES: ${smoke.fails.join(', ')}\n\n` +
      `DESIGN:\n${JSON.stringify(design)}\n\n` +
      `BROKEN HTML (fix or rewrite fully if needed):\n${(html || '').slice(0, 12000)}\n\n` +
      `Return a complete PLAYABLE game.`;
    const repairRes = await callModel(env, REPAIR_SYS, repairUser, 7000);
    if (repairRes.ok) {
      const repaired = extractHtml(repairRes.text);
      if (repaired && repaired.length > 400) {
        html = repaired;
        smoke = smokeValidateHtml(html);
      }
    }
  }

  // Last chance: ultra-simple forced arcade
  if (!smoke.ok) {
    stages.push('simple-arcade');
    const simpleUser =
      `Write a complete single-file HTML canvas game titled "${titleFromDesign.replace(/"/g, '')}".\n` +
      `Genre: top-down dodge. Player (cyan 28px square) moves with arrows/WASD and touch drag.\n` +
      `Red squares fall from top; collision = game over. Score = time survived.\n` +
      `Title screen with PLAY button (HTML button). Score HUD. Game over + RETRY.\n` +
      `Bright colors on dark navy background. rAF loop. try/catch localStorage for best score.\n` +
      `Idea flavor (visual names only): ${prompt.slice(0, 200)}\n` +
      `Output full HTML only.`;
    const simpleRes = await callModel(env, GAME_SYS, simpleUser, 5000);
    if (simpleRes.ok) {
      const simpleHtml = extractHtml(simpleRes.text);
      if (simpleHtml) {
        html = simpleHtml;
        smoke = smokeValidateHtml(html);
      }
    }
  }

  if (!html || html.length < 200) {
    return { ok: false, error: 'The generator did not return a valid game. Try rephrasing or Surprise me.' };
  }

  // Soft-accept if still failing but large enough — better than nothing; smoke_fails reported
  html = ensureTitle(html, titleFromDesign);
  stages.push('pack');
  const m = html.match(/<title>([^<]{1,60})<\/title>/i);
  const title = ((m ? m[1].trim() : titleFromDesign) || 'Untitled Game').slice(0, 40);
  const fp = dna.match(/fingerprint ([^\)]+)/)?.[1];

  if (!smoke.ok && html.length < 2500) {
    return {
      ok: false,
      error: `Generated game failed playability checks (${smoke.fails.join(', ')}). Try again with a simpler idea.`,
    };
  }

  return {
    ok: true,
    html,
    title,
    design,
    stages,
    recipe_fingerprint: fp,
    smoke_fails: smoke.ok ? undefined : smoke.fails,
  };
}

export async function refineGameHtml(
  env: Env,
  currentHtml: string,
  promptRaw: string,
): Promise<{ ok: true; html: string; smoke_fails?: string[] } | { ok: false; error: string }> {
  const prompt = clamp(promptRaw, 800);
  if (prompt.length < 2) return { ok: false, error: 'Tell me what to change.' };
  const user =
    `INSTRUCTION:\n${prompt}\n\n` +
    `Keep the game PLAYABLE (moving player, hazards, rAF, PLAY/retry).\n` +
    `CURRENT HTML:\n${currentHtml.slice(0, 26000)}`;
  const r = await callModel(env, REFINE_SYS, user, 7000);
  if (!r.ok) return r;
  let html = extractHtml(r.text);
  if (!html || html.length < 200) return { ok: false, error: 'The edit did not return a valid game. Try rephrasing.' };

  let smoke = smokeValidateHtml(html);
  if (!smoke.ok) {
    const repair = await callModel(
      env,
      REPAIR_SYS,
      `After an edit the game broke. Failures: ${smoke.fails.join(', ')}\nINSTRUCTION was: ${prompt}\nHTML:\n${html.slice(0, 12000)}`,
      7000,
    );
    if (repair.ok) {
      const fixed = extractHtml(repair.text);
      if (fixed && fixed.length > 400) {
        html = fixed;
        smoke = smokeValidateHtml(html);
      }
    }
  }
  // Prefer previous HTML if refine destroyed playability
  if (!smoke.ok && smokeValidateHtml(currentHtml).ok && html.length < currentHtml.length * 0.5) {
    return { ok: false, error: 'That edit would break the game. Try a smaller change.' };
  }
  return { ok: true, html, smoke_fails: smoke.ok ? undefined : smoke.fails };
}
