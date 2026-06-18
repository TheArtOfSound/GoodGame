import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getJSON, postForm } from "../lib/api";
import GameCard from "../components/GameCard";
import { BACKEND_URL } from "../lib/config";

export default function CreatorConsole() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!slug) return <ConsoleHome user={user} />;
  return <GameConsole slug={slug} user={user} />;
}

function ConsoleHome({ user }) {
  const [games, setGames] = useState([]);
  useEffect(() => {
    getJSON("/creator/games").then((d) => setGames(d.games || []));
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="console-home">
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        Creator console
      </div>
      <h1 className="text-3xl font-bold uppercase text-white mt-2">Your games</h1>
      <div className="mt-6 flex gap-3">
        <Link
          to="/create"
          data-testid="console-upload-cta"
          className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11 flex items-center"
        >
          Upload new game
        </Link>
      </div>
      {games.length === 0 ? (
        <div className="text-[#A1A1AA] border border-dashed border-[#1A1A1A] p-8 text-center mt-8" data-testid="console-empty">
          You haven&apos;t uploaded any games yet.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
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

  useEffect(() => {
    getJSON(`/games/${slug}`)
      .then(setData)
      .catch(() => setErr("Not found"));
  }, [slug]);

  if (err) return <div className="px-8 py-16 text-[#A1A1AA]">{err}</div>;
  if (!data) return <div className="px-8 py-16 text-[#52525B]">Loading...</div>;

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

  const cover = game.cover_image ? `${BACKEND_URL}${game.cover_image}?v=${game.updated_at}` : null;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-10" data-testid="game-console">
      <div>
        <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
          Manage
        </div>
        <h1 className="text-3xl font-bold uppercase text-white mt-2">{game.title}</h1>
        <Link
          to={`/games/${slug}`}
          className="text-[#A1A1AA] hover:text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em]"
        >
          View public page &rarr;
        </Link>
      </div>

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
            <input
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
            {thumbMsg && <div className="text-sm font-mono text-[#A1A1AA]">{thumbMsg}</div>}
          </form>
        </div>
      </Section>

      <Section title="Replace build">
        <form onSubmit={updateBuild} className="space-y-3 max-w-lg">
          <input
            type="file"
            name="build"
            data-testid="build-input"
            accept=".zip,application/zip"
            className="block text-white font-mono text-sm"
            required
          />
          <input name="version" placeholder="Version (e.g. 1.1.0)" className="input" />
          <textarea name="notes" placeholder="Patch notes" rows={3} className="input" />
          <button
            disabled={buildBusy}
            data-testid="build-submit"
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
          >
            {buildBusy ? "Uploading..." : "Replace build"}
          </button>
          {buildMsg && <div className="text-sm font-mono text-[#A1A1AA]">{buildMsg}</div>}
        </form>
      </Section>

      <Section title="Add patch note">
        <form onSubmit={addPatch} className="space-y-3 max-w-lg">
          <input name="version" placeholder="Version" className="input" required />
          <textarea name="notes" placeholder="What changed?" rows={4} className="input" required />
          <button
            disabled={patchBusy}
            data-testid="patch-submit"
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
          >
            {patchBusy ? "Posting..." : "Post note"}
          </button>
          {patchMsg && <div className="text-sm font-mono text-[#A1A1AA]">{patchMsg}</div>}
        </form>
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
