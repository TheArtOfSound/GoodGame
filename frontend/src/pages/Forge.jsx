import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../lib/config";
import SEO from "../components/SEO";
import { CharacterCount, ErrorState, InlineNotice, PageLoader } from "../components/UIState";

export default function Forge() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [game, setGame] = useState(null);
  const [err, setErr] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [runReport, setRunReport] = useState(null);
  const [runBusy, setRunBusy] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [v, setV] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    getJSON(`/games/${slug}`)
      .then((d) => setGame(d.game))
      .catch(() => setErr("Not found"));
  }, [slug]);

  if (authLoading) return <PageLoader label="Checking creator account" />;
  if (!user) return <Navigate to="/login" replace />;
  if (err) return <div className="max-w-3xl mx-auto px-4 py-16"><ErrorState title="Forge draft unavailable" body={err} /></div>;
  if (!game) return <PageLoader label="Loading Forge workspace" />;
  if (game.owner_id !== user.id)
    return <div className="px-8 py-16 text-[#A1A1AA]" data-testid="forge-not-owner">You don&apos;t own this draft.</div>;

  const published = game.status === "published";
  const src = `${BACKEND_URL}/api/ugc/${game.id}/${game.upload_entry}?v=${v}`;

  const refine = async (e) => {
    if (e) e.preventDefault();
    if (prompt.trim().length < 2) {
      setMsg("Tell me what to change.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await postJSON(`/games/${slug}/forge-refine`, { prompt });
      setPrompt("");
      setMsg("Updated — preview reloaded.");
      setV((n) => n + 1);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Edit failed.");
    } finally {
      setBusy(false);
    }
  };

  const runCheck = async () => {
    setRunBusy(true);
    setRunReport(null);
    try {
      const r = await postJSON(`/games/${slug}/runtime-check`, {});
      setRunReport(r.report);
    } catch (e) {
      setRunReport({ error: e.response?.data?.detail || "Check failed" });
    } finally {
      setRunBusy(false);
    }
  };

  const publish = async () => {
    setPubBusy(true);
    try {
      await postJSON(`/games/${slug}/publish`, {});
      navigate(`/games/${slug}`);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Publish failed.");
      setPubBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="forge-workspace">
      <SEO title={`Forge · ${game.title}`} path={`/forge/${slug}`} noindex />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
            Forge workspace &middot; {published ? "Published" : "Draft"}
          </div>
          <h1 className="text-2xl font-bold uppercase text-white mt-1">{game.title}</h1>
        </div>
        <div className="flex gap-2">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="border border-[#1A1A1A] hover:border-white text-white text-sm px-4 h-11 flex items-center uppercase tracking-wider font-bold"
          >
            Open
          </a>
          <button
            onClick={publish}
            disabled={pubBusy || published}
            data-testid="forge-publish"
            className="bg-[#34D399] text-black font-bold uppercase tracking-wider text-sm px-5 h-11 disabled:opacity-50"
          >
            {published ? "Published" : pubBusy ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <div className="bg-black border border-[#1A1A1A]">
            <iframe
              key={v}
              ref={frameRef}
              title={game.title}
              src={src}
              sandbox="allow-scripts allow-pointer-lock allow-forms"
              allow="fullscreen; autoplay; gamepad"
              className="w-full aspect-video bg-black"
              data-testid="forge-preview"
            />
          </div>
          {published && (
            <p className="text-[#34D399] text-sm mt-3">
              Live now &mdash; view the <a className="underline" href={`/games/${slug}`}>public page</a>.
            </p>
          )}
        </div>

        <aside className="space-y-5">
          <form onSubmit={refine} className="border border-[#1A1A1A] p-4">
            <label htmlFor="forge-refine-input" className="block text-[#71717A] font-mono text-xs uppercase tracking-[0.2em] mb-2">
              Refine with a prompt
            </label>
            <textarea
              id="forge-refine-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="e.g. make enemies faster, add a shield power-up, use a blue palette"
              className="input w-full"
              data-testid="forge-refine-input"
            />
            <div className="flex justify-end mt-1"><CharacterCount value={prompt} max={600} /></div>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button
                disabled={busy}
                data-testid="forge-refine-btn"
                className="btn-primary"
              >
                {busy ? "Editing…" : "Apply change"}
              </button>
              {msg && <InlineNotice tone={msg.includes("failed") || msg.includes("Tell") ? "error" : "success"}>{msg}</InlineNotice>}
            </div>
          </form>

          <div className="border border-[#1A1A1A] p-4">
            <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">Test</div>
            <button
              onClick={runCheck}
              disabled={runBusy}
              data-testid="forge-runtime-btn"
              className="bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#D4AF37] text-white text-sm px-4 h-10 uppercase tracking-wider font-bold disabled:opacity-50"
            >
              {runBusy ? "Checking…" : "Run runtime check"}
            </button>
            {runReport && (
              <div className="mt-3 text-sm" data-testid="forge-runtime-report">
                {runReport.error ? (
                  <div className="text-[#FF3B30] font-mono">{runReport.error}</div>
                ) : (
                  <>
                    <div className={runReport.ok ? "text-[#34D399] font-bold" : "text-[#D4AF37] font-bold"}>
                      {runReport.ok ? "Renders, no errors" : runReport.rendered ? "Renders, with issues" : "Did not render"}
                    </div>
                    {runReport.note && <div className="text-[#A1A1AA] mt-1 text-xs">{runReport.note}</div>}
                    {runReport.errors && runReport.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-[#A1A1AA] font-mono text-xs">
                        {runReport.errors.map((e, i) => (
                          <li key={i}>&bull; {e}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <p className="text-[#52525B] text-xs leading-relaxed">
            Drafts stay private until you publish. Keep refining with prompts, test in a real browser, then publish to your catalog.
          </p>
        </aside>
      </div>
    </div>
  );
}
