import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postForm, postJSON } from "../lib/api";

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
  const [report, setReport] = useState(null);
  const [forgePrompt, setForgePrompt] = useState("");
  const [forgeBusy, setForgeBusy] = useState(false);
  const [forgeErr, setForgeErr] = useState(null);

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
      if (res.compat) {
        setReport({ ...res.compat, slug: res.game.slug });
      } else {
        navigate(`/console/${res.game.slug}`);
      }
    } catch (e) {
      setErr(e.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const forge = async () => {
    setForgeErr(null);
    if (forgePrompt.trim().length < 3) {
      setForgeErr("Describe your game idea first.");
      return;
    }
    setForgeBusy(true);
    try {
      const res = await postJSON("/forge", { prompt: forgePrompt });
      navigate(`/games/${res.game.slug}`);
    } catch (e) {
      setForgeErr(e.response?.data?.detail || "Generation failed. Try again.");
    } finally {
      setForgeBusy(false);
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

      {report ? (
        <CompatReport report={report} onContinue={() => navigate(`/console/${report.slug}`)} />
      ) : (
        <>
          <div className="mt-8 border border-[#1A1A1A] p-5" data-testid="forge-panel">
            <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em] mb-2">
              Forge &middot; generate with AI
            </div>
            <p className="text-[#A1A1AA] text-sm mb-3">
              Describe a game and GoodGame builds a playable browser game from a built-in template &mdash; no upload needed.
            </p>
            <textarea
              data-testid="forge-prompt"
              value={forgePrompt}
              onChange={(e) => setForgePrompt(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. a neon arena shooter where enemies spawn in waves and get faster"
              className="input w-full"
            />
            {forgeErr && (
              <div className="text-[#FF3B30] text-sm font-mono mt-2" data-testid="forge-error">
                {forgeErr}
              </div>
            )}
            <button
              type="button"
              onClick={forge}
              disabled={forgeBusy}
              data-testid="forge-submit"
              className="mt-3 h-11 px-5 bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm hover:bg-[#E5C158] disabled:opacity-50"
            >
              {forgeBusy ? "Generating..." : "Generate game"}
            </button>
          </div>

          <div className="mt-8 flex items-center gap-3 text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em]">
            <span className="h-px bg-[#1A1A1A] flex-1" /> or upload your own <span className="h-px bg-[#1A1A1A] flex-1" />
          </div>

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
            {busy ? "Checking & publishing..." : "Publish game"}
          </button>
        </form>
        </>
      )}
    </div>
  );
}

function CompatReport({ report, onContinue }) {
  const scoreColor = report.score >= 85 ? "#34D399" : report.score >= 60 ? "#D4AF37" : "#FF3B30";
  const levelColor = (lvl) => (lvl === "pass" ? "#34D399" : lvl === "warn" ? "#D4AF37" : "#FF3B30");
  const levelIcon = (lvl) => (lvl === "pass" ? "✓" : lvl === "warn" ? "!" : "✕");

  return (
    <div className="mt-8" data-testid="compat-report">
      <div className="flex items-center gap-4 border border-[#27272A] p-5">
        <div className="text-5xl font-bold leading-none" style={{ color: scoreColor }}>
          {report.score}
        </div>
        <div>
          <div className="text-white font-bold uppercase tracking-wider">Published &middot; Compatibility check</div>
          <div className="text-[#A1A1AA] text-sm mt-1">
            Your game is live. Here is how it scored on GoodGame&rsquo;s browser-readiness checks.
          </div>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {report.checks.map((c) => (
          <li key={c.id} className="flex gap-3" data-testid={`compat-check-${c.id}`}>
            <span className="font-bold w-4 text-center shrink-0" style={{ color: levelColor(c.level) }}>
              {levelIcon(c.level)}
            </span>
            <div>
              <div className="text-white text-sm font-semibold">{c.title}</div>
              <div className="text-[#A1A1AA] text-xs leading-relaxed">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      {report.applied_fixes?.length > 0 && (
        <div className="mt-6 border border-[#27272A] p-4">
          <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">
            Auto-applied fixes
          </div>
          <ul className="space-y-1">
            {report.applied_fixes.map((f, i) => (
              <li key={i} className="text-[#A1A1AA] text-xs">&bull; {f}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onContinue}
        data-testid="compat-continue"
        className="mt-6 w-full h-12 bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#E5C158]"
      >
        Continue to console
      </button>
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
