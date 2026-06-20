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
  const [leaderboard, setLeaderboard] = useState([]);
  const playerRef = useRef(null);
  const frameRef = useRef(null);
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

  const loadLeaderboard = () => {
    getJSON(`/sdk/leaderboard?game=${encodeURIComponent(slug)}&board=default`)
      .then((r) => setLeaderboard(r.entries || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (data) loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, slug]);

  // Bridge the sandboxed game (opaque origin, no session cookie) to the API.
  useEffect(() => {
    const onMsg = async (e) => {
      const frame = frameRef.current;
      if (!frame || e.source !== frame.contentWindow) return;
      const m = e.data;
      if (!m || m.source !== "goodgame") return;
      const reply = (payload) => {
        try {
          e.source.postMessage({ source: "goodgame-host", reqId: m.reqId, data: payload }, "*");
        } catch (_) {}
      };
      try {
        if (m.type === "GG_SCORE") {
          await postJSON("/sdk/score", { game_slug: slug, board: m.board || "default", score: m.score });
          loadLeaderboard();
        } else if (m.type === "GG_SAVE") {
          await postJSON("/sdk/save", { game_slug: slug, data: m.data });
        } else if (m.type === "GG_LOAD") {
          const r = await getJSON(`/sdk/save?game=${encodeURIComponent(slug)}`).catch(() => ({ data: null }));
          reply(r.data ?? null);
        } else if (m.type === "GG_LEADERBOARD") {
          const r = await getJSON(
            `/sdk/leaderboard?game=${encodeURIComponent(slug)}&board=${encodeURIComponent(m.board || "default")}`
          ).catch(() => ({ entries: [] }));
          reply(r.entries || []);
        }
      } catch (_) {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  ref={frameRef}
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
          <Reviews slug={slug} user={user} />
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

          {leaderboard.length > 0 && (
            <div className="border border-[#1A1A1A] p-4" data-testid="leaderboard">
              <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-3">
                Leaderboard
              </div>
              <ol className="space-y-2">
                {leaderboard.slice(0, 10).map((e) => (
                  <li key={e.rank} className="flex items-center justify-between text-sm">
                    <span className="text-[#A1A1AA] truncate">
                      <span className="text-[#52525B] font-mono mr-2">{e.rank}</span>
                      {e.display_name}
                    </span>
                    <span className="text-[#D4AF37] font-mono ml-3">{Number(e.score).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

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

function stars(n) {
  const r = Math.max(0, Math.min(5, Math.round(n || 0)));
  return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
}

function Reviews({ slug, user }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ avg: 0, count: 0 });
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    getJSON(`/games/${slug}/reviews`)
      .then((d) => {
        setReviews(d.reviews || []);
        setSummary(d.summary || { avg: 0, count: 0 });
      })
      .catch(() => {});
  };
  useEffect(load, [slug]);

  useEffect(() => {
    if (!user) return;
    const mine = reviews.find((r) => r.author_id === user.id);
    if (mine) {
      setRating(mine.rating);
      setBody(mine.body || "");
    }
  }, [reviews, user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setMsg("Pick a rating first.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await postJSON(`/games/${slug}/reviews`, { rating, body });
      setMsg("Review posted.");
      load();
    } catch (e) {
      setMsg(e.response?.data?.detail || "Could not post review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="reviews">
      <div className="flex items-baseline gap-3 border-b border-[#1A1A1A] pb-2 mb-5">
        <h2 className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">Reviews</h2>
        {summary.count > 0 && (
          <span className="text-sm text-[#A1A1AA]">
            <span className="text-[#D4AF37]">{stars(summary.avg)}</span> {summary.avg} &middot; {summary.count}{" "}
            review{summary.count === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {user ? (
        <form onSubmit={submit} className="mb-8 border border-[#1A1A1A] p-4">
          <div className="flex items-center gap-1 mb-3" data-testid="rating-input">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className={`text-2xl leading-none ${n <= rating ? "text-[#D4AF37]" : "text-[#3A3A3A]"} hover:text-[#E5C158]`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Share what you thought (optional)"
            className="input w-full"
            data-testid="review-body"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              disabled={busy}
              data-testid="review-submit"
              className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11 disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post review"}
            </button>
            {msg && <span className="text-sm font-mono text-[#A1A1AA]">{msg}</span>}
          </div>
        </form>
      ) : (
        <div className="text-[#A1A1AA] text-sm mb-8">
          <Link to="/login" className="text-[#D4AF37] underline">
            Log in
          </Link>{" "}
          to leave a review.
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="border border-[#1A1A1A] p-4" data-testid="review-item">
            <div className="flex items-center justify-between">
              <Link
                to={`/creators/${r.author_username}`}
                className="text-white text-sm font-semibold hover:text-[#D4AF37]"
              >
                {r.author_name || `@${r.author_username}`}
              </Link>
              <span className="text-[#D4AF37] text-sm">{stars(r.rating)}</span>
            </div>
            {r.body && <p className="text-[#A1A1AA] text-sm mt-2 whitespace-pre-wrap">{r.body}</p>}
          </div>
        ))}
        {reviews.length === 0 && <div className="text-[#52525B] text-sm">No reviews yet. Be the first.</div>}
      </div>
    </section>
  );
}
