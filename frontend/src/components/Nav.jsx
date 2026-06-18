import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Gamepad2, Upload, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import DonateButton from "./DonateButton";

const navItems = [
  { to: "/games", label: "Games" },
  { to: "/clips", label: "Clips" },
  { to: "/communities", label: "Communities" },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-[#1A1A1A]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link
          to="/"
          data-testid="brand-link"
          className="flex items-center gap-2 text-white"
        >
          <Gamepad2 className="w-6 h-6 text-[#D4AF37]" />
          <span className="font-black uppercase tracking-tight text-lg">
            GoodGame<span className="text-[#D4AF37]">.center</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `uppercase tracking-[0.18em] font-mono text-xs transition-colors ${
                  isActive ? "text-[#D4AF37]" : "text-[#A1A1AA] hover:text-white"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <DonateButton />
          {user ? (
            <>
              <Link
                to="/create"
                data-testid="upload-game-cta"
                className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-xs px-4 h-10 flex items-center gap-2 hover:bg-[#E5C158] transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload Game
              </Link>
              <Link
                to={`/creators/${user.username}`}
                data-testid="account-link"
                className="text-white font-mono text-sm border border-[#1A1A1A] hover:border-white px-3 h-10 flex items-center transition-colors"
              >
                @{user.username}
              </Link>
              <Link
                to="/settings"
                data-testid="settings-link"
                className="text-[#A1A1AA] hover:text-white p-2"
                aria-label="Settings"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </Link>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="text-[#A1A1AA] hover:text-white p-2"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="login-link"
                className="text-white border border-[#1A1A1A] hover:border-white px-4 h-10 flex items-center uppercase tracking-wider text-xs font-bold transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/onboarding"
                data-testid="join-link"
                className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider text-xs px-4 h-10 flex items-center hover:bg-[#E5C158] transition-colors"
              >
                Join
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-white p-2"
          onClick={() => setOpen((s) => !s)}
          data-testid="mobile-menu-toggle"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {open && (
        <div
          className="md:hidden border-t border-[#1A1A1A] bg-black px-4 py-4 space-y-3"
          data-testid="mobile-menu"
        >
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block text-white uppercase font-mono text-xs tracking-[0.18em]"
            >
              {n.label}
            </Link>
          ))}
          <div className="border-t border-[#1A1A1A] pt-3 space-y-2">
            <DonateButton variant="footer" className="w-full justify-center" />
            {user ? (
              <>
                <Link
                  to="/create"
                  onClick={() => setOpen(false)}
                  className="block bg-[#D4AF37] text-black font-bold uppercase text-xs px-4 h-10 leading-10 text-center"
                >
                  Upload Game
                </Link>
                <Link
                  to={`/creators/${user.username}`}
                  onClick={() => setOpen(false)}
                  className="block text-white border border-[#1A1A1A] px-4 h-10 leading-10 text-center"
                >
                  @{user.username}
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  data-testid="settings-link-mobile"
                  className="block text-white border border-[#1A1A1A] px-4 h-10 leading-10 text-center"
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-[#A1A1AA] border border-[#1A1A1A] px-4 h-10"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block text-white border border-[#1A1A1A] px-4 h-10 leading-10 text-center"
                >
                  Log in
                </Link>
                <Link
                  to="/onboarding"
                  onClick={() => setOpen(false)}
                  className="block bg-[#D4AF37] text-black font-bold uppercase text-xs px-4 h-10 leading-10 text-center"
                >
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
