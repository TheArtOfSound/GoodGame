import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import GameCard from "../components/GameCard";
import { Search as SearchIcon, X } from "lucide-react";
import { EmptyState, ErrorState, GridSkeleton, PageHeader } from "../components/UIState";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [input, setInput] = useState(q);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setInput(q);
    if (!q.trim()) {
      setData(null);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    getJSON(`/search?q=${encodeURIComponent(q)}`)
      .then(setData)
      .catch(() => {
        setData(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [q]);

  const runSearch = () => {
    setParams(input.trim() ? { q: input.trim() } : {});
  };
  const submit = (e) => {
    e.preventDefault();
    runSearch();
  };

  const games = data?.games || [];
  const creators = data?.creators || [];
  const communities = data?.communities || [];
  const nothing = q && !loading && !games.length && !creators.length && !communities.length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="search-page">
      <SEO title="Search" path="/search" noindex />
      <PageHeader eyebrow="Discover" title="Search" description="Find games, creators, and communities across GoodGame." />
      <form onSubmit={submit} className="mt-4 flex gap-2 max-w-xl">
        <label className="relative flex-1">
          <span className="sr-only">Search GoodGame</span>
          <SearchIcon className="absolute left-3 top-4 w-4 h-4 text-[#52525B]" />
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Games, creators, communities"
            className="input pl-10 pr-11"
            data-testid="search-input"
          />
          {input && (
            <button type="button" onClick={() => setInput("")} className="absolute right-1 top-1 w-10 h-10 grid place-items-center text-[#71717A] hover:text-white" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
        <button className="btn-primary h-12 px-5">
          <SearchIcon className="w-4 h-4" /> Search
        </button>
      </form>

      {!q && !loading && (
        <EmptyState
          className="mt-8"
          icon={SearchIcon}
          title="Search the network"
          body="Try a game title, creator username, genre, or community."
        />
      )}

      {loading && <div className="mt-8"><GridSkeleton count={6} /></div>}
      {error && (
        <ErrorState
          className="mt-8"
          title="Search is unavailable"
          body="The query could not be completed. Submit it again in a moment."
          action={<button type="button" className="btn-secondary" onClick={runSearch}>Retry</button>}
        />
      )}

      {q && !loading && !error && (
        <div className="mt-8 space-y-10">
          <Section title={`Games (${games.length})`}>
            {games.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {games.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            ) : (
              <Empty>No games match &ldquo;{q}&rdquo;.</Empty>
            )}
          </Section>

          {creators.length > 0 && (
            <Section title={`Creators (${creators.length})`}>
              <div className="flex flex-wrap gap-3">
                {creators.map((c) => (
                  <Link
                    key={c.id}
                    to={`/creators/${c.username}`}
                    className="border border-[#1A1A1A] hover:border-[#D4AF37] text-white text-sm px-4 py-2"
                  >
                    @{c.username}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {communities.length > 0 && (
            <Section title={`Communities (${communities.length})`}>
              <div className="flex flex-wrap gap-3">
                {communities.map((c) => (
                  <Link
                    key={c.id}
                    to={`/communities/${c.slug}`}
                    className="border border-[#1A1A1A] hover:border-[#D4AF37] text-white text-sm px-4 py-2"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {nothing && (
            <EmptyState
              icon={SearchIcon}
              title={`No results for “${q}”`}
              body="Try fewer words, a username, or a broader genre."
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-[#1A1A1A] pb-2">
        {title}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <div className="text-[#A1A1AA] text-sm">{children}</div>;
}
