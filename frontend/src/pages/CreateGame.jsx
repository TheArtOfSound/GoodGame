import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getJSON, postForm, postJSON } from "../lib/api";
import { authPath } from "../lib/navigation";
import SEO from "../components/SEO";
import ForgeLoader from "../components/ForgeLoader";
import {
  Check,
  FileArchive,
  Link2 as LinkIcon,
  Sparkles,
  Upload,
  X,
  Gamepad2,
  Shield,
  Zap,
  Dices,
} from "lucide-react";
import { CharacterCount, InlineNotice, PageHeader, PageLoader } from "../components/UIState";

const PATHS = [
  {
    id: "upload",
    icon: FileArchive,
    title: "Upload a build",
    detail: "Drop an HTML5 .zip. We host it free and give you a play page.",
  },
  {
    id: "link",
    icon: LinkIcon,
    title: "Link a hosted game",
    detail: "Paste a browser play URL (itch web, GitHub Pages, your domain).",
  },
  {
    id: "forge",
    icon: Sparkles,
    title: "Make one with AI",
    detail: "Pick a recipe DNA + idea — Forge designs menus, systems, then codes a playable draft.",
  },
];

const STEPS = [
  { n: "1", t: "Stamp a pass", d: "Join in under a minute — no wallet needed." },
  { n: "2", t: "Wheel it in", d: "HTML5 zip we host, or a public browser URL." },
  { n: "3", t: "Lights on", d: "Share /games/your-slug — playable in one click." },
];

/** Client-side gate before hitting the API (store links are not browser builds). */
function storeLinkError(url) {
  const s = (url || "").trim().toLowerCase();
  if (!s) return null;
  if (
    /play\.google\.com|apps\.apple\.com|itunes\.apple\.com|store\.steampowered\.com|microsoft\.com\/.*store/i.test(s) ||
    /\/store\/apps\/details|\/app\/id\d+/i.test(s)
  ) {
    return "That looks like an app store link. GoodGame needs a browser-playable page or an HTML5 .zip we can host — not Google Play / App Store / Steam storefronts.";
  }
  return null;
}

