import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ActivityFeed from "../components/ActivityFeed";
import SEO from "../components/SEO";

export default function Activity() {
  const { user } = useAuth();
  const [activity, setActivity] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const data = await getJSON("/feed/global?limit=60");
    setActivity(data.activity || []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      await postJSON("/feed/posts", { body: body.trim() });
      setBody("");
      await load();
      toast.success("Posted to global activity");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10" data-testid="activity-page">
      <SEO
        title="Global gaming activity"
        description="Follow public game releases, player posts, gameplay clips, and persistent high scores from across GoodGame.center."
        path="/activity"
      />
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.24em]">Live network</div>
      <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-white">Global activity</h1>
      <p className="text-[#A1A1AA] mt-2 max-w-2xl">
        One public stream for releases, player posts, clips, and leaderboard runs.
      </p>

      <div className="mt-8 border-y border-[#1A1A1A] py-5">
        {user ? (
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor="global-post">Post to global activity</label>
            <textarea
              id="global-post"
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 800))}
              className="input min-h-24"
              placeholder="Share a run, a release note, a playtest request, or what you are building..."
              data-testid="global-post-input"
            />
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-[#52525B] font-mono text-[10px]">{body.length}/800</span>
              <button
                type="submit"
                disabled={posting || !body.trim()}
                className="h-10 px-4 bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-xs inline-flex items-center gap-2 disabled:opacity-40"
                data-testid="global-post-submit"
              >
                <Send className="w-4 h-4" /> {posting ? "Posting" : "Post"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-5 flex-wrap">
            <span className="text-[#A1A1AA]">Log in to post to the global feed and rank on leaderboards.</span>
            <Link to="/login" className="h-10 px-4 border border-[#D4AF37] text-[#D4AF37] font-bold uppercase tracking-wider text-xs inline-flex items-center">
              Log in
            </Link>
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading ? <div className="py-10 text-[#52525B]">Loading activity...</div> : <ActivityFeed activity={activity} />}
      </div>
    </div>
  );
}
