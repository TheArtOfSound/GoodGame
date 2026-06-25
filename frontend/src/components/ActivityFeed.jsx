import { Link } from "react-router-dom";
import { Gamepad2, MessageSquare, PlaySquare, Trophy } from "lucide-react";

const iconFor = {
  game: Gamepad2,
  post: MessageSquare,
  clip: PlaySquare,
  score: Trophy,
};

const labelFor = {
  game: "Published a game",
  post: "Posted",
  clip: "Shared a clip",
  score: "Set a score",
};

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        Math.round((date.getTime() - Date.now()) / 86400000),
        "day"
      );
}

export default function ActivityFeed({ activity = [], compact = false }) {
  if (!activity.length) {
    return (
      <div className="border border-dashed border-[#1A1A1A] px-5 py-10 text-center text-[#71717A]">
        Public activity will appear when players post, publish, clip, or submit scores.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1A1A1A]" data-testid="global-activity-feed">
      {activity.map((item) => {
        const Icon = iconFor[item.kind] || MessageSquare;
        return (
          <article key={item.id} className={`flex gap-4 ${compact ? "py-4" : "py-5"}`}>
            <div className="w-9 h-9 shrink-0 border border-[#2A2A2A] bg-[#0A0A0A] grid place-items-center text-[#D4AF37]">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    to={`/creators/${item.actor_username}`}
                    className="font-bold text-white hover:text-[#D4AF37]"
                  >
                    {item.actor_name || `@${item.actor_username}`}
                  </Link>
                  <span className="text-[#71717A] text-sm"> · {labelFor[item.kind] || "Updated"}</span>
                </div>
                <time className="text-[#52525B] font-mono text-[10px] uppercase tracking-wider shrink-0">
                  {formatTime(item.created_at)}
                </time>
              </div>
              {item.kind === "score" ? (
                <Link to={item.href || "#"} className="block mt-1 text-[#A1A1AA] hover:text-white">
                  <span className="text-[#D4AF37] font-bold">{Number(item.score).toLocaleString()}</span>
                  {" on "}
                  <span className="text-white">{item.game_title}</span>
                </Link>
              ) : (
                <>
                  {item.title && item.kind !== "post" && (
                    <Link to={item.href || "#"} className="block mt-1 text-white font-semibold hover:text-[#D4AF37]">
                      {item.title}
                    </Link>
                  )}
                  {item.body && (
                    <p className={`mt-1 text-[#A1A1AA] leading-relaxed ${compact ? "line-clamp-2 text-sm" : ""}`}>
                      {item.body}
                    </p>
                  )}
                </>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[#52525B] font-mono text-[10px] uppercase tracking-wider">
                {item.game_slug && <Link to={`/games/${item.game_slug}`}>{item.game_title}</Link>}
                {item.community_slug && <Link to={`/communities/${item.community_slug}`}>{item.community_name}</Link>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
