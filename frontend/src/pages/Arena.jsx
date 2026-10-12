import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, Flame, Star, Coins, ArrowUpRight } from "lucide-react";
import SEO from "../components/SEO";
import MoonDash from "../components/MoonDash";
import { readPassport, streak } from "../lib/gg";
export default function Arena() {
  const [passport,setPassport]=useState(readPassport);
  const [params]=useSearchParams();
  const beat=Number(params.get("beat"));
  const challenge=params.has("beat") && Number.isInteger(beat) && beat>=0 && beat<=100000;
  useEffect(()=>{const sync=()=>setPassport(readPassport());window.addEventListener("gg-passport",sync);return()=>window.removeEventListener("gg-passport",sync);},[]);
  const badges=[{label:"First flight",desc:"Complete your first run",done:passport.runs>=1},{label:"Coin collector",desc:"Score 100 in one run",done:passport.best>=100},{label:"Arcade regular",desc:"Complete 10 runs",done:passport.runs>=10},{label:"Back for more",desc:"Play on 3 different days",done:passport.days.length>=3}];
  return <div className="gg-page"><SEO path="/arena" title="GG Arena — Play Moon Dash & Challenge Your Friends" description="Play GG Moon Dash free in your browser. Collect game coins, dodge obstacles, earn device passport badges, and share a score challenge with friends." image="/og/gg-arcade.png" />
    <div className="gg-page-heading"><div className="gg-kicker">THE GG ARENA / FREE PLAY</div><h1>Less scrolling.<br /><span>More high scores.</span></h1><p>One quick run. One worthy rival. Your next good game starts here.</p></div>
    {challenge && <p className="gg-notice"><Trophy size={18}/> Someone challenged you to beat {beat} points. Your best: {passport.best}. {passport.best>beat?"Challenge beaten!":"Ready for a run?"}</p>}
    <div className="gg-arena-layout"><MoonDash/><aside className="gg-passport"><div className="gg-kicker">YOUR ARCADE PASSPORT</div><h2>Player one.</h2><p className="gg-muted">Saved on this device. No account needed.</p><div className="gg-passport-stats"><div><Star size={18}/><b>{passport.xp}</b><span>Arcade XP</span></div><div><Trophy size={18}/><b>{passport.best}</b><span>Personal best</span></div><div><Flame size={18}/><b>{streak(passport.days)}</b><span>Day streak</span></div></div><div className="gg-level"><span>LEVEL {1+Math.floor(passport.xp/100)}</span><span>{passport.xp%100} / 100 XP</span><progress max="100" value={passport.xp%100} aria-label="XP toward the next level" /></div><h3>Little wins. Keep them.</h3><div className="gg-badges">{badges.map(b=><div key={b.label} className={b.done?"earned":""}><span aria-hidden="true">{b.done?"✦":"◇"}</span><div><strong>{b.label}</strong><small>{b.desc} · {b.done?"earned":"locked"}</small></div></div>)}</div><Link className="gg-holder-perk" to="/gg"><Coins size={22}/><div><strong>Got GG? Go gold.</strong><small>Check your holdings for the gold pilot skin.</small></div><ArrowUpRight size={18}/></Link><p className="gg-fineprint">XP, scores, badges, and game coins have no monetary value. Passport progress is local and can be reset by clearing browser storage. Moon Dash scores are personal; global ranked games have their own leaderboards.</p></aside></div>
    <section className="gg-arena-next"><div><h2>There's more to play.</h2><p>Find your next favorite in the full browser arcade.</p></div><Link className="gg-button gg-button-outline" to="/games">Explore all games <ArrowUpRight size={18}/></Link></section>
  </div>;
}
