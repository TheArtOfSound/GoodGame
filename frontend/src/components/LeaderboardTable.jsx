import { Link } from "react-router-dom";
import { Crown } from "lucide-react";

export default function LeaderboardTable({ entries = [], currentUserId, unit = "points", limit }) {
  const rows = limit ? entries.slice(0, limit) : entries;
  if (!rows.length) {
    return (
      <div className="border border-dashed border-[#1A1A1A] px-4 py-8 text-center text-[#71717A] text-sm">
        No ranked scores yet. Sign in, play, and take first place.
      </div>
    );
  }

  return (
    <div className="border border-[#1A1A1A] overflow-hidden" data-testid="leaderboard-table">
      <div className="grid grid-cols-[52px_1fr_auto] gap-3 px-4 py-2 bg-[#080808] text-[#52525B] font-mono text-[10px] uppercase tracking-[0.18em]">
        <span>Rank</span>
        <span>Player</span>
        <span>{unit}</span>
      </div>
      <ol className="divide-y divide-[#1A1A1A]">
        {rows.map((entry, index) => {
          const rank = Number(entry.rank || entry.game_rank || index + 1);
          return (
            <li
              key={entry.id || `${entry.user_id}-${entry.score}`}
              className={`grid grid-cols-[52px_1fr_auto] items-center gap-3 px-4 py-3 ${
                entry.user_id === currentUserId ? "bg-[#D4AF37]/[0.07]" : "bg-black"
              }`}
            >
              <div className="font-mono text-xs text-[#A1A1AA] flex items-center gap-1">
                {rank === 1 && <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />}
                {rank}
              </div>
              <Link to={`/creators/${entry.username}`} className="min-w-0 hover:text-[#D4AF37]">
                <div className="truncate font-semibold text-white">{entry.display_name || entry.username}</div>
                <div className="truncate font-mono text-[10px] text-[#52525B]">@{entry.username}</div>
              </Link>
              <div className="font-mono font-bold text-white tabular-nums">
                {Number(entry.score).toLocaleString()}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
