import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Communities() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState(null);

  const refresh = () =>
    getJSON("/communities")
      .then((d) => setItems(d.communities || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await postJSON("/communities", { name, description: desc });
      setName("");
      setDesc("");
      refresh();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10" data-testid="communities-page">
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
        Communities
      </div>
      <h1 className="text-3xl font-bold uppercase text-white tracking-tight">Hubs for players</h1>

      {user && (
        <form onSubmit={create} className="mt-6 border border-[#1A1A1A] p-5 bg-[#080808] grid md:grid-cols-3 gap-3">
          <input
            data-testid="community-name"
            placeholder="Community name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input md:col-span-1"
            required
            minLength={3}
            maxLength={48}
          />
          <input
            data-testid="community-desc"
            placeholder="Short description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="input md:col-span-2"
          />
          {err && <div className="text-[#FF3B30] text-sm font-mono md:col-span-3">{err}</div>}
          <button
            data-testid="community-create"
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider h-11 md:col-span-3"
          >
            Create community
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-[#52525B] mt-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-[#A1A1AA] border border-dashed border-[#1A1A1A] p-8 mt-8 text-center" data-testid="communities-empty">
          No communities yet. {user ? "Create the first one." : "Log in to create one."}
        </div>
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
