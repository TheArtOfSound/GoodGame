// Hand-authored custom key art + logos per game. NOT a procedural template —
// each composition and wordmark is individually designed with its own palette.
// viewBox 460x215 (Steam header-capsule ratio). Title is baked in (no overlay).

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 215" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;

// ---- GG Puzzle League — clean flat tiles, geometric logo (teal) ----
function puzzleLeague(): string {
  const tile = (x: number, y: number, n: string, c: string) =>
    `<g transform="translate(${x},${y})"><rect width="58" height="58" rx="8" fill="${c}"/><rect width="58" height="6" rx="3" fill="#ffffff" fill-opacity="0.22"/><text x="29" y="38" text-anchor="middle" font-family="Arial" font-weight="800" font-size="26" fill="#06312b">${n}</text></g>`;
  return wrap(
    `<rect width="460" height="215" fill="#0c2b2a"/>` +
    `<rect width="460" height="215" fill="url(#pl-g)"/>` +
    `<defs><radialGradient id="pl-g" cx="0.72" cy="0.25" r="0.9"><stop offset="0" stop-color="#14b8a6" stop-opacity="0.55"/><stop offset="1" stop-color="#0c2b2a" stop-opacity="0"/></radialGradient></defs>` +
    `<g transform="translate(250,28) rotate(-8)">` +
    tile(0, 0, '2', '#5eead4') + tile(66, 14, '8', '#2dd4bf') + tile(0, 70, '16', '#14b8a6') + tile(66, 84, '4', '#5eead4') +
    `</g>` +
    `<g transform="translate(34,150)"><text font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="30" letter-spacing="-1" fill="#ffffff">PUZZLE</text><text y="30" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="30" letter-spacing="6" fill="#5eead4">LEAGUE</text></g>`
  );
}

// ---- Neon Drift — synthwave: retro sun, perspective grid, car (magenta/cyan) ----
function neonDrift(): string {
  let grid = '';
  for (let i = 0; i <= 12; i++) { const x = (i / 12) * 460; grid += `<line x1="${x}" y1="215" x2="230" y2="135" stroke="#2de2e6" stroke-opacity="0.45" stroke-width="1"/>`; }
  for (let i = 1; i <= 6; i++) { const y = 135 + Math.pow(i / 6, 2.1) * 80; grid += `<line x1="0" y1="${y}" x2="460" y2="${y}" stroke="#2de2e6" stroke-opacity="${0.5 - i * 0.05}" stroke-width="1"/>`; }
  let slats = '';
  for (let i = 0; i < 10; i++) { const y = 150 + i * 5; slats += `<rect x="168" y="${y}" width="124" height="${1.5 + i * 0.3}" fill="#1a0726"/>`; }
  return wrap(
    `<defs><linearGradient id="nd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0a4a"/><stop offset="0.45" stop-color="#7a1d7e"/><stop offset="0.62" stop-color="#d11f6b"/><stop offset="0.625" stop-color="#170724"/><stop offset="1" stop-color="#090416"/></linearGradient>` +
    `<linearGradient id="nd-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe24a"/><stop offset="0.55" stop-color="#ff7ac0"/><stop offset="1" stop-color="#ff2d95"/></linearGradient>` +
    `<clipPath id="nd-c"><rect width="460" height="135"/></clipPath></defs>` +
    `<rect width="460" height="215" fill="url(#nd-sky)"/>` +
    `<g clip-path="url(#nd-c)"><circle cx="230" cy="150" r="66" fill="url(#nd-sun)"/>${slats}</g>` +
    `<rect x="0" y="133" width="460" height="2.5" fill="#ff6bb6"/>` +
    `<g>${grid}</g>` +
    `<g transform="translate(214,168)"><path d="M2 24 L8 8 Q10 3 16 3 L26 3 Q32 3 34 8 L40 24 Z" fill="#120a1e"/><rect x="3" y="22" width="36" height="6" rx="2" fill="#0a0612"/><rect x="6" y="9" width="8" height="4" rx="2" fill="#ff2d95"/><rect x="28" y="9" width="8" height="4" rx="2" fill="#ff2d95"/></g>` +
    `<text x="230" y="46" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-style="italic" font-weight="800" font-size="36" letter-spacing="1" fill="#ffffff" transform="skewX(-9)" stroke="#2de2e6" stroke-width="0.6">NEON DRIFT</text>`
  );
}

