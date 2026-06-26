import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postForm, api } from "../lib/api";
import SEO from "../components/SEO";
import { BACKEND_URL } from "../lib/config";
import { CharacterCount, ErrorState, InlineNotice, PageHeader, PageLoader } from "../components/UIState";
import { FormField } from "../components/FormControls";
import { ImageUp } from "lucide-react";
import Avatar from "../components/Avatar";

export default function Settings() {
  const { user, loading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [savedMsg, setSavedMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);
  const [bannerMsg, setBannerMsg] = useState(null);
  const [me, setMe] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get(`/creators/${user.username}`)
      .then((r) => {
        const c = r.data.creator;
        setMe(c);
        setDisplayName(c.display_name || "");
        setBio(c.bio || "");
      })
      .catch(() => setProfileError(true));
  }, [user]);

  if (loading) return <PageLoader label="Loading settings" />;
  if (!user) return <Navigate to="/login" replace />;
  if (profileError) return <div className="max-w-3xl mx-auto px-4 py-16"><ErrorState title="Profile settings could not load" body="Reload the page to retry." /></div>;
  if (!me) return <PageLoader label="Loading profile" />;

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSavedMsg(null);
    try {
      await api.patch("/me/profile", { display_name: displayName, bio });
      setSavedMsg("Saved");
      await refresh();
    } catch (e2) {
      setSavedMsg(e2.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (e) => {
    e.preventDefault();
    const file = e.target.elements.avatar.files?.[0];
    if (!file) return;
    setAvatarMsg(null);
    setAvatarBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await postForm("/me/avatar", fd);
      setAvatarMsg("Updated");
      setMe({ ...me, avatar: r.avatar_url });
      await refresh();
    } catch (e2) {
      setAvatarMsg(e2.response?.data?.detail || "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  };

  const uploadBanner = async (e) => {
    e.preventDefault();
    const file = e.target.elements.banner.files?.[0];
    if (!file) return;
    setBannerMsg(null);
    setBannerBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await postForm("/me/banner", fd);
      setBannerMsg("Updated");
      setMe({ ...me, banner: r.banner_url });
    } catch (e2) {
      setBannerMsg(e2.response?.data?.detail || "Upload failed");
    } finally {
      setBannerBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10" data-testid="settings-page">
      <SEO title="Settings" path="/settings" />
      <PageHeader eyebrow="Account" title="Settings" description="Manage your public creator profile and profile media." />

      <Section title="Profile">
        <form onSubmit={saveProfile} className="space-y-3 max-w-lg">
          <FormField id="settings-display-name" label="Display name">
            <input
              id="settings-display-name"
              data-testid="settings-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              maxLength={60}
            />
          </FormField>
          <FormField id="settings-bio" label="Bio">
            <textarea
              id="settings-bio"
              data-testid="settings-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="input"
              maxLength={600}
            />
            <div className="flex justify-end mt-1"><CharacterCount value={bio} max={600} /></div>
          </FormField>
          <button
            data-testid="settings-save"
            disabled={busy}
            className="btn-primary"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          {savedMsg && <InlineNotice tone={savedMsg === "Saved" ? "success" : "error"}>{savedMsg}</InlineNotice>}
        </form>
      </Section>

      <Section title="Avatar">
        <div className="flex items-start gap-6 flex-wrap">
          <Avatar
            value={me?.avatar}
            name={me?.display_name || user.username}
            className="w-24 h-24 border border-[#1A1A1A]"
            textClassName="text-3xl"
          />
          <form onSubmit={uploadAvatar} className="flex-1 min-w-[260px] space-y-3">
            <MediaPicker id="settings-avatar-input" name="avatar" label="Choose avatar" />
            <button
              data-testid="settings-avatar-submit"
              disabled={avatarBusy}
              className="btn-primary"
            >
              {avatarBusy ? "Uploading..." : "Upload avatar"}
            </button>
            {avatarMsg && <InlineNotice tone={avatarMsg === "Updated" ? "success" : "error"}>{avatarMsg}</InlineNotice>}
          </form>
        </div>
      </Section>

      <Section title="Banner">
        <div className="space-y-4">
          <div className="w-full h-32 bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden">
            {me?.banner ? (
              <img src={`${BACKEND_URL}${me.banner}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#52525B] font-mono text-xs">
                No banner
              </div>
            )}
          </div>
          <form onSubmit={uploadBanner} className="space-y-3">
            <MediaPicker id="settings-banner-input" name="banner" label="Choose banner" />
            <button
              data-testid="settings-banner-submit"
              disabled={bannerBusy}
              className="btn-primary"
            >
              {bannerBusy ? "Uploading..." : "Upload banner"}
            </button>
            {bannerMsg && <InlineNotice tone={bannerMsg === "Updated" ? "success" : "error"}>{bannerMsg}</InlineNotice>}
          </form>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-4 border-b border-[#1A1A1A] pb-2">
        {title}
      </div>
      {children}
    </section>
  );
}

function MediaPicker({ id, name, label }) {
  const [fileName, setFileName] = useState("");
  return (
    <label htmlFor={id} className="flex items-center gap-3 border border-dashed border-[#27272A] bg-[#050505] p-4 cursor-pointer hover:border-[#D4AF37]/60">
      <ImageUp className="w-5 h-5 text-[#D4AF37] shrink-0" />
      <span className="text-sm text-white truncate">{fileName || label}</span>
      <input
        id={id}
        type="file"
        name={name}
        data-testid={id}
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
        required
      />
    </label>
  );
}
