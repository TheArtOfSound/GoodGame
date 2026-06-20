// Curated, evergreen, SEO-targeted articles served server-side (meta + Article
// JSON-LD injected into the shell, included in the sitemap). Kept in code so the
// content is live and indexable immediately without a DB seed. Body blocks: a
// string is a paragraph; "## ..." renders as a subheading.
export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  accent: string;
  date: string; // ISO
  keywords: string[];
  body: string[];
};

export const NEWS: NewsArticle[] = [
  {
    slug: 'what-is-goodgame-center',
    title: 'What Is GoodGame.center? Instant Browser Games, No Downloads',
    excerpt: 'GoodGame.center is a free, browser-first platform to play indie games instantly, publish your own HTML5 builds, and build a following — no downloads, no wallet, no installs.',
    category: 'guide',
    accent: '#66c0f4',
    date: '2026-06-01T00:00:00Z',
    keywords: ['browser games', 'free online games', 'html5 games', 'indie games', 'play games no download'],
    body: [
      'GoodGame.center is a free, browser-first platform for playing and publishing indie games. Every game runs instantly in your browser — there is nothing to download, no launcher to install, and no account required just to play.',
      '## Play instantly',
      'Open a game page and press play. Games run in a sandboxed browser tab, so you can jump between dozens of titles in seconds. It is the fastest way to discover small, weird, and wonderful games from independent creators.',
      '## Publish your own game',
      'Creators can upload a zipped HTML5/WebGL/Godot/Unity web build and get a live, shareable game page in minutes. GoodGame automatically checks the build for common problems and hosts it on a fast global edge network.',
      '## Make a game from a prompt',
      'No build yet? GoodGame Forge turns a text prompt into a real, playable browser game you can keep refining, test, and publish when it is ready. It is the simplest way to go from idea to playable.',
      '## Free and creator-first',
      'There is no wallet, no token, and no paywall to play. GoodGame is supported by optional donations so the focus stays on great games and the creators who make them.',
    ],
  },
  {
    slug: 'best-free-browser-games-2026',
    title: 'The Best Free Browser Games to Play in 2026 (No Download)',
    excerpt: 'A guide to the best free browser games you can play instantly in 2026 — arcade, puzzle, shooter, and experimental indie titles that run in any browser with no install.',
    category: 'guide',
    accent: '#a1cd44',
    date: '2026-06-05T00:00:00Z',
    keywords: ['best browser games', 'free browser games 2026', 'games to play in browser', 'no download games'],
    body: [
      'The best browser games share one thing: you can play them in seconds. No store page, no multi-gigabyte download, no patch — just click and play. In 2026 the browser is a genuinely great place to game, and indie creators are leading the way.',
      '## What makes a great browser game',
      'Great browser games load fast, work on both desktop and mobile, and are instantly understandable. They respect your time: a clear goal, tight controls, and a reason to come back for one more run.',
      '## How to find them',
      'Browse the GoodGame catalog by what you are in the mood for — arcade, puzzle, shooter, or experimental — and press play on anything that catches your eye. Follow creators whose games you enjoy so new releases show up in your feed.',
      '## Play, then create',
      'The best part of browser gaming is how short the gap is between playing and making. If a game inspires you, you can publish your own in minutes — or generate one from a prompt with GoodGame Forge.',
    ],
  },
  {
    slug: 'make-a-browser-game-with-ai',
    title: 'How to Make a Browser Game with AI (No Code Required)',
    excerpt: 'Make a playable browser game from a text prompt with GoodGame Forge — generate the game, refine it with more prompts, test it in a real browser, and publish when ready. No coding needed.',
    category: 'guide',
    accent: '#b06bff',
    date: '2026-06-10T00:00:00Z',
    keywords: ['make a game with ai', 'ai game generator', 'create a browser game', 'no code game maker', 'text to game'],
    body: [
      'You no longer need to write code to make a browser game. With GoodGame Forge you describe the game you want, and the platform generates a real, self-contained HTML5 game you can play immediately.',
      '## Start with a prompt',
      'Describe your idea in a sentence — for example, "a neon arena shooter with waves of enemies that get faster." Forge generates a complete playable game and opens it in a workspace.',
      '## Refine it like a conversation',
      'Forge is not one-and-done. Keep refining the same game with follow-up prompts: "make enemies faster," "add a shield power-up," "use a blue palette." Each change edits the same game, and the preview updates so you can play it right away.',
      '## Test, then publish',
      'Run a built-in runtime check to confirm the game loads and renders without errors, then publish to your catalog with one click. Drafts stay private until you are happy with them.',
      '## Why browser-first matters',
      'Because the result is a standard HTML5 game, anyone can play it instantly — on a phone or a laptop, with no install. That is the fastest path from idea to an audience.',
    ],
  },
  {
    slug: 'publish-html5-game-guide',
    title: 'How to Publish Your HTML5 Game Online: A Creator’s Guide',
    excerpt: 'A step-by-step guide to publishing an HTML5, WebGL, Unity, Godot, or Phaser web build online for free on GoodGame.center — including how to avoid the most common upload problems.',
    category: 'guide',
    accent: '#f0b323',
    date: '2026-06-12T00:00:00Z',
    keywords: ['publish html5 game', 'host webgl game', 'upload unity webgl', 'godot web export', 'where to publish browser games'],
    body: [
      'You built a web game — now you want people to play it. Publishing an HTML5, WebGL, Unity, Godot, or Phaser web build online is straightforward if your build is self-contained and starts from an index.html.',
      '## Export a web build',
      'In your engine, export a web/HTML5 build. The output folder should contain an index.html at its root plus the JavaScript, WebAssembly, and asset files your game needs.',
      '## Zip and upload',
      'Zip the build folder and upload it. GoodGame unzips it, hosts the files on a global edge network, and gives you a live, shareable game page with a working Play button in minutes.',
      '## Avoid the common upload problems',
      'Most "it worked locally but breaks online" issues come from a few causes: assets loaded from an external CDN that may be blocked, a canvas that assumes a fixed size, missing files the game references, or no mobile viewport. GoodGame scans every upload for these and fixes the safe ones automatically.',
      '## Share and grow',
      'Once published, your game has a clean URL, structured data for search engines, and a spot in your creator profile. Players can review it, clip it, and follow you for what you make next.',
    ],
  },
  {
    slug: 'browser-game-not-loading-fixes',
    title: 'Browser Game Not Loading? Common HTML5 Upload Fixes',
    excerpt: 'Your HTML5 game works locally but breaks online? Here are the most common reasons a browser game fails to load after upload — blocked CDNs, fixed canvas sizes, missing files — and how to fix them.',
    category: 'guide',
    accent: '#f43f5e',
    date: '2026-06-15T00:00:00Z',
    keywords: ['html5 game not loading', 'webgl game blank screen', 'browser game wont start', 'unity webgl not loading'],
    body: [
      'A browser game that runs perfectly on your machine can fail once it is hosted. The good news: the causes are almost always the same handful of issues, and they are easy to fix.',
      '## 1. External CDN dependencies',
      'If your game loads a library or font from an external CDN, it can break when that CDN is slow, down, or blocked. Bundle your dependencies into the build so the game is fully self-contained.',
      '## 2. Fixed canvas size or 100vh',
      'A canvas hard-coded to 1920x1080, or a layout that relies on 100vh, often overflows or clips inside a hosted frame. Size the canvas to its container and handle the resize event.',
      '## 3. Missing or misreferenced files',
      'If the game references an asset that is not in the uploaded zip, or uses an absolute path, it will 404 and may fail to start. Keep paths relative and make sure every referenced file is included.',
      '## 4. No mobile viewport',
      'Without a viewport meta tag, your game will render tiny or unscaled on phones. GoodGame adds one automatically, but it is good practice to include it.',
      'GoodGame runs every upload through an automatic compatibility check that flags these issues and fixes the safe ones, so your game just works for players.',
    ],
  },
];

export const newsList = () => NEWS.map(({ body, ...meta }) => meta);
export const newsArticle = (slug: string) => NEWS.find((a) => a.slug === slug) || null;
export const newsSlugs = () => NEWS.map((a) => a.slug);