// ---- GG Speed Run — motion streaks, forward chevrons (orange) ----
function speedRun(): string {
  let streaks = '';
  for (let i = 0; i < 9; i++) { const y = 20 + i * 21, w = 60 + (i % 3) * 70, x = (i * 57) % 360; streaks += `<rect x="${x}" y="${y}" width="${w}" height="3" rx="1.5" fill="#ffffff" fill-opacity="${0.06 + (i % 4) * 0.03}" transform="skewX(-20)"/>`; }
  const chev = (x: number, o: number) => `<path d="M${x} 70 L${x + 26} 107 L${x} 144 L${x + 12} 107 Z" fill="#ffd000" fill-opacity="${o}"/>`;
  return wrap(
    `<defs><linearGradient id="sr-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a1e00"/><stop offset="0.5" stop-color="#e8590c"/><stop offset="1" stop-color="#ff9a1f"/></linearGradient></defs>` +
    `<rect width="460" height="215" fill="url(#sr-g)"/>` +
    `<g>${streaks}</g>` +
    `<g transform="translate(300,0)">${chev(0, 0.35)}${chev(34, 0.6)}${chev(68, 0.95)}</g>` +
    `<text x="30" y="120" font-family="Arial,Helvetica,sans-serif" font-style="italic" font-weight="800" font-size="44" fill="#ffffff" transform="skewX(-12)">SPEED</text>` +
    `<text x="40" y="162" font-family="Arial,Helvetica,sans-serif" font-style="italic" font-weight="800" font-size="44" fill="#0a0a0f" transform="skewX(-12)">RUN</text>`
  );
}

// ---- GG Blitz Arena — energy burst, reticle, bolt (electric blue) ----
function blitzArena(): string {
  let rays = '';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rays += `<line x1="230" y1="100" x2="${230 + Math.cos(a) * 230}" y2="${100 + Math.sin(a) * 230}" stroke="#1a9fff" stroke-opacity="0.10" stroke-width="${i % 2 ? 8 : 3}"/>`; }
  return wrap(
    `<defs><radialGradient id="ba-g" cx="0.5" cy="0.47" r="0.7"><stop offset="0" stop-color="#1e4a82"/><stop offset="1" stop-color="#071426"/></radialGradient></defs>` +
    `<rect width="460" height="215" fill="url(#ba-g)"/>` +
    `<g>${rays}</g>` +
    `<circle cx="230" cy="100" r="46" fill="none" stroke="#1a9fff" stroke-width="2" stroke-opacity="0.55"/>` +
    `<circle cx="230" cy="100" r="64" fill="none" stroke="#1a9fff" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="6 8"/>` +
    `<g stroke="#66c0f4" stroke-width="2"><line x1="230" y1="42" x2="230" y2="58"/><line x1="230" y1="142" x2="230" y2="158"/><line x1="172" y1="100" x2="188" y2="100"/><line x1="272" y1="100" x2="288" y2="100"/></g>` +
    `<path d="M232 74 L214 104 L228 104 L224 128 L246 96 L232 96 Z" fill="#ffe24a" stroke="#fff" stroke-width="0.5"/>` +
    `<text x="230" y="186" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="30" letter-spacing="3" fill="#ffffff">BLITZ ARENA</text>`
  );
}

// ---- GG Card Clash — fanned cards, suits (royal purple/gold) ----
function cardClash(): string {
  const card = (x: number, y: number, rot: number, suit: string, col: string) =>
    `<g transform="translate(${x},${y}) rotate(${rot})"><rect x="-26" y="-37" width="52" height="74" rx="6" fill="#f4f1ea" stroke="#cbb6a0" stroke-opacity="0.5"/><text x="-19" y="-19" font-family="Georgia,serif" font-weight="700" font-size="15" fill="${col}">${suit}</text><text x="0" y="9" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="${col}">${suit}</text></g>`;
  return wrap(
    `<defs><radialGradient id="cc-g" cx="0.5" cy="0.3" r="0.95"><stop offset="0" stop-color="#5b21b6"/><stop offset="1" stop-color="#1e0a3c"/></radialGradient></defs>` +
    `<rect width="460" height="215" fill="url(#cc-g)"/>` +
    `<g transform="translate(232,96)">` +
    card(-72, 14, -22, '♠', '#15121f') + card(-26, 2, -8, '♥', '#c01d3a') + card(24, 4, 9, '♣', '#15121f') + card(72, 18, 23, '♦', '#c01d3a') +
    `</g>` +
    `<text x="230" y="180" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="32" letter-spacing="1" fill="#f5c518">CARD CLASH</text>`
  );
}

