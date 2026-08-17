// Combinatorial recipe space for GoodGame Forge.
// Dimensions multiply to well over 10k unique design DNA strings.

export type RecipeDim = {
  id: string;
  label: string;
  options: { id: string; label: string; blurb: string }[];
};

export const RECIPE_DIMS: RecipeDim[] = [
  {
    id: 'genre',
    label: 'Genre',
    options: [
      { id: 'arena-shooter', label: 'Arena shooter', blurb: 'survive waves in a closed arena' },
      { id: 'endless-runner', label: 'Endless runner', blurb: 'auto-scroll, jump/dodge hazards' },
      { id: 'platformer', label: 'Platformer', blurb: 'side-scroll levels, jumps, collectibles' },
      { id: 'puzzle-match', label: 'Match puzzle', blurb: 'grid matching / clear-board pressure' },
      { id: 'merge', label: 'Merge', blurb: 'combine equal units to climb a ladder' },
      { id: 'tower-defense', label: 'Tower defense', blurb: 'place towers, pathing enemies' },
      { id: 'roguelike', label: 'Roguelike room', blurb: 'rooms, risk rewards, permadeath run' },
      { id: 'racing', label: 'Racing', blurb: 'lane or free racer with boosts' },
      { id: 'rhythm', label: 'Rhythm', blurb: 'hit notes on beat for score' },
      { id: 'survival', label: 'Survival horde', blurb: 'build-up power while swarm scales' },
      { id: 'stealth', label: 'Stealth', blurb: 'avoid vision cones, silent moves' },
      { id: 'sports-arcade', label: 'Sports arcade', blurb: 'simple physics sport minigame' },
      { id: 'idle-clicker', label: 'Idle clicker', blurb: 'taps, upgrades, number go up' },
      { id: 'bullet-hell', label: 'Bullet hell', blurb: 'dense patterns, tight hitbox' },
    ],
  },
  {
    id: 'view',
    label: 'Camera',
    options: [
      { id: 'top-down', label: 'Top-down', blurb: 'bird’s-eye 2D' },
      { id: 'side', label: 'Side view', blurb: 'classic 2D side' },
      { id: 'fixed', label: 'Fixed screen', blurb: 'single screen, no scroll' },
      { id: 'follow', label: 'Follow cam', blurb: 'smooth camera on player' },
      { id: 'iso-lite', label: 'Fake iso', blurb: 'diamond/iso projection feel' },
    ],
  },
  {
    id: 'tone',
    label: 'Art tone',
    options: [
      { id: 'neon', label: 'Neon', blurb: 'glow lines, dark void, cyan/magenta' },
      { id: 'pixel', label: 'Pixel retro', blurb: 'chunky pixels, limited palette' },
      { id: 'cute', label: 'Cute pastel', blurb: 'soft shapes, friendly colors' },
      { id: 'horror', label: 'Horror', blurb: 'low light, red accents, tension' },
      { id: 'minimal', label: 'Minimal', blurb: 'flat geometry, high contrast' },
      { id: 'cyber', label: 'Cyberpunk', blurb: 'grids, glitch, chrome gold' },
      { id: 'cartoon', label: 'Cartoon', blurb: 'bold outlines, bounce' },
      { id: 'noir', label: 'Noir', blurb: 'monochrome + one accent' },
      { id: 'candy', label: 'Candy', blurb: 'saturated pop colors' },
      { id: 'military', label: 'Military', blurb: 'olive, HUD crosshairs' },
    ],
  },
  {
    id: 'loop',
    label: 'Core loop',
    options: [
      { id: 'score-attack', label: 'Score attack', blurb: 'beat high score before death' },
      { id: 'wave-clear', label: 'Wave clear', blurb: 'finish wave → reward → harder wave' },
      { id: 'timed', label: 'Timed run', blurb: 'clock pressure, best time' },
      { id: 'endless', label: 'Endless scale', blurb: 'difficulty ramps forever' },
      { id: 'levels', label: 'Level map', blurb: '3–6 short levels with goal' },
      { id: 'combo', label: 'Combo chain', blurb: 'string actions for multipliers' },
      { id: 'resource', label: 'Resource race', blurb: 'gather / spend under threat' },
      { id: 'boss', label: 'Boss phases', blurb: 'telegraphed boss with phases' },
      { id: 'escape', label: 'Escape', blurb: 'reach exit while chased' },
      { id: 'defend', label: 'Defend base', blurb: 'protect a point / crystal' },
    ],
  },
  {
    id: 'input',
    label: 'Controls',
    options: [
      { id: 'tap', label: 'Tap / click', blurb: 'primary is pointer taps' },
      { id: 'drag', label: 'Drag / aim', blurb: 'drag to aim or draw path' },
      { id: 'keys-touch', label: 'Keys + touch', blurb: 'WASD/arrows + on-screen pad' },
      { id: 'hold-release', label: 'Hold & release', blurb: 'charge shots / jumps' },
      { id: 'swipe', label: 'Swipe lanes', blurb: 'swipe to change lanes/dir' },
    ],
  },
  {
    id: 'ui',
    label: 'Menus & HUD',
    options: [
      { id: 'arcade', label: 'Arcade cabinet', blurb: 'INSERT COIN start, big score, game over banner' },
      { id: 'mobile', label: 'Mobile clean', blurb: 'portrait-friendly, large buttons, safe margins' },
      { id: 'cinematic', label: 'Cinematic', blurb: 'letterbox, title card, pause menu' },
      { id: 'diegetic', label: 'Diegetic HUD', blurb: 'UI feels in-world (gauges, panels)' },
      { id: 'esports', label: 'Esports HUD', blurb: 'compact stats, kill feed style' },
      { id: 'kids', label: 'Kid-friendly', blurb: 'huge icons, few words, smile feedback' },
      { id: 'terminal', label: 'Terminal', blurb: 'mono type, scanlines, command feel' },
      { id: 'luxury', label: 'Luxury gold', blurb: 'black/gold GoodGame aesthetic' },
    ],
  },
  {
    id: 'difficulty',
    label: 'Difficulty',
    options: [
      { id: 'casual', label: 'Casual', blurb: 'forgiving hitboxes, slow ramp' },
      { id: 'standard', label: 'Standard', blurb: 'fair skill curve' },
      { id: 'hard', label: 'Hard', blurb: 'tight timing, less forgiveness' },
      { id: 'escalating', label: 'Escalating', blurb: 'starts easy, becomes brutal' },
    ],
  },
  {
    id: 'feature',
    label: 'Signature feature',
    options: [
      { id: 'powerups', label: 'Power-ups', blurb: 'pickups that change kit briefly' },
      { id: 'shop', label: 'Between-round shop', blurb: 'spend score on upgrades' },
      { id: 'combo-meter', label: 'Combo meter', blurb: 'fill meter for special' },
      { id: 'stealth-vision', label: 'Vision cones', blurb: 'AI vision / light gameplay' },
      { id: 'build-place', label: 'Place objects', blurb: 'deploy units or blocks' },
      { id: 'weather', label: 'Hazards weather', blurb: 'periodic environmental events' },
      { id: 'meta-unlock', label: 'Unlocks', blurb: 'permanent unlocks across runs' },
      { id: 'local-2p', label: 'Hotseat / 2P local', blurb: 'simple 2-player alternate or split' },
      { id: 'daily-seed', label: 'Daily seed feel', blurb: 'seeded RNG, same-day challenge vibe' },
      { id: 'parry', label: 'Parry / perfect', blurb: 'timing windows for defense' },
    ],
  },
];

