// Creator-hosted games: embed an already-hosted web build by URL instead of
// uploading a zip. This module:
//   1. validates + normalizes the URL (SSRF-safe: https only, no private/reserved hosts),
//   2. fetches it to confirm it can actually be framed (X-Frame-Options / CSP frame-ancestors),
//   3. proves the creator controls the domain via a token (meta tag or /.well-known file).
// The embedded game runs on the creator's OWN origin in a sandboxed iframe, so it
// never touches the visitor's GoodGame session.

const MAX_URL = 512;
const FETCH_TIMEOUT = 8000;
const MAX_HTML = 512 * 1024;
const META_NAME = 'goodgame-site-verification';
const WELL_KNOWN = '/.well-known/goodgame-verify.txt';

export type UrlCheck = { ok: true; url: string; origin: string } | { ok: false; error: string };
export type EmbedCheck =
  | { ok: true; finalUrl: string; html: string; verified: boolean }
  | { ok: false; error: string };

// Block private, loopback, link-local, CGNAT, multicast and reserved IPv4 ranges.
function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const oct = m.slice(1).map(Number);
  if (oct.some((n) => n > 255)) return true; // malformed → treat as unsafe
  const [a, b] = oct;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;          // link-local + cloud metadata (169.254.169.254)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true;                          // multicast / reserved
  return false;
}

export function normalizeEmbedUrl(raw: string): UrlCheck {
  const s = (raw || '').trim();
  if (!s) return { ok: false, error: 'Enter the URL where your game is hosted.' };
  if (s.length > MAX_URL) return { ok: false, error: 'That URL is too long.' };
  let u: URL;
  try { u = new URL(s); } catch { return { ok: false, error: 'That doesn’t look like a valid URL — include the https:// prefix.' }; }
  if (u.protocol !== 'https:') return { ok: false, error: 'The URL must start with https:// — an insecure page can’t be embedded on a secure site.' };
  if (u.username || u.password) return { ok: false, error: 'Remove the username/password from the URL.' };
  if (u.port && u.port !== '443') return { ok: false, error: 'Only standard https URLs (port 443) are allowed.' };
  const host = u.hostname.toLowerCase();
  if (host.includes(':')) return { ok: false, error: 'IPv6 addresses aren’t supported — use a domain name.' };
  if (!host.includes('.')) return { ok: false, error: 'Use a full public domain (e.g. yourgame.example.com).' };
  if (/(^|\.)(localhost|local|internal|home|lan)$/.test(host)) return { ok: false, error: 'That host isn’t publicly reachable.' };
  if (isPrivateIPv4(host)) return { ok: false, error: 'That’s a private or reserved IP address and can’t be used.' };
  u.hash = '';
  return { ok: true, url: u.toString(), origin: u.origin };
}

// Returns a human reason if the target's headers forbid us from framing it, else null.
function framingBlocked(headers: Headers, siteOrigin: string): string | null {
  const xfo = (headers.get('x-frame-options') || '').toLowerCase();
  if (xfo.includes('deny')) return 'it sends X-Frame-Options: DENY';
  if (xfo.includes('sameorigin')) return 'it sends X-Frame-Options: SAMEORIGIN';
  if (xfo.includes('allow-from')) return 'it restricts framing with X-Frame-Options: ALLOW-FROM';
  const csp = headers.get('content-security-policy') || '';
  const fa = csp.split(';').map((d) => d.trim()).find((d) => /^frame-ancestors\b/i.test(d));
  if (fa) {
    const toks = fa.split(/\s+/).slice(1).map((t) => t.toLowerCase().replace(/;$/, ''));
    if (!toks.length || toks.includes("'none'")) return 'its CSP forbids framing (frame-ancestors ’none’)';
    let siteHost = '';
    try { siteHost = new URL(siteOrigin).hostname.toLowerCase(); } catch { /* ignore */ }
    const allowsUs = toks.some((t) =>
      t === '*' || t === 'https:' ||
      t === siteOrigin.toLowerCase() || t === siteHost || t === '*.' + siteHost);
    if (!allowsUs) return 'its CSP only allows framing on specific origins';
  }
  return null;
}

// Look for <meta name="goodgame-site-verification" content="<token>"> in the page HTML.
export function metaVerified(html: string, token: string): boolean {
  if (!html || !token) return false;
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metas) {
    if (new RegExp(`name\\s*=\\s*["']${META_NAME}["']`, 'i').test(tag)) {
      const m = tag.match(/content\s*=\s*["']([^"']+)["']/i);
      if (m && m[1].trim() === token) return true;
    }
  }
  return false;
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'GoodGameBot/1.0 (+https://goodgame.center)', accept: 'text/html,*/*' },
      signal: ctrl.signal,
      ...init,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Fetch the target and decide whether it's embeddable. If a token is supplied,
// also report whether the page already carries the verification meta tag.
export async function fetchForEmbed(url: string, siteOrigin: string, token?: string): Promise<EmbedCheck> {
  let res: Response;
  try {
    res = await timedFetch(url);
  } catch {
    return { ok: false, error: 'Could not reach that URL — it timed out or refused the connection.' };
  }
  // Re-validate the final URL after redirects (guards against SSRF via redirect).
  const finalCheck = normalizeEmbedUrl(res.url || url);
  if (!finalCheck.ok) return { ok: false, error: 'That URL redirects somewhere that can’t be embedded.' };
  if (!res.ok) return { ok: false, error: `That URL returned HTTP ${res.status}.` };
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct && !ct.includes('html')) return { ok: false, error: `That URL serves ${ct.split(';')[0]}, not an HTML page.` };
  const blocked = framingBlocked(res.headers, siteOrigin);
  if (blocked) return { ok: false, error: `That page can’t be embedded — ${blocked}. Host it where framing is allowed, or upload a .zip instead.` };
  let html = '';
  try {
    const buf = await res.arrayBuffer();
    html = new TextDecoder().decode(buf.slice(0, MAX_HTML));
  } catch { /* body is optional for the framing decision */ }
  return { ok: true, finalUrl: finalCheck.url, html, verified: token ? metaVerified(html, token) : false };
}

// Fallback ownership proof: GET <origin>/.well-known/goodgame-verify.txt and look for the token.
export async function wellKnownVerified(origin: string, token: string): Promise<boolean> {
  try {
    const res = await timedFetch(origin.replace(/\/$/, '') + WELL_KNOWN);
    if (!res.ok) return false;
    const txt = (await res.text()).slice(0, 4096);
    return txt.split(/\s+/).some((t) => t.trim() === token);
  } catch {
    return false;
  }
}

export const newEmbedToken = (): string => {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return 'ggv_' + Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
};

// The verification snippet we ask creators to add to their page's <head>.
export const verifyMetaTag = (token: string): string => `<meta name="${META_NAME}" content="${token}">`;
export const WELL_KNOWN_PATH = WELL_KNOWN;

// Sandbox for a cross-origin creator-hosted embed. allow-same-origin keeps the
// creator's OWN origin (so their game's storage works) — being cross-origin, it
// still cannot reach ours. Deliberately NO allow-top-navigation / allow-popups /
// allow-modals so a linked page can't hijack the tab or spam popups.
export const EMBED_SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock allow-fullscreen allow-orientation-lock';
