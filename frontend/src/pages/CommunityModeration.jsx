import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON, postForm } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../components/UIState";
import { ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import Avatar from "../components/Avatar";

export default function CommunityModeration() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("members");
  const [busyAction, setBusyAction] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const load = async () => {
    setErr(null);
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

  if (err) return <div className="max-w-4xl mx-auto px-4 py-16"><ErrorState title="Moderation tools unavailable" body={err} action={<button type="button" className="btn-secondary" onClick={load}>Retry</button>} /></div>;
  if (!data) return <PageLoader label="Loading moderation tools" />;
  const isMod = ["owner", "moderator"].includes(data.viewer_role);
  const isOwner = data.viewer_role === "owner";

  const act = async (path, body = {}) => {
    setBusyAction(path);
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => fd.append(k, v));
    try {
      await postForm(path, fd);
      await load();
      toast.success("Moderation action completed");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Moderation action failed");
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const requestAction = (action) => setConfirmAction(action);

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const completed = await act(confirmAction.path, confirmAction.body);
    if (completed) setConfirmAction(null);
  };

  if (!user || !isMod)
    return (
      <div className="px-8 py-16 text-[#A1A1AA]" data-testid="mod-no-access">
        <ErrorState
          title="Moderator access required"
          body="You need to be an owner or moderator to manage this community."
          action={<Link to={`/communities/${slug}`} className="btn-secondary">Back to community</Link>}
        />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10" data-testid="community-moderation">
      <SEO title={`Moderate ${slug}`} path={`/communities/${slug}/moderate`} />
      <PageHeader
        eyebrow="Moderation"
        title="Manage community"
        description="Review membership, roles, restrictions, and open reports."
        actions={<Link to={`/communities/${slug}`} className="btn-secondary">Back to community</Link>}
      />

      <div className="mt-8 border-b border-[#1A1A1A] flex gap-6" role="tablist" aria-label="Moderation views">
        {[
          ["members", `Members (${data.members.length})`],
          ["reports", `Reports (${reports.length})`],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            data-testid={`mod-tab-${k}`}
            role="tab"
            aria-selected={tab === k}
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
          {data.members.length === 0 ? (
            <EmptyState className="border-0" icon={Users} title="No members" body="This community does not have any members to moderate." />
          ) : data.members.map((m) => (
            <MemberRow
              key={m.user_id}
              member={m}
              isOwner={isOwner}
              busy={busyAction?.includes(`/members/${m.user_id}/`)}
              onRole={(role) => act(`/communities/${slug}/members/${m.user_id}/role`, { role })}
              onMute={() => act(`/communities/${slug}/members/${m.user_id}/mute`)}
              onUnmute={() => act(`/communities/${slug}/members/${m.user_id}/unmute`)}
              onBan={() => requestAction({
                title: `Ban @${m.username}?`,
                body: "They will lose access to this community until a moderator reverses the ban.",
                label: "Ban member",
                path: `/communities/${slug}/members/${m.user_id}/ban`,
              })}
              onUnban={() => act(`/communities/${slug}/members/${m.user_id}/unban`)}
              onRemove={() => requestAction({
                title: `Remove @${m.username}?`,
                body: "They will be removed from the member list and can rejoin unless separately banned.",
                label: "Remove member",
                path: `/communities/${slug}/members/${m.user_id}/remove`,
              })}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-3" data-testid="reports-list">
          {reports.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No open reports" body="Reported community content will appear here for review." />
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
                    disabled={busyAction === `/reports/${r.id}/resolve`}
                    className="btn-secondary h-8 px-3 text-xs"
                  >
                    {busyAction === `/reports/${r.id}/resolve` ? "Resolving..." : "Resolve"}
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
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        body={confirmAction?.body}
        confirmLabel={confirmAction?.label}
        busy={Boolean(busyAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}

function MemberRow({ member, isOwner, busy, onRole, onMute, onUnmute, onBan, onUnban, onRemove }) {
  return (
    <div
      data-testid={`member-row-${member.username}`}
      className="flex items-center gap-3 px-4 py-3 flex-wrap"
    >
      <Avatar
        value={member.avatar}
        name={member.display_name || member.username}
        className="w-10 h-10 border border-[#1A1A1A]"
        textClassName="text-base"
      />
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
            disabled={busy}
            className="btn-secondary h-8 px-3 text-xs"
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
                disabled={busy}
                className="btn-secondary h-8 px-3 text-xs"
              >
                Unmute
              </button>
            ) : (
              <button
                data-testid={`mute-${member.username}`}
                onClick={onMute}
                disabled={busy}
                className="btn-secondary h-8 px-3 text-xs"
              >
                Mute
              </button>
            )}
            {member.banned ? (
              <button
                data-testid={`unban-${member.username}`}
                onClick={onUnban}
                disabled={busy}
                className="btn-secondary h-8 px-3 text-xs"
              >
                Unban
              </button>
            ) : (
              <button
                data-testid={`ban-${member.username}`}
                onClick={onBan}
                disabled={busy}
                className="btn-danger h-8 px-3 text-xs"
              >
                Ban
              </button>
            )}
            <button
              data-testid={`remove-${member.username}`}
              onClick={onRemove}
              disabled={busy}
              className="btn-secondary h-8 px-3 text-xs"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
