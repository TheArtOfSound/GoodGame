import { useState } from "react";
import { postJSON } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function FollowButton({ username, initialFollowing, disabled }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(!!initialFollowing);
  const [busy, setBusy] = useState(false);

  if (disabled) return null;

  const toggle = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      const r = await postJSON(`/creators/${username}/follow`, {});
      setFollowing(!!r.following);
    } catch (_e) {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      data-testid="follow-button"
      className={`px-5 h-10 flex items-center text-sm uppercase font-bold tracking-wider transition-colors ${
        following
          ? "border border-[#1A1A1A] text-white hover:border-[#FF3B30] hover:text-[#FF3B30]"
          : "bg-[#D4AF37] text-black hover:bg-[#E5C158]"
      } disabled:opacity-50`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
