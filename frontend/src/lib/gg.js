export const GG_MINT = "5QNJ5DDnTPYW1gfNoxeXBGy85Ws5k5vH5Ass1KWYmoon";
export const GG_EXPLORER = `https://solscan.io/token/${GG_MINT}`;
export const GG_CHART = `https://dexscreener.com/solana/${GG_MINT}`;
export const GG_TITLE = "GoodGame — Free Browser Games & the GG Solana Arcade";
export const GG_DESCRIPTION = "Play free browser games, take the daily arcade challenge, and discover GOODGAME (GG) on Solana. No download or wallet required to play.";
export const dayKey = () => new Date().toISOString().slice(0, 10);
export function dailyPick(games) {
  const pool = games.filter(g => !g.price_amount && g.play_mode !== "external").sort((a,b) => a.slug.localeCompare(b.slug));
  return pool.length ? pool[Math.floor(Date.now() / 86400000) % pool.length] : null;
}
export function readPassport() {
  try {
    const p = JSON.parse(localStorage.getItem("gg-passport-v1") || "{}");
    return { xp: Math.max(0, Number(p.xp) || 0), runs: Math.max(0, Number(p.runs) || 0), best: Math.max(0, Number(p.best) || 0), days: Array.isArray(p.days) ? p.days.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-365) : [] };
  } catch { return { xp: 0, runs: 0, best: 0, days: [] }; }
}
export function recordRun(score) {
  const p = readPassport();
  const next = { xp: p.xp + 10 + Math.floor(score / 10), runs: p.runs + 1, best: Math.max(p.best, score), days: [...new Set([...p.days, dayKey()])].slice(-365) };
  try { localStorage.setItem("gg-passport-v1", JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event("gg-passport"));
  return next;
}
export function streak(days) {
  let date = new Date(`${dayKey()}T00:00:00Z`), n = 0;
  if (!days.includes(dayKey())) date.setUTCDate(date.getUTCDate() - 1);
  while (days.includes(date.toISOString().slice(0,10))) { n++; date.setUTCDate(date.getUTCDate() - 1); }
  return n;
}
export async function shareChallenge(score) {
  const url = `https://goodgame.center/arena?beat=${score}`;
  const text = `I scored ${score} in GG Moon Dash. Your turn. Free browser arcade on GoodGame 🎮`;
  if (navigator.share) { await navigator.share({ title: "Beat my GG score", text, url }); return "Challenge shared"; }
  await navigator.clipboard.writeText(`${text}\n${url}`);
  return "Challenge copied";
}

