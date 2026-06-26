import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import FollowButton from "../components/FollowButton";
import SEO from "../components/SEO";
import { BACKEND_URL } from "../lib/config";
import { Film, Gamepad2 } from "lucide-react";
import { EmptyState, ErrorState, PageLoader } from "../components/UIState";
import Avatar from "../components/Avatar";

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
      <div className="max-w-3xl mx-auto px-4 py-20" data-testid="creator-not-found">
        <ErrorState
          title="Creator not found"
          body="This profile may have been renamed or removed."
          action={<Link to="/creators" className="btn-secondary">Browse creators</Link>}
        />
      </div>
    );
  if (!data) return <PageLoader label="Loading creator" />;

  const { creator, games, clips, is_self, is_following } = data;
  const firstGameCover = games.find((game) => game.cover_image)?.cover_image;
  const bannerSrc = creator.banner
    ? `${BACKEND_URL}${creator.banner}`
    : firstGameCover
      ? `${BACKEND_URL}${firstGameCover}`
      : "/game-covers/voidline-survivor.webp";

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
          src={bannerSrc}
          alt=""
          className="w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative">
        <div className="flex items-end gap-5 flex-wrap">
          <Avatar
            value={creator.avatar}
            name={creator.display_name || creator.username}
            className="w-28 h-28 border-2 border-[#D4AF37]"
            textClassName="text-3xl"
          />
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

        <div className="mt-8 border-b border-[#1A1A1A] flex gap-6" role="tablist" aria-label="Creator content">
          {["games", "clips"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`creator-tab-${t}`}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`creator-panel-${t}`}
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
            <EmptyState
              className="mt-6"
              icon={Gamepad2}
              testId="creator-games-empty"
              title="No published games"
              body={is_self ? "Create or upload a game to start your public catalog." : "This creator has not published a game yet."}
              action={is_self ? <Link to="/create" className="btn-primary">Create a game</Link> : null}
            />
          ) : (
            <div id="creator-panel-games" role="tabpanel" className="mt-6 game-grid">
              {games.map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          )
        ) : clips.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={Film}
            testId="creator-clips-empty"
            title="No clips published"
            body={is_self ? "Upload a gameplay moment to add it to your profile." : "This creator has not shared a clip yet."}
            action={is_self ? <Link to="/clips" className="btn-secondary">Upload a clip</Link> : null}
          />
        ) : (
          <div id="creator-panel-clips" role="tabpanel" className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
