import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postForm } from "../lib/api";

export default function CreateGame() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!file) {
      setErr("Choose a .zip build first");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("pitch", pitch);
    fd.append("description", description);
    fd.append("tags", tags);
    fd.append("build", file);
    try {
      const res = await postForm("/games", fd);
      navigate(`/console/${res.game.slug}`);
    } catch (e) {
      setErr(e.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" data-testid="create-game-page">
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        New game
      </div>
      <h1 className="text-3xl font-bold uppercase text-white mt-2">Upload a browser game</h1>
      <p className="text-[#A1A1AA] mt-2 text-sm">
        Provide an HTML5 build as a zip with an <code className="text-[#D4AF37]">index.html</code>{" "}
        at the root.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Title">
          <input
            data-testid="create-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
            maxLength={120}
          />
        </Field>
        <Field label="One-line pitch">
          <input
            data-testid="create-pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            className="input"
            maxLength={240}
          />
        </Field>
        <Field label="Description">
          <textarea
            data-testid="create-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="input"
          />
        </Field>
        <Field label="Tags (comma separated)">
          <input
            data-testid="create-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input"
            placeholder="action, puzzle, retro"
          />
        </Field>
        <Field label="Build zip">
          <input
            data-testid="create-build"
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-white font-mono text-sm"
            required
          />
        </Field>
        {err && (
          <div className="text-[#FF3B30] text-sm font-mono" data-testid="create-error">
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="create-submit"
          className="w-full h-12 bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#E5C158] disabled:opacity-50"
        >
          {busy ? "Uploading..." : "Publish game"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}
