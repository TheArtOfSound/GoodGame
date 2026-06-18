// Dynamic Open Graph card + favicon generation (SVG, 1200x630).
// Renderer-safe: layered gradients + soft radial "blobs" (no filters), so social
// scrapers rasterize it cleanly. No monograms.

const x = (s: string): string =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

function wrap(text: string, max: number, maxLines: number): string[] {
  const words = (text || '').split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const out = lines.slice(0, maxLines);
  if (words.join(' ').length > out.join(' ').length) out[out.length - 1] += '…';
  return out;
}

// light/dark shades of a hex accent
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function ogCard(o: { accent: string; eyebrow: string; title: string; sub?: string; footer?: string; mark?: string }): string {
  const a = o.accent || '#6b93ff';
  const seed = hash(o.title + o.eyebrow);
  const gx = 720 + (seed % 360);          // glow x
  const gy = 90 + ((seed >> 5) % 150);    // glow y
  const lines = wrap(o.title, 17, 3);
  const baseY = lines.length === 1 ? 380 : lines.length === 2 ? 340 : 300;
  const titleSvg = lines
    .map((l, i) => `<text x="84" y="${baseY + i * 84}" font-size="76" font-weight="800" fill="#ffffff" letter-spacing="-3" font-family="Inter,system-ui,sans-serif">${x(l)}</text>`)
    .join('');
  const subY = baseY + lines.length * 84 + 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="base" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="${x(shade(a, -0.62))}"/>
    <stop offset="0.7" stop-color="#080b12"/>
    <stop offset="1" stop-color="#06080d"/>
  </linearGradient>
  <radialGradient id="b1" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${x(shade(a, 0.12))}" stop-opacity="0.9"/>
    <stop offset="1" stop-color="${x(a)}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="b2" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${x(shade(a, -0.3))}" stop-opacity="0.8"/>
    <stop offset="1" stop-color="${x(a)}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.45" stop-color="#06080d" stop-opacity="0"/>
    <stop offset="1" stop-color="#06080d" stop-opacity="0.85"/>
  </linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#base)"/>
<ellipse cx="${gx}" cy="${gy}" rx="560" ry="420" fill="url(#b1)"/>
<ellipse cx="${gx - 360}" cy="700" rx="520" ry="380" fill="url(#b2)"/>
<g stroke="${x(shade(a, 0.3))}" stroke-width="1.5" opacity="0.10">
  <line x1="0" y1="150" x2="1200" y2="60"/><line x1="0" y1="330" x2="1200" y2="240"/>
  <line x1="0" y1="510" x2="1200" y2="420"/><line x1="0" y1="690" x2="1200" y2="600"/>
</g>
<rect width="1200" height="630" fill="url(#vig)"/>
<rect x="1" y="1" width="1198" height="628" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/>
<g transform="translate(84,80)" font-family="Inter,system-ui,sans-serif">
  <rect width="54" height="54" rx="14" fill="${x(a)}"/>
  <text x="27" y="37" font-size="28" font-weight="900" fill="#fff" text-anchor="middle">G</text>
  <text x="72" y="24" font-size="25" font-weight="800" fill="#eef2fb">GoodGame<tspan fill="${x(shade(a, 0.35))}">.center</tspan></text>
  <text x="72" y="48" font-size="16" letter-spacing="1.5" fill="#9fb0cc">${x((o.eyebrow || '').toUpperCase())}</text>
</g>
<g font-family="Inter,system-ui,sans-serif">${titleSvg}</g>
${o.sub ? `<text x="84" y="${subY}" font-size="27" fill="#b3bed5" font-family="Inter,system-ui,sans-serif">${x(wrap(o.sub, 62, 1)[0] || '')}</text>` : ''}
<text x="84" y="572" font-size="20" fill="#7c89a6" font-family="Inter,system-ui,sans-serif">${x(o.footer || 'Play · publish · clip · compete · build')}</text>
</svg>`;
}

export const favicon = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b93ff"/><stop offset="1" stop-color="#9d6bff"/></linearGradient></defs>
<rect width="32" height="32" rx="9" fill="url(#a)"/>
<text x="16" y="23" font-size="19" font-weight="900" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif">G</text>
</svg>`;

export { x as xmlEscape };
