#!/usr/bin/env python3
"""Turn sparse 16:9 gameplay captures into readable catalog capsules.

Crops to the action, places it on a tinted plate, and stamps an exact title.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "frontend" / "public" / "game-covers"
OUT = SRC

TITLES = {
    "perfect-stack-timing-game": ("Perfect Stack", "Timing · GoodGame Labs"),
    "nightshift-lane-racer": ("Nightshift Lane", "Racer · GoodGame Labs"),
    "orbit-catch-reflex-game": ("Orbit Catch", "Reflex · GoodGame Labs"),
    "prism-breaker-arcade": ("Prism Breaker", "Arcade · GoodGame Labs"),
    "rooftop-rush-runner": ("Rooftop Rush", "Runner · GoodGame Labs"),
    "signal-snake-grid-game": ("Signal Snake", "Grid · GoodGame Labs"),
    "sum-forge-number-puzzle": ("Sum Forge", "Puzzle · GoodGame Labs"),
    "voidline-survivor": ("Voidline Survivor", "Arena · GoodGame Labs"),
    "blackout-grid-logic-puzzle": ("Blackout Grid", "Logic · GoodGame Labs"),
}

W, H = 1280, 720
GOLD = (212, 175, 55)
WHITE = (255, 255, 255)
MUTED = (201, 201, 209)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def content_box(im: Image.Image) -> tuple[int, int, int, int]:
    rgb = im.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    hit = 0
    step = max(1, min(w, h) // 360)
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b = px[x, y]
            luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
            chroma = max(r, g, b) - min(r, g, b)
            if luma > 32 or chroma > 22:
                hit += 1
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y
    if hit < 40:
        return (0, 0, w, h)
    pad_x = max(24, int((max_x - min_x) * 0.18))
    pad_y = max(24, int((max_y - min_y) * 0.18))
    x0 = max(0, min_x - pad_x)
    y0 = max(0, min_y - pad_y)
    x1 = min(w, max_x + pad_x)
    y1 = min(h, max_y + pad_y)
    # Keep a capsule-shaped crop so thin HUD/board slices do not get stretched.
    min_w, min_h = int(w * 0.55), int(h * 0.52)
    if x1 - x0 < min_w:
        cx = (x0 + x1) // 2
        x0 = max(0, cx - min_w // 2)
        x1 = min(w, x0 + min_w)
        x0 = max(0, x1 - min_w)
    if y1 - y0 < min_h:
        cy = (y0 + y1) // 2
        y0 = max(0, cy - min_h // 2)
        y1 = min(h, y0 + min_h)
        y0 = max(0, y1 - min_h)
    return (x0, y0, x1, y1)


def accent_of(im: Image.Image) -> tuple[int, int, int]:
    small = im.convert("RGB").resize((48, 27), Image.Resampling.BOX)
    pixels = list(small.getdata())
    colorful = [p for p in pixels if max(p) - min(p) > 18 and sum(p) / 3 > 28]
    sample = colorful or pixels
    sample.sort(key=lambda p: (max(p) - min(p), sum(p)), reverse=True)
    r, g, b = sample[0]
    # keep it on the gold/teal side of saturated, never near-black
    return (max(40, r), max(40, g), max(40, b))


def gradient(size: tuple[int, int], accent: tuple[int, int, int]) -> Image.Image:
    w, h = size
    base = Image.new("RGB", size, (8, 8, 10))
    overlay = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(accent[0] * (0.18 + 0.10 * (1 - t)))
        g = int(accent[1] * (0.16 + 0.08 * (1 - t)))
        b = int(accent[2] * (0.14 + 0.06 * (1 - t)))
        draw.line([(0, y), (w, y)], fill=(min(255, r), min(255, g), min(255, b)))
    return Image.blend(base, overlay, 0.85)


def compose(src: Path, title: str, kicker: str, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    box = content_box(im)
    crop = im.crop(box)
    # Prefer filling the plate; letterbox only if the crop is extremely thin.
    plate = ImageOps.fit(crop, (W, H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.55))
    accent = accent_of(plate)
    bg = gradient((W, H), accent)
    # Soften the source so HUD text does not fight the stamped title, then lift it.
    play = ImageEnhance.Color(plate).enhance(1.18)
    play = ImageEnhance.Contrast(play).enhance(1.12)
    play = ImageEnhance.Brightness(play).enhance(1.04)
    composed = Image.blend(bg, play, 0.88)

    # Bottom readability plate
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for y in range(H - 250, H):
        a = int(220 * ((y - (H - 250)) / 250) ** 1.15)
        sd.line([(0, y), (W, y)], fill=(6, 6, 8, a))
    composed = Image.alpha_composite(composed.convert("RGBA"), shade)

    d = ImageDraw.Draw(composed)
    # Gold corners
    for x0, y0, dx, dy in ((28, 28, 1, 1), (W - 28, 28, -1, 1), (28, H - 28, 1, -1), (W - 28, H - 28, -1, -1)):
        d.line([(x0, y0), (x0 + 28 * dx, y0)], fill=GOLD + (255,), width=3)
        d.line([(x0, y0), (x0, y0 + 28 * dy)], fill=GOLD + (255,), width=3)

    title_font = font(58, bold=True)
    kicker_font = font(20, bold=True)
    d.text((48, H - 148), kicker.upper(), font=kicker_font, fill=GOLD + (255,))
    d.text((46, H - 118), title, font=title_font, fill=WHITE + (255,))
    composed = composed.convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    composed.save(dest, "WEBP", quality=86, method=6)
    print(f"wrote {dest.name} {dest.stat().st_size} bytes from crop {box}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="*", help="optional slug.webp files")
    args = parser.parse_args()
    if args.inputs:
        files = [Path(p) for p in args.inputs]
    else:
        files = [SRC / f"{slug}.webp" for slug in TITLES]
    for path in files:
        slug = path.stem
        title, kicker = TITLES.get(slug, (slug.replace("-", " ").title(), "Browser game"))
        if not path.exists():
            print(f"skip missing {path}")
            continue
        compose(path, title, kicker, OUT / f"{slug}.webp")


if __name__ == "__main__":
    main()
