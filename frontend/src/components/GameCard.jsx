import { Link } from "react-router-dom";
import { BACKEND_URL } from "../lib/config";

const FALLBACKS = [
  "https://images.unsplash.com/photo-1759171053096-e7dbe7c36eb6?crop=entropy&cs=srgb&fm=jpg&w=600&q=70",
  "https://images.unsplash.com/photo-1631896928983-2c94ea6f97e8?crop=entropy&cs=srgb&fm=jpg&w=600&q=70",
  "https://images.unsplash.com/photo-1773053965532-7ca7adcd6b49?crop=entropy&cs=srgb&fm=jpg&w=600&q=70",
];

function fallbackArt(id) {
  let h = 0;
  for (let i = 0; i < (id || "x").length; i++) h = (h * 31 + id.charCodeAt(i)) % 999;
  return FALLBACKS[h % FALLBACKS.length];
}

export default function GameCard({ game }) {
  const cover = game.cover_image
    ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at || ""}`
    : fallbackArt(game.id || game.slug);
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
