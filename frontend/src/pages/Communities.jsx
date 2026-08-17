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
    <div className="alley-rooms" data-testid="communities-page">
      <div>
        <div>
          <PageHeader
            eyebrow="Side rooms"
            title="Behind the row"
            description="Open a room for a genre, a playtest, or the people who keep a cabinet warm."
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      {user && (
        <form onSubmit={create} className="mb-8 surface p-5 grid md:grid-cols-3 gap-3">
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
        <ErrorState title="Communities could not load" body="The community directory is temporarily unavailable." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          testId="communities-empty"
          title="No communities yet"
          body={user ? "Create the first focused space for players." : "Log in to create or join a community."}
          action={!user ? <Link to="/login" className="btn-secondary">Log in</Link> : null}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/communities/${c.slug}`}
              data-testid={`community-card-${c.slug}`}
              className="surface card-lift p-5 block"
            >
              <div className="text-white font-bold text-lg group-hover:text-[#F1D77A]">{c.name}</div>
              <div className="text-[#A1A1AA] text-sm mt-1 line-clamp-2">{c.description}</div>
              <div className="meta-text font-mono text-[10px] uppercase tracking-[0.2em] mt-3">
                {c.member_count} member{c.member_count === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