// ---- Gridlock — glowing node network (violet) ----
function gridlock(): string {
  const N = [[120, 70], [200, 50], [280, 90], [350, 60], [160, 130], [250, 150], [330, 140], [95, 110]];
  let edges = '', nodes = '';
  const E = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 2], [5, 6], [6, 3], [7, 0], [7, 4]];
  for (const [a, b] of E) edges += `<line x1="${N[a][0]}" y1="${N[a][1]}" x2="${N[b][0]}" y2="${N[b][1]}" stroke="#a855f7" stroke-opacity="0.4" stroke-width="1.5"/>`;
  N.forEach((p, i) => { const on = [0, 2, 5, 3].includes(i); nodes += `<circle cx="${p[0]}" cy="${p[1]}" r="${on ? 11 : 7}" fill="${on ? '#c084fc' : '#3b1d63'}" stroke="#a855f7" stroke-width="1.5"/>`; });
  return wrap(
    `<rect width="460" height="215" fill="#15082b"/>` +
    `<rect width="460" height="215" fill="url(#gl-g)"/>` +
    `<defs><radialGradient id="gl-g" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#3b1166" stop-opacity="0.7"/><stop offset="1" stop-color="#15082b" stop-opacity="0"/></radialGradient></defs>` +
    `<g>${edges}${nodes}</g>` +
    `<text x="230" y="190" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="32" letter-spacing="7" fill="#ffffff">GRIDLOCK</text>`
  );
}

// ---- GG Horror Nights — blood moon, dead trees, fog (crimson/black) ----
function horrorNights(): string {
  return wrap(
    `<defs><linearGradient id="hn-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0608"/><stop offset="1" stop-color="#050304"/></linearGradient><radialGradient id="hn-m" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#e8c9a0"/><stop offset="0.7" stop-color="#b5503a"/><stop offset="1" stop-color="#7a1e1e"/></radialGradient></defs>` +
    `<rect width="460" height="215" fill="url(#hn-g)"/>` +
    `<circle cx="338" cy="74" r="46" fill="url(#hn-m)"/>` +
    `<circle cx="338" cy="74" r="46" fill="#1a0608" fill-opacity="0.0"/>` +
    `<g fill="#1a0608" opacity="0.85"><ellipse cx="320" cy="64" rx="10" ry="3"/><ellipse cx="350" cy="84" rx="14" ry="3"/></g>` +
    `<path d="M0 215 L0 150 Q40 120 30 90 Q60 110 70 140 Q90 110 110 150 L110 215 Z" fill="#0a0405"/>` +
    `<path d="M70 215 L80 130 L72 120 L86 126 L84 110 L96 124 L100 100 L106 126 L120 116 L112 132 L120 215 Z" fill="#000"/>` +
    `<g stroke="#000" stroke-width="3" fill="none" opacity="0.9"><path d="M392 215 L388 120 L380 112"/><path d="M388 140 L398 128"/><path d="M386 160 L376 150"/></g>` +
    `<ellipse cx="230" cy="205" rx="240" ry="26" fill="#3a1414" opacity="0.35"/>` +
    `<text x="226" y="120" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="34" letter-spacing="2" fill="#c8262a">HORROR</text>` +
    `<text x="226" y="152" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-style="italic" font-size="26" letter-spacing="6" fill="#9a9486">NIGHTS</text>`
  );
}

// ---- GG Builder Jam — isometric stacked blocks (amber) ----
function builderJam(): string {
  const block = (x: number, y: number, top: string, l: string, r: string) =>
    `<g transform="translate(${x},${y})"><path d="M0 -18 L26 -5 L0 8 L-26 -5 Z" fill="${top}"/><path d="M-26 -5 L0 8 L0 36 L-26 23 Z" fill="${l}"/><path d="M26 -5 L0 8 L0 36 L26 23 Z" fill="${r}"/></g>`;
  return wrap(
    `<defs><linearGradient id="bj-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2607"/><stop offset="1" stop-color="#171003"/></linearGradient></defs>` +
    `<rect width="460" height="215" fill="url(#bj-g)"/>` +
    `<g transform="translate(300,70)">` +
    block(0, 0, '#fbbf24', '#b97c0c', '#d99410') + block(-26, 13, '#fcd34d', '#c98a10', '#eaa317') + block(26, 13, '#f59e0b', '#a86b08', '#c9850e') + block(0, 26, '#fde68a', '#caa11a', '#edc032') +
    `</g>` +
    `<text x="30" y="118" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="34" letter-spacing="-1" fill="#fbbf24">BUILDER</text>` +
    `<text x="32" y="156" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="34" letter-spacing="2" fill="#ffffff">JAM</text>`
  );
}

