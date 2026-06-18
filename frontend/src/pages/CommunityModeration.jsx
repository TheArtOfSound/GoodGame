import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON, postForm } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function CommunityModeration() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("members");

  const load = async () => {
    try {
      const d = await getJSON(`/communities/${slug}/members`);
      setData(d);
      try {
        const r = await getJSON(`/communities/${slug}/reports`);
        setReports(r.reports || []);
      } catch (_e) {
        setReports([]);
      }
    } catch (_e) {
      setErr("Not found or not allowed");
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [slug]);

  if (err) return <div className="px-8 py-16 text-[#A1A1AA]">{err}</div>;
  if (!data) return <div className="px-8 py-10 text-[#52525B]">Loading...</div>;
  const isMod = ["owner", "moderator"].includes(data.viewer_role);
  const isOwner = data.viewer_role === "owner";

  const act = async (path, body = {}) => {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => fd.append(k, v));
    try {
      await postForm(path, fd);
      load();
    } catch (_e) {
      // ignore
    }
  };

  if (!user || !isMod)
    return (
      <div className="px-8 py-16 text-[#A1A1AA]" data-testid="mod-no-access">
        You need to be a moderator of this community.{" "}
        <Link to={`/communities/${slug}`} className="text-[#D4AF37] underline">
          Back
        </Link>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10" data-testid="community-moderation">
      <SEO title={`Moderate ${slug}`} path={`/communities/${slug}/moderate`} />
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        Moderation
      </div>
      <h1 className="text-3xl font-bold uppercase text-white">Manage community</h1>
      <Link
        to={`/communities/${slug}`}
        className="text-[#A1A1AA] hover:text-white text-sm font-mono uppercase tracking-[0.2em]"
      >
        &larr; Back to community
      </Link>

      <div className="mt-6 border-b border-[#1A1A1A] flex gap-6">
        {[
          ["members", `Members (${data.members.length})`],
          ["reports", `Reports (${reports.length})`],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            data-testid={`mod-tab-${k}`}
            className={`uppercase font-mono text-xs tracking-[0.2em] py-3 border-b-2 -mb-px ${
              tab === k ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-[#A1A1AA] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "members" ? (
        <div className="mt-6 divide-y divide-[#1A1A1A] border border-[#1A1A1A]">
          {data.members.map((m) => (
            <MemberRow
              key={m.user_id}
              member={m}
              isOwner={isOwner}
              onRole={(role) =>
                act(`/communities/${slug}/members/${m.user_id}/role`, { role })
              }
              onMute={() => act(`/communities/${slug}/members/${m.user_id}/mute`)}
              onUnmute={() => act(`/communities/${slug}/members/${m.user_id}/unmute`)}
              onBan={() => act(`/communities/${slug}/members/${m.user_id}/ban`)}
              onUnban={() => act(`/communities/${slug}/members/${m.user_id}/unban`)}
              onRemove={() => act(`/communities/${slug}/members/${m.user_id}/remove`)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-3" data-testid="reports-list">
          {reports.length === 0 ? (
            <div className="text-[#52525B] font-mono text-sm">No open reports.</div>
          ) : (
            reports.map((r) => (
              <article
                key={r.id}
                data-testid={`report-${r.id}`}
                className="border border-[#1A1A1A] p-4 bg-[#0A0A0A]"
              >
                <div className="flex justify-between items-center">
                  <div className="text-[#D4AF37] font-mono text-[10px] uppercase tracking-[0.2em]">
                    {r.target_type} / {r.target_id}
                  </div>
                  <button
                    onClick={() =>
                      act(`/reports/${r.id}/resolve`, { resolution: "dismissed" })
                    }
                    data-testid={`resolve-report-${r.id}`}
                    className="text-xs uppercase font-bold tracking-wider text-[#A1A1AA] border border-[#1A1A1A] hover:border-white px-3 h-8 flex items-center"
                  >
                    Resolve
                  </button>
                </div>
                <div className="text-white mt-2 text-sm">{r.reason}</div>
                <div className="text-[#52525B] font-mono text-[10px] mt-2">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, isOwner, onRole, onMute, onUnmute, onBan, onUnban, onRemove }) {
  return (
    <div
      data-testid={`member-row-${member.username}`}
      className="flex items-center gap-3 px-4 py-3 flex-wrap"
    >
      <div className="w-10 h-10 bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden">
        {member.avatar ? (
          <img src={`${BACKEND}${member.avatar}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#D4AF37] font-bold uppercase">
            {member.username?.[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={`/creators/${member.username}`}
          className="text-white font-bold truncate hover:text-[#D4AF37]"
        >
          @{member.username}
        </Link>
        <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em]">
          {member.role}
          {member.muted && " · muted"}
          {member.banned && " · banned"}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {isOwner && member.role !== "owner" && (
          <button
            data-testid={`role-toggle-${member.username}`}
            onClick={() =>
              onRole(member.role === "moderator" ? "member" : "moderator")
            }
            className="text-xs uppercase font-bold tracking-wider border border-[#1A1A1A] hover:border-white text-white px-3 h-8 flex items-center"
          >
            {member.role === "moderator" ? "Demote" : "Promote"}
          </button>
        )}
        {member.role !== "owner" && (
          <>
            {member.muted ? (
              <button
                data-testid={`unmute-${member.username}`}
                onClick={onUnmute}
                className="text-xs uppercase font-bold tracking-wider border border-[#1A1A1A] hover:border-white text-white px-3 h-8 flex items-center"
              >
                Unmute
              </button>
            ) : (
              <button
                data-testid={`mute-${member.username}`}
                onClick={onMute}
                className="text-xs uppercase font-bold tracking-wider border border-[#1A1A1A] hover:border-white text-white px-3 h-8 flex items-center"
              >
                Mute
              </button>
            )}
            {member.banned ? (
              <button
                data-testid={`unban-${member.username}`}
                onClick={onUnban}
                className="text-xs uppercase font-bold tracking-wider border border-[#1A1A1A] hover:border-white text-white px-3 h-8 flex items-center"
              >
                Unban
              </button>
            ) : (
              <button
                data-testid={`ban-${member.username}`}
                onClick={onBan}
                className="text-xs uppercase font-bold tracking-wider border border-[#1A1A1A] hover:border-[#FF3B30] hover:text-[#FF3B30] text-[#FF3B30] px-3 h-8 flex items-center"
              >
                Ban
              </button>
            )}
            <button
              data-testid={`remove-${member.username}`}
              onClick={onRemove}
              className="text-xs uppercase font-bold tracking-wider border border-[#1A1A1A] hover:border-white text-[#A1A1AA] px-3 h-8 flex items-center"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
