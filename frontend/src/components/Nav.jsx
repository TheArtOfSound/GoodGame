import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Menu, Search, Settings, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import DonateButton from "./DonateButton";

const navItems = [
  { to: "/games", label: "Games", icon: "/brand/alley/icon-games.webp" },
  { to: "/feed", label: "Feed" },
  { to: "/clips", label: "Clips", icon: "/brand/alley/icon-clips.webp" },
  { to: "/communities", label: "Communities", icon: "/brand/alley/icon-creators.webp" },
  { to: "/creators", label: "Creators", icon: "/brand/alley/icon-creators.webp" },
  { to: "/news", label: "News" },
];

const secondaryItems = [
  { to: "/activity", label: "Global activity" },
  { to: "/leaderboards", label: "Leaderboards" },
];

const TICKER =
  "FREE BROWSER GAMES  ·  NO DOWNLOAD  ·  HOST YOUR HTML5 ZIP  ·  PLAY IN THE ALLEY  ·  INSTANT CABINETS  ·  ";

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
      <div className="alley-marquee" aria-hidden="true">
        <div className="alley-marquee-track">
          <span>{TICKER}</span>
          <span>{TICKER}</span>
          <span>{TICKER}</span>
        </div>
      </div>

      <aside className="alley-spine" data-testid="site-header">
        <Link to="/" className="alley-spine-brand" data-testid="brand-link" aria-label="GoodGame.center home">
          <img src="/brand/alley/mark.webp" alt="" width={44} height={44} className="alley-spine-mark" />
          <span className="alley-spine-word">
            GOODGAME
            <i>.center</i>
          </span>
        </Link>

        <nav className="alley-spine-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) => `alley-spine-link ${isActive ? "is-on" : ""}`}
              title={item.label}
            >
              {item.icon ? <img src={item.icon} alt="" /> : <span className="alley-spine-dot" />}
              <em>{item.label}</em>
            </NavLink>
          ))}
        </nav>

        <div className="alley-spine-end">
          <Link to="/search" className="alley-spine-tool" aria-label="Search" title="Search">
            <Search className="w-4 h-4" />
          </Link>
          {user ? (
            <>
              <Link to="/create?method=upload" className="alley-spine-join" data-testid="upload-game-cta" title="Host a game">
                Host
              </Link>
              <Link to={`/creators/${user.username}`} className="alley-spine-user" data-testid="account-link" title={`@${user.username}`}>
                @{user.username}
              </Link>
              <Link to="/settings" className="alley-spine-tool" data-testid="settings-link" aria-label="Settings">
                <Settings className="w-4 h-4" />
              </Link>
              <button onClick={handleLogout} className="alley-spine-tool" data-testid="logout-button" aria-label="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="alley-spine-tool" data-testid="login-link">
                In
              </Link>
              <Link to="/onboarding" className="alley-spine-join" data-testid="join-link">
                Join
              </Link>
            </>
          )}
        </div>
      </aside>

      <header className="alley-topbar">
        <Link to="/" className="alley-topbar-brand" aria-label="GoodGame.center home">
          <img src="/brand/alley/mark.webp" alt="" width={32} height={32} />
          <span>
            GOODGAME<i>.center</i>
          </span>
        </Link>
        <div className="alley-topbar-actions">
          <DonateButton />
          {user ? (
            <Link to="/create?method=upload" data-testid="upload-game-cta" className="btn-primary h-10 px-3">
              <Upload className="w-4 h-4" /> Host
            </Link>
          ) : (
            <>
              <Link to="/login" data-testid="login-link" className="btn-secondary h-10 px-3">
                Log in
              </Link>
              <Link to="/create" data-testid="nav-host-cta" className="btn-primary h-10 px-3 hidden sm:inline-flex">
                Host free
              </Link>
            </>
          )}
          <button
            className="icon-button"
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
        <div id="mobile-navigation" className="nav-drawer alley-drawer" data-testid="mobile-menu">
          <form onSubmit={submitSearch} className="relative mb-4">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-[#52525B]" aria-hidden="true" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search games, creators, communities"
              aria-label="Search"
              className="input pl-10"
              data-testid="nav-search"
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
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 grid gap-2">
            {user ? (
              <>
                <Link to="/create?method=upload" className="btn-primary w-full">
                  <Upload className="w-4 h-4" /> Host game free
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
