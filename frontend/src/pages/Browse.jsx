import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import SEO from "../components/SEO";
import { Search, Upload, X } from "lucide-react";
import { EmptyState, ErrorState, GridSkeleton, PageHeader } from "../components/UIState";
import { pickFeatured, sortGames } from "../lib/games";

export default function Browse() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState(null);
  const [sort, setSort] = useState("popular");

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

  const filtered = sortGames(
    games.filter((g) => {
      if (tag && !(g.tags || []).some((t) => String(t).toLowerCase() === tag)) return false;
      if (!normalizedQuery) return true;
      return (
        g.title.toLowerCase().includes(normalizedQuery) ||
        (g.owner_username || "").toLowerCase().includes(normalizedQuery) ||
        (g.tags || []).some((t) => t.toLowerCase().includes(normalizedQuery))
      );
    }),
    sort,
  );

  const featured = !tag && !normalizedQuery && filtered.length ? pickFeatured(filtered) : null;
  const gridGames = featured ? filtered.filter((g) => g.id !== featured.id) : filtered;

  return (
    <div data-testid="browse-page" className="alley-lot">
      <SEO
        title="Free Browser Games — Play Indie Web Games on GoodGame.center"
        description="Browse free browser games from indie creators. Play arcade, puzzle, shooter, experimental, and HTML5 games instantly on GoodGame.center."
        path="/games"
      />

      <div className="alley-lot-mast">
        <div className="alley-lot-mast-inner">
          <PageHeader
            eyebrow="The lot"
            title="Every cabinet on the block"
            description="Walk the row. No download. Plug yours in if the lot is missing a machine."
            actions={
              <Link to="/create?method=upload" className="btn-primary h-11 px-5">
                <Upload className="w-4 h-4" /> Plug one in
              </Link>
            }
          />
        </div>
      </div>

      <div className="alley-lot-filters">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3 flex-wrap">
          <label className="relative flex-1 min-w-[200px] max-w-md">
            <span className="sr-only">Filter games</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" aria-hidden="true" />
            <input
              data-testid="browse-search"
              placeholder="Filter by title, creator, or tag"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input h-10 pl-10 pr-11 text-sm"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-[#71717A] hover:text-white"
                aria-label="Clear filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </label>
          {!loading && !error && (
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex border border-[#242428]" role="group" aria-label="Sort games">
                {[
                  { id: "popular", label: "Popular" },
                  { id: "new", label: "New" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSort(option.id)}
                    aria-pressed={sort === option.id}
                    data-testid={`browse-sort-${option.id}`}
                    className={`h-8 px-3 text-[11px] font-mono uppercase tracking-[0.14em] ${
                      sort === option.id
                        ? "bg-[var(--sodium)] text-black"
                        : "text-[#C9C9D1] hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="meta-text font-mono text-[11px] uppercase tracking-[0.18em]">
                {filtered.length} game{filtered.length === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </div>

        {!loading && !error && genres.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pb-3 flex flex-wrap gap-2" data-testid="genre-filters">
            <button
              type="button"
              onClick={() => setTag(null)}
              aria-pressed={tag === null}
              className={`h-8 px-3 text-xs font-semibold border transition-colors ${
                tag === null
                  ? "bg-[var(--sodium)] text-black border-[var(--sodium)]"
                  : "text-[#C9C9D1] border-[#242428] hover:border-white/40 hover:text-white"
              }`}
            >
              All
            </button>
            {genres.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => setTag(tag === g.name ? null : g.name)}
                aria-pressed={tag === g.name}
                data-testid={`genre-${g.name}`}
                className={`h-8 px-3 text-xs font-semibold border transition-colors ${
                  tag === g.name
                    ? "bg-[var(--sodium)] text-black border-[var(--sodium)]"
                    : "text-[#C9C9D1] border-[#242428] hover:border-white/40 hover:text-white"
                }`}
              >
                {g.name.charAt(0).toUpperCase() + g.name.slice(1)}
                <span className={tag === g.name ? "ml-1.5 text-black/60" : "ml-1.5 text-[#71717A]"}>{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="alley-lot-floor">
        {loading ? (
          <GridSkeleton count={12} className="catalog-grid" />
        ) : error ? (
          <ErrorState
            title="The lot lights flickered"
            body="The cabinets could not be counted. Try again."
            action={<button type="button" className="btn-secondary" onClick={load}>Retry</button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            testId="browse-empty"
            title={games.length ? "Nothing in this bay" : "The lot is empty"}
            body={
              games.length
                ? `Nothing matches ${[q.trim() && `“${q.trim()}”`, tag && `the ${tag} genre`].filter(Boolean).join(" in ")}. Try a broader walk.`
                : "Wheel in an HTML5 build and it becomes the first machine on the row."
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
          <>
            {featured && (
              <div className="mb-6">
                <div className="eyebrow mb-3">Under the sodium lamp</div>
                <GameCard game={featured} size="lg" />
              </div>
            )}
            <div className="catalog-grid">
              {gridGames.map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
