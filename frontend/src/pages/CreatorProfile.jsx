import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import FollowButton from "../components/FollowButton";
import SEO from "../components/SEO";
import { BACKEND_URL } from "../lib/config";
const BANNER_FALLBACK =
  "https://images.unsplash.com/photo-1718844054440-22acf5d5c8f0?crop=entropy&cs=srgb&fm=jpg&w=1600&q=70";

export default function CreatorProfile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("games");

  useEffect(() => {
    setData(null);
    setErr(null);
    getJSON(`/creators/${username}`)
      .then(setData)
      .catch(() => setErr("Creator not found"));
  }, [username]);

  if (err)
    return (
      <div className="px-8 py-20 text-center" data-testid="creator-not-found">
        <h1 className="text-2xl font-bold uppercase text-white">Creator not found</h1>
      </div>
    );
  if (!data) return <div className="px-8 py-10 text-[#52525B]">Loading...</div>;

  const { creator, games, clips, is_self, is_following } = data;

  return (
    <div data-testid="creator-profile">
      <SEO
        title={`${creator.display_name} (@${creator.username})`}
        description={creator.bio || `Browser games by @${creator.username} on GoodGame.center.`}
        image={creator.banner ? `${BACKEND_URL}${creator.banner}` : null}
        type="profile"
        path={`/creators/${creator.username}`}
      />
      <div className="relative h-44 md:h-56 border-b border-[#1A1A1A] overflow-hidden">
        <img
          src={creator.banner ? `${BACKEND_URL}${creator.banner}` : BANNER_FALLBACK}
          alt=""
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative">
        <div className="flex items-end gap-5 flex-wrap">
          <div className="w-28 h-28 bg-[#0A0A0A] border-2 border-[#D4AF37]">
            {creator.avatar ? (
              <img src={`${BACKEND_URL}${creator.avatar}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#D4AF37] font-black text-3xl uppercase">
                {creator.username[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold uppercase text-white tracking-tight">
              {creator.display_name}
            </h1>
            <div className="text-[#A1A1AA] font-mono text-xs uppercase tracking-[0.2em]">
              @{creator.username}
            </div>
            <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em] mt-1">
              {creator.follower_count} followers · {creator.following_count} following
            </div>
          </div>
          {is_self ? (
            <div className="flex gap-2">
              <Link
                to="/settings"
                data-testid="own-profile-settings-link"
                className="border border-[#1A1A1A] hover:border-white text-white px-4 h-10 flex items-center text-sm uppercase font-bold tracking-wider"
              >
                Edit profile
              </Link>
              <Link
                to="/console"
                data-testid="own-profile-console-link"
                className="border border-[#1A1A1A] hover:border-white text-white px-4 h-10 flex items-center text-sm uppercase font-bold tracking-wider"
              >
                Creator console
              </Link>
            </div>
          ) : (
            <FollowButton
              username={creator.username}
              initialFollowing={is_following}
            />
          )}
        </div>
        {creator.bio && (
          <p className="text-[#A1A1AA] mt-4 max-w-2xl leading-relaxed">{creator.bio}</p>
        )}

        <div className="mt-8 border-b border-[#1A1A1A] flex gap-6">
          {["games", "clips"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`creator-tab-${t}`}
              className={`uppercase font-mono text-xs tracking-[0.2em] py-3 border-b-2 -mb-px ${
                tab === t
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-[#A1A1AA] hover:text-white"
              }`}
            >
              {t} ({(t === "games" ? games : clips).length})
            </button>
          ))}
        </div>

        {tab === "games" ? (
          games.length === 0 ? (
            <div className="text-[#A1A1AA] py-8" data-testid="creator-games-empty">
              No games yet.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {games.map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          )
        ) : clips.length === 0 ? (
          <div className="text-[#A1A1AA] py-8" data-testid="creator-clips-empty">
            No clips yet.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {clips.map((c) => (
              <Link
                key={c.id}
                to={`/clips/${c.slug}`}
                className="border border-[#1A1A1A] hover:border-[#D4AF37]/60 p-3"
              >
                <video
                  src={`${BACKEND_URL}${c.video_path}`}
                  className="w-full aspect-video bg-black"
                  preload="metadata"
                  muted
                />
                <div className="text-white mt-2 text-sm">{c.caption || "Untitled"}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
