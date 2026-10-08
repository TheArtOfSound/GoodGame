import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Menu, Search, Settings, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import DonateButton from "./DonateButton";

const navItems = [
  { to: "/games", label: "Games" },
  { to: "/feed", label: "Feed" },
  { to: "/clips", label: "Clips" },
  { to: "/communities", label: "Communities" },
  { to: "/creators", label: "Creators" },
  { to: "/news", label: "Guides & news" },
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
      <header className="alley-topbar" data-testid="site-header">
        <Link to="/" className="alley-topbar-brand" data-testid="brand-link" aria-label="GoodGame.center home">
          <img src="/brand/alley/mark.webp" alt="" width={36} height={36} />
          <span>
            GOODGAME<i>.center</i>
          </span>
        </Link>

        <nav className="alley-topbar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replaceAll(" ", "-").replace("-&-", "-")}`}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="alley-topbar-actions">
          <Link to="/search" className="icon-button topbar-search" aria-label="Search GoodGame" title="Search">
            <Search className="w-4 h-4" />
          </Link>
          <div className="topbar-donate"><DonateButton /></div>
          {user ? (
            <>
              <Link to="/create?method=upload" data-testid="upload-game-cta" className="btn-primary topbar-publish">
                <Upload className="w-4 h-4" /> Publish
              </Link>
              <Link to={`/creators/${user.username}`} className="topbar-account" data-testid="account-link">
                @{user.username}
              </Link>
              <Link to="/settings" className="icon-button topbar-user-tool" data-testid="settings-link" aria-label="Settings" title="Settings">
                <Settings className="w-4 h-4" />
              </Link>
              <button onClick={handleLogout} className="icon-button topbar-user-tool" data-testid="logout-button" aria-label="Log out" title="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="login-link" className="topbar-login">
                Log in
              </Link>
              <Link to="/create" data-testid="nav-host-cta" className="btn-primary topbar-publish">
                Publish a game
              </Link>
            </>
          )}
          <button
            className="icon-button topbar-menu"
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
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-[#8B8B95]" aria-hidden="true" />
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
                  <Upload className="w-4 h-4" /> Publish a game
                </Link>
                <Link to={`/creators/${user.username}`} className="btn-secondary w-full">
                  View @{user.username}
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
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
