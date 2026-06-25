import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import { Play, Trophy, Upload, Users } from "lucide-react";
import SEO from "../components/SEO";
import DonateButton from "../components/DonateButton";
import ActivityFeed from "../components/ActivityFeed";

const HERO_BG = "https://images.unsplash.com/photo-1517241034903-9a4c3ab12f00?crop=entropy&cs=srgb&fm=jpg&w=1600&q=70";

export default function Home() {
  const [games, setGames] = useState([]);
  const [activity, setActivity] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const donationState = new URLSearchParams(location.search).get("donation");

  useEffect(() => {
    Promise.all([
      getJSON("/games?limit=18&sort=new"),
      getJSON("/feed/global?limit=8"),
      getJSON("/leaderboards?limit=6"),
    ])
      .then(([gameData, activityData, leaderboardData]) => {
        setGames(gameData.games || []);
        setActivity(activityData.activity || []);
        setLeaders(leaderboardData.leaders || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="home-page">
      <SEO path="/" />
      {donationState === "thanks" && (
        <div className="border-b border-[#1A1A1A] bg-[#D4AF37] text-black text-center py-3 px-4 font-bold uppercase tracking-wider text-xs" data-testid="donation-thanks">
          Thank you for supporting GoodGame.center.
        </div>
      )}
      {donationState === "cancelled" && (
        <div className="border-b border-[#1A1A1A] bg-[#080808] text-[#A1A1AA] text-center py-3 px-4 font-mono text-xs uppercase tracking-[0.2em]" data-testid="donation-cancelled">
          Donation checkout cancelled.
        </div>
      )}
      <section className="relative overflow-hidden border-b border-[#1A1A1A]">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32">
          <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em] mb-4">
            Browser-first / Free to play / Free to upload
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white max-w-3xl leading-[0.95]">
            Play. Ship.
            <br />
            <span className="text-[#D4AF37]">Be played.</span>
          </h1>
          <p className="text-[#A1A1AA] mt-6 max-w-xl text-base md:text-lg leading-relaxed">
            A real platform for indie browser games. No wallets, no tokens. Upload
            an HTML5 build, drop a thumbnail, share patch notes &mdash; and let
            anyone press play.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/games"
              data-testid="hero-browse-cta"
              className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-6 h-12 flex items-center gap-2 hover:bg-[#E5C158] transition-colors"
            >
              <Play className="w-4 h-4" /> Browse Games
            </Link>
            <Link
              to="/create"
              data-testid="hero-upload-cta"
              className="border border-[#1A1A1A] text-white font-bold uppercase tracking-wider text-sm px-6 h-12 flex items-center gap-2 hover:border-white transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload your game
            </Link>
            <Link
              to="/communities"
              className="border border-[#1A1A1A] text-white font-bold uppercase tracking-wider text-sm px-6 h-12 flex items-center gap-2 hover:border-white transition-colors"
            >
              <Users className="w-4 h-4" /> Communities
            </Link>
            <DonateButton variant="hero" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
              Latest
            </div>
            <h2 className="text-2xl md:text-3xl font-bold uppercase text-white tracking-tight">
              Recently uploaded
            </h2>
          </div>
          <Link
            to="/games"
            className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em] hover:underline"
          >
            See all &rarr;
          </Link>
        </div>
        {loading ? (
          <div className="text-[#52525B] font-mono text-sm">Loading...</div>
        ) : games.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {games.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid lg:grid-cols-[1.35fr_0.65fr] gap-10">
          <div>
            <div className="flex items-end justify-between gap-4 mb-2">
              <div>
                <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">Across GoodGame</div>
                <h2 className="text-2xl md:text-3xl font-bold uppercase text-white tracking-tight">Global activity</h2>
              </div>
              <Link to="/activity" className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em] hover:underline">
                Open feed &rarr;
              </Link>
            </div>
            <ActivityFeed activity={activity} compact />
          </div>

          <div>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">Current holders</div>
                <h2 className="text-2xl font-bold uppercase text-white tracking-tight">Champions</h2>
              </div>
              <Link to="/leaderboards" aria-label="All leaderboards" className="text-[#D4AF37]">
                <Trophy className="w-5 h-5" />
              </Link>
            </div>
            {leaders.length ? (
              <div className="border border-[#1A1A1A] divide-y divide-[#1A1A1A]">
                {leaders.map((leader) => (
                  <Link key={leader.game_id} to={`/games/${leader.game_slug}#leaderboard`} className="block px-4 py-3 hover:bg-[#0A0A0A]">
                    <div className="flex justify-between gap-4">
                      <span className="text-white font-semibold truncate">{leader.game_title}</span>
                      <span className="text-[#D4AF37] font-mono font-bold tabular-nums">{Number(leader.score).toLocaleString()}</span>
                    </div>
                    <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-wider mt-1">
                      @{leader.username}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[#1A1A1A] p-6 text-[#71717A] text-sm">
                No champion yet. The first authenticated score takes the board.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div
      data-testid="empty-catalog"
      className="border border-dashed border-[#1A1A1A] p-10 text-center"
    >
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em] mb-2">
        No games yet
      </div>
      <div className="text-white text-xl font-bold mb-2">Be the first to ship.</div>
      <div className="text-[#A1A1AA] text-sm mb-6">
        The catalog is empty. Upload your HTML5 game build and it shows up here.
      </div>
      <Link
        to="/create"
        className="inline-flex items-center gap-2 bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm px-6 h-12"
      >
        <Upload className="w-4 h-4" /> Upload Game
      </Link>
    </div>
  );
}
