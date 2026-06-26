import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChevronRight,
  Gamepad2,
  LogOut,
  Menu,
  Search,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import DonateButton from "./DonateButton";

const navItems = [
  { to: "/games", label: "Games" },
  { to: "/feed", label: "Feed" },
  { to: "/clips", label: "Clips" },
  { to: "/communities", label: "Communities" },
  { to: "/creators", label: "Creators" },
  { to: "/news", label: "News" },
];

const secondaryItems = [
  { to: "/activity", label: "Global activity" },
  { to: "/leaderboards", label: "Leaderboards" },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = q.trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
    setQ("");
  };

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <>
      <header
        data-testid="site-header"
        className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-[#1A1A1A]"
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-16 flex items-center gap-5">
        <Link
          to="/"
          data-testid="brand-link"
          className="flex items-center gap-2 text-white shrink-0"
          aria-label="GoodGame.center home"
        >
          <Gamepad2 className="w-6 h-6 text-[#D4AF37]" />
          <span className="font-black uppercase text-lg whitespace-nowrap">
            GoodGame<span className="text-[#D4AF37]">.center</span>
          </span>
        </Link>

        <nav className="hidden xl:flex items-center gap-4 text-sm ml-2" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `uppercase tracking-[0.14em] font-mono text-[11px] transition-colors ${
                  isActive ? "text-[#D4AF37]" : "text-[#A1A1AA] hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-2 ml-auto">
          <Link
            to="/search"
            className="icon-button hidden xl:inline-grid 2xl:hidden"
            aria-label="Search"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </Link>
          <form onSubmit={submitSearch} className="relative hidden 2xl:block">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#52525B]" aria-hidden="true" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search"
              aria-label="Search"
              data-testid="nav-search"
              className="bg-[#0A0A0A] border border-[#27272A] focus:border-[#D4AF37] text-white text-sm pl-9 pr-3 h-10 w-44 outline-none transition-colors"
            />
          </form>
          <DonateButton />
          {user ? (
            <>
              <Link to="/create" data-testid="upload-game-cta" className="btn-primary h-10 px-4">
                <Upload className="w-4 h-4" /> Upload
              </Link>
              <Link
                to={`/creators/${user.username}`}
                data-testid="account-link"
                className="h-10 max-w-36 border border-[#27272A] hover:border-white px-3 flex items-center text-white font-mono text-xs truncate"
                title={`@${user.username}`}
              >
                @{user.username}
              </Link>
              <Link to="/settings" data-testid="settings-link" className="icon-button" aria-label="Settings" title="Settings">
                <Settings className="w-4 h-4" />
              </Link>
              <button onClick={handleLogout} data-testid="logout-button" className="icon-button" aria-label="Log out" title="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="login-link" className="btn-secondary h-10 px-4">
                Log in
              </Link>
              <Link to="/onboarding" data-testid="join-link" className="btn-primary h-10 px-4">
                Join
              </Link>
            </>
          )}
        </div>

        <button
          className="xl:hidden icon-button ml-auto"
          onClick={() => setOpen((value) => !value)}
          data-testid="mobile-menu-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        </div>
      </header>

      {open && (
        <div id="mobile-navigation" className="nav-drawer xl:hidden" data-testid="mobile-menu">
          <form onSubmit={submitSearch} className="relative mb-4">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-[#52525B]" aria-hidden="true" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search games, creators, communities"
              aria-label="Search"
              className="input pl-10"
            />
          </form>

          <nav aria-label="Mobile primary">
            {[...navItems, ...secondaryItems].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-drawer-link ${isActive ? "is-active" : ""}`}
              >
                {item.label}
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 grid gap-2">
            <DonateButton variant="footer" className="w-full justify-center" />
            {user ? (
              <>
                <Link to="/create" className="btn-primary w-full">
                  <Upload className="w-4 h-4" /> Upload game
                </Link>
                <Link to={`/creators/${user.username}`} className="btn-secondary w-full">
                  @{user.username}
                </Link>
                <Link to="/settings" data-testid="settings-link-mobile" className="btn-secondary w-full">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <button onClick={handleLogout} className="btn-secondary w-full">
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-secondary w-full">
                  Log in
                </Link>
                <Link to="/onboarding" className="btn-primary w-full">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
