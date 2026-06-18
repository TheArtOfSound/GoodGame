import { useEffect, useState } from "react";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import SEO from "../components/SEO";

export default function Browse() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    getJSON("/games?limit=120")
      .then((d) => setGames(d.games || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = q
    ? games.filter(
        (g) =>
          g.title.toLowerCase().includes(q.toLowerCase()) ||
          (g.tags || []).some((t) => t.includes(q.toLowerCase()))
      )
    : games;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="browse-page">
      <SEO title="Browse all games" path="/games" />
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
        Browse
      </div>
      <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-white">
        All games
      </h1>
      <div className="mt-6 mb-8">
        <input
          data-testid="browse-search"
          placeholder="Search by title or tag..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full md:w-96 h-12 bg-[#0A0A0A] border border-[#1A1A1A] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none px-4 text-white font-mono text-sm"
        />
      </div>
      {loading ? (
        <div className="text-[#52525B]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-[#A1A1AA] border border-dashed border-[#1A1A1A] p-8 text-center" data-testid="browse-empty">
          No games match your search yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {filtered.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
