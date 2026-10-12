import { Link } from "react-router-dom";
import DonateButton from "./DonateButton";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="alley-pavement">
      <div className="alley-pavement-inner">
        <div>
          <div className="alley-pavement-brand">
            <img src="/brand/logo/gg-mark.svg" alt="" width={36} height={36} />
            <span>
              GOODGAME<i>.center</i>
            </span>
          </div>
          <p>
            Play indie browser games instantly, publish an HTML5 build for free, and meet the people making them.
          </p>
          <div className="mt-5">
            <DonateButton variant="footer" />
          </div>
          <p className="mt-4"><a href="https://x.com/GGcenterhub" target="_blank" rel="noopener noreferrer">Follow GoodGame on X · @GGcenterhub ↗</a></p>
        </div>
        <FooterCol
          title="Play"
          links={[
            ["Browse games", "/games"],
            ["GG Arena", "/arena"],
            ["GG on Solana", "/gg"],
            ["Feed", "/feed"],
            ["High scores", "/leaderboards"],
            ["Clips", "/clips"],
          ]}
        />
        <FooterCol
          title="Create"
          links={[
            ["Publish a game", "/create"],
            ["Creators", "/creators"],
            ["News", "/news"],
            ["Communities", "/communities"],
          ]}
        />
        <FooterCol
          title="About"
          links={[
            ["GG First 100", "/mission"],
            ["Project & media kit", "/press"],
            ["Terms", "/legal/terms"],
            ["Privacy", "/legal/privacy"],
            ["DMCA", "/legal/dmca"],
            ["Content Policy", "/legal/content"],
          ]}
        />
      </div>
      <div className="alley-pavement-grate">
        © {new Date().getFullYear()} GoodGame.center — free browser games and creator hosting
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="alley-pavement-col">{title}</div>
      <ul>
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
