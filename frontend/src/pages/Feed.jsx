import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import SEO from "../components/SEO";
import GameCard from "../components/GameCard";
import { useAuth } from "../context/AuthContext";

function stars(n) {
  const r = Math.max(0, Math.min(5, Math.round(n || 0)));
  return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
}

export default function Feed() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const welcome = params.get("welcome");
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    getJSON("/feed")
      .then(setData)
      .catch(() => setData({ personalized: false, items: [] }));
  }, []);

  const submitPost = async (e) => {
    e.preventDefault();
    if (text.trim().length < 1) return;
    setPosting(true);
    try {
      const r = await postJSON("/posts", { body: text });
      setText("");
      setData((d) => ({ ...d, items: [r.post, ...(d?.items || [])] }));
    } catch (_e) {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  const onDelete = (id) =>
    setData((d) => ({ ...d, items: (d?.items || []).filter((it) => !(it.type === "post" && it.id === id)) }));

  const items = data?.items || [];
  const personalized = data?.personalized;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10" data-testid="feed-page">
      <SEO title="Your feed" path="/feed" noindex />
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        {personalized ? "Following" : "Discover"}
      </div>
      <h1 className="text-3xl font-bold uppercase text-white mt-1">
        {personalized ? "Your feed" : "Latest on GoodGame"}
      </h1>

      {welcome && user && (
        <div className="mt-6 border border-[#D4AF37]/40 bg-[#D4AF37]/5 p-5" data-testid="welcome-panel">
          <div className="text-[#D4AF37] font-bold uppercase tracking-wider text-sm">
            Welcome to GoodGame, @{user.username}
          </div>
          <p className="text-[#A1A1AA] text-sm mt-1">Here&apos;s how to get started:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to="/create"
              className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-xs px-4 h-10 flex items-center"
            >
              Make a game with AI
            </Link>
            <Link
              to="/games"
              className="border border-[#1A1A1A] hover:border-white text-white text-xs uppercase tracking-wider font-bold px-4 h-10 flex items-center"
            >
              Browse games
            </Link>
            <Link
              to="/creators"
              className="border border-[#1A1A1A] hover:border-white text-white text-xs uppercase tracking-wider font-bold px-4 h-10 flex items-center"
            >
              Find creators
            </Link>
          </div>
          <p className="text-[#52525B] text-xs mt-3">Or share your first post below.</p>
        </div>
      )}

      {user ? (
        <form onSubmit={submitPost} className="mt-6 border border-[#1A1A1A] p-4" data-testid="post-composer">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Share an update, a game you love, or what you're building…"
            className="input w-full"
            data-testid="post-input"
          />
          <div className="flex justify-end mt-2">
            <button
              disabled={posting || !text.trim()}
              data-testid="post-submit"
              className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-10 disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-[#A1A1AA] text-sm mt-4">
          <Link to="/onboarding" className="text-[#D4AF37] underline">
            Join
          </Link>{" "}
          to post and follow creators.
        </p>
      )}

      {!data && <div className="text-[#52525B] mt-8 font-mono text-sm">Loading&hellip;</div>}
      {data && items.length === 0 && (
        <div className="text-[#A1A1AA] mt-8">Nothing here yet — be the first to post.</div>
      )}

      <div className="mt-6 space-y-4">
        {items.map((it, i) => (
          <FeedItem key={it.id || i} it={it} user={user} onDelete={onDelete} />
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

function PostCard({ it, user, onDelete }) {
  const [likes, setLikes] = useState(it.likes || 0);
  const [liked, setLiked] = useState(!!it.liked);
  const [busy, setBusy] = useState(false);

  const like = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const r = await postJSON(`/posts/${it.id}/like`, {});
      setLiked(r.liked);
      setLikes(r.count);
    } catch (_e) {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    try {
      await postJSON(`/posts/${it.id}/delete`, {});
      onDelete(it.id);
    } catch (_e) {
      // ignore
    }
  };

  return (
    <div className="border border-[#1A1A1A] p-4" data-testid="feed-post">
      <div className="flex items-center justify-between">
        <Actor actor={it.actor} />
        {it.post.mine && (
          <button
            onClick={del}
            className="text-[#52525B] hover:text-[#FF3B30] text-xs font-mono uppercase"
            data-testid="post-delete"
          >
            Delete
          </button>
        )}
      </div>
      <p className="text-[#C7C7CC] mt-2 whitespace-pre-wrap">{it.post.body}</p>
      <button
        onClick={like}
        disabled={busy || !user}
        data-testid="post-like"
        className={`mt-3 text-sm font-mono inline-flex items-center gap-1 ${
          liked ? "text-[#FF3B30]" : "text-[#52525B] hover:text-white"
        }`}
      >
        {liked ? "♥" : "♡"} {likes > 0 ? likes : ""}
      </button>
    </div>
  );
}

function FeedItem({ it, user, onDelete }) {
  if (it.type === "post") return <PostCard it={it} user={user} onDelete={onDelete} />;
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
