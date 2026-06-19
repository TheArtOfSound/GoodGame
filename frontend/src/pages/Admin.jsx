import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, LogOut, RotateCcw, Search, Shield, Trash2 } from "lucide-react";
import { getJSON, postJSON } from "../lib/api";
import SEO from "../components/SEO";

const filters = [
  ["active", "Active"],
  ["removed", "Removed"],
  ["all", "All"],
];

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(null);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [state, setState] = useState("active");
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState({ active: 0, removed: 0 });
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (nextState = state) => {
    const data = await getJSON(`/admin/games?state=${nextState}`);
    setGames(data.games || []);
    setStats(data.stats || { active: 0, removed: 0 });
  };

  useEffect(() => {
    getJSON("/admin/session")
      .then((s) => {
        setLoggedIn(!!s.logged_in);
        if (s.logged_in) load();
      })
      .catch(() => setLoggedIn(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) =>
      [g.title, g.slug, g.owner_username, g.engine, ...(g.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [games, query]);

  const login = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await postJSON("/admin/login", { password });
      setPassword("");
      setLoggedIn(true);
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Admin login failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await postJSON("/admin/logout", {});
    setLoggedIn(false);
    setGames([]);
  };

  const switchState = async (next) => {
    setState(next);
    await load(next);
  };

  const deleteGame = async (game) => {
    const reason = window.prompt(`Delete "${game.title}" from public GoodGame?`, "bad_faith_or_policy_violation");
    if (!reason) return;
    await postJSON(`/admin/games/${game.id}/delete`, { reason });
    await load();
  };

  const restoreGame = async (game) => {
    if (!window.confirm(`Restore "${game.title}" to the public catalog?`)) return;
    await postJSON(`/admin/games/${game.id}/restore`, {});
    await load();
  };

  if (loggedIn === null) return <div className="px-8 py-10 text-[#52525B]">Loading...</div>;

  if (!loggedIn) {
    return (
      <main className="min-h-[70vh] max-w-md mx-auto px-4 py-20" data-testid="admin-login-page">
        <SEO title="Admin" path="/admin" noindex />
        <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em] flex items-center gap-2">
          <Shield className="w-4 h-4" /> Admin
        </div>
        <h1 className="text-3xl font-black uppercase text-white mt-3">Moderation login</h1>
        <p className="text-[#A1A1AA] text-sm mt-3 leading-relaxed">
          Private operator access for removing bad-faith uploads from the public catalog.
        </p>
        <form onSubmit={login} className="mt-8 space-y-4">
          <input
            data-testid="admin-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            className="input"
            placeholder="Admin password"
            required
          />
          {err && <div className="text-[#FF3B30] text-sm font-mono" data-testid="admin-error">{err}</div>}
          <button
            data-testid="admin-login-submit"
            disabled={busy}
            className="w-full h-12 bg-[#D4AF37] text-black font-black uppercase tracking-wider disabled:opacity-50"
          >
            {busy ? "Checking..." : "Enter admin"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="admin-page">
      <SEO title="Admin" path="/admin" noindex />
      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-[#1A1A1A] pb-6">
        <div>
          <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em] flex items-center gap-2">
            <Shield className="w-4 h-4" /> GoodGame admin
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase text-white mt-2">Moderation console</h1>
          <div className="text-[#A1A1AA] text-sm mt-2">
            {stats.active} active games · {stats.removed} removed games
          </div>
        </div>
        <button
          onClick={logout}
          className="border border-[#1A1A1A] hover:border-white text-white px-4 h-10 flex items-center gap-2 uppercase tracking-wider text-xs font-bold"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {filters.map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchState(key)}
              data-testid={`admin-filter-${key}`}
              className={`h-10 px-4 border uppercase tracking-wider text-xs font-bold ${
                state === key
                  ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                  : "border-[#1A1A1A] text-[#A1A1AA] hover:text-white hover:border-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#52525B]" />
          <input
            data-testid="admin-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
            placeholder="Search title, owner, tag"
          />
        </label>
      </div>

      <div className="mt-6 border border-[#1A1A1A] overflow-x-auto">
        {visible.length === 0 ? (
          <div className="p-10 text-center text-[#52525B] font-mono text-sm" data-testid="admin-empty">
            No games in this view.
          </div>
        ) : (
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-[#080808] text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em]">
              <tr>
                <th className="text-left p-3">Game</th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3">Engine</th>
                <th className="text-left p-3">State</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {visible.map((game) => (
                <tr key={game.id} data-testid={`admin-game-row-${game.slug}`}>
                  <td className="p-3">
                    <div className="text-white font-bold">{game.title}</div>
                    <div className="text-[#52525B] font-mono text-xs">{game.slug}</div>
                    {game.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {game.tags.map((tag) => (
                          <span key={tag} className="text-[#D4AF37] font-mono text-[10px] uppercase">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-[#A1A1AA]">@{game.owner_username || "unknown"}</td>
                  <td className="p-3 text-[#A1A1AA] font-mono uppercase text-xs">{game.engine || "web"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
                      game.state === "active" ? "text-[#86EFAC]" : "text-[#FF7A7A]"
                    }`}>
                      {game.state === "active" ? "Active" : "Removed"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {game.state === "active" ? (
                        <button
                          onClick={() => deleteGame(game)}
                          data-testid={`admin-delete-${game.slug}`}
                          className="h-9 px-3 border border-[#3A1515] text-[#FF7A7A] hover:border-[#FF3B30] hover:text-[#FF3B30] inline-flex items-center gap-2 uppercase tracking-wider text-xs font-bold"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => restoreGame(game)}
                          data-testid={`admin-restore-${game.slug}`}
                          className="h-9 px-3 border border-[#1A1A1A] text-white hover:border-[#D4AF37] hover:text-[#D4AF37] inline-flex items-center gap-2 uppercase tracking-wider text-xs font-bold"
                        >
                          <RotateCcw className="w-4 h-4" /> Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex gap-2 text-[#52525B] text-xs">
        <AlertTriangle className="w-4 h-4 text-[#D4AF37]" />
        Delete soft-removes a game from public pages, hides linked clips/posts/reviews, and writes an audit entry.
      </div>
    </main>
  );
}
