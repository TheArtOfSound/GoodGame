import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import ActivityFeed from "../components/ActivityFeed";
import { ChevronLeft, ChevronRight, Gamepad2, Globe2, Play, Upload } from "lucide-react";
import SEO from "../components/SEO";
import { EmptyState, ErrorState } from "../components/UIState";
import { coverFallbackUrl, coverUrl, isExternalGame, pickFeatured, playHref } from "../lib/games";

export default function Home() {
  const [games, setGames] = useState([]);
  const [activity, setActivity] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [leaderError, setLeaderError] = useState(false);
  const location = useLocation();
  const railRef = useRef(null);
  const donationState = new URLSearchParams(location.search).get("donation");

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.allSettled([
      getJSON("/games?limit=12&sort=new"),
      getJSON("/feed/global?limit=8"),
      getJSON("/leaderboards?limit=6"),
    ])
      .then(([gameData, activityData, leaderboardData]) => {
        setError(gameData.status === "rejected");
        setActivityError(activityData.status === "rejected");
        setLeaderError(leaderboardData.status === "rejected");
        setGames(gameData.value?.games || []);
        setActivity(activityData.value?.activity || []);
        setLeaders(leaderboardData.value?.leaders || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featured = useMemo(() => pickFeatured(games), [games]);

  const nudge = (dir) => {
    const node = railRef.current;
    if (!node) return;
    node.scrollBy({ left: dir * Math.min(360, node.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div data-testid="home-page" className="alley-home">
      <SEO path="/" />
      {donationState === "thanks" && (
        <div className="alley-notice is-gold" data-testid="donation-thanks">
          Thank you for supporting GoodGame.
        </div>
      )}
      {donationState === "cancelled" && (
        <div className="alley-notice" data-testid="donation-cancelled">
          Donation checkout cancelled.
        </div>
      )}

      <section className="alley-arrival" data-testid="home-hero-split">
        <div className="alley-arrival-photo">
          <video
            className="alley-arrival-video"
            autoPlay
            muted
            loop
            playsInline
            poster="/brand/alley/hero.webp"
            aria-hidden="true"
          >
            <source src="/brand/alley/hero-loop.mp4" type="video/mp4" />
          </video>
          <img src="/brand/alley/hero.webp" alt="" width={1920} height={1080} fetchPriority="high" />
          <div className="alley-rain" aria-hidden="true" />
          <div className="alley-arrival-fade" />
        </div>
        <div className="alley-arrival-ticket">
          <div className="alley-stamp">FREE BROWSER GAMES</div>
          <h1>
            Play instantly.
            <span> Publish in minutes.</span>
          </h1>
          <p>
            Discover indie games that run in your browser—no download or account required. Made a game?
            Upload an HTML5 zip or link your hosted build for free.
          </p>
          <div className="alley-arrival-cta">
            <Link to="/games" data-testid="hero-browse-cta" className="btn-primary h-12 px-6">
              <Play className="w-4 h-4 fill-current" /> Browse games
            </Link>
            <Link to="/create?method=upload" data-testid="hero-upload-cta" className="btn-secondary h-12 px-6">
              <Upload className="w-4 h-4" /> Publish a game
            </Link>
          </div>
          {featured && (
            <Link to={playHref(featured)} className="alley-now-playing" data-testid="home-featured-game">
              <img
                src={coverUrl(featured)}
                alt=""
                onError={(event) => {
                  const fallback = coverFallbackUrl(featured);
                  if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                }}
              />
              <div>
                <b>{isExternalGame(featured) ? "Play on creator site" : "Featured game"}</b>
                <strong>{featured.title}</strong>
                <small>{featured.owner_username ? `@${featured.owner_username}` : "GoodGame Labs"}</small>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="alley-row">
        <div className="alley-row-head">
          <div>
            <div className="eyebrow">Ready to play</div>
            <h2>Recently added games</h2>
          </div>
          <div className="alley-row-tools">
            <button type="button" className="alley-nudge" onClick={() => nudge(-1)} aria-label="Previous games">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" className="alley-nudge" onClick={() => nudge(1)} aria-label="Next games">
              <ChevronRight className="w-5 h-5" />
            </button>
            <Link to="/games">Browse all games →</Link>
          </div>
        </div>

        {loading ? (
          <div className="cabinet-rail" data-testid="home-spotlight">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="cabinet is-ghost" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Games could not load"
            body="The catalog is temporarily unavailable. Try again in a moment."
            action={
              <button type="button" className="btn-secondary" onClick={load}>
                Try again
              </button>
            }
          />
        ) : games.length === 0 ? (
          <EmptyState
            testId="empty-catalog"
            icon={Upload}
            eyebrow="Game catalog"
            title="No games yet"
            body="Upload an HTML5 build to publish the first game."
            action={
              <Link to="/create" className="btn-primary h-12 px-6">
                <Upload className="w-4 h-4" /> Host a game
              </Link>
            }
          />
        ) : (
          <div className="cabinet-rail" ref={railRef} data-testid="home-spotlight">
            {games.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </section>

      <section className="home-how" aria-labelledby="how-goodgame-works">
        <div className="home-how-copy">
          <div className="eyebrow">Simple by design</div>
          <h2 id="how-goodgame-works">Play, publish, and share</h2>
          <p>GoodGame is built for browser games. Players can start immediately, and creators get a permanent page they can share anywhere.</p>
        </div>
        <ol className="home-how-steps">
          <li>
            <Gamepad2 aria-hidden="true" />
            <div><b>1. Pick a game</b><span>Browse by title, creator, or genre.</span></div>
          </li>
          <li>
            <Play aria-hidden="true" />
            <div><b>2. Play instantly</b><span>Open it in your browser. No install required.</span></div>
          </li>
          <li>
            <Globe2 aria-hidden="true" />
            <div><b>3. Publish your own</b><span>Upload a zip or link a hosted game for free.</span></div>
          </li>
        </ol>
      </section>

      <section className="alley-board">
        <div className="alley-board-brick">
          <div className="alley-row-head">
            <div>
              <div className="eyebrow">Community</div>
              <h2>Latest activity</h2>
            </div>
            <Link to="/activity">See all activity →</Link>
          </div>
          <div className="home-activity">
            {activityError ? (
              <p className="meta-text">Activity is temporarily unavailable.</p>
            ) : (
              <ActivityFeed activity={activity.slice(0, 6)} compact />
            )}
            <div className="home-community-invite">
              <p>Follow creators, share updates, and find people to playtest with.</p>
              <Link to="/onboarding" className="btn-secondary">Join the community</Link>
            </div>
          </div>
        </div>

        <aside className="sticker-wall">
          <div className="alley-row-head">
            <div>
              <div className="eyebrow">Competition</div>
              <h2>High scores</h2>
            </div>
            <Link to="/leaderboards" aria-label="All leaderboards">
              All
            </Link>
          </div>
          {leaders.length ? (
            <ol className="sticker-list">
              {leaders.map((leader, index) => (
                <li key={leader.game_id}>
                  <Link to={`/games/${leader.game_slug}#leaderboard`} className="sticker">
                    <em>{index + 1}</em>
                    <div>
                      <strong>{leader.game_title}</strong>
                      <small>@{leader.username}</small>
                    </div>
                    <b>{Number(leader.score).toLocaleString()}</b>
                  </Link>
                </li>
              ))}
            </ol>
          ) : leaderError ? (
            <p className="meta-text">High scores are temporarily unavailable.</p>
          ) : (
            <div className="sticker is-empty">No high scores yet. Log in and play to join the leaderboard.</div>
          )}
        </aside>
      </section>
    </div>
  );
}
