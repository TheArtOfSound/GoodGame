import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJSON } from "../lib/api";
import GameCard from "../components/GameCard";
import { Play, Upload, Users } from "lucide-react";

const HERO_BG = "https://images.unsplash.com/photo-1517241034903-9a4c3ab12f00?crop=entropy&cs=srgb&fm=jpg&w=1600&q=70";

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJSON("/games?limit=18")
      .then((d) => setGames(d.games || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="home-page">
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
