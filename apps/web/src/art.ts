// Illustrated cover art — each playable genre gets a scene that depicts the actual
// game (seeded so every title looks distinct), instead of a flat gradient.
// Returns a self-contained <svg viewBox="0 0 320 200"> string.

function rng(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', ''); if (h.length !== 6) return hex;
  const n = parseInt(h, 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// IDs MUST be unique per inline SVG — duplicate ids across one HTML document
// collapse, so every url(#bg) would otherwise resolve to the first scene on the page.
const open = (a: string, uid: string, glow = '70% 18%') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">` +
  `<defs><linearGradient id="bg${uid}" x1="0" y1="0" x2="0.5" y2="1">` +
  `<stop offset="0" stop-color="${shade(a, -0.55)}"/><stop offset="0.7" stop-color="#0a0e18"/><stop offset="1" stop-color="#080b12"/></linearGradient>` +
  `<radialGradient id="gl${uid}" cx="${glow.split(' ')[0]}" cy="${glow.split(' ')[1]}" r="0.7"><stop offset="0" stop-color="${shade(a, 0.12)}" stop-opacity="0.8"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient></defs>` +
  `<rect width="320" height="200" fill="url(#bg${uid})"/><rect width="320" height="200" fill="url(#gl${uid})"/>`;
const close = '</svg>';

function mergeScene(a: string, r: () => number, uid: string): string {
  const N = 4, size = 36, gap = 9, gw = N * size + (N - 1) * gap, ox = (320 - gw) / 2, oy = (200 - gw) / 2;
  let s = open(a, uid) + `<rect x="${ox - gap}" y="${oy - gap}" width="${gw + 2 * gap}" height="${gw + 2 * gap}" rx="13" fill="#0c1120"/>`;
  const vals = [2, 4, 8, 16, 32, 64, 128];
  for (let i = 0; i < 16; i++) {
    const x = ox + (i % N) * (size + gap), y = oy + ((i / N) | 0) * (size + gap);
    if (r() >= 0.55) { s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="#ffffff" fill-opacity="0.05"/>`; continue; }
    const v = vals[Math.min(vals.length - 1, Math.floor(r() * 5))];
    s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="${shade(a, Math.min(0.55, Math.log2(v) * 0.07))}"/>`;
    s += `<text x="${x + size / 2}" y="${y + size / 2 + 1}" font-family="Inter,system-ui,sans-serif" font-size="${v < 10 ? 17 : v < 100 ? 14 : 11}" font-weight="800" fill="#0a0e18" text-anchor="middle" dominant-baseline="central">${v}</text>`;
  }
  return s + close;
}

function runnerScene(a: string, r: () => number, uid: string): string {
  const gy = 150;
  let s = open(a, uid, '80% 22%');
  for (let i = 0; i < 7; i++) { const x = 20 + i * 46 + r() * 10; s += `<line x1="${x}" y1="${gy}" x2="${x - 26}" y2="200" stroke="#ffffff" stroke-opacity="0.05" stroke-width="2"/>`; }
  s += `<line x1="0" y1="${gy}" x2="320" y2="${gy}" stroke="${a}" stroke-opacity="0.65" stroke-width="2.5"/>`;
  for (let i = 0; i < 3; i++) { const x = 150 + i * 70 + r() * 24, h = 20 + r() * 26; s += `<rect x="${x}" y="${gy - h}" width="15" height="${h + 2}" rx="3" fill="#f0556b"/>`; }
  s += `<rect x="64" y="${gy - 52}" width="26" height="26" rx="7" fill="#fff"/><circle cx="77" cy="${gy - 14}" r="13" fill="${a}" opacity="0.2"/>`;
  return s + close;
}

function arenaScene(a: string, r: () => number, uid: string): string {
  let s = open(a, uid, '50% 50%');
  for (let x = 0; x <= 320; x += 32) s += `<line x1="${x}" y1="0" x2="${x}" y2="200" stroke="#ffffff" stroke-opacity="0.045"/>`;
  for (let y = 0; y <= 200; y += 32) s += `<line x1="0" y1="${y}" x2="320" y2="${y}" stroke="#ffffff" stroke-opacity="0.045"/>`;
  const cx = 160, cy = 100;
  for (let i = 0; i < 7; i++) { const ang = r() * 6.28, d = 55 + r() * 75; s += `<circle cx="${cx + Math.cos(ang) * d}" cy="${cy + Math.sin(ang) * d * 0.7}" r="${7 + r() * 5}" fill="#f0556b"/>`; }
  for (let i = 0; i < 6; i++) { const ang = (i / 6) * 6.28, d = 26 + r() * 40; s += `<circle cx="${cx + Math.cos(ang) * d}" cy="${cy + Math.sin(ang) * d}" r="3.5" fill="${a}"/>`; }
  s += `<circle cx="${cx}" cy="${cy}" r="20" fill="${a}" opacity="0.25"/><circle cx="${cx}" cy="${cy}" r="11" fill="#fff"/>`;
  return s + close;
}

function racerScene(a: string, r: () => number, uid: string): string {
  let s = open(a, uid, '50% 6%');
  s += `<path d="M130 0 L190 0 L260 200 L60 200 Z" fill="#0c1120"/>`;
  s += `<path d="M130 0 L190 0 L260 200 L60 200 Z" fill="none" stroke="${a}" stroke-opacity="0.65" stroke-width="2.5"/>`;
  for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = t0 + 0.06, y0 = t0 * 200, y1 = t1 * 200, w0 = 1 + t0 * 5, w1 = 1 + t1 * 5; s += `<polygon points="${160 - w0},${y0} ${160 + w0},${y0} ${160 + w1},${y1} ${160 - w1},${y1}" fill="#ffffff" fill-opacity="0.16"/>`; }
  const fx = 150 + (r() - 0.5) * 30; s += `<rect x="${fx - 11}" y="60" width="22" height="34" rx="5" fill="#f0556b"/>`;
  s += `<rect x="146" y="150" width="28" height="44" rx="7" fill="#fff"/>`;
  return s + close;
}

function logicScene(a: string, r: () => number, uid: string): string {
  const N = 4, size = 34, gap = 11, gw = N * size + (N - 1) * gap, ox = (320 - gw) / 2, oy = (200 - gw) / 2;
  let s = open(a, uid, '50% 50%');
  for (let i = 0; i < 16; i++) {
    const x = ox + (i % N) * (size + gap), y = oy + ((i / N) | 0) * (size + gap);
    if (r() < 0.5) s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="9" fill="${a}"/>`;
    else s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="9" fill="#0e1320" stroke="#ffffff" stroke-opacity="0.07"/>`;
  }
  return s + close;
}

function defaultScene(a: string, r: () => number, uid: string): string {
  let s = open(a, uid, `${60 + r() * 25}% ${15 + r() * 20}%`);
  for (let i = 0; i < 6; i++) {
    const x = r() * 320, y = r() * 200, sz = 16 + r() * 52, rot = r() * 45;
    if (r() < 0.5) s += `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="${sz * 0.28}" fill="${shade(a, r() * 0.35)}" fill-opacity="${0.12 + r() * 0.18}" transform="rotate(${rot} ${x + sz / 2} ${y + sz / 2})"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="${sz / 2}" fill="none" stroke="${shade(a, 0.3)}" stroke-opacity="${0.14 + r() * 0.18}" stroke-width="2"/>`;
  }
  return s + close;
}

const SCENES: Record<string, (a: string, r: () => number, uid: string) => string> = {
  merge: mergeScene, runner: runnerScene, arena: arenaScene, racer: racerScene, logic: logicScene,
};

export function gameArt(kind: string | null | undefined, accent: string, seed: string): string {
  const key = seed || kind || accent || 'gg';
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (SCENES[kind || ''] || defaultScene)(accent || '#6b93ff', rng(key), h.toString(36));
}
