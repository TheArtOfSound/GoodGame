import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import { ChevronLeft, ChevronRight, Play, Upload } from "lucide-react";
import SEO from "../components/SEO";
import { EmptyState, ErrorState } from "../components/UIState";
import { coverFallbackUrl, coverUrl, isExternalGame, pickFeatured, playHref } from "../lib/games";

export default function Home() {
  const [games, setGames] = useState([]);
  const [activity, setActivity] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const location = useLocation();
  const railRef = useRef(null);
  const donationState = new URLSearchParams(location.search).get("donation");

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      getJSON("/games?limit=24&sort=new"),
      getJSON("/feed/global?limit=8"),
      getJSON("/leaderboards?limit=6"),
    ])
      .then(([gameData, activityData, leaderboardData]) => {
        setGames(gameData.games || []);
        setActivity(activityData.activity || []);
        setLeaders(leaderboardData.leaders || []);
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
          Thank you for supporting the alley.
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
          <div className="alley-stamp">FREE ENTRY</div>
          <h1>
            The alley is
            <span> open.</span>
          </h1>
          <p>
            Browser cabinets, no install. Walk the row, drop a coin, or wheel your own HTML5 machine in.
          </p>
          <div className="alley-arrival-cta">
            <Link to="/games" data-testid="hero-browse-cta" className="btn-primary h-12 px-6">
              <Play className="w-4 h-4 fill-current" /> Walk the cabinets
            </Link>
            <Link to="/create?method=upload" data-testid="hero-upload-cta" className="btn-secondary h-12 px-6">
              <Upload className="w-4 h-4" /> Plug yours in
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
                <b>{isExternalGame(featured) ? "Lit on the host" : "Now glowing"}</b>
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
            <div className="eyebrow">The row</div>
            <h2>Cabinets on tonight</h2>
          </div>
          <div className="alley-row-tools">
            <button type="button" className="alley-nudge" onClick={() => nudge(-1)} aria-label="Previous cabinets">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" className="alley-nudge" onClick={() => nudge(1)} aria-label="Next cabinets">
              <ChevronRight className="w-5 h-5" />
            </button>
            <Link to="/games">See the lot →</Link>
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
            title="The alley lights flickered"
            body="The catalog could not load. The cabinets are still here."
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
            eyebrow="Dark alley"
            title="No cabinets yet"
            body="Upload an HTML5 build and it becomes the first machine on the row."
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

      <section className="alley-board">
        <div className="alley-board-brick">
          <div className="alley-row-head">
            <div>
              <div className="eyebrow">Brick wall</div>
              <h2>Tonight’s flyers</h2>
            </div>
            <Link to="/activity">More tape →</Link>
          </div>
          <div className="flyer-wall">
            {(activity.length ? activity : [{ kind: "note", title: "The wall is clean", body: "Post after you play." }]).map(
              (item, index) => (
                <article
                  key={item.id || item.title || index}
                  className="flyer"
                  style={{ "--tilt": `${((index * 17) % 7) - 3}deg` }}
                >
                  <span>{item.kind || "note"}</span>
                  <strong>{item.title || item.game_title || item.body || "Untitled"}</strong>
                  {item.username || item.author_username ? (
                    <small>@{item.username || item.author_username}</small>
                  ) : null}
                </article>
              ),
            )}
          </div>
        </div>

        <aside className="sticker-wall">
          <div className="alley-row-head">
            <div>
              <div className="eyebrow">Glass case</div>
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
          ) : (
            <div className="sticker is-empty">No champion yet. First logged-in score takes the glass.</div>
          )}
        </aside>
      </section>
    </div>
  );
}
