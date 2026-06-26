import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import SEO from "../components/SEO";
import { UserRoundSearch } from "lucide-react";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../components/UIState";
import Avatar from "../components/Avatar";

function fmtCount(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function Creators() {
  const [creators, setCreators] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getJSON("/creators")
      .then((d) => setCreators(d.creators || []))
      .catch(() => {
        setCreators([]);
        setError(true);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10" data-testid="creators-page">
      <SEO
        title="Creators"
        description="Discover indie creators publishing free browser games, clips, and communities on GoodGame.center. Follow them to fill your feed."
        path="/creators"
      />
      <PageHeader
        eyebrow="People"
        title="Creators"
        description="Indie developers publishing browser games, clips, and communities. Follow them to personalize your feed."
      />

      {!creators && <PageLoader label="Loading creators" />}
      {error && <ErrorState className="mt-8" title="Creators could not load" body="The directory request failed." />}
      {!error && creators && creators.length === 0 && (
        <EmptyState
          className="mt-8"
          icon={UserRoundSearch}
          testId="creators-empty"
          title="No creator profiles yet"
          body="Create an account and publish a game to start the directory."
          action={<Link to="/onboarding" className="btn-primary">Join GoodGame</Link>}
        />
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {(creators || []).map((c) => {
          const verified = c.official || c.verification_state === "verified";
          return (
            <Link
              key={c.id || c.username}
              to={`/creators/${c.username}`}
              className="border border-[#1A1A1A] hover:border-[#D4AF37]/60 p-5 flex items-center gap-4 text-left transition-colors group"
              data-testid="creator-card"
            >
              <Avatar
                value={c.avatar}
                name={c.display_name || c.username}
                className="w-16 h-16 shrink-0 border border-[#1A1A1A]"
                textClassName="text-2xl"
              />
              <div className="min-w-0">
                <div className="text-white group-hover:text-[#F1D77A] font-bold truncate">{c.display_name || c.username}</div>
                <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.18em] truncate">@{c.username}</div>
                <div className="text-[#A1A1AA] text-xs mt-2">{fmtCount(c.follower_count)} followers</div>
                {verified && <div className="text-[#66c0f4] text-[10px] font-mono uppercase tracking-wider mt-1">&#10003; Verified</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
