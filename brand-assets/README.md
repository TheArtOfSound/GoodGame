# GoodGame.center — Brand Art Kit

Custom black + gold **premium arcade** assets for [goodgame.center](https://goodgame.center/).

Matches `design_guidelines.json`:

| Token | Hex |
|-------|-----|
| Background | `#000000` / `#0A0A0A` |
| Gold primary | `#D4AF37` |
| Gold hover | `#E5C158` |
| Text | `#FFFFFF` / `#A1A1AA` |

---

## Folder map

```
brand-assets/
├── logo/
│   ├── gg-mark-gold.jpg     # Photoreal brushed-gold GG monogram (marketing)
│   ├── gg-mark.svg          # Production nav mark (vector)
│   ├── wordmark.svg         # GoodGame.center horizontal lockup
│   └── favicon.svg          # 32×32 tab icon
├── banners/
│   ├── hero-live.jpg        # Homepage / live hero (16:9)
│   └── profile-banner.jpg   # Creator / community cover
├── icons/                   # Gold outline set (same stroke contract)
│   ├── icon-games.jpg
│   ├── icon-clips.jpg
│   ├── icon-creators.jpg
│   ├── icon-communities.jpg
│   ├── icon-arena.jpg
│   ├── icon-upload.jpg
│   ├── icon-search.jpg
│   └── icon-news.jpg
├── buttons/
│   ├── btn-primary-normal.jpg
│   ├── btn-primary-hover.jpg
│   ├── btn-primary-pressed.jpg
│   └── btn-ghost-normal.jpg # Outline secondary
└── social/
    └── og-card-bg.jpg       # Empty OG / share card (overlay title in code)
```

---

## How to wire into the live site

### 1. Favicon + OG

Copy vectors into the web app public root (or serve from Worker routes):

```bash
cp brand-assets/logo/favicon.svg apps/web/public/favicon.svg
# or keep generating favicon from og.ts and swap the gold SVG body
```

Use `social/og-card-bg.jpg` as the base layer for Open Graph cards, then composite title/URL in `og.ts` (do **not** bake long titles into AI images).

### 2. Nav brand mark

Replace the blue `brandMark()` in `apps/web/src/keyart.ts` with the gold SVG from `logo/gg-mark.svg`, or inline:

```ts
export const brandMark = (): string =>
  /* paste contents of logo/gg-mark.svg (inline, no XML declaration) */;
```

### 3. Hero / profile banners

- `banners/hero-live.jpg` → home hero background (`opacity` ~0.35–0.55 over black)
- `banners/profile-banner.jpg` → default creator/community banner when user has none

### 4. Icons

Prefer converting the gold outline set to **SVG** or sprite for crisp 16–24px nav use. JPGs are fine for marketing decks and large tiles; for UI chrome, re-trace or export SVG.

### 5. Buttons

Raster button frames are for mockups / special CTAs. Production CSS already has:

- `.btn-accent` (play green)
- `.btn-primary` (store blue)
- `.btn-gold` / gold primary per design guidelines

If you want the metallic gold look live, use CSS gradients + border rather than button images (text stays crisp and localizable).

---

## Style contract (keep new art consistent)

1. **Palette:** black void + metallic gold only (no rainbow accents on chrome).
2. **Icons:** thin outline, same stroke, equal padding, gold `#D4AF37`, pure black tile, optional thin gold frame.
3. **No text** on icons/buttons/banners — titles go in HTML/SVG.
4. **Sharp luxury**, not bubbly SaaS; corners can be slight radius on app icon only.

---

## Next assets you may want

- App icon 512 / 1024 (iOS / Android store)
- Animated hero loop (6s subtle camera push on `hero-live`)
- Genre key-art pack (action / puzzle / racing / horror) matching existing `keyart.ts` games
- Live “NOW PLAYING” ticker strip (no text; leave room for CSS label)

Say which of those you want next and we’ll generate them in the same kit.
