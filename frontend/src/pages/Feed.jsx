import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import SEO from "../components/SEO";
import GameCard from "../components/GameCard";
import { useAuth } from "../context/AuthContext";
import { Heart, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../components/ConfirmDialog";
import { CharacterCount, EmptyState, ErrorState, PageHeader, PageLoader } from "../components/UIState";

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
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    getJSON("/feed")
      .then(setData)
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error("Your post could not be published.");
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
      <PageHeader
        eyebrow={personalized ? "Following" : "Discover"}
        title={personalized ? "Your feed" : "Latest on GoodGame"}
        description={personalized ? "Updates from creators you follow." : "Fresh posts, games, clips, and reviews from across the network."}
      />

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
          <div className="flex justify-between items-center gap-3 mt-2">
            <CharacterCount value={text} max={600} />
            <button
              disabled={posting || !text.trim()}
              data-testid="post-submit"
              className="btn-primary h-10"
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

      {!data && !error && <PageLoader label="Loading feed" />}
      {error && (
        <ErrorState
          className="mt-8"
          title="The feed could not load"
          body="Your posts are safe. Retry the network request."
          action={<button type="button" className="btn-secondary" onClick={load}>Retry</button>}
        />
      )}
      {data && items.length === 0 && (
        <EmptyState className="mt-8" icon={MessageSquare} title="Nothing here yet" body="Publish the first update or follow creators to build your feed." />
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  const like = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const r = await postJSON(`/posts/${it.id}/like`, {});
      setLiked(r.liked);
      setLikes(r.count);
    } catch (_e) {
      toast.error("Like could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await postJSON(`/posts/${it.id}/delete`, {});
      onDelete(it.id);
      toast.success("Post deleted.");
    } catch (_e) {
      toast.error("Post could not be deleted.");
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="border border-[#1A1A1A] p-4" data-testid="feed-post">
      <div className="flex items-center justify-between">
        <Actor actor={it.actor} />
        {it.post.mine && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="icon-button w-8 h-8 hover:text-[#FF7A7A]"
            data-testid="post-delete"
            aria-label="Delete post"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4" />
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
        <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
        <span>{likes > 0 ? likes : "Like"}</span>
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        body="This removes the post from public feeds. This action cannot be undone."
        confirmLabel="Delete post"
        busy={busy}
        onConfirm={del}
        onClose={() => setConfirmDelete(false)}
      />
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
