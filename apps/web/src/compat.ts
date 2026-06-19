// Static compatibility analysis + safe auto-fixes for uploaded browser-game builds.
// Runs in the Worker at upload time (no headless browser). It surfaces the
// breakages that most often make a "works locally" build fail once it is hosted
// in a sandboxed, opaque-origin iframe, and applies the few fixes that can never
// break a game. Runtime checks (does it actually start, paint, accept input)
// belong to a future Browser Rendering pass — this is the cheap first layer.
import type { IngestFile } from './ingest';

export type CompatLevel = 'pass' | 'warn' | 'fail';
export type CompatCheck = { id: string; level: CompatLevel; title: string; detail: string };
export type CompatReport = {
  score: number;            // 0-100, weighted by warn/fail
  entry: string;
  checks: CompatCheck[];
  applied_fixes: string[];  // safe transforms applied to the entry HTML
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();

// Remote hosts that are safe enough not to warn about (fonts only).
const ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

// The GoodGame adapter: additive only. Captures runtime errors and exposes a
// score/save bridge over postMessage. Cannot change a game's own behaviour.
const ADAPTER = `<script>(function(){function s(t,d){try{if(parent&&parent!==window)parent.postMessage(Object.assign({source:'goodgame',type:t},d||{}),'*')}catch(e){}}window.GoodGame=window.GoodGame||{ready:function(){s('GG_READY')},submitScore:function(b,v){s('GG_SCORE',{board:b,score:v})},achievement:function(i){s('GG_ACHIEVEMENT',{id:i})},save:function(d){s('GG_SAVE',{data:d})}};window.addEventListener('error',function(e){s('GG_ERROR',{message:String(e&&e.message||''),source:String(e&&e.filename||''),line:e&&e.lineno||0})});window.addEventListener('unhandledrejection',function(e){s('GG_ERROR',{message:'Unhandled rejection: '+String(e&&e.reason)})});})();</script>`;
const VIEWPORT = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`;

const normalize = (path: string): string => {
  const out: string[] = [];
  for (const seg of path.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return out.join('/');
};

const injectIntoHead = (html: string, snippet: string): string => {
  const head = html.match(/<head[^>]*>/i);
  if (head && head.index != null) { const i = head.index + head[0].length; return html.slice(0, i) + snippet + html.slice(i); }
  const body = html.match(/<body[^>]*>/i);
  if (body && body.index != null) { const i = body.index + body[0].length; return html.slice(0, i) + snippet + html.slice(i); }
  const htmlTag = html.match(/<html[^>]*>/i);
  if (htmlTag && htmlTag.index != null) { const i = htmlTag.index + htmlTag[0].length; return html.slice(0, i) + snippet + html.slice(i); }
  return snippet + html;
};

// Decode a bounded haystack of the build's text (entry + scripts) for heuristics.
const textHaystack = (files: IngestFile[], limit = 500_000): string => {
  let out = '';
  for (const f of files) {
    if (f.enc) continue; // compressed — skip
    if (!/text\/html|javascript/.test(f.ct)) continue;
    out += '\n' + decoder.decode(f.bytes);
    if (out.length > limit) break;
  }
  return out.toLowerCase();
};

export function analyzeAndPrepare(files: IngestFile[], entry: string): { report: CompatReport; files: IngestFile[] } {
  const checks: CompatCheck[] = [];
  const applied: string[] = [];
  const fileSet = new Set(files.map((f) => f.path));
  const entryFile = files.find((f) => f.path === entry);
  const entryDir = entry.includes('/') ? entry.slice(0, entry.lastIndexOf('/') + 1) : '';

  // The entry HTML may be brotli/gzip-encoded (Unity). We can't safely rewrite
  // those, so analyze conservatively and skip injection.
  const canEditEntry = !!entryFile && !entryFile.enc;
  let html = canEditEntry ? decoder.decode(entryFile!.bytes) : '';

  // 1) External CDN dependencies — load fine but are a portability/reliability risk.
  const hosts = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"'\s]+)/gi)) {
    try { const h = new URL(m[1]).hostname; if (!ALLOWED_HOSTS.has(h)) hosts.add(h); } catch { /* ignore */ }
  }
  checks.push(hosts.size
    ? { id: 'external-deps', level: 'warn', title: 'External dependencies', detail: `Loads from ${[...hosts].slice(0, 5).join(', ')}. Bundle these into the zip so the game can't break when a CDN is slow or down.` }
    : { id: 'external-deps', level: 'pass', title: 'Self-contained', detail: 'No third-party CDN scripts or styles in the entry HTML.' });

  // 2) Missing local assets referenced from the entry HTML.
  if (canEditEntry) {
    const missing: string[] = [];
    for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"'>]+)["']/gi)) {
      let ref = m[1].split('#')[0].split('?')[0].trim();
      if (!ref || /^(https?:|data:|blob:|mailto:|tel:|\/\/|#)/i.test(ref) || ref.startsWith('/')) continue;
      if (ref.includes('{') || ref.includes('${')) continue; // templated
      const resolved = normalize(entryDir + ref);
      if (resolved && !fileSet.has(resolved) && !missing.includes(resolved)) missing.push(resolved);
    }
    checks.push(missing.length
      ? { id: 'missing-assets', level: 'warn', title: 'Referenced files missing', detail: `These paths are referenced but not in the zip: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}.` }
      : { id: 'missing-assets', level: 'pass', title: 'Assets resolved', detail: 'Every file the entry HTML references is present in the build.' });
  }

  // 3) Viewport — required for the game to scale on mobile; auto-added if absent.
  const hasViewport = /<meta[^>]+name\s*=\s*["']viewport["']/i.test(html);
  if (!hasViewport && canEditEntry) {
    checks.push({ id: 'viewport', level: 'warn', title: 'Viewport meta added', detail: 'No mobile viewport tag was present — GoodGame added one so the game scales on phones.' });
  } else {
    checks.push({ id: 'viewport', level: 'pass', title: 'Viewport set', detail: 'A mobile viewport meta tag is present.' });
  }

  // 4) Rigid sizing that often overflows the play frame.
  const rigid = /100vh/i.test(html) || /<canvas[^>]+(?:width|height)\s*=\s*["']?\d{4,}/i.test(html);
  checks.push(rigid
    ? { id: 'sizing', level: 'warn', title: 'Fixed sizing detected', detail: 'Uses 100vh or a large fixed canvas size, which can overflow the play frame. Prefer sizing the canvas to its container.' }
    : { id: 'sizing', level: 'pass', title: 'Flexible sizing', detail: 'No obvious fixed-pixel or 100vh layout traps in the entry HTML.' });

  // 5) Mobile input — warn if it looks keyboard-only.
  const hay = textHaystack(files);
  const hasKeyboard = /addeventlistener\(\s*['"]key(down|up|press)|onkey(down|up)|\.key\b|keycode/.test(hay);
  const hasPointer = /touchstart|touchend|touchmove|pointerdown|pointermove|onpointer|ontouchstart/.test(hay);
  checks.push(hasKeyboard && !hasPointer
    ? { id: 'touch-input', level: 'warn', title: 'Looks keyboard-only', detail: 'Keyboard handlers found but no touch/pointer input — the game may be unplayable on phones and tablets.' }
    : { id: 'touch-input', level: 'pass', title: 'Input looks portable', detail: hasPointer ? 'Touch/pointer input handlers detected.' : 'No keyboard-only pattern detected.' });

  // Apply the safe fixes to the entry HTML.
  if (canEditEntry) {
    let next = html;
    if (!hasViewport) { next = injectIntoHead(next, VIEWPORT); applied.push('Added a mobile viewport meta tag.'); }
    next = injectIntoHead(next, ADAPTER); applied.push('Injected the GoodGame adapter (runtime error capture + score/save bridge).');
    if (next !== html) {
      html = next;
      const idx = files.findIndex((f) => f.path === entry);
      if (idx >= 0) files = files.map((f, i) => (i === idx ? { ...f, bytes: encoder.encode(html) } : f));
    }
  } else {
    checks.push({ id: 'entry-encoding', level: 'warn', title: 'Compressed entry HTML', detail: 'The entry HTML is pre-compressed, so GoodGame did not inject the adapter or viewport fix.' });
  }

  const score = Math.max(0, 100 - checks.reduce((n, c) => n + (c.level === 'fail' ? 25 : c.level === 'warn' ? 8 : 0), 0));
  return { report: { score, entry, checks, applied_fixes: applied }, files };
}
