import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import { BACKEND_URL } from "../lib/config";

function fmtCount(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function Creators() {
  const [creators, setCreators] = useState(null);

  useEffect(() => {
    getJSON("/creators")
      .then((d) => setCreators(d.creators || []))
      .catch(() => setCreators([]));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="creators-page">
      <SEO
        title="Creators"
        description="Discover indie creators publishing free browser games, clips, and communities on GoodGame.center. Follow them to fill your feed."
        path="/creators"
      />
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">Creators</div>
      <h1 className="text-3xl font-bold uppercase text-white mt-1">Creators</h1>
      <p className="text-[#A1A1AA] mt-2 max-w-2xl">
        Indie developers publishing browser games on GoodGame. Follow them to fill your feed.
      </p>

      {!creators && <div className="text-[#52525B] mt-8 font-mono text-sm">Loading&hellip;</div>}
      {creators && creators.length === 0 && (
        <div className="text-[#A1A1AA] mt-8" data-testid="creators-empty">
          No creators yet. <Link to="/onboarding" className="text-[#D4AF37] underline">Be the first.</Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {(creators || []).map((c) => {
          const verified = c.official || c.verification_state === "verified";
          const avatarIsImg = c.avatar && typeof c.avatar === "string" && c.avatar.startsWith("/");
          const avatarColor = c.avatar && typeof c.avatar === "string" && c.avatar.startsWith("#") ? c.avatar : "#D4AF37";
          return (
            <Link
              key={c.id || c.username}
              to={`/creators/${c.username}`}
              className="border border-[#1A1A1A] hover:border-[#D4AF37]/60 p-5 flex flex-col items-center text-center transition-colors"
              data-testid="creator-card"
            >
              <div className="w-16 h-16 bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden flex items-center justify-center">
                {avatarIsImg ? (
                  <img src={`${BACKEND_URL}${c.avatar}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black uppercase" style={{ color: avatarColor }}>
                    {(c.display_name || c.username || "?")[0]}
                  </span>
                )}
              </div>
              <div className="text-white font-bold mt-3 truncate w-full">{c.display_name || c.username}</div>
              <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em] truncate w-full">
                @{c.username}
              </div>
              <div className="text-[#A1A1AA] text-xs mt-2">{fmtCount(c.follower_count)} followers</div>
              {verified && (
                <div className="text-[#66c0f4] text-[10px] font-mono uppercase tracking-wider mt-1">&#10003; Verified</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
