import { Link } from "react-router-dom";
import DonateButton from "./DonateButton";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="alley-pavement">
      <div className="alley-pavement-inner">
        <div>
          <div className="alley-pavement-brand">
            <img src="/brand/alley/mark.webp" alt="" width={36} height={36} />
            <span>
              GOODGAME<i>.center</i>
            </span>
          </div>
          <p>
            A night street of browser cabinets. Play indie HTML5 games, or wheel your own machine into the alley.
          </p>
          <div className="mt-5">
            <DonateButton variant="footer" />
          </div>
        </div>
        <FooterCol
          title="Walk"
          links={[
            ["The cabinets", "/games"],
            ["Feed", "/feed"],
            ["High scores", "/leaderboards"],
            ["Clips", "/clips"],
          ]}
        />
        <FooterCol
          title="Plug in"
          links={[
            ["Host a game", "/create"],
            ["Creators", "/creators"],
            ["News", "/news"],
            ["Communities", "/communities"],
          ]}
        />
        <FooterCol
          title="House rules"
          links={[
            ["Terms", "/legal/terms"],
            ["Privacy", "/legal/privacy"],
            ["DMCA", "/legal/dmca"],
            ["Content Policy", "/legal/content"],
          ]}
        />
      </div>
      <div className="alley-pavement-grate">
        © {new Date().getFullYear()} GoodGame.center — the alley is open
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
