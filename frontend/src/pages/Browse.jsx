import { useEffect, useState } from "react";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import SEO from "../components/SEO";
import { Search, X } from "lucide-react";
import { EmptyState, ErrorState, GridSkeleton, PageHeader } from "../components/UIState";

export default function Browse() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");

  const load = () => {
    setLoading(true);
    setError(false);
    getJSON("/games?limit=120")
      .then((d) => setGames(d.games || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedQuery = q.trim().toLowerCase();
  const filtered = normalizedQuery
    ? games.filter(
        (g) =>
          g.title.toLowerCase().includes(normalizedQuery) ||
          (g.owner_username || "").toLowerCase().includes(normalizedQuery) ||
          (g.tags || []).some((t) => t.toLowerCase().includes(normalizedQuery))
      )
    : games;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="browse-page">
      <SEO title="Browse all games" path="/games" />
      <PageHeader
        eyebrow="Catalog"
        title="All games"
        description="Original and creator-published browser games, ready to play without a download."
      />
      <div className="mt-6 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <label className="relative w-full md:w-96">
          <span className="sr-only">Filter games</span>
          <Search className="absolute left-3 top-4 w-4 h-4 text-[#52525B]" aria-hidden="true" />
        <input
          data-testid="browse-search"
          placeholder="Filter by title, creator, or tag"
          value={q}
          onChange={(e) => setQ(e.target.value)}
            className="input pl-10 pr-11"
        />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-1 top-1 w-10 h-10 grid place-items-center text-[#71717A] hover:text-white" aria-label="Clear filter">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
        {!loading && !error && (
          <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.18em]">
            {filtered.length} game{filtered.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
      {loading ? (
        <GridSkeleton count={12} />
      ) : error ? (
        <ErrorState
          title="Games could not load"
          body="Try the catalog request again."
          action={<button type="button" className="btn-secondary" onClick={load}>Retry</button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          testId="browse-empty"
          title={games.length ? "No matching games" : "No games published yet"}
          body={games.length ? `Nothing matches “${q.trim()}”. Try a shorter title, creator, or tag.` : "The public catalog is ready for its first creator release."}
          action={games.length ? <button type="button" className="btn-secondary" onClick={() => setQ("")}>Clear filter</button> : null}
        />
      ) : (
        <div className="game-grid">
          {filtered.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
