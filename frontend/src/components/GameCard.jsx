import { Link } from "react-router-dom";
import { ExternalLink, Play, Zap } from "lucide-react";
import { coverFallbackUrl, coverUrl, isExternalGame, isInstantPlay, playHref } from "../lib/games";

const primaryTag = (game) => {
  const tags = Array.isArray(game.tags) ? game.tags : [];
  const tag = tags.find(Boolean);
  return tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : null;
};

export default function GameCard({ game, size = "md", variant = "cabinet" }) {
  const cover = coverUrl(game);
  const genre = primaryTag(game);
  const external = isExternalGame(game);
  const instant = isInstantPlay(game);
  const plays = Number(game.play_count) || 0;
  const large = size === "lg";

  return (
    <Link
      to={playHref(game)}
      data-testid={`game-card-${game.slug}`}
      className={`cabinet ${large ? "is-lg" : ""} ${variant === "flat" ? "is-flat" : ""}`}
    >
      <div className="cabinet-marquee">
        <span title={game.title}>{game.title}</span>
      </div>
      <div className="cabinet-bezel">
        <div className="cabinet-screen">
          <img
            src={cover}
            alt={`${game.title} gameplay`}
            loading="lazy"
            onError={(event) => {
              const fallback = coverFallbackUrl(game);
              if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
            }}
          />
          <div className="cabinet-scan" aria-hidden="true" />
          <span className="cabinet-play">
            <Play className="w-5 h-5 fill-current" />
          </span>
          {external && (
            <span className="cabinet-chip">
              <ExternalLink className="w-2.5 h-2.5" /> Host
            </span>
          )}
          {instant && (
            <span className="cabinet-chip is-live">
              <Zap className="w-2.5 h-2.5 fill-current" /> Live
            </span>
          )}
        </div>
        <div className="cabinet-speakers" aria-hidden="true" />
      </div>
      <div className="cabinet-deck">
        <span className="cabinet-who">
          {game.owner_username ? `@${game.owner_username}` : "Unknown"}
        </span>
        <span className="cabinet-stat">
          {genre ? genre : "Browser"}
          {plays > 0 ? ` · ${plays.toLocaleString()}` : ""}
        </span>
      </div>
      <div className="cabinet-coin" aria-hidden="true"><i /></div>
      <div className="cabinet-legs" aria-hidden="true"><i /><i /></div>
    </Link>
  );
}
