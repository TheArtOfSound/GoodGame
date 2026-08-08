import { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postForm, postJSON } from "../lib/api";
import { authPath } from "../lib/navigation";
import {
  Check,
  FileArchive,
  Link2 as LinkIcon,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { CharacterCount, InlineNotice, PageHeader, PageLoader } from "../components/UIState";

const PATHS = [
  {
    id: "upload",
    icon: FileArchive,
    title: "Upload a build",
    detail: "Drop in an HTML5 zip. We host it for free.",
  },
  {
    id: "link",
    icon: LinkIcon,
    title: "Link a hosted game",
    detail: "Keep hosting it anywhere. We create the playable page.",
  },
  {
    id: "forge",
    icon: Sparkles,
    title: "Make one with AI",
    detail: "Describe an idea and start with a playable draft.",
  },
];

export default function CreateGame() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const requestedMethod = new URLSearchParams(location.search).get("method");
  const [method, setMethod] = useState(PATHS.some((path) => path.id === requestedMethod) ? requestedMethod : "upload");
  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState(null);
  const [embedUrl, setEmbedUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [forgePrompt, setForgePrompt] = useState("");
  const [forgeBusy, setForgeBusy] = useState(false);
  const [forgeErr, setForgeErr] = useState(null);

  if (authLoading) return <PageLoader label="Checking account" />;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={authPath("/login", next)} replace />;
  }

  const chooseMethod = (nextMethod) => {
    setMethod(nextMethod);
    setErr(null);
    setForgeErr(null);
  };

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".zip")) {
      setErr("Choose a .zip file containing your HTML5 game.");
      return;
    }
    setFile(nextFile);
    setErr(null);
    const suggestedTitle = nextFile.name.replace(/\.zip$/i, "").replace(/[-_]+/g, " ").trim();
    setTitle((current) => current || suggestedTitle);
  };

  const submit = async (event) => {
    event.preventDefault();
    setErr(null);
    if (method === "upload" && !file) {
      setErr("Drop in the .zip build you want GoodGame to host.");
      return;
    }
    if (method === "link" && !embedUrl.trim()) {
      setErr("Paste the https URL of the game you already host.");
      return;
    }

    setBusy(true);
    const form = new FormData();
    form.append("title", title);
    form.append("pitch", pitch);
    form.append("description", description);
    form.append("tags", tags);
    if (method === "upload") form.append("build", file);
    else form.append("embed_url", embedUrl.trim());

    try {
      const result = await postForm("/games", form);
      if (result.compat) setReport({ ...result.compat, slug: result.game.slug });
      else navigate(`/console/${result.game.slug}`);
    } catch (error) {
      setErr(error.response?.data?.detail || "Publishing failed. Your inputs are still here — try again.");
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
      const result = await postJSON("/forge", { prompt: forgePrompt });
      navigate(`/forge/${result.slug}`);
    } catch (error) {
      setForgeErr(error.response?.data?.detail || "Generation failed. Try again.");
    } finally {
      setForgeBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-14" data-testid="create-game-page">
      <PageHeader
        eyebrow="Creator tools"
        title="Publish a browser game"
        description="Choose the path you already have. Every option ends with one playable GoodGame page you can share."
      />

      {report ? (
        <CompatReport report={report} onContinue={() => navigate(`/console/${report.slug}`)} />
      ) : (
        <>
          <div className="mt-8 grid md:grid-cols-3 border border-[#242428]" aria-label="Publishing method">
            {PATHS.map((path) => {
              const Icon = path.icon;
              const active = method === path.id;
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => chooseMethod(path.id)}
                  aria-pressed={active}
                  data-testid={`create-method-${path.id}`}
                  className={`group min-h-32 p-4 text-left border-b last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 transition-colors ${
                    active ? "bg-[#D4AF37] text-black" : "bg-[#080808] border-[#242428] text-white hover:bg-[#101012]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <Icon className={`w-5 h-5 ${active ? "text-black" : "text-[#D4AF37]"}`} />
                    {active && <Check className="w-4 h-4" aria-hidden="true" />}
                  </span>
                  <span className="block font-bold mt-4">{path.title}</span>
                  <span className={`block text-sm mt-1 leading-snug ${active ? "text-black/75" : "text-[#8B8B95]"}`}>
                    {path.detail}
                  </span>
                </button>
              );
            })}
          </div>

          {method === "forge" ? (
            <section className="mt-8 border-y border-[#242428] py-7" data-testid="forge-panel">
              <div className="eyebrow mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Start from an idea
              </div>
              <h2 className="text-2xl font-bold text-white">What should the game feel like?</h2>
              <p className="text-[#A1A1AA] text-sm mt-2 max-w-2xl">
                GoodGame creates a real browser game you can play immediately, then refine with follow-up prompts before publishing.
              </p>
              <label htmlFor="forge-prompt" className="sr-only">Game idea</label>
              <textarea
                id="forge-prompt"
                data-testid="forge-prompt"
                value={forgePrompt}
                onChange={(event) => setForgePrompt(event.target.value)}
                rows={5}
                maxLength={500}
                autoFocus
                placeholder="A neon arena shooter where enemies arrive in waves and the soundtrack speeds up with each round…"
                className="input w-full mt-5"
              />
              <div className="flex justify-end mt-1"><CharacterCount value={forgePrompt} max={500} /></div>
              {forgeErr && <InlineNotice tone="error" className="mt-3" testId="forge-error">{forgeErr}</InlineNotice>}
              <button type="button" onClick={forge} disabled={forgeBusy} data-testid="forge-submit" className="btn-primary mt-4 h-12 px-6">
                <Sparkles className="w-4 h-4" /> {forgeBusy ? "Building your draft…" : "Generate playable draft"}
              </button>
            </section>
          ) : (
            <form onSubmit={submit} className="mt-8 grid lg:grid-cols-[1fr_0.8fr] gap-8 lg:gap-12">
              <div className="space-y-5">
                <div>
                  <div className="eyebrow mb-2">1 · Game</div>
                  <h2 className="text-2xl font-bold text-white">{method === "upload" ? "Add your build" : "Add your game URL"}</h2>
                </div>

                {method === "upload" ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                    }}
                    onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      chooseFile(event.dataTransfer.files?.[0]);
                    }}
                    className={`min-h-52 border border-dashed grid place-items-center p-6 text-center cursor-pointer transition-colors ${
                      dragging ? "border-[#D4AF37] bg-[#D4AF37]/10" : file ? "border-[#34D399] bg-[#07100C]" : "border-[#3A3A3A] bg-[#080808] hover:border-[#D4AF37]"
                    }`}
                    data-testid="create-dropzone"
                  >
                    <input
                      ref={fileInputRef}
                      id="create-build"
                      data-testid="create-build"
                      type="file"
                      accept=".zip,application/zip"
                      onChange={(event) => chooseFile(event.target.files?.[0])}
                      className="sr-only"
                    />
                    {file ? (
                      <div>
                        <Check className="w-8 h-8 text-[#34D399] mx-auto" />
                        <div className="text-white font-bold mt-3 break-all">{file.name}</div>
                        <div className="meta-text text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · ready to publish</div>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="mt-4 text-[#A1A1AA] hover:text-white text-xs inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-[#D4AF37] mx-auto" />
                        <div className="text-white font-bold mt-3">Drop your game zip here</div>
                        <div className="meta-text text-sm mt-1">or click to choose a file</div>
                        <div className="text-[#71717A] text-xs mt-4">index.html at the root · up to 90 MB</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-[#242428] bg-[#080808] p-5">
                    <label htmlFor="create-embed-url" className="block text-white font-bold mb-2">Playable https URL</label>
                    <input
                      id="create-embed-url"
                      data-testid="create-embed-url"
                      type="url"
                      inputMode="url"
                      maxLength={512}
                      value={embedUrl}
                      onChange={(event) => setEmbedUrl(event.target.value)}
                      placeholder="https://yourgame.example.com"
                      className="input"
                      autoFocus
                      required
                    />
                    <p className="meta-text text-xs mt-3 leading-relaxed">
                      Works with itch.io, GitHub Pages, Firebase, Vercel, Netlify, or your own domain. The page must allow embedding.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 text-sm text-[#A1A1AA]">
                  <Check className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>{method === "upload" ? "GoodGame hosts the build and runs a browser compatibility check." : "Your build stays on your host and updates there appear instantly."}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="eyebrow mb-2">2 · Listing</div>
                  <h2 className="text-2xl font-bold text-white">Make it easy to discover</h2>
                </div>
                <Field id="create-title" label="Title">
                  <input id="create-title" data-testid="create-title" value={title} onChange={(event) => setTitle(event.target.value)} className="input" required maxLength={120} />
                </Field>
                <Field id="create-pitch" label="One-line pitch">
                  <input id="create-pitch" data-testid="create-pitch" value={pitch} onChange={(event) => setPitch(event.target.value)} className="input" maxLength={240} placeholder="What makes it fun?" />
                </Field>
                <details className="border-y border-[#242428] py-3">
                  <summary className="cursor-pointer text-sm text-[#A1A1AA] hover:text-white">Add description and tags <span className="text-[#71717A]">(optional)</span></summary>
                  <div className="space-y-4 pt-4">
                    <Field id="create-description" label="Description">
                      <textarea id="create-description" data-testid="create-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="input" maxLength={4000} />
                      <div className="flex justify-end mt-1"><CharacterCount value={description} max={4000} /></div>
                    </Field>
                    <Field id="create-tags" label="Tags">
                      <input id="create-tags" data-testid="create-tags" value={tags} onChange={(event) => setTags(event.target.value)} className="input" placeholder="action, puzzle, retro" />
                    </Field>
                  </div>
                </details>
                {err && <InlineNotice tone="error" testId="create-error">{err}</InlineNotice>}
                <button type="submit" disabled={busy} data-testid="create-submit" className="btn-primary w-full h-12">
                  <Upload className="w-4 h-4" /> {busy ? "Checking & publishing…" : method === "upload" ? "Upload & publish" : "Create playable page"}
                </button>
                <p className="text-[#71717A] text-xs text-center">Free to publish. You keep ownership of your game.</p>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function CompatReport({ report, onContinue }) {
  const scoreColor = report.score >= 85 ? "#34D399" : report.score >= 60 ? "#D4AF37" : "#FF3B30";
  const levelColor = (level) => (level === "pass" ? "#34D399" : level === "warn" ? "#D4AF37" : "#FF3B30");
  const levelIcon = (level) => (level === "pass" ? "✓" : level === "warn" ? "!" : "✕");

  return (
    <div className="mt-8" data-testid="compat-report">
      <div className="flex items-center gap-4 border border-[#27272A] p-5">
        <div className="text-5xl font-bold leading-none" style={{ color: scoreColor }}>{report.score}</div>
        <div>
          <div className="text-white font-bold uppercase tracking-wider">Published &middot; Compatibility check</div>
          <div className="text-[#A1A1AA] text-sm mt-1">Your game is live. Here is how it scored on GoodGame&rsquo;s browser-readiness checks.</div>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {report.checks.map((check) => (
          <li key={check.id} className="flex gap-3" data-testid={`compat-check-${check.id}`}>
            <span className="font-bold w-4 text-center shrink-0" style={{ color: levelColor(check.level) }}>{levelIcon(check.level)}</span>
            <div>
              <div className="text-white text-sm font-semibold">{check.title}</div>
              <div className="text-[#A1A1AA] text-xs leading-relaxed">{check.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      {report.applied_fixes?.length > 0 && (
        <div className="mt-6 border border-[#27272A] p-4">
          <div className="text-[#71717A] font-mono text-xs uppercase tracking-[0.2em] mb-2">Auto-applied fixes</div>
          <ul className="space-y-1">{report.applied_fixes.map((fix, index) => <li key={index} className="text-[#A1A1AA] text-xs">&bull; {fix}</li>)}</ul>
        </div>
      )}
      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        <a href={`/games/${report.slug}`} className="btn-primary h-12">Play & share</a>
        <button onClick={onContinue} data-testid="compat-continue" className="btn-secondary h-12">Open creator console</button>
      </div>
    </div>
  );
}

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[#A1A1AA] font-mono text-xs uppercase tracking-[0.2em] mb-2">{label}</label>
      {children}
    </div>
  );
}
