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
  const [tag, setTag] = useState(null);

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
  // Genre chips come from the catalog's own tags, so they always reflect what's
  // actually playable rather than a hardcoded list that can go stale. Creators
  // also use tags for SEO ("free browser game", "html5"), which describe every
  // game here and so make useless filters — drop those, plus anything that
  // matches more than half the catalog and therefore doesn't narrow anything.
  const GENERIC_TAGS = new Set([
    "free browser game", "browser game", "browser games", "free game", "free games",
    "free", "online", "online game", "html5", "html5 game", "web", "webgl", "game",
    "games", "2d", "3d", "indie",
  ]);
  const genres = (() => {
    const counts = new Map();
    for (const g of games) {
      for (const t of g.tags || []) {
        const key = String(t).trim().toLowerCase();
        if (key && !GENERIC_TAGS.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const ceiling = Math.max(2, Math.floor(games.length * 0.5));
    return [...counts.entries()]
      .filter(([, count]) => count <= ceiling)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  })();

  const filtered = games.filter((g) => {
    if (tag && !(g.tags || []).some((t) => String(t).toLowerCase() === tag)) return false;
    if (!normalizedQuery) return true;
    return (
      g.title.toLowerCase().includes(normalizedQuery) ||
      (g.owner_username || "").toLowerCase().includes(normalizedQuery) ||
      (g.tags || []).some((t) => t.toLowerCase().includes(normalizedQuery))
    );
  });

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
          <div className="meta-text font-mono text-[11px] uppercase tracking-[0.18em]">
            {filtered.length} game{filtered.length === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* Browsing by genre is how players actually shop for a game to play. */}
      {!loading && !error && genres.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" data-testid="genre-filters">
          <button
            type="button"
            onClick={() => setTag(null)}
            aria-pressed={tag === null}
            className={`h-9 px-3.5 text-xs font-semibold border transition-colors ${
              tag === null
                ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                : "text-[#C9C9D1] border-[#242428] hover:border-white/40 hover:text-white"
            }`}
          >
            All games
          </button>
          {genres.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={() => setTag(tag === g.name ? null : g.name)}
              aria-pressed={tag === g.name}
              data-testid={`genre-${g.name}`}
              className={`h-9 px-3.5 text-xs font-semibold border transition-colors ${
                tag === g.name
                  ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                  : "text-[#C9C9D1] border-[#242428] hover:border-white/40 hover:text-white"
              }`}
            >
              {g.name.charAt(0).toUpperCase() + g.name.slice(1)}
              <span className={tag === g.name ? "ml-1.5 text-black/60" : "ml-1.5 text-[#71717A]"}>{g.count}</span>
            </button>
          ))}
        </div>
      )}
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
          body={
            games.length
              ? `Nothing matches ${[q.trim() && `“${q.trim()}”`, tag && `the ${tag} genre`].filter(Boolean).join(" in ")}. Try a broader search.`
              : "The public catalog is ready for its first creator release."
          }
          action={
            games.length ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setQ("");
                  setTag(null);
                }}
              >
                Clear filters
              </button>
            ) : null
          }
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
