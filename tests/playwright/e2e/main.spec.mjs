// @ts-check
import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import AdmZip from "adm-zip";
import { PNG } from "pngjs";

/**
 * End-to-end: signup → upload zip → upload thumbnail → upload clip → follow → moderate.
 *
 * Run with:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *   npx playwright test --config tests/playwright/playwright.config.mjs
 */

const SLUG_SAFE = (s) => s.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18);
const uid = () => SLUG_SAFE("e2e_" + Math.random().toString(36).slice(2, 9));

// --- Fixture helpers ----------------------------------------------------------
function buildGameZip(outPath) {
  const zip = new AdmZip();
  zip.addFile(
    "index.html",
    Buffer.from(
      `<!doctype html><html><head><meta charset="utf-8"><title>E2E Game</title></head>
       <body style="background:#000;color:#fff;font-family:monospace;display:grid;place-items:center;height:100vh">
       <h1>E2E TEST GAME</h1></body></html>`,
    ),
  );
  zip.writeZip(outPath);
}

function buildPng(outPath, w = 320, h = 180, color = [212, 175, 55, 255]) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) << 2;
      png.data[i] = color[0];
      png.data[i + 1] = color[1];
      png.data[i + 2] = color[2];
      png.data[i + 3] = color[3];
    }
  }
  writeFileSync(outPath, PNG.sync.write(png));
}

// Minimal valid mp4 (a ~7KB still frame). Generated with ffmpeg and embedded here as base64.
// If you'd rather generate fresh: ffmpeg -f lavfi -i color=c=black:s=64x36:d=1 -movflags +faststart out.mp4
const TINY_MP4_BASE64 = readFileSync(
  resolve(import.meta.dirname || ".", "fixtures.b64"),
  "utf8",
).trim();

function buildMp4(outPath) {
  writeFileSync(outPath, Buffer.from(TINY_MP4_BASE64, "base64"));
}

// Common signup helper
async function signup(page, baseURL) {
  const username = uid();
  await page.goto(baseURL + "/onboarding");
  await page.getByTestId("onb-username").fill(username);
  await page.getByTestId("onb-display-name").fill(username);
  await page.getByTestId("onb-password").fill("test-password-123");
  await page.getByTestId("onb-pin").fill("1234");
  await page.getByTestId("onb-submit").click();
  await page.waitForURL(new RegExp(`/creators/${username}`), { timeout: 15_000 });
  return username;
}

// --- The test -----------------------------------------------------------------
test("e2e: signup → upload zip → thumbnail → clip → follow → community moderate", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(180_000);

  const work = join(tmpdir(), `gg-e2e-${Date.now()}`);
  if (!existsSync(work)) mkdirSync(work, { recursive: true });
  const zipPath = join(work, "game.zip");
  const thumbPath = join(work, "thumb.png");
  const clipPath = join(work, "clip.mp4");
  buildGameZip(zipPath);
  buildPng(thumbPath);
  buildMp4(clipPath);

  // 1. Sign up creator A
  const userA = await signup(page, baseURL);
  await expect(page.getByTestId("creator-profile")).toBeVisible();

  // 2. Upload a game
  await page.goto(baseURL + "/create");
  const title = `E2E ${uid()}`;
  await page.getByTestId("create-title").fill(title);
  await page.getByTestId("create-pitch").fill("an e2e game pitch");
  await page.getByTestId("create-tags").fill("e2e, test");
  await page.getByTestId("create-build").setInputFiles(zipPath);
  await page.getByTestId("create-submit").click();
  // Lands on /console/<slug>
  await page.waitForURL(/\/console\/.+/, { timeout: 20_000 });
  const slug = new URL(page.url()).pathname.split("/").pop();

  // 3. Upload thumbnail
  await page.getByTestId("thumb-input").setInputFiles(thumbPath);
  await page.getByTestId("thumb-submit").click();
  await expect(page.locator("text=Thumbnail updated")).toBeVisible({ timeout: 15_000 });

  // Game now visible publicly at /games/<slug>
  await page.goto(`${baseURL}/games/${slug}`);
  await expect(page.getByTestId("game-detail-page")).toBeVisible();
  await expect(page.getByTestId("play-game-button")).toBeVisible();

  // 4. Upload a clip
  await page.goto(baseURL + "/clips");
  await page.getByTestId("clips-upload-toggle").click();
  await page.getByTestId("clip-caption").fill("an e2e clip");
  await page.getByTestId("clip-tags").fill("e2e");
  await page.getByTestId("clip-file").setInputFiles(clipPath);
  await page.getByTestId("clip-submit").click();
  // Form clears + new clip appears in list
  await expect(page.locator('[data-testid^="clip-card-"]').first()).toBeVisible({
    timeout: 15_000,
  });

  // 5. Sign up creator B (new context = new session), follow A
  const ctxB = await context.browser().newContext();
  const pageB = await ctxB.newPage();
  const userB = await signup(pageB, baseURL);
  await pageB.goto(`${baseURL}/creators/${userA}`);
  await expect(pageB.getByTestId("follow-button")).toBeVisible();
  await pageB.getByTestId("follow-button").click();
  await expect(pageB.getByTestId("follow-button")).toHaveText(/following/i, {
    timeout: 8_000,
  });

  // Back on creator A's profile, follower_count should be 1 (reload)
  await pageB.reload();
  await expect(pageB.locator("text=/1 followers/i")).toBeVisible();

  // 6. Create a community as A and moderate as A
  await page.goto(baseURL + "/communities");
  const cname = `E2E Comm ${uid()}`;
  await page.getByTestId("community-name").fill(cname);
  await page.getByTestId("community-desc").fill("for e2e");
  await page.getByTestId("community-create").click();

  // The frontend navigates directly to /communities/<slug> on success.
  await page.waitForURL(/\/communities\/[^/]+$/, { timeout: 15_000 });
  await expect(page.getByTestId("community-detail")).toBeVisible();
  const comSlug = new URL(page.url()).pathname.split("/").pop();
  await page.getByTestId("community-post-body").fill("hello from e2e");
  await page.getByTestId("community-post-submit").click();
  await expect(page.locator('[data-testid^="community-post-"]').first()).toBeVisible();

  // B joins
  await pageB.goto(`${baseURL}/communities/${comSlug}`);
  await pageB.getByTestId("community-join").click();
  await expect(pageB.getByTestId("community-post-body")).toBeVisible();

  // A moderates: visit moderate page, ban B, then unban
  await page.goto(`${baseURL}/communities/${comSlug}/moderate`);
  await expect(page.getByTestId("community-moderation")).toBeVisible();
  await expect(page.getByTestId(`member-row-${userB}`)).toBeVisible();
  await page.getByTestId(`ban-${userB}`).click();
  await expect(page.getByTestId(`unban-${userB}`)).toBeVisible({ timeout: 8_000 });
  await page.getByTestId(`unban-${userB}`).click();
  await expect(page.getByTestId(`ban-${userB}`)).toBeVisible({ timeout: 8_000 });

  await ctxB.close();
});
