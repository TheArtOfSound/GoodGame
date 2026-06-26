import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import SEO from "../components/SEO";
import { Hash } from "lucide-react";
import { EmptyState, ErrorState, GridSkeleton, PageHeader } from "../components/UIState";

export default function TagPage() {
  const { tag } = useParams();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getJSON(`/tags/${encodeURIComponent(tag)}`)
      .then((d) => setGames(d.games || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tag]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="tag-page">
      <SEO
        title={`#${tag} games`}
        description={`Browse browser games tagged #${tag} on GoodGame.center.`}
        path={`/tags/${tag}`}
      />
      <PageHeader
        eyebrow="Tag"
        title={`#${tag}`}
        description={`${games.length || "Browser"} game${games.length === 1 ? "" : "s"} connected to this topic.`}
        actions={<Link to="/games" className="btn-secondary">Browse all games</Link>}
      />

      {loading ? (
        <div className="mt-8"><GridSkeleton count={6} /></div>
      ) : error ? (
        <ErrorState className="mt-8" title="Tag could not load" body="Return to the full catalog and try again." />
      ) : games.length === 0 ? (
        <EmptyState className="mt-8" icon={Hash} testId="tag-empty" title={`No #${tag} games yet`} body="This tag will become browsable when creators publish matching games." />
      ) : (
        <div className="mt-8 game-grid">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
