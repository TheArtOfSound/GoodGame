import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Users } from "lucide-react";
import { EmptyState, ErrorState, InlineNotice, PageHeader, PageLoader } from "../components/UIState";
import { FormField } from "../components/FormControls";

export default function Communities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    getJSON("/communities")
      .then((d) => setItems(d.communities || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await postJSON("/communities", { name, description: desc });
      setName("");
      setDesc("");
      if (res?.community?.slug) {
        navigate(`/communities/${res.community.slug}`);
        return;
      }
      refresh();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10" data-testid="communities-page">
      <PageHeader
        eyebrow="Communities"
        title="Player hubs"
        description="Create or join focused spaces for games, genres, playtests, and creator communities."
      />

      {user && (
        <form onSubmit={create} className="mt-6 border border-[#1A1A1A] p-5 bg-[#080808] grid md:grid-cols-3 gap-3">
          <FormField id="community-name" label="Community name">
            <input
              id="community-name"
              data-testid="community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
              minLength={3}
              maxLength={48}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField id="community-desc" label="Short description">
              <input
                id="community-desc"
                data-testid="community-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="input"
                maxLength={240}
              />
            </FormField>
          </div>
          {err && <InlineNotice tone="error" className="md:col-span-3">{err}</InlineNotice>}
          <button
            data-testid="community-create"
            disabled={busy}
            className="btn-primary md:col-span-3"
          >
            {busy ? "Creating..." : "Create community"}
          </button>
        </form>
      )}

      {loading ? (
        <PageLoader label="Loading communities" />
      ) : loadError ? (
        <ErrorState className="mt-8" title="Communities could not load" body="The community directory is temporarily unavailable." />
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Users}
          testId="communities-empty"
          title="No communities yet"
          body={user ? "Create the first focused space for players." : "Log in to create or join a community."}
          action={!user ? <Link to="/login" className="btn-secondary">Log in</Link> : null}
        />
      ) : (
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/communities/${c.slug}`}
              data-testid={`community-card-${c.slug}`}
              className="border border-[#1A1A1A] hover:border-[#D4AF37]/60 p-5 block"
            >
              <div className="text-white font-bold text-lg">{c.name}</div>
              <div className="text-[#A1A1AA] text-sm mt-1 line-clamp-2">{c.description}</div>
              <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em] mt-3">
                {c.member_count} member{c.member_count === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
