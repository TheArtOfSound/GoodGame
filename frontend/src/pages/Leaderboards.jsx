import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trophy, X } from "lucide-react";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../components/UIState";

export default function Leaderboards() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getJSON("/leaderboards?limit=60")
      .then((data) => setLeaders(data.leaders || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const normalized = query.trim().toLowerCase();
  const visible = normalized
    ? leaders.filter((leader) =>
        [leader.game_title, leader.username, leader.display_name, leader.score_unit]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
    : leaders;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10" data-testid="leaderboards-page">
      <SEO
        title="Browser game leaderboards"
        description="See persistent global high scores and current champions across free browser games on GoodGame.center."
        path="/leaderboards"
      />
      <PageHeader
        eyebrow="Persistent scores"
        title="Global champions"
        description="Each row is the current best authenticated run for that game. Scores are never prefilled."
      />

      {loading ? (
        <PageLoader label="Loading leaderboards" />
      ) : error ? (
        <ErrorState className="mt-8" title="Leaderboards could not load" body="Ranked scores are temporarily unavailable." />
      ) : leaders.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Trophy}
          title="Every board is open"
          body="Play a ranked game while signed in to become its first champion."
          action={<Link to="/games" className="btn-primary">Find a game</Link>}
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
            <label htmlFor="leaderboard-filter" className="relative w-full md:w-80">
              <span className="sr-only">Filter leaderboards</span>
              <Search className="absolute left-3 top-4 w-4 h-4 text-[#52525B]" />
              <input id="leaderboard-filter" value={query} onChange={(event) => setQuery(event.target.value)} className="input pl-10 pr-11" placeholder="Game or player" />
              {query && <button type="button" className="absolute right-1 top-1 w-10 h-10 grid place-items-center text-[#71717A] hover:text-white" onClick={() => setQuery("")} aria-label="Clear filter"><X className="w-4 h-4" /></button>}
            </label>
            <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-wider">{visible.length} board{visible.length === 1 ? "" : "s"}</div>
          </div>
          {visible.length === 0 ? (
            <EmptyState className="mt-6" icon={Search} title="No matching boards" body={`Nothing matches “${query.trim()}”.`} action={<button type="button" className="btn-secondary" onClick={() => setQuery("")}>Clear filter</button>} />
          ) : (
          <div className="mt-6 border border-[#1A1A1A] divide-y divide-[#1A1A1A]">
          {visible.map((leader) => (
            <Link
              key={leader.game_id}
              to={`/games/${leader.game_slug}#leaderboard`}
              className="grid md:grid-cols-[1fr_220px_160px] gap-3 md:items-center px-4 md:px-5 py-4 hover:bg-[#0A0A0A]"
            >
              <div>
                <div className="text-white font-bold">{leader.game_title}</div>
                <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-wider">
                  {leader.trust_mode === "first_party" ? "First-party scoring" : "Client-reported scoring"}
                </div>
              </div>
              <div className="text-[#A1A1AA]">
                <span className="text-[#D4AF37] font-bold">#{leader.game_rank}</span>{" "}
                {leader.display_name || leader.username}
              </div>
              <div className="font-mono font-bold text-white md:text-right tabular-nums">
                {Number(leader.score).toLocaleString()}{" "}
                <span className="text-[#52525B] text-[10px] uppercase">{leader.score_unit}</span>
              </div>
            </Link>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  );
}
