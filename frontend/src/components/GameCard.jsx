import { Link } from "react-router-dom";
import { Eye, Play, Star } from "lucide-react";
import { BACKEND_URL } from "../lib/config";

export default function GameCard({ game }) {
  const cover = game.cover_image
    ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at || ""}`
    : `${BACKEND_URL}/og/game/${game.slug}.svg`;
  return (
    <Link
      to={`/games/${game.slug}`}
      data-testid={`game-card-${game.slug}`}
      className="group block bg-[#080808] border border-[#1A1A1A] hover:border-[#D4AF37]/60 transition-colors duration-150"
    >
      <div className="aspect-video bg-black overflow-hidden relative">
        <img
          src={cover}
          alt={`${game.title} gameplay`}
          className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-200"
          loading="lazy"
          onError={(event) => {
            const fallback = `${BACKEND_URL}/og/game/${game.slug}.svg`;
            if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
          }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
        <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-11 h-11 bg-[#D4AF37] text-black grid place-items-center shadow-xl">
            <Play className="w-5 h-5 fill-current" aria-hidden="true" />
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="text-white font-bold truncate group-hover:text-[#F1D77A] transition-colors" title={game.title}>
          {game.title}
        </div>
        <div className="flex items-center justify-between gap-3 mt-1">
          <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.18em] truncate">
            @{game.owner_username || "unknown"}
          </div>
          {game.engine && (
            <div className="text-[#D4AF37] font-mono text-[10px] uppercase">
              {game.engine}
            </div>
          )}
        </div>
        {(Number(game.play_count) > 0 || Number(game.rating_count) > 0) && (
          <div className="flex items-center gap-3 mt-2 text-[#71717A] font-mono text-[10px] tabular-nums">
            {Number(game.play_count) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3 h-3" aria-hidden="true" />
                {Number(game.play_count).toLocaleString()}
              </span>
            )}
            {Number(game.rating_count) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-[#D4AF37]" aria-hidden="true" />
                {Number(game.rating_avg || 0).toFixed(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
