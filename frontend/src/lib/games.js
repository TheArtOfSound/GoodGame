import { BACKEND_URL } from "./config";

const INSTANT_ENGINES = new Set(["goodgame-canvas", "forge", "web", "html5"]);
// Bump when replacing static /game-covers/* so cards do not keep a stale hash.
const STATIC_COVER_REV = "20260817";

export function isExternalGame(game) {
  if (!game) return false;
  return game.play_mode === "external" || String(game.engine || "").toLowerCase() === "external";
}

export function isInstantPlay(game) {
  if (!game || isExternalGame(game)) return false;
  return INSTANT_ENGINES.has(String(game.engine || "").toLowerCase());
}

export function playHref(game) {
  if (!game?.slug) return "/games";
  // External hosts block iframes — send people to the game page, not a 404 player.
  if (isExternalGame(game)) return `/games/${game.slug}`;
  return `/games/${game.slug}/play`;
}

export function coverFallbackUrl(game) {
  return game?.slug ? `${BACKEND_URL}/og/game/${game.slug}.svg` : "/brand/banners/hero-live.jpg";
}

export function coverUrl(game) {
  if (game?.cover_image) {
    const rev = String(game.cover_image).startsWith("/game-covers/")
      ? STATIC_COVER_REV
      : game.updated_at || "";
    const q = rev ? `?v=${encodeURIComponent(rev)}` : "";
    return `${BACKEND_URL}${game.cover_image}${q}`;
  }
  return coverFallbackUrl(game);
}

export function ugcUrl(game, extraQuery) {
  const entry = game?.upload_entry;
  if (!game?.id || !entry || entry === "null" || entry === "undefined") return null;
  const encoded = String(entry).split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const q = extraQuery ? `?${extraQuery}` : "";
  return `${BACKEND_URL}/api/ugc/${game.id}/${encoded}${q}`;
}

export function playIframeSrc(game) {
  if (!game || isExternalGame(game)) return null;
  if (game.embed_url) return game.embed_url;
  return ugcUrl(game);
}

export function pickFeatured(games) {
  const list = Array.isArray(games) ? games : [];
  return (
    list.find((g) => isInstantPlay(g) && g.cover_image) ||
    list.find((g) => isInstantPlay(g)) ||
    list.find((g) => !isExternalGame(g)) ||
    list[0] ||
    null
  );
}

export function sortGames(games, sort) {
  const list = [...(games || [])];
  if (sort === "new") {
    return list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }
  return list.sort((a, b) => {
    const plays = (Number(b.play_count) || 0) - (Number(a.play_count) || 0);
    if (plays) return plays;
    const rating = (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0);
    if (rating) return rating;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
}
