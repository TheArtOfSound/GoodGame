// Ingest a zipped web/WebGL/Unity/Godot build: unzip in-Worker, sanitize paths,
// find the entrypoint, and assign content-type + content-encoding per file.
import { unzipSync } from 'fflate';

export type IngestFile = { path: string; bytes: Uint8Array; ct: string; enc?: string };
export type IngestResult =
  | { ok: true; entry: string; files: IngestFile[]; total: number }
  | { ok: false; error: string };

const MAX_TOTAL = 90 * 1024 * 1024;   // 90 MB per build
const MAX_FILE = 40 * 1024 * 1024;    // 40 MB per file
const MAX_FILES = 800;

// Block obvious native executables; everything else web-ish is allowed (served
// from a sandboxed opaque origin, never executed server-side).
const DENY = new Set(['exe', 'dll', 'bat', 'cmd', 'sh', 'msi', 'app', 'jar', 'com', 'scr', 'ps1', 'deb', 'dmg', 'apk', 'so', 'dylib', 'bin0']);

const CT: Record<string, string> = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
  wasm: 'application/wasm', map: 'application/json; charset=utf-8',
  data: 'application/octet-stream', mem: 'application/octet-stream', bin: 'application/octet-stream',
  pck: 'application/octet-stream', unityweb: 'application/octet-stream', symbols: 'application/octet-stream',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp', cur: 'image/x-icon',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  mp4: 'video/mp4', webm: 'video/webm',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8', csv: 'text/csv; charset=utf-8',
  glb: 'model/gltf-binary', gltf: 'model/gltf+json',
};

const ext = (p: string): string => { const i = p.lastIndexOf('.'); return i < 0 ? '' : p.slice(i + 1).toLowerCase(); };

function safePath(raw: string): string | null {
  let p = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!p || p.endsWith('/')) return null;                      // dir
  if (p.startsWith('/') || p.includes('..')) return null;      // traversal / absolute
  if (/(^|\/)__MACOSX\//.test(p) || /(^|\/)\.DS_Store$/.test(p)) return null;
  if (p.split('/').some((s) => s.startsWith('._'))) return null;
  return p;
}

// If every file lives under a single top-level folder, strip it so the
// entrypoint resolves at the root (zipping a folder is the common case).
function stripWrapper(paths: string[]): string {
  let prefix: string | null = null;
  for (const p of paths) {
    const top = p.includes('/') ? p.slice(0, p.indexOf('/') + 1) : '';
    if (!top) return '';
    if (prefix === null) prefix = top;
    else if (prefix !== top) return '';
  }
  return prefix || '';
}

export function ingestZip(buf: Uint8Array): IngestResult {
  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(buf);
  } catch {
    return { ok: false, error: 'That file is not a valid .zip archive.' };
  }
  const entries = Object.keys(raw);
  if (!entries.length) return { ok: false, error: 'The zip is empty.' };

  const cleaned: { path: string; bytes: Uint8Array }[] = [];
  for (const key of entries) {
    const p = safePath(key);
    if (!p) continue;
    if (DENY.has(ext(p))) return { ok: false, error: `Blocked file type: ${p} (executables aren’t allowed).` };
    cleaned.push({ path: p, bytes: raw[key] });
  }
  if (!cleaned.length) return { ok: false, error: 'No usable files found in the zip.' };
  if (cleaned.length > MAX_FILES) return { ok: false, error: `Too many files (${cleaned.length}). Limit is ${MAX_FILES}.` };

  const wrapper = stripWrapper(cleaned.map((f) => f.path));
  const files: IngestFile[] = [];
  let total = 0;
  for (const f of cleaned) {
    const path = wrapper ? f.path.slice(wrapper.length) : f.path;
    if (!path) continue;
    if (f.bytes.length > MAX_FILE) return { ok: false, error: `${path} is too large (limit ${Math.round(MAX_FILE / 1048576)} MB per file).` };
    total += f.bytes.length;
    if (total > MAX_TOTAL) return { ok: false, error: `Build exceeds ${Math.round(MAX_TOTAL / 1048576)} MB total.` };
    let e = ext(path), enc: string | undefined;
    if (e === 'br') { enc = 'br'; e = ext(path.slice(0, -3)); }
    else if (e === 'gz') { enc = 'gzip'; e = ext(path.slice(0, -3)); }
    files.push({ path, bytes: f.bytes, ct: CT[e] || 'application/octet-stream', enc });
  }

  // Pick entrypoint: root index.html, else any index.html, else a lone .html.
  const htmls = files.filter((f) => /\.html?$/i.test(f.path));
  let entry = files.find((f) => f.path === 'index.html')?.path
    || htmls.find((f) => f.path.toLowerCase().endsWith('/index.html'))?.path
    || (htmls.length === 1 ? htmls[0].path : '');
  if (!entry) {
    return { ok: false, error: htmls.length ? 'Multiple HTML files — name your entry index.html at the zip root.' : 'No index.html found. Your build needs an HTML entrypoint.' };
  }
  return { ok: true, entry, files, total };
}
