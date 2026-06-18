import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON, postJSON, postForm } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function CommunityDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [body, setBody] = useState("");
  const [postErr, setPostErr] = useState(null);

  const load = () =>
    getJSON(`/communities/${slug}`)
      .then(setData)
      .catch(() => setErr("Not found"));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [slug]);

  if (err)
    return (
      <div className="px-8 py-20 text-center" data-testid="community-not-found">
        <h1 className="text-2xl uppercase text-white font-bold">Community not found</h1>
      </div>
    );
  if (!data) return <div className="px-8 py-10 text-[#52525B]">Loading...</div>;

  const { community, role, posts } = data;
  const canPost = ["owner", "moderator", "member"].includes(role);
  const canMod = ["owner", "moderator"].includes(role);

  const join = async () => {
    try {
      await postJSON(`/communities/${slug}/join`, {});
      load();
    } catch (_e) {
      // ignore
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    setPostErr(null);
    const fd = new FormData();
    fd.append("body", body);
    try {
      await postForm(`/communities/${slug}/posts`, fd);
      setBody("");
      load();
    } catch (e) {
      setPostErr(e.response?.data?.detail || "Failed");
    }
  };

  const hide = async (pid) => {
    const fd = new FormData();
    try {
      await postForm(`/communities/${slug}/posts/${pid}/hide`, fd);
      load();
    } catch (_e) {
      // ignore
    }
  };

  const reportPost = async (pid) => {
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason) return;
    const fd = new FormData();
    fd.append("target_type", "community_post");
    fd.append("target_id", pid);
    fd.append("reason", reason);
    fd.append("community_slug", slug);
    try {
      await postForm("/reports", fd);
      window.alert("Report submitted");
    } catch (_e) {
      window.alert("Could not submit report");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10" data-testid="community-detail">
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
        Community
      </div>
      <h1 className="text-3xl font-bold uppercase text-white tracking-tight">{community.name}</h1>
      <p className="text-[#A1A1AA] mt-2">{community.description}</p>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-[#52525B] font-mono text-xs mt-1">
          {community.member_count} member{community.member_count === 1 ? "" : "s"} · role: {role}
        </div>
        {(role === "owner" || role === "moderator") && (
          <Link
            to={`/communities/${slug}/moderate`}
            data-testid="community-moderate-link"
            className="border border-[#1A1A1A] hover:border-white text-white px-4 h-10 flex items-center text-sm uppercase font-bold tracking-wider"
          >
            Moderate
          </Link>
        )}
      </div>

      {user && role === "guest" && (
        <button
          onClick={join}
          data-testid="community-join"
          className="mt-4 bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
        >
          Join community
        </button>
      )}
      {!user && (
        <Link
          to="/login"
          className="mt-4 inline-block border border-[#1A1A1A] hover:border-white text-white px-5 h-11 leading-[44px] text-sm uppercase font-bold tracking-wider"
        >
          Log in to join
        </Link>
      )}

      {canPost && (
        <form onSubmit={submitPost} className="mt-8 border border-[#1A1A1A] p-4 bg-[#080808] space-y-3">
          <textarea
            data-testid="community-post-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Share something..."
            required
            className="input"
          />
          {postErr && <div className="text-[#FF3B30] text-sm font-mono">{postErr}</div>}
          <button
            data-testid="community-post-submit"
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
          >
            Post
          </button>
        </form>
      )}

      <div className="mt-8 space-y-3">
        {posts.length === 0 ? (
          <div className="text-[#52525B] font-mono text-sm" data-testid="community-empty-posts">
            No posts yet.
          </div>
        ) : (
          posts.map((p) => (
            <article
              key={p.id}
              data-testid={`community-post-${p.id}`}
              className="border border-[#1A1A1A] p-4 bg-[#0A0A0A]"
            >
              <div className="flex items-center justify-between">
                <Link to={`/creators/${p.author_username}`} className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em]">
                  @{p.author_username}
                </Link>
                <div className="flex gap-3">
                  {user && p.author_id !== user.id && (
                    <button
                      onClick={() => reportPost(p.id)}
                      data-testid={`report-post-${p.id}`}
                      className="text-[#A1A1AA] font-mono text-[10px] uppercase tracking-[0.2em] hover:text-white"
                    >
                      Report
                    </button>
                  )}
                  {canMod && (
                    <button
                      onClick={() => hide(p.id)}
                      data-testid={`hide-post-${p.id}`}
                      className="text-[#FF3B30] font-mono text-[10px] uppercase tracking-[0.2em] hover:underline"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
              <div className="text-white mt-2 whitespace-pre-wrap">{p.body}</div>
              <div className="text-[#52525B] font-mono text-[10px] mt-2">
                {new Date(p.created_at).toLocaleString()}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
