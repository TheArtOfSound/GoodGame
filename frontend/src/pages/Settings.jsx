import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postForm, api } from "../lib/api";
import SEO from "../components/SEO";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function Settings() {
  const { user, loading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [savedMsg, setSavedMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);
  const [bannerMsg, setBannerMsg] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get(`/creators/${user.username}`).then((r) => {
      const c = r.data.creator;
      setMe(c);
      setDisplayName(c.display_name || "");
      setBio(c.bio || "");
    });
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

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
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await postForm("/me/avatar", fd);
      setAvatarMsg("Updated");
      setMe({ ...me, avatar: r.avatar_url });
      await refresh();
    } catch (e2) {
      setAvatarMsg(e2.response?.data?.detail || "Upload failed");
    }
  };

  const uploadBanner = async (e) => {
    e.preventDefault();
    const file = e.target.elements.banner.files?.[0];
    if (!file) return;
    setBannerMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await postForm("/me/banner", fd);
      setBannerMsg("Updated");
      setMe({ ...me, banner: r.banner_url });
    } catch (e2) {
      setBannerMsg(e2.response?.data?.detail || "Upload failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10" data-testid="settings-page">
      <SEO title="Settings" path="/settings" />
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        Account
      </div>
      <h1 className="text-3xl font-bold uppercase text-white mt-2">Settings</h1>

      <Section title="Profile">
        <form onSubmit={saveProfile} className="space-y-3 max-w-lg">
          <input
            data-testid="settings-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="input"
            maxLength={60}
          />
          <textarea
            data-testid="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Short bio (max 600 chars)"
            className="input"
            maxLength={600}
          />
          <button
            data-testid="settings-save"
            disabled={busy}
            className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          {savedMsg && <div className="text-sm font-mono text-[#A1A1AA]">{savedMsg}</div>}
        </form>
      </Section>

      <Section title="Avatar">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-24 h-24 bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden">
            {me?.avatar ? (
              <img src={`${BACKEND}${me.avatar}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#D4AF37] font-black text-3xl uppercase">
                {user.username[0]}
              </div>
            )}
          </div>
          <form onSubmit={uploadAvatar} className="flex-1 min-w-[260px] space-y-3">
            <input
              type="file"
              name="avatar"
              data-testid="settings-avatar-input"
              accept="image/png,image/jpeg,image/webp"
              className="block text-white font-mono text-sm"
              required
            />
            <button
              data-testid="settings-avatar-submit"
              className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
            >
              Upload avatar
            </button>
            {avatarMsg && <div className="text-sm font-mono text-[#A1A1AA]">{avatarMsg}</div>}
          </form>
        </div>
      </Section>

      <Section title="Banner">
        <div className="space-y-4">
          <div className="w-full h-32 bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden">
            {me?.banner ? (
              <img src={`${BACKEND}${me.banner}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#52525B] font-mono text-xs">
                No banner
              </div>
            )}
          </div>
          <form onSubmit={uploadBanner} className="space-y-3">
            <input
              type="file"
              name="banner"
              data-testid="settings-banner-input"
              accept="image/png,image/jpeg,image/webp"
              className="block text-white font-mono text-sm"
              required
            />
            <button
              data-testid="settings-banner-submit"
              className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-5 h-11"
            >
              Upload banner
            </button>
            {bannerMsg && <div className="text-sm font-mono text-[#A1A1AA]">{bannerMsg}</div>}
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
