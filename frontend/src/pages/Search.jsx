import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import GameCard from "../components/GameCard";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [input, setInput] = useState(q);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(q);
    if (!q.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    getJSON(`/search?q=${encodeURIComponent(q)}`)
      .then(setData)
      .catch(() => setData({ games: [], creators: [], communities: [] }))
      .finally(() => setLoading(false));
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  };

  const games = data?.games || [];
  const creators = data?.creators || [];
  const communities = data?.communities || [];
  const nothing = q && !loading && !games.length && !creators.length && !communities.length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="search-page">
      <SEO title="Search" path="/search" noindex />
      <h1 className="text-3xl font-bold uppercase text-white">Search</h1>
      <form onSubmit={submit} className="mt-4 flex gap-2 max-w-xl">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search games, creators, communities"
          className="input flex-1"
          data-testid="search-input"
        />
        <button className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11">
          Search
        </button>
      </form>

      {loading && <div className="text-[#52525B] mt-8 font-mono text-sm">Searching&hellip;</div>}

      {q && !loading && (
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

          {nothing && <Empty>Nothing found for &ldquo;{q}&rdquo;.</Empty>}
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
