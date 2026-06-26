import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Maximize2, Minimize2, Play, RotateCcw, Settings } from "lucide-react";
import SEO from "../components/SEO";
import LeaderboardTable from "../components/LeaderboardTable";
import { BACKEND_URL } from "../lib/config";
import { CharacterCount, ErrorState, InlineNotice, PageLoader } from "../components/UIState";

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
  const [leaderboard, setLeaderboard] = useState({ config: null, entries: [] });
  const [sdkLeaderboard, setSdkLeaderboard] = useState([]);
  const [scoreNotice, setScoreNotice] = useState("");
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const runRef = useRef(null);
  const isPlayRoute = location.pathname.endsWith("/play");
  const fullScreenLayout = playing && (immersive || (isPlayRoute && !forceInline));

  useEffect(() => {
    setData(null);
    setError(null);
    setPlaying(isPlayRoute);
    setImmersive(false);
    setForceInline(false);
    setCounted(false);
    runRef.current = null;
    getJSON(`/games/${slug}`)
      .then((next) => {
        setData(next);
        setLeaderboard(next.leaderboard || { config: null, entries: [] });
      })
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

  const loadSdkLeaderboard = useCallback(() => {
    getJSON(`/sdk/leaderboard?game=${encodeURIComponent(slug)}&board=default`)
      .then((r) => setSdkLeaderboard(r.entries || []))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (data && !leaderboard.config?.enabled) loadSdkLeaderboard();
  }, [data, leaderboard.config?.enabled, loadSdkLeaderboard]);

  useEffect(() => {
    if (!fullScreenLayout) return undefined;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [fullScreenLayout]);

  const startRun = useCallback(async () => {
    if (!user || !data?.game || !leaderboard.config?.enabled) return null;
    try {
      const result = await postJSON(`/games/${slug}/runs`, { client_build: "web-player-1.1.0" });
      runRef.current = result.run_id;
      setScoreNotice("");
      return result.run_id;
    } catch (runError) {
      setScoreNotice(runError.response?.data?.detail || "This run cannot be ranked.");
      return null;
    }
  }, [data, leaderboard.config, slug, user]);

  const submitScore = useCallback(async (payload) => {
    if (!user || !leaderboard.config?.enabled) return;
    const runId = runRef.current || (await startRun());
    if (!runId) return;
    runRef.current = null;
    try {
      const result = await postJSON(`/games/${slug}/scores`, {
        run_id: runId,
        score: Math.max(0, Math.round(Number(payload.score) || 0)),
        duration_ms: Math.max(0, Math.round(Number(payload.duration_ms) || 0)),
      });
      setLeaderboard((current) => ({ ...current, entries: result.leaderboard || current.entries }));
      const rank = result.personal_best?.rank;
      setScoreNotice(rank ? `Score saved. Personal rank #${rank}.` : "Score saved.");
    } catch (scoreError) {
      setScoreNotice(scoreError.response?.data?.detail || "Score could not be saved.");
    }
  }, [leaderboard.config, slug, startRun, user]);

  useEffect(() => {
    const receive = async (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const payload = event.data || {};
      if (payload.type === "goodgame:run-start") {
        runRef.current = null;
        startRun();
      } else if (payload.type === "goodgame:score") {
        submitScore(payload);
      } else if (payload.source === "goodgame") {
        const reply = (data) => {
          try {
            event.source.postMessage({ source: "goodgame-host", reqId: payload.reqId, data }, "*");
          } catch (_error) {}
        };
        try {
          if (payload.type === "GG_SCORE") {
            await postJSON("/sdk/score", {
              game_slug: slug,
              board: payload.board || "default",
              score: payload.score,
            });
            loadSdkLeaderboard();
          } else if (payload.type === "GG_SAVE") {
            await postJSON("/sdk/save", { game_slug: slug, data: payload.data });
          } else if (payload.type === "GG_LOAD") {
            const result = await getJSON(`/sdk/save?game=${encodeURIComponent(slug)}`).catch(() => ({ data: null }));
            reply(result.data ?? null);
          } else if (payload.type === "GG_LEADERBOARD") {
            const result = await getJSON(
              `/sdk/leaderboard?game=${encodeURIComponent(slug)}&board=${encodeURIComponent(payload.board || "default")}`
            ).catch(() => ({ entries: [] }));
            reply(result.entries || []);
          }
        } catch (_error) {}
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [loadSdkLeaderboard, slug, startRun, submitScore]);

  if (error)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20" data-testid="game-not-found">
        <ErrorState
          title="Game not found"
          body="This game may have been removed, renamed, or never published."
          action={<Link to="/games" className="btn-secondary">Back to games</Link>}
        />
      </div>
    );

  if (!data) return <PageLoader label="Loading game" />;

  const { game, releases } = data;
  const isOwner = user && user.id === game.owner_id;
  const iframeSrc = `${BACKEND_URL}/api/ugc/${game.id}/${game.upload_entry}`;
  const cover = game.cover_image
    ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at}`
    : `${BACKEND_URL}/og/game/${game.slug}.svg`;
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
        title={game.seo_title || game.title}
        description={game.seo_description || game.pitch || game.description?.slice(0, 200) || "Play this browser game on GoodGame.center"}
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
                      const frame = iframeRef.current;
                      runRef.current = null;
                      if (frame) frame.src = frame.src;
                    }}
                    className="h-10 px-3 bg-black/70 border border-white/15 text-white hover:border-white inline-flex items-center gap-2 uppercase tracking-wider text-xs font-bold backdrop-blur"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                </div>
                <iframe
                  ref={iframeRef}
                  title={game.title}
                  src={iframeSrc}
                  sandbox="allow-scripts allow-pointer-lock allow-forms"
                  allow="fullscreen; autoplay; gamepad"
                  allowFullScreen
                  className="game-player-frame w-full aspect-video bg-black"
                  data-testid="play-iframe"
                  onLoad={() => {
                    runRef.current = null;
                    if (!game.play_template) startRun();
                  }}
                />
                <div className="mobile-landscape-hint">
                  Turn your phone landscape for the full playfield.
                </div>
              </>
            ) : (
              <div className="relative w-full aspect-video bg-[#080808] flex items-center justify-center">
                <img
                  src={cover}
                  alt={`${game.title} gameplay cover`}
                  className="absolute inset-0 w-full h-full object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-black/35" />
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
            {scoreNotice && (
              <InlineNotice
                tone={scoreNotice.toLowerCase().includes("could") || scoreNotice.toLowerCase().includes("cannot") ? "error" : "success"}
                className="mt-5"
                testId="score-notice"
              >
                {scoreNotice}
              </InlineNotice>
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
          <section id="leaderboard" className="scroll-mt-24">
            <div className="flex items-end justify-between gap-3 mb-2">
              <div>
                <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">Ranked runs</div>
                <h2 className="text-xl font-bold uppercase text-white">Leaderboard</h2>
              </div>
              <Link to="/leaderboards" className="text-[#D4AF37] font-mono text-[10px] uppercase tracking-wider">
                Global
              </Link>
            </div>
            <LeaderboardTable
              entries={leaderboard.entries || []}
              currentUserId={user?.id}
              unit={leaderboard.config?.score_unit || "points"}
              limit={10}
            />
            <p className="text-[#52525B] text-xs mt-3 leading-relaxed">
              {user
                ? "Your best authenticated run is ranked automatically."
                : "Play freely, or log in before a run to save your score."}
            </p>
          </section>

          <div className="border border-[#1A1A1A] p-4">
            <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">
              Build
            </div>
            <div className="text-white text-sm font-mono">{game.engine}</div>
            <div className="text-[#52525B] text-xs mt-1">
              {game.play_template ? "GoodGame canvas runtime" : `${(game.upload_bytes / 1024 / 1024).toFixed(2)} MB`}
            </div>
          </div>

          {!leaderboard.config?.enabled && sdkLeaderboard.length > 0 && (
            <div className="border border-[#1A1A1A] p-4" data-testid="leaderboard">
              <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-3">
                Casual leaderboard
              </div>
              <ol className="space-y-2">
                {sdkLeaderboard.slice(0, 10).map((e) => (
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
                aria-pressed={rating === n}
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
          <div className="flex justify-end mt-1">
            <CharacterCount value={body} max={2000} />
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button
              disabled={busy}
              data-testid="review-submit"
              className="btn-primary"
            >
              {busy ? "Posting…" : "Post review"}
            </button>
            {msg && (
              <InlineNotice tone={msg.includes("Could") || msg.includes("Pick") ? "error" : "success"}>
                {msg}
              </InlineNotice>
            )}
          </div>
        </form>
      ) : (
        <div className="text-[#A1A1AA] text-sm mb-8 border-y border-[#1A1A1A] py-4">
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
