import { Link } from "react-router-dom";
import { Play, Star, Zap } from "lucide-react";
import { BACKEND_URL } from "../lib/config";

// Players don't know or care what "goodgame-canvas" is. Translate the engine
// into the thing they actually want to know: can I click and play right now?
const INSTANT_ENGINES = new Set(["goodgame-canvas", "forge", "web", "html5"]);

const primaryTag = (game) => {
  const tags = Array.isArray(game.tags) ? game.tags : [];
  const tag = tags.find(Boolean);
  return tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : null;
};

export default function GameCard({ game }) {
  const cover = game.cover_image
    ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at || ""}`
    : `${BACKEND_URL}/og/game/${game.slug}.svg`;
  const genre = primaryTag(game);
  const instant = INSTANT_ENGINES.has(String(game.engine || "").toLowerCase());
  const plays = Number(game.play_count) || 0;
  const rating = Number(game.rating_count) > 0 ? Number(game.rating_avg || 0) : null;

  return (
    <Link
      to={`/games/${game.slug}`}
      data-testid={`game-card-${game.slug}`}
      className="group block surface card-lift"
    >
      <div className="aspect-video bg-black overflow-hidden relative">
        <img
          src={cover}
          alt={`${game.title} gameplay`}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 ease-out"
          loading="lazy"
          onError={(event) => {
            const fallback = `${BACKEND_URL}/og/game/${game.slug}.svg`;
            if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
          }}
        />
        {/* Bottom scrim keeps the overlaid badges legible on bright cover art. */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />

        {instant && (
          <span className="absolute top-2 left-2 chip !text-[#F1D77A] !bg-black/70 !border-[#D4AF37]/40">
            <Zap className="w-2.5 h-2.5 fill-current" aria-hidden="true" /> Instant
          </span>
        )}
        {genre && (
          <span className="absolute bottom-2 left-2 chip !bg-black/60">{genre}</span>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <span className="w-12 h-12 bg-[#D4AF37] text-black grid place-items-center shadow-[0_8px_24px_-6px_rgba(0,0,0,.9)]">
            <Play className="w-5 h-5 fill-current" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="p-3">
        <div
          className="text-white font-semibold truncate group-hover:text-[#F1D77A] transition-colors"
          title={game.title}
        >
          {game.title}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="meta-text text-xs truncate">
            {game.owner_username ? `@${game.owner_username}` : "Unknown creator"}
          </span>
          <span className="flex items-center gap-2.5 shrink-0 tabular-nums meta-text text-xs">
            {rating !== null && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-[#D4AF37] fill-current" aria-hidden="true" />
                {rating.toFixed(1)}
              </span>
            )}
            {plays > 0 && (
              <span>
                {plays.toLocaleString()} {plays === 1 ? "play" : "plays"}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
