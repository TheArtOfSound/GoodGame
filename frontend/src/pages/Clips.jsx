import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON, postForm } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import GamePicker from "../components/GamePicker";
import SEO from "../components/SEO";
import { BACKEND_URL } from "../lib/config";

export default function Clips() {
  const { user } = useAuth();
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const refresh = () =>
    getJSON("/clips")
      .then((d) => setClips(d.clips || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="clips-page">
      <SEO title="Clips" description="Short gameplay clips from GoodGame.center creators." path="/clips" />
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
            Clips
          </div>
          <h1 className="text-3xl font-bold uppercase text-white tracking-tight">
            Highlights from the community
          </h1>
        </div>
        {user ? (
          <button
            data-testid="clips-upload-toggle"
            onClick={() => setShowForm((s) => !s)}
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
          >
            {showForm ? "Close" : "Upload clip"}
          </button>
        ) : (
          <Link
            to="/login"
            className="border border-[#1A1A1A] hover:border-white text-white px-5 h-11 flex items-center text-sm uppercase font-bold tracking-wider"
          >
            Log in to upload
          </Link>
        )}
      </div>

      {showForm && user && <UploadForm onDone={refresh} />}

      {loading ? (
        <div className="text-[#52525B] mt-8">Loading...</div>
      ) : clips.length === 0 ? (
        <div className="text-[#A1A1AA] border border-dashed border-[#1A1A1A] p-8 mt-8 text-center" data-testid="clips-empty">
          No clips yet. Be the first to upload.
        </div>
      ) : (
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((c) => (
            <Link
              key={c.id}
              to={`/clips/${c.slug}`}
              data-testid={`clip-card-${c.slug}`}
              className="border border-[#1A1A1A] hover:border-[#D4AF37]/60 p-3 block"
            >
              <video
                src={`${BACKEND_URL}${c.video_path}`}
                preload="metadata"
                muted
                className="w-full aspect-video bg-black"
              />
              <div className="text-white mt-2 truncate">{c.caption || "Untitled"}</div>
              <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em] mt-1">
                @{c.author_username}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadForm({ onDone }) {
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [game, setGame] = useState(null);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setErr("Choose a video");
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("caption", caption);
    fd.append("tags", tags);
    fd.append("game_slug", game?.slug || "");
    fd.append("video", file);
    try {
      await postForm("/clips", fd);
      setCaption("");
      setTags("");
      setGame(null);
      setFile(null);
      onDone?.();
    } catch (e) {
      setErr(e.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      data-testid="clip-upload-form"
      className="mt-6 border border-[#1A1A1A] p-5 grid md:grid-cols-2 gap-4 bg-[#080808]"
    >
      <input
        data-testid="clip-caption"
        placeholder="Caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="input"
        maxLength={280}
      />
      <input
        data-testid="clip-tags"
        placeholder="Tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="input"
      />
      <div className="md:col-span-2">
        <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">
          Associated game (optional)
        </div>
        <GamePicker value={game} onChange={setGame} placeholder="Search a game by title or tag..." />
        {game && (
          <div className="text-[#D4AF37] font-mono text-[10px] uppercase tracking-[0.2em] mt-1">
            Attached: {game.title}
          </div>
        )}
      </div>
      <input
        data-testid="clip-file"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-white font-mono text-sm md:col-span-2"
        required
      />
      {err && (
        <div className="text-[#FF3B30] text-sm font-mono md:col-span-2">{err}</div>
      )}
      <button
        type="submit"
        disabled={busy}
        data-testid="clip-submit"
        className="md:col-span-2 h-12 bg-[#D4AF37] text-black font-bold uppercase tracking-wider disabled:opacity-50"
      >
        {busy ? "Uploading..." : "Publish clip"}
      </button>
    </form>
  );
}
