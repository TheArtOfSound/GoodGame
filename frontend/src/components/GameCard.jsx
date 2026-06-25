import { Link } from "react-router-dom";
import { BACKEND_URL } from "../lib/config";

export default function GameCard({ game }) {
  const cover = game.cover_image
    ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at || ""}`
    : `${BACKEND_URL}/og/game/${game.slug}.svg`;
  return (
    <Link
      to={`/games/${game.slug}`}
      data-testid={`game-card-${game.slug}`}
      className="group block bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#D4AF37]/60 transition-all duration-150 ease-out"
    >
      <div className="aspect-video bg-black overflow-hidden relative">
        <img
          src={cover}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
          loading="lazy"
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/0 group-hover:ring-[#D4AF37]/30 transition-all" />
      </div>
      <div className="p-3">
        <div className="text-white font-bold truncate" title={game.title}>
          {game.title}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.18em] truncate">
            @{game.owner_username || "unknown"}
          </div>
          {game.engine && (
            <div className="text-[#D4AF37] font-mono text-[10px] uppercase">
              {game.engine}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