// ---- GG Battle Grid — tactical grid, squads, objective line (red vs blue) ----
function battleGrid(): string {
  let grid = '';
  for (let i = 0; i <= 10; i++) grid += `<line x1="${i * 46}" y1="58" x2="${i * 46}" y2="215" stroke="#1e3a5f" stroke-width="1"/>`;
  for (let i = 0; i <= 4; i++) grid += `<line x1="0" y1="${58 + i * 40}" x2="460" y2="${58 + i * 40}" stroke="#1e3a5f" stroke-width="1"/>`;
  const unit = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${c}" stroke-opacity="0.4"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`;
  return wrap(
    `<defs><linearGradient id="btg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1626"/><stop offset="1" stop-color="#050b14"/></linearGradient></defs>` +
    `<rect width="460" height="215" fill="url(#btg-g)"/><g>${grid}</g>` +
    `<line x1="150" y1="120" x2="330" y2="132" stroke="#ffffff" stroke-opacity="0.25" stroke-dasharray="3 5"/>` +
    unit(108, 118, '#3b82f6') + unit(150, 162, '#3b82f6') + unit(140, 92, '#3b82f6') +
    unit(330, 102, '#ef4444') + unit(360, 150, '#ef4444') + unit(304, 168, '#ef4444') +
    `<text x="230" y="40" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="28" letter-spacing="4" fill="#ffffff">BATTLE GRID</text>`
  );
}

// ---- GG DevQuest — code glyphs, quest path + flag (cyan, mono) ----
function devQuest(): string {
  return wrap(
    `<defs><radialGradient id="dq-g" cx="0.5" cy="0.45" r="0.85"><stop offset="0" stop-color="#0e4f5e"/><stop offset="1" stop-color="#04141a"/></radialGradient></defs>` +
    `<rect width="460" height="215" fill="url(#dq-g)"/>` +
    `<text x="44" y="78" font-family="monospace" font-size="44" fill="#22d3ee" fill-opacity="0.16">&lt;/&gt;</text>` +
    `<text x="334" y="180" font-family="monospace" font-size="44" fill="#22d3ee" fill-opacity="0.13">{ }</text>` +
    `<path d="M70 152 Q160 112 230 142 T392 108" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="5 6"/>` +
    `<circle cx="70" cy="152" r="6" fill="#22d3ee"/><circle cx="230" cy="142" r="6" fill="#67e8f9"/>` +
    `<g transform="translate(388,84)"><rect x="0" y="0" width="2.5" height="30" fill="#ffffff"/><path d="M2.5 2 L20 9 L2.5 16 Z" fill="#22d3ee"/></g>` +
    `<text x="230" y="58" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="30" letter-spacing="3" fill="#ffffff">DEV<tspan fill="#22d3ee">QUEST</tspan></text>`
  );
}

const ART: Record<string, () => string> = {
  'puzzle-league': puzzleLeague,
  'neon-drift': neonDrift,
  'speed-run': speedRun,
  'blitz-arena': blitzArena,
  'card-clash': cardClash,
  'gridlock': gridlock,
  'horror-nights': horrorNights,
  'builder-jam': builderJam,
  'battle-grid': battleGrid,
  'devquest': devQuest,
};

export const hasKeyart = (slug: string): boolean => slug in ART;
export const keyart = (slug: string): string | null => (ART[slug] ? ART[slug]() : null);

// Custom GoodGame brand mark (replaces the plain gradient square).
export const brandMark = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="30" height="30">` +
  `<defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a9fff"/><stop offset="1" stop-color="#0768c9"/></linearGradient></defs>` +
  `<rect width="36" height="36" rx="8" fill="url(#bm)"/>` +
  `<path d="M25 12.5 A8.5 8.5 0 1 0 25 23.5 L25 19 L19.5 19" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>` +
  `<circle cx="26" cy="18" r="2.1" fill="#9fe0ff"/>` +
  `</svg>`;
