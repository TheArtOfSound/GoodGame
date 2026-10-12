import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Play, Search, Trophy, Zap, Gamepad2, Coins, Upload, Shuffle } from "lucide-react";
import { getJSON } from "../lib/api";
import { coverUrl, coverFallbackUrl, playHref, pickFeatured } from "../lib/games";
import { dailyPick, GG_TITLE, GG_DESCRIPTION } from "../lib/gg";
import SEO from "../components/SEO";
const categories = ["All games", "Arcade", "Puzzle", "Shooter", "Racing"];
export default function Home() {
  const [games, setGames] = useState([]), [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const [category, setCategory] = useState("All games"), [query, setQuery] = useState("");
  const location = useLocation();
  const load = () => {
    setLoading(true); setError(false);
    Promise.allSettled([getJSON("/games?limit=60&sort=new"), getJSON("/leaderboards?limit=4")]).then(([g,l]) => {
      setGames(g.value?.games || []); setError(g.status === "rejected"); setLeaders(l.value?.leaders || []); setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);
  const featured = games.find(g => g.slug === "nightshift-lane-racer") || pickFeatured(games);
  const daily = dailyPick(games);
  const filtered = games.filter(g => {
    const text = `${g.title} ${g.tags || ""} ${g.pitch || ""}`.toLowerCase();
    const match = category === "All games" || text.includes(category.toLowerCase()) || (category === "Racing" && /racer|lane|race|driv/.test(text));
    return match && text.includes(query.toLowerCase());
  });
  const surprise = games.filter(g => !g.price_amount && g.play_mode !== "external");
  return <div className="gg-home" data-testid="home-page">
    <SEO title={GG_TITLE} description={GG_DESCRIPTION} path="/" image="/og/gg-arcade.png" />
    {new URLSearchParams(location.search).get("donation") === "thanks" && <p className="gg-notice">Thank you for supporting GoodGame.</p>}
    <section className="gg-hero">
      <div className="gg-hero-copy">
        <div className="gg-kicker"><span className="gg-status-dot" /> THE ARCADE IS OPEN <span className="gg-kicker-tail">BUILT FOR PLAYERS. ON SOLANA.</span></div>
        <h1>Good games.<br /><span>Great company.</span></h1>
        <p>Your next favorite game is one click away. Drop into the arcade, chase a high score, and make a little noise with the GG community.</p>
        <div className="gg-actions"><a href="#arcade" className="gg-button"><Play size={17} fill="currentColor" /> Enter the arcade <ArrowRight size={18} /></a><Link to="/arena" className="gg-button gg-button-outline">Take the challenge <ArrowUpRight size={18} /></Link></div>
        <div className="gg-hero-proof"><span><Zap size={14} /> Instant browser play</span><span><Gamepad2 size={14} /> Free to get started</span><span><Coins size={14} /> GG on Solana</span></div>
      </div>
      <div className="gg-hero-scene">
        <div className="gg-orbit gg-orbit-one" /><div className="gg-orbit gg-orbit-two" />
        <div className="gg-floating-label">INSERT CURIOSITY <span>↗</span></div>
        <Link to={featured ? playHref(featured) : "/arena"} className="gg-featured">
          <div className="gg-featured-image"><img src={featured ? coverUrl(featured) : "/game-covers/nightshift-lane-racer.webp"} alt={featured ? `${featured.title} gameplay artwork` : "Neon arcade highway"} fetchPriority="high" onError={e => { e.currentTarget.onerror=null; e.currentTarget.src=coverFallbackUrl(featured); }} /><span className="gg-featured-tag">TONIGHT'S FEATURE</span><span className="gg-play-disc"><Play size={28} fill="currentColor" /></span></div>
          <div className="gg-featured-caption"><div><small>ONE MORE RUN?</small><strong>{featured?.title || "GG Moon Dash"}</strong></div><ArrowUpRight size={24} /></div>
        </Link>
        <Link to="/gg" className="gg-coin" aria-label="Meet GOODGAME GG on Solana"><span>GG</span><small>GOODGAME · SOLANA</small></Link>
        <div className="gg-scene-coordinate">GG / PLAYER ONE / READY</div>
      </div>
    </section>
    <div className="gg-ticker" aria-label="Arcade highlights"><span>PLAY A LITTLE</span><b>✳</b><span>BUILD SOMETHING</span><b>✳</b><span>BEAT YOUR BEST</span><b>✳</b><span>SAY GG</span><b>✳</b><Link to="/gg">MEET THE COIN ↗</Link></div>
    <section className="gg-discover" id="arcade">
      <div className="gg-section-head"><div><div className="gg-kicker">01 / PICK YOUR PLAY</div><h2>Small games. Big energy.</h2></div><Link to="/games" className="gg-text-link">The full arcade <ArrowUpRight size={18} /></Link></div>
      <div className="gg-browser-tools"><div className="gg-filters" aria-label="Game categories">{categories.map(c => <button key={c} onClick={() => setCategory(c)} aria-pressed={category===c} className={category===c ? "selected" : ""}>{c}</button>)}</div><label className="gg-game-search"><Search size={16} /><input aria-label="Find a game" placeholder="Find your next obsession" value={query} onChange={e=>setQuery(e.target.value)} /></label></div>
      {error ? <div className="gg-empty">The arcade catalog could not load. <button className="gg-button gg-button-outline" onClick={load}>Try again</button></div> : loading ? <div className="gg-game-grid">{Array.from({length:8},(_,i)=><div className="gg-game-skeleton" key={i} />)}</div> : filtered.length ? <div className="gg-game-grid">{filtered.slice(0,8).map(g => <Link className="gg-game-card" to={playHref(g)} key={g.id}><div className="gg-game-image"><img src={coverUrl(g)} alt="" loading="lazy" onError={e => { e.currentTarget.onerror=null; e.currentTarget.src=coverFallbackUrl(g); }} /><span className="gg-game-play"><Play size={18} fill="currentColor" /></span><small>{g.price_amount ? `${g.price_amount} ${g.price_token}` : "FREE TO PLAY"}</small></div><div className="gg-game-info"><strong>{g.title}</strong><ArrowUpRight size={16} /></div><p>{g.pitch || "Discover an indie browser game."}</p></Link>)}</div> : <p className="gg-empty">No games match this selection. Try another genre or search.</p>}
      <div className="gg-discover-foot"><span>Nothing to install. Something to love.</span>{surprise.length>0 && <a className="gg-text-link" href={playHref(surprise[Math.floor(Math.random()*surprise.length)])}><Shuffle size={15} /> Surprise me</a>}</div>
    </section>
    <section className="gg-challenge-row">
      <div className="gg-daily"><div className="gg-kicker"><span className="gg-status-dot" /> A NEW PICK EVERY DAY · UTC</div><h2>Same game.<br />New bragging rights.</h2><p>{daily ? `Today's pick: ${daily.title}. Take a run, then see how you stack up on the game leaderboard.` : "Thirty seconds. Three lanes. Collect GG coins and dodge the red blocks in Moon Dash."}</p><div className="gg-actions"><Link to={daily ? playHref(daily) : "/arena"} className="gg-button">Play today's pick <ArrowUpRight size={18} /></Link><Link to="/arena" className="gg-text-link">Try GG Moon Dash →</Link></div><span className="gg-daily-watermark" aria-hidden="true">GG</span></div>
      <aside className="gg-leaders"><div className="gg-section-head"><h3><Trophy size={19} /> Hall of play</h3><Link to="/leaderboards" aria-label="All leaderboards"><ArrowUpRight size={20} /></Link></div><p className="gg-muted">Current game champions</p>{leaders.length ? <ol>{leaders.map((l,i)=><li key={`${l.game_id}-${i}`}><span className="gg-rank">0{i+1}</span><Link to={`/games/${l.game_slug}#leaderboard`}><strong>{l.game_title}</strong><small>@{l.username}</small></Link><b>{Number(l.score).toLocaleString()}</b></li>)}</ol> : <div className="gg-empty"><Trophy size={32} /><p>The next high score could be yours.</p><Link to="/leaderboards" className="gg-text-link">Explore ranked games →</Link></div>}</aside>
    </section>
    <section className="gg-token-banner"><div className="gg-token-seal" aria-hidden="true">GG</div><div><div className="gg-kicker">02 / THE COIN IN YOUR CORNER</div><h2>Meet GG. Bring your game face.</h2><p>GOODGAME on Solana belongs in the arcade. Connect your wallet, check your GG, and unlock a gold pilot skin in Moon Dash. Everyone gets to play.</p></div><Link to="/gg" className="gg-button gg-button-outline">Explore $GG <ArrowUpRight size={18} /></Link></section>
    <section className="gg-create"><div><div className="gg-kicker">03 / MADE BY YOU</div><h2>Got a game?<br /><span>Give it a home.</span></h2></div><div><p>Upload your HTML5 build or link a hosted game. Get a playable page, find your first fans, and share it with a community that actually plays.</p><div className="gg-actions"><Link to="/create" className="gg-button"><Upload size={17} /> Publish a game</Link><Link to="/creators" className="gg-text-link">Meet the creators ↗</Link></div></div></section>
    <section className="gg-faq"><div className="gg-kicker">BEFORE YOU HIT PLAY</div><h2>A few good answers.</h2><details><summary>Do I need a wallet to play?</summary><p>No. Browse and play free browser games as a guest. Connect a Solana wallet only if you want to check your GG holdings and use the gold pilot cosmetic.</p></details><details><summary>Are XP and game coins real GG tokens?</summary><p>No. Moon Dash coins, XP, and passport badges are free game progress stored on this device. They have no cash value and cannot be exchanged for GG.</p></details><details><summary>Can I publish my own browser game?</summary><p>Yes. Use the creator flow to upload a web game or link a hosted build. <Link to="/create">Publish your game →</Link></p></details></section>
  </div>;
}
