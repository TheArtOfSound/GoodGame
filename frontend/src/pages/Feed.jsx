import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import GameCard from "../components/GameCard";
import { useAuth } from "../context/AuthContext";

function stars(n) {
  const r = Math.max(0, Math.min(5, Math.round(n || 0)));
  return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
}

export default function Feed() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    getJSON("/feed")
      .then(setData)
      .catch(() => setData({ personalized: false, items: [] }));
  }, []);

  const items = data?.items || [];
  const personalized = data?.personalized;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10" data-testid="feed-page">
      <SEO title="Your feed" path="/feed" noindex />
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        {personalized ? "Following" : "Discover"}
      </div>
      <h1 className="text-3xl font-bold uppercase text-white mt-1">
        {personalized ? "Your feed" : "Latest on GoodGame"}
      </h1>
      {data && !personalized && (
        <p className="text-[#A1A1AA] text-sm mt-2">
          {user ? (
            "Follow creators to personalize this feed."
          ) : (
            <>
              The newest games and clips.{" "}
              <Link to="/onboarding" className="text-[#D4AF37] underline">
                Join
              </Link>{" "}
              and follow creators to make it yours.
            </>
          )}
        </p>
      )}

      {!data && <div className="text-[#52525B] mt-8 font-mono text-sm">Loading&hellip;</div>}
      {data && items.length === 0 && <div className="text-[#A1A1AA] mt-8">Nothing here yet.</div>}

      <div className="mt-8 space-y-5">
        {items.map((it, i) => (
          <FeedItem key={i} it={it} />
        ))}
      </div>
    </div>
  );
}

function Actor({ actor }) {
  return (
    <Link to={`/creators/${actor.username}`} className="text-white font-semibold hover:text-[#D4AF37]">
      {actor.name || `@${actor.username}`}
    </Link>
  );
}

function FeedItem({ it }) {
  if (it.type === "game") {
    return (
      <div className="border border-[#1A1A1A] p-4" data-testid="feed-game">
        <div className="text-[#A1A1AA] text-sm mb-3">
          <Actor actor={it.actor} /> published a game
        </div>
        <div className="max-w-xs">
          <GameCard game={it.game} />
        </div>
      </div>
    );
  }
  if (it.type === "clip") {
    return (
      <div className="border border-[#1A1A1A] p-4" data-testid="feed-clip">
        <div className="text-[#A1A1AA] text-sm">
          <Actor actor={it.actor} /> posted a clip
        </div>
        <Link to={`/clips/${it.clip.slug}`} className="text-white hover:text-[#D4AF37] mt-1 inline-block">
          &#9654; {it.clip.caption}
        </Link>
      </div>
    );
  }
  if (it.type === "review") {
    return (
      <div className="border border-[#1A1A1A] p-4" data-testid="feed-review">
        <div className="text-[#A1A1AA] text-sm">
          <Actor actor={it.actor} /> reviewed{" "}
          <Link to={`/games/${it.review.game_slug}`} className="text-white hover:text-[#D4AF37]">
            {it.review.game_title}
          </Link>{" "}
          <span className="text-[#D4AF37]">{stars(it.review.rating)}</span>
        </div>
        {it.review.body && <p className="text-[#A1A1AA] text-sm mt-2">{it.review.body}</p>}
      </div>
    );
  }
  return null;
}
