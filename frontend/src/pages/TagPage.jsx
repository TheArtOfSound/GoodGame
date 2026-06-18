import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import SEO from "../components/SEO";

export default function TagPage() {
  const { tag } = useParams();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getJSON(`/tags/${encodeURIComponent(tag)}`)
      .then((d) => setGames(d.games || []))
      .finally(() => setLoading(false));
  }, [tag]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="tag-page">
      <SEO
        title={`#${tag} games`}
        description={`Browse browser games tagged #${tag} on GoodGame.center.`}
        path={`/tags/${tag}`}
      />
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
        Tag
      </div>
      <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-white">
        #{tag}
      </h1>
      <Link to="/games" className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em] hover:underline mt-2 inline-block">
        Browse all games &rarr;
      </Link>

      {loading ? (
        <div className="text-[#52525B] mt-8">Loading...</div>
      ) : games.length === 0 ? (
        <div className="text-[#A1A1AA] border border-dashed border-[#1A1A1A] p-8 mt-8 text-center" data-testid="tag-empty">
          No games tagged #{tag} yet.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
