import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON, postForm } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import GamePicker from "../components/GamePicker";
import SEO from "../components/SEO";
import { BACKEND_URL } from "../lib/config";
import { FileVideo, Film, Upload, X } from "lucide-react";
import { CharacterCount, EmptyState, ErrorState, InlineNotice, PageHeader, PageLoader } from "../components/UIState";
import { FormField } from "../components/FormControls";

export default function Clips() {
  const { user } = useAuth();
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(false);

  const refresh = () => {
    setError(false);
    return getJSON("/clips")
      .then((d) => {
        setClips(d.clips || []);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="clips-page">
      <SEO title="Clips" description="Short gameplay clips from GoodGame.center creators." path="/clips" />
      <PageHeader
        eyebrow="Clips"
        title="Community highlights"
        description="Gameplay moments uploaded by players and creators."
        actions={user ? (
          <button
            data-testid="clips-upload-toggle"
            onClick={() => setShowForm((s) => !s)}
            className={showForm ? "btn-secondary" : "btn-primary"}
          >
            {showForm ? <><X className="w-4 h-4" /> Close</> : <><Upload className="w-4 h-4" /> Upload clip</>}
          </button>
        ) : (
          <Link to="/login" className="btn-secondary">
            Log in to upload
          </Link>
        )}
      />

      {showForm && user && <UploadForm onDone={refresh} />}

      {loading ? (
        <PageLoader label="Loading clips" />
      ) : error ? (
        <ErrorState className="mt-8" title="Clips could not load" body="Try this page again in a moment." />
      ) : clips.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Film}
          testId="clips-empty"
          title="No clips yet"
          body="Capture a gameplay moment and publish the first community highlight."
          action={user ? <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>Upload clip</button> : null}
        />
      ) : (
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((c) => (
            <Link
              key={c.id}
              to={`/clips/${c.slug}`}
              data-testid={`clip-card-${c.slug}`}
              className="border border-[#1A1A1A] hover:border-[#D4AF37]/60 p-3 block group"
            >
              <video
                src={`${BACKEND_URL}${c.video_path}`}
                preload="metadata"
                muted
                className="w-full aspect-video bg-black"
              />
              <div className="text-white group-hover:text-[#F1D77A] mt-2 truncate">{c.caption || "Untitled"}</div>
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
      <FormField id="clip-caption" label="Caption">
        <input
          id="clip-caption"
          data-testid="clip-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="input"
          maxLength={280}
        />
        <div className="flex justify-end mt-1"><CharacterCount value={caption} max={280} /></div>
      </FormField>
      <FormField id="clip-tags" label="Tags" hint="Separate tags with commas.">
        <input
          id="clip-tags"
          data-testid="clip-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="input"
          aria-describedby="clip-tags-hint"
        />
      </FormField>
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
      <div className="md:col-span-2">
        <div className="text-[#71717A] font-mono text-xs uppercase tracking-[0.2em] mb-2">Video file</div>
        <label htmlFor="clip-file" className="flex items-center gap-3 border border-dashed border-[#27272A] bg-[#050505] p-4 cursor-pointer hover:border-[#D4AF37]/60">
          <span className="w-10 h-10 border border-[#27272A] grid place-items-center text-[#D4AF37] shrink-0">
            <FileVideo className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-white text-sm font-semibold truncate">{file?.name || "Choose a gameplay video"}</span>
            <span className="block text-[#52525B] text-xs mt-0.5">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : "MP4, WebM, or QuickTime"}</span>
          </span>
          <input
            id="clip-file"
            data-testid="clip-file"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="sr-only"
            required
          />
        </label>
      </div>
      {err && (
        <InlineNotice tone="error" className="md:col-span-2">{err}</InlineNotice>
      )}
      <button
        type="submit"
        disabled={busy}
        data-testid="clip-submit"
        className="btn-primary md:col-span-2 h-12"
      >
        {busy ? "Uploading..." : "Publish clip"}
      </button>
    </form>
  );
}
