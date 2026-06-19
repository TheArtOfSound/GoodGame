import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Maximize2, Minimize2, Play, RotateCcw, Settings } from "lucide-react";
import SEO from "../components/SEO";
import { BACKEND_URL } from "../lib/config";

export default function GameDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [forceInline, setForceInline] = useState(false);
  const [counted, setCounted] = useState(false);
  const playerRef = useRef(null);
  const isPlayRoute = location.pathname.endsWith("/play");

  useEffect(() => {
    setData(null);
    setError(null);
    setPlaying(isPlayRoute);
    setImmersive(false);
    setForceInline(false);
    setCounted(false);
    getJSON(`/games/${slug}`)
      .then(setData)
      .catch(() => setError("Game not found"));
  }, [slug, isPlayRoute]);

  useEffect(() => {
    if (data && isPlayRoute) setPlaying(true);
  }, [data, isPlayRoute]);

  useEffect(() => {
    if (!playing || counted) return;
    setCounted(true);
    postJSON(`/games/${slug}/play`, {}).catch(() => {});
  }, [playing, counted, slug]);

  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setImmersive(false);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

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
  const iframeSrc = `${BACKEND_URL}/api/ugc/${game.id}/${game.upload_entry}`;
  const cover = game.cover_image ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at}` : null;
  const fullScreenLayout = playing && (immersive || (isPlayRoute && !forceInline));

  const onPlay = () => {
    setPlaying(true);
  };

  const enterFullscreen = async () => {
    setPlaying(true);
    setForceInline(false);
    setImmersive(true);
    try {
      await playerRef.current?.requestFullscreen?.();
    } catch (_e) {}
  };

  const exitFullscreen = async () => {
    setForceInline(true);
    setImmersive(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch (_e) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="game-detail-page">
      <SEO
        title={game.title}
        description={game.pitch || game.description?.slice(0, 200) || "Play this browser game on GoodGame.center"}
        image={cover}
        type="game"
        path={`/games/${game.slug}`}
      />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div
            ref={playerRef}
            className={`game-player-shell bg-black border border-[#1A1A1A] ${playing ? "is-playing" : ""} ${fullScreenLayout ? "is-immersive" : ""}`}
            data-testid="play-iframe-container"
          >
            {playing ? (
              <>
                <div className="game-player-toolbar">
                  <button
                    type="button"
                    onClick={fullScreenLayout ? exitFullscreen : enterFullscreen}
                    data-testid="game-fullscreen-toggle"
                    className="h-10 px-3 bg-black/70 border border-white/15 text-white hover:border-[#D4AF37] hover:text-[#D4AF37] inline-flex items-center gap-2 uppercase tracking-wider text-xs font-bold backdrop-blur"
                  >
                    {fullScreenLayout ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    {fullScreenLayout ? "Exit" : "Fullscreen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const frame = document.querySelector("[data-testid='play-iframe']");
                      if (frame) frame.src = frame.src;
                    }}
                    className="h-10 px-3 bg-black/70 border border-white/15 text-white hover:border-white inline-flex items-center gap-2 uppercase tracking-wider text-xs font-bold backdrop-blur"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                </div>
                <iframe
                  title={game.title}
                  src={iframeSrc}
                  sandbox="allow-scripts allow-pointer-lock allow-forms"
                  allow="fullscreen; autoplay; gamepad"
                  allowFullScreen
                  className="game-player-frame w-full aspect-video bg-black"
                  data-testid="play-iframe"
                />
                <div className="mobile-landscape-hint">
                  Turn your phone landscape for the full playfield.
                </div>
              </>
            ) : (
              <div className="relative w-full aspect-video bg-[#080808] flex items-center justify-center">
                {cover && (
                  <img
                    src={cover}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                )}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={onPlay}
                    data-testid="play-game-button"
                    className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-8 h-14 flex items-center gap-3 hover:bg-[#E5C158]"
                  >
                    <Play className="w-5 h-5" /> Play
                  </button>
                  <button
                    onClick={enterFullscreen}
                    data-testid="play-fullscreen-button"
                    className="border border-white/20 bg-black/60 text-white font-bold uppercase tracking-wider text-sm px-6 h-14 flex items-center gap-3 hover:border-[#D4AF37] hover:text-[#D4AF37] backdrop-blur"
                  >
                    <Maximize2 className="w-5 h-5" /> Fullscreen
                  </button>
                </div>
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
                  <Link
                    key={t}
                    to={`/tags/${t}`}
                    data-testid={`game-tag-${t}`}
                    className="border border-[#1A1A1A] hover:border-[#D4AF37] text-[#A1A1AA] hover:text-[#D4AF37] font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 transition-colors"
                  >
                    #{t}
                  </Link>
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