export default function CreateGame() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const requestedMethod = new URLSearchParams(location.search).get("method");
  const [method, setMethod] = useState(
    PATHS.some((path) => path.id === requestedMethod) ? requestedMethod : "upload"
  );
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
  const [forgeDone, setForgeDone] = useState(false);
  const [forgeErr, setForgeErr] = useState(null);
  const [recipeCatalog, setRecipeCatalog] = useState(null);
  const [recipe, setRecipe] = useState({});

  useEffect(() => {
    if (method !== "forge") return;
    getJSON("/forge/recipes")
      .then((d) => {
        setRecipeCatalog(d);
        // default random DNA so first generate always has a full combo
        if (d?.dimensions?.length) {
          const picks = {};
          for (const dim of d.dimensions) {
            const opt = dim.options[Math.floor(Math.random() * dim.options.length)];
            picks[dim.id] = opt.id;
          }
          setRecipe(picks);
        }
      })
      .catch(() => setRecipeCatalog(null));
  }, [method]);

  const recipeLabels = useMemo(() => {
    if (!recipeCatalog?.dimensions) return [];
    return recipeCatalog.dimensions
      .map((dim) => {
        const opt = dim.options.find((o) => o.id === recipe[dim.id]);
        return opt ? opt.label : null;
      })
      .filter(Boolean);
  }, [recipeCatalog, recipe]);

  const surpriseRecipe = () => {
    if (!recipeCatalog?.dimensions) return;
    const picks = {};
    for (const dim of recipeCatalog.dimensions) {
      const opt = dim.options[Math.floor(Math.random() * dim.options.length)];
      picks[dim.id] = opt.id;
    }
    setRecipe(picks);
  };

  if (authLoading) return <PageLoader label="Checking account" />;

  const nextPath = `${location.pathname}${location.search || "?method=upload"}`;

  // Logged-out: full publish marketing (no hard bounce to login)
  if (!user) {
    return (
      <div data-testid="create-game-guest" className="create-guest alley-dock">
        <SEO
          title="Host Your Browser Game Free — Publish HTML5 Games on GoodGame.center"
          description="Upload an HTML5 or WebGL zip and GoodGame hosts it for free, or link a playable browser URL. Live play page in minutes. No app store, no wallet."
          path="/create"
        />
        <div className="alley-dock-hero">
          <img src="/brand/alley/dock.webp" alt="" width={1280} height={720} />
          <div className="alley-rain" aria-hidden="true" />
          <div className="alley-dock-copy">
            <div className="alley-stamp">LOADING BAY</div>
            <h1>
              Wheel a machine
              <span> in.</span>
            </h1>
            <p>
              Drop an HTML5 zip on the dock and we plug it into the row. Or paste a playable browser URL.
              You keep the keys.
            </p>
            <div className="alley-arrival-cta">
              <Link
                to={authPath("/onboarding", nextPath)}
                className="btn-primary h-12 px-7"
                data-testid="create-guest-join"
              >
                <Upload className="w-4 h-4" /> Stamp a pass &amp; plug in
              </Link>
              <Link
                to={authPath("/login", nextPath)}
                className="btn-secondary h-12 px-6"
                data-testid="create-guest-login"
              >
                Back door
              </Link>
            </div>
            <p className="meta-text text-xs mt-4 max-w-lg">
              App-store links stay on the truck. We need a{" "}
              <strong className="text-[#C9C9D1] font-semibold">browser</strong> build — zip or https play page.
            </p>
          </div>
        </div>

        <div className="alley-dock-bay">
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="alley-crate">
                <em>{s.n}</em>
                <div className="text-white font-bold mt-3">{s.t}</div>
                <p className="text-[#8B8B95] text-sm mt-1 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Three bays</h2>
          <div className="grid md:grid-cols-3 border border-[rgba(232,165,75,0.28)]">
            {PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <div
                  key={path.id}
                  className="p-5 border-b last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 border-[rgba(232,165,75,0.2)] bg-[#080808]/80"
                >
                  <Icon className="w-5 h-5 text-[var(--sodium)]" />
                  <div className="font-bold text-white mt-3">{path.title}</div>
                  <p className="text-sm text-[#8B8B95] mt-1 leading-snug">{path.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 alley-crate flex flex-col md:flex-row gap-6 items-start">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-[var(--sodium)] shrink-0" />
              <div>
                <div className="text-white font-bold">What rolls in</div>
                <p className="text-[#8B8B95] text-sm mt-1">
                  HTML5 / WebGL / Unity Web / Godot Web zips · itch.io web embeds · GitHub Pages · Vercel · Netlify · your domain
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-[var(--sodium)] shrink-0" />
              <div>
                <div className="text-white font-bold">What stays on the truck</div>
                <p className="text-[#8B8B95] text-sm mt-1">
                  Play Store / App Store only · native APKs with no web build · pages that block framing (unless you host the zip with us)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              to={authPath("/onboarding", nextPath)}
              className="btn-primary h-12 px-8 inline-flex"
              data-testid="create-guest-join-bottom"
            >
              <Gamepad2 className="w-4 h-4" /> Open the bay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const chooseMethod = (nextMethod) => {
    setMethod(nextMethod);
    setErr(null);
    setForgeErr(null);
  };

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".zip")) {
      setErr("Choose a .zip file containing your HTML5 game (index.html at the root).");
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
    if (method === "link") {
      if (!embedUrl.trim()) {
        setErr("Paste the https URL of the browser game you already host.");
        return;
      }
      const storeErr = storeLinkError(embedUrl);
      if (storeErr) {
        setErr(storeErr);
        return;
      }
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
      else if (result.play_mode === "external" || result.game?.engine === "external") {
        // Linked URL blocks iframes — still published; play opens original site
        navigate(`/games/${result.game.slug}?listed=external`);
      } else navigate(`/console/${result.game.slug}`);
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
    setForgeDone(false);
    try {
      const result = await postJSON("/forge", { prompt: forgePrompt, recipe });
      setForgeDone(true);
      // brief beat so the loader can show "Draft ready"
      await new Promise((r) => setTimeout(r, 700));
      navigate(`/forge/${result.slug}`);
    } catch (error) {
      setForgeErr(error.response?.data?.detail || "Generation failed. Try again.");
      setForgeBusy(false);
      setForgeDone(false);
    }
  };

  return (
    <div className="alley-dock-bay" data-testid="create-game-page">
      <ForgeLoader
        active={forgeBusy}
        done={forgeDone}
        prompt={forgePrompt}
        recipeLabels={recipeLabels}
      />
      <SEO
        title="Host Your Browser Game Free — Publish HTML5 Games on GoodGame.center"
        description="Upload an HTML5 or WebGL zip and GoodGame hosts it for free, or link a playable browser URL. Live play page in minutes."
        path="/create"
      />
      <PageHeader
        eyebrow="Loading bay"
        title="Wheel a machine in"
        description="Upload a zip we host, link a browser URL, or generate a draft. Every path ends with a cabinet on the row."
      />

      <div className="mt-4 surface px-4 py-3 text-sm text-[#C9C9D1] flex gap-2 items-start">
        <Check className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
        <span>
          <strong className="text-white">Hosting path:</strong> zip upload = we store and serve your build.
          Link = you keep hosting; we embed the play page. App store links are not enough.
        </span>
      </div>

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
                <Sparkles className="w-4 h-4" /> Forge · deep design
              </div>
              <h2 className="text-2xl font-bold text-white">Build a game from DNA + idea</h2>
              <p className="text-[#A1A1AA] text-sm mt-2 max-w-2xl">
                Pick recipe dimensions (tens of thousands of combos), describe the fantasy, then Forge
                designs menus, HUD, buttons, systems — and codes a playable single-file game.
              </p>
              {recipeCatalog?.combo_count ? (
                <p className="text-[#D4AF37] font-mono text-[11px] uppercase tracking-[0.16em] mt-3">
                  {Number(recipeCatalog.combo_count).toLocaleString()} possible DNA combinations
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                <div className="text-white font-bold text-sm">Design DNA</div>
                <button
                  type="button"
                  onClick={surpriseRecipe}
                  className="btn-secondary h-9 px-3 text-xs"
                  data-testid="forge-surprise"
                >
                  <Dices className="w-3.5 h-3.5" /> Surprise me
                </button>
              </div>

              {recipeCatalog?.dimensions ? (
                <div className="forge-recipe-grid" data-testid="forge-recipe-grid">
                  {recipeCatalog.dimensions.map((dim) => (
                    <div key={dim.id} className="forge-recipe-dim">
                      <label htmlFor={`recipe-${dim.id}`}>{dim.label}</label>
                      <select
                        id={`recipe-${dim.id}`}
                        value={recipe[dim.id] || ""}
                        onChange={(e) => setRecipe((r) => ({ ...r, [dim.id]: e.target.value }))}
                        data-testid={`forge-recipe-${dim.id}`}
                      >
                        {dim.options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="meta-text text-sm mt-3">Loading recipe catalog…</p>
              )}

              <label htmlFor="forge-prompt" className="block text-white font-bold mt-6 mb-2">
                Your idea
              </label>
              <textarea
                id="forge-prompt"
                data-testid="forge-prompt"
                value={forgePrompt}
                onChange={(event) => setForgePrompt(event.target.value)}
                rows={4}
                maxLength={800}
                autoFocus
                placeholder="A courier droid dodging office drones while delivering memos before the inbox overflows…"
                className="input w-full"
              />
              <div className="flex justify-end mt-1"><CharacterCount value={forgePrompt} max={800} /></div>
              {forgeErr && <InlineNotice tone="error" className="mt-3" testId="forge-error">{forgeErr}</InlineNotice>}
              <button
                type="button"
                onClick={forge}
                disabled={forgeBusy}
                data-testid="forge-submit"
                className="btn-primary mt-4 h-12 px-6"
              >
                <Sparkles className="w-4 h-4" />{" "}
                {forgeBusy ? "Creating your game…" : "Design & generate game"}
              </button>
            </section>
          ) : (
            <form onSubmit={submit} className="mt-8 grid lg:grid-cols-[1fr_0.8fr] gap-8 lg:gap-12">
              <div className="space-y-5">
                <div>
                  <div className="eyebrow mb-2">1 · Game</div>
                  <h2 className="text-2xl font-bold text-white">
                    {method === "upload" ? "Upload zip — we host it" : "Browser play URL"}
                  </h2>
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
                        <div className="meta-text text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · ready to host</div>
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
                        <div className="text-white font-bold mt-3">Drop your HTML5 game zip here</div>
                        <div className="meta-text text-sm mt-1">or click to choose a file</div>
                        <div className="text-[#71717A] text-xs mt-4">index.html at the root · up to 90 MB · free hosting</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-[#242428] bg-[#080808] p-5">
                    <label htmlFor="create-embed-url" className="block text-white font-bold mb-2">
                      Playable https URL (browser only)
                    </label>
                    <input
                      id="create-embed-url"
                      data-testid="create-embed-url"
                      type="url"
                      inputMode="url"
                      maxLength={512}
                      value={embedUrl}
                      onChange={(event) => {
                        setEmbedUrl(event.target.value);
                        const se = storeLinkError(event.target.value);
                        if (se) setErr(se);
                        else if (err && storeLinkError(err) === null) setErr(null);
                      }}
                      placeholder="https://yourgame.example.com or itch.io/embed/…"
                      className="input"
                      autoFocus
                      required
                    />
                    <p className="meta-text text-xs mt-3 leading-relaxed">
                      Works with itch.io web, GitHub Pages, Firebase, Vercel, Netlify, or your domain.
                      If the site blocks iframes (X-Frame-Options), we still list it and Play opens on the original site.
                      For play <em>inside</em> GoodGame, upload a .zip instead.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 text-sm text-[#A1A1AA]">
                  <Check className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>
                    {method === "upload"
                      ? "GoodGame hosts the build on our CDN and runs a browser compatibility check."
                      : "Your build stays on your host; updates there show on GoodGame immediately."}
                  </span>
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
                  <summary className="cursor-pointer text-sm text-[#A1A1AA] hover:text-white">
                    Add description and tags <span className="text-[#71717A]">(optional)</span>
                  </summary>
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
                  <Upload className="w-4 h-4" />{" "}
                  {busy
                    ? "Checking & publishing…"
                    : method === "upload"
                      ? "Upload, host & publish"
                      : "Create playable page"}
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
          <div className="text-white font-bold uppercase tracking-wider">Published &middot; Live on GoodGame</div>
          <div className="text-[#A1A1AA] text-sm mt-1">
            Your game is hosted and searchable. Share the play link with players.
          </div>
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
        <a href={`/games/${report.slug}`} className="btn-primary h-12">Play &amp; share</a>
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