export type RecipePicks = Record<string, string>;

export function comboCount(): number {
  return RECIPE_DIMS.reduce((n, d) => n * d.options.length, 1);
}

export function randomRecipe(): RecipePicks {
  const picks: RecipePicks = {};
  for (const dim of RECIPE_DIMS) {
    const opt = dim.options[Math.floor(Math.random() * dim.options.length)];
    picks[dim.id] = opt.id;
  }
  return picks;
}

export function resolveRecipe(picks: RecipePicks | null | undefined): {
  picks: RecipePicks;
  lines: string[];
  fingerprint: string;
} {
  const resolved: RecipePicks = {};
  const lines: string[] = [];
  for (const dim of RECIPE_DIMS) {
    const id = picks?.[dim.id];
    const opt = dim.options.find((o) => o.id === id) || dim.options[Math.floor(Math.random() * dim.options.length)];
    resolved[dim.id] = opt.id;
    lines.push(`${dim.label}: ${opt.label} — ${opt.blurb}`);
  }
  const fingerprint = RECIPE_DIMS.map((d) => resolved[d.id]).join('/');
  return { picks: resolved, lines, fingerprint };
}

export function recipeCatalogPublic() {
  return {
    combo_count: comboCount(),
    dimensions: RECIPE_DIMS.map((d) => ({
      id: d.id,
      label: d.label,
      options: d.options.map((o) => ({ id: o.id, label: o.label, blurb: o.blurb })),
    })),
  };
}

/** Human + machine brief injected into design and code prompts. */
export function recipeToPromptBlock(picks: RecipePicks | null | undefined): string {
  const { lines, fingerprint } = resolveRecipe(picks);
  return (
    `DESIGN DNA (fingerprint ${fingerprint}):\n` +
    lines.map((l) => `- ${l}`).join('\n') +
    `\nHonor every DNA line in mechanics, visuals, and UI.`
  );
}
