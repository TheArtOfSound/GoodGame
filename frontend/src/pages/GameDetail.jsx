import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Play, Settings } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function GameDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    setPlaying(false);
    getJSON(`/games/${slug}`)
      .then(setData)
      .catch(() => setError("Game not found"));
  }, [slug]);

  if (error)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center" data-testid="game-not-found">
        <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">404</div>
        <h1 className="text-3xl font-bold text-white mt-2">Game not found</h1>
        <Link to="/games" className="text-[#A1A1AA] underline mt-4 inline-block">
          Back to browse
        </Link>
      </div>
    );

  if (!data) return <div className="px-8 py-10 text-[#52525B]">Loading...</div>;

  const { game, releases } = data;
  const isOwner = user && user.id === game.owner_id;
  const iframeSrc = `${BACKEND}/api/ugc/${game.id}/${game.upload_entry}`;
  const cover = game.cover_image ? `${BACKEND}${game.cover_image}?v=${game.updated_at}` : null;

  const onPlay = async () => {
    setPlaying(true);
    try {
      await postJSON(`/games/${slug}/play`, {});
    } catch (_e) {
      // best-effort play counter
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="game-detail-page">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black border border-[#1A1A1A]" data-testid="play-iframe-container">
            {playing ? (
              <iframe
                title={game.title}
                src={iframeSrc}
                sandbox="allow-scripts allow-pointer-lock allow-fullscreen allow-forms"
                className="w-full aspect-video bg-black"
                data-testid="play-iframe"
              />
            ) : (
              <div className="relative w-full aspect-video bg-[#080808] flex items-center justify-center">
                {cover && (
                  <img
                    src={cover}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                )}
                <button
                  onClick={onPlay}
                  data-testid="play-game-button"
                  className="relative z-10 bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-8 h-14 flex items-center gap-3 hover:bg-[#E5C158]"
                >
                  <Play className="w-5 h-5" /> Play
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold uppercase text-white tracking-tight">
                  {game.title}
                </h1>
                <Link
                  to={`/creators/${game.owner_username}`}
                  className="text-[#A1A1AA] hover:text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em]"
                >
                  by @{game.owner_username}
                </Link>
              </div>
              {isOwner && (
                <Link
                  to={`/console/${game.slug}`}
                  data-testid="manage-game-link"
                  className="border border-[#1A1A1A] hover:border-white text-white px-4 h-10 flex items-center gap-2 text-sm uppercase tracking-wider font-bold"
                >
                  <Settings className="w-4 h-4" /> Manage
                </Link>
              )}
            </div>
            {game.pitch && (
              <p className="text-[#A1A1AA] mt-4 text-lg leading-relaxed">{game.pitch}</p>
            )}
            {game.description && (
              <div className="mt-6 text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">
                {game.description}
              </div>
            )}
            {game.tags && game.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {game.tags.map((t) => (
                  <span
                    key={t}
                    className="border border-[#1A1A1A] text-[#A1A1AA] font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="border border-[#1A1A1A] p-4">
            <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">
              Build
            </div>
            <div className="text-white text-sm font-mono">{game.engine}</div>
            <div className="text-[#52525B] text-xs mt-1">
              {(game.upload_bytes / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>

          <div>
            <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">
              Patch notes
            </div>
            <div className="space-y-3" data-testid="patch-notes">
              {(releases || []).map((r) => (
                <div key={r.id} className="border border-[#1A1A1A] p-3">
                  <div className="flex justify-between items-center">
                    <div className="text-white font-mono text-xs">v{r.version}</div>
                    <div className="text-[#52525B] font-mono text-[10px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {r.notes && (
                    <div className="text-[#A1A1AA] text-sm mt-2 whitespace-pre-wrap">
                      {r.notes}
                    </div>
                  )}
                </div>
              ))}
              {(!releases || releases.length === 0) && (
                <div className="text-[#52525B] text-sm">No patch notes yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
