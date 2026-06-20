// Runtime validation via Cloudflare Browser Rendering: load an uploaded game in a
// real headless browser and report whether it renders plus any console errors.
// The static analyzer (compat.ts) can't catch crashes-on-boot; this can. Gated on
// the BROWSER binding and fully guarded so it degrades to a "not available" note.
import puppeteer from '@cloudflare/puppeteer';
import type { Env } from './lib';

export type RuntimeReport = { ok: boolean; rendered: boolean; errors: string[]; checked_at: string; note?: string };

export async function runtimeCheck(env: Env, gameUrl: string): Promise<RuntimeReport> {
  const now = new Date().toISOString();
  if (!env.BROWSER) return { ok: false, rendered: false, errors: [], checked_at: now, note: 'Runtime checks are not enabled on this deployment.' };
  let browser: any;
  const errors: string[] = [];
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    page.on('console', (msg: any) => { if (msg.type && msg.type() === 'error') errors.push(String(msg.text()).slice(0, 200)); });
    page.on('pageerror', (err: any) => { errors.push(String(err?.message || err).slice(0, 200)); });
    await page.goto(gameUrl, { waitUntil: 'load', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 4000)); // let the game boot
    // Runs inside the headless browser; access the DOM untyped (the Worker tsconfig has no DOM lib).
    const rendered = await page.evaluate(() => {
      const d: any = (globalThis as any).document;
      if (!d) return false;
      const c: any = d.querySelector('canvas');
      const canvasOk = !!c && c.width > 0 && c.height > 0;
      const text = ((d.body && d.body.innerText) || '').trim().length > 0;
      const kids = (d.body && d.body.childElementCount) || 0;
      return canvasOk || text || kids > 0;
    });
    return { ok: rendered && errors.length === 0, rendered, errors: errors.slice(0, 10), checked_at: now };
  } catch (e: any) {
    return { ok: false, rendered: false, errors: [String(e?.message || e).slice(0, 200)], checked_at: now, note: 'Runtime check could not complete.' };
  } finally {
    try { if (browser) await browser.close(); } catch { /* ignore */ }
  }
}
