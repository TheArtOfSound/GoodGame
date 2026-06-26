import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getJSON, postForm, postJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import { BACKEND_URL } from "../lib/config";
import { Upload } from "lucide-react";
import { EmptyState, ErrorState, InlineNotice, PageHeader, PageLoader } from "../components/UIState";
import { FormField } from "../components/FormControls";

export default function CreatorConsole() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <PageLoader label="Checking creator account" />;
  if (!user) return <Navigate to="/login" replace />;

  if (!slug) return <ConsoleHome user={user} />;
  return <GameConsole slug={slug} user={user} />;
}

function ConsoleHome({ user }) {
  const [games, setGames] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    getJSON("/creator/games")
      .then((d) => setGames(d.games || []))
      .catch(() => {
        setGames([]);
        setError(true);
      });
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="console-home">
      <PageHeader
        eyebrow="Creator console"
        title="Your games"
        description={`Manage releases and browser-readiness checks for @${user.username}.`}
        actions={<Link to="/create" data-testid="console-upload-cta" className="btn-primary"><Upload className="w-4 h-4" /> New game</Link>}
      />
      {!games ? (
        <PageLoader label="Loading your games" />
      ) : error ? (
        <ErrorState className="mt-8" title="Your games could not load" body="The creator catalog request failed." />
      ) : games.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Upload}
          testId="console-empty"
          title="No games published"
          body="Generate a draft or upload an HTML5 zip to start your catalog."
          action={<Link to="/create" className="btn-primary">Create a game</Link>}
        />
      ) : (
        <div className="mt-8 game-grid">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function GameConsole({ slug, user }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [thumbMsg, setThumbMsg] = useState(null);
  const [patchBusy, setPatchBusy] = useState(false);
  const [patchMsg, setPatchMsg] = useState(null);
  const [buildBusy, setBuildBusy] = useState(false);
  const [buildMsg, setBuildMsg] = useState(null);
  const [runBusy, setRunBusy] = useState(false);
  const [runReport, setRunReport] = useState(null);

  useEffect(() => {
    getJSON(`/games/${slug}`)
      .then(setData)
      .catch(() => setErr("Not found"));
  }, [slug]);

  if (err) return <div className="max-w-3xl mx-auto px-4 py-16"><ErrorState title="Game console unavailable" body={err} /></div>;
  if (!data) return <PageLoader label="Loading game console" />;

  const { game } = data;
  if (game.owner_id !== user.id)
    return (
      <div className="px-8 py-16 text-[#A1A1AA]" data-testid="console-not-owner">
        You don&apos;t own this game.
      </div>
    );

  const uploadThumb = async (e) => {
    e.preventDefault();
    const file = e.target.elements.thumb.files?.[0];
    if (!file) return;
    setThumbBusy(true);
    setThumbMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await postForm(`/games/${slug}/thumbnail`, fd);
      setThumbMsg("Thumbnail updated");
      setData({ ...data, game: { ...game, cover_image: r.cover_image, updated_at: new Date().toISOString() } });
    } catch (e) {
      setThumbMsg(e.response?.data?.detail || "Upload failed");
    } finally {
      setThumbBusy(false);
    }
  };

  const updateBuild = async (e) => {
    e.preventDefault();
    const file = e.target.elements.build.files?.[0];
    if (!file) return;
    setBuildBusy(true);
    setBuildMsg(null);
    const fd = new FormData();
    fd.append("build", file);
    fd.append("version", e.target.elements.version.value);
    fd.append("notes", e.target.elements.notes.value);
    try {
      await postForm(`/games/${slug}/build`, fd);
      setBuildMsg("Build updated");
      e.target.reset();
    } catch (e) {
      setBuildMsg(e.response?.data?.detail || "Upload failed");
    } finally {
      setBuildBusy(false);
    }
  };

  const addPatch = async (e) => {
    e.preventDefault();
    setPatchBusy(true);
    setPatchMsg(null);
    const fd = new FormData();
    fd.append("version", e.target.elements.version.value);
    fd.append("notes", e.target.elements.notes.value);
    try {
      await postForm(`/games/${slug}/patch`, fd);
      setPatchMsg("Patch note posted");
      e.target.reset();
    } catch (e) {
      setPatchMsg(e.response?.data?.detail || "Failed");
    } finally {
      setPatchBusy(false);
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

  const cover = game.cover_image ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at}` : null;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-10" data-testid="game-console">
      <PageHeader
        eyebrow="Manage"
        title={game.title}
        description="Update media and builds, publish release notes, and verify the live browser runtime."
        actions={<Link to={`/games/${slug}`} className="btn-secondary">View public page</Link>}
      />

      <Section title="Thumbnail">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-48 aspect-video bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden">
            {cover ? (
              <img src={cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#52525B] font-mono text-xs">
                No thumbnail
              </div>
            )}
          </div>
          <form onSubmit={uploadThumb} className="flex-1 min-w-[260px] space-y-3">
            <label htmlFor="thumb-input" className="block text-[#71717A] font-mono text-xs uppercase tracking-[0.2em]">Thumbnail image</label>
            <input
              id="thumb-input"
              type="file"
              name="thumb"
              data-testid="thumb-input"
              accept="image/png,image/jpeg,image/webp"
              className="block text-white font-mono text-sm"
              required
            />
            <button
              type="submit"
              disabled={thumbBusy}
              data-testid="thumb-submit"
              className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
            >
              {thumbBusy ? "Uploading..." : "Upload thumbnail"}
            </button>
            {thumbMsg && <InlineNotice tone={thumbMsg.includes("updated") ? "success" : "error"}>{thumbMsg}</InlineNotice>}
          </form>
        </div>
      </Section>

      <Section title="Replace build">
        <form onSubmit={updateBuild} className="space-y-3 max-w-lg">
          <label htmlFor="build-input" className="block text-[#71717A] font-mono text-xs uppercase tracking-[0.2em]">Build zip</label>
          <input
            id="build-input"
            type="file"
            name="build"
            data-testid="build-input"
            accept=".zip,application/zip"
            className="block text-white font-mono text-sm"
            required
          />
          <FormField id="build-version" label="Version" hint="For example, 1.1.0">
            <input id="build-version" name="version" className="input" aria-describedby="build-version-hint" />
          </FormField>
          <FormField id="build-notes" label="Patch notes">
            <textarea id="build-notes" name="notes" rows={3} className="input" />
          </FormField>
          <button
            disabled={buildBusy}
            data-testid="build-submit"
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
          >
            {buildBusy ? "Uploading..." : "Replace build"}
          </button>
          {buildMsg && <InlineNotice tone={buildMsg.includes("updated") ? "success" : "error"}>{buildMsg}</InlineNotice>}
        </form>
      </Section>

      <Section title="Add patch note">
        <form onSubmit={addPatch} className="space-y-3 max-w-lg">
          <FormField id="patch-version" label="Version">
            <input id="patch-version" name="version" className="input" required />
          </FormField>
          <FormField id="patch-notes" label="What changed">
            <textarea id="patch-notes" name="notes" rows={4} className="input" required />
          </FormField>
          <button
            disabled={patchBusy}
            data-testid="patch-submit"
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
          >
            {patchBusy ? "Posting..." : "Post note"}
          </button>
          {patchMsg && <InlineNotice tone={patchMsg.includes("posted") ? "success" : "error"}>{patchMsg}</InlineNotice>}
        </form>
      </Section>

      <Section title="Runtime check">
        <p className="text-[#A1A1AA] text-sm mb-3 max-w-lg">
          Loads your game in a real headless browser and reports whether it renders and any console errors.
        </p>
        <button
          onClick={runCheck}
          disabled={runBusy}
          data-testid="runtime-check-btn"
          className="btn-primary"
        >
          {runBusy ? "Checking..." : "Run runtime check"}
        </button>
        {runReport && (
          <div className="mt-4 border border-[#1A1A1A] p-4 max-w-lg text-sm" data-testid="runtime-report">
            {runReport.error ? (
              <div className="text-[#FF3B30] font-mono">{runReport.error}</div>
            ) : (
              <>
                <div className={runReport.ok ? "text-[#34D399] font-bold" : "text-[#D4AF37] font-bold"}>
                  {runReport.ok
                    ? "Renders, no console errors"
                    : runReport.rendered
                    ? "Renders, but with issues"
                    : "Did not render"}
                </div>
                {runReport.note && <div className="text-[#A1A1AA] mt-1">{runReport.note}</div>}
                {runReport.errors && runReport.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[#A1A1AA] font-mono text-xs">
                    {runReport.errors.map((er, i) => (
                      <li key={i}>&bull; {er}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-[#1A1A1A] pb-2">
        {title}
      </div>
      {children}
    </section>
  );
}
