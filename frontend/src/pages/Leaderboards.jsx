import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";

export default function Leaderboards() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJSON("/leaderboards?limit=60")
      .then((data) => setLeaders(data.leaders || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10" data-testid="leaderboards-page">
      <SEO
        title="Browser game leaderboards"
        description="See persistent global high scores and current champions across free browser games on GoodGame.center."
        path="/leaderboards"
      />
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.24em]">Persistent scores</div>
      <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-white">Global champions</h1>
      <p className="text-[#A1A1AA] mt-2 max-w-2xl">
        Each row is the current best authenticated run for that game. Scores are never prefilled.
      </p>

      {loading ? (
        <div className="py-12 text-[#52525B]">Loading leaderboards...</div>
      ) : leaders.length === 0 ? (
        <div className="mt-8 border border-dashed border-[#1A1A1A] px-6 py-12 text-center">
          <Trophy className="w-7 h-7 text-[#D4AF37] mx-auto" />
          <div className="mt-3 text-white font-bold">Every board is open.</div>
          <div className="text-[#71717A] text-sm mt-1">Play a ranked game while signed in to become its first champion.</div>
          <Link to="/games" className="inline-flex mt-5 h-10 px-4 bg-[#D4AF37] text-black items-center font-bold uppercase tracking-wider text-xs">
            Find a game
          </Link>
        </div>
      ) : (
        <div className="mt-8 border border-[#1A1A1A] divide-y divide-[#1A1A1A]">
          {leaders.map((leader) => (
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
    </div>
  );
}
