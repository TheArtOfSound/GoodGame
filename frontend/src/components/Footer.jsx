import { Link } from "react-router-dom";
import DonateButton from "./DonateButton";

export default function Footer() {
  return (
    <footer
      data-testid="site-footer"
      className="border-t border-[#1A1A1A] mt-24 bg-black"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="text-white font-black uppercase tracking-tight">
            GoodGame<span className="text-[#D4AF37]">.center</span>
          </div>
          <p className="text-[#52525B] text-sm mt-3 leading-relaxed">
            A free, browser-first platform for indie game creators and players.
          </p>
          <div className="mt-5">
            <DonateButton variant="footer" />
          </div>
        </div>
        <FooterCol
          title="Platform"
          links={[
            ["Browse Games", "/games"],
            ["Clips", "/clips"],
            ["Communities", "/communities"],
          ]}
        />
        <FooterCol
          title="Create"
          links={[
            ["Upload Game", "/create"],
            ["Creator Console", "/console"],
          ]}
        />
        <FooterCol
          title="Trust & Safety"
          links={[
            ["Terms", "/legal/terms"],
            ["Privacy", "/legal/privacy"],
            ["DMCA", "/legal/dmca"],
            ["Content Policy", "/legal/content"],
          ]}
        />
      </div>
      <div className="border-t border-[#1A1A1A] py-6 text-center text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} GoodGame.center
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="text-[#52525B] uppercase font-mono text-xs tracking-[0.2em] mb-3">
        {title}
      </div>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link
              to={to}
              className="text-[#A1A1AA] hover:text-[#D4AF37] text-sm transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
