import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Share2, ArrowLeft, ArrowRight } from "lucide-react";
import { useGG } from "../context/GGContext";
import { dayKey, recordRun, shareChallenge } from "../lib/gg";

export default function MoonDash() {
  const canvas = useRef(null), engine = useRef(null), frame = useRef(0);
  const [round, setRound] = useState(0), [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ score: 0, time: 30, lives: 3 }), [notice, setNotice] = useState("");
  const { gold } = useGG();
  const goldRef = useRef(gold);
  goldRef.current = gold;
  useEffect(() => {
    const el = canvas.current, ctx = el.getContext("2d");
    const seed = Number(dayKey().replaceAll("-", ""));
    const state = { lane: 1, score: 0, lives: 3, elapsed: 0, objects: [], next: 0.3, random: seed, invincible: 0, finished: false };
    engine.current = state;
    const random = () => { state.random = (Math.imul(1664525, state.random) + 1013904223) >>> 0; return state.random / 4294967296; };
    let last = 0, lastHud = 0;
    const finish = () => {
      if (state.finished) return;
      state.finished = true; recordRun(state.score); setPhase("done");
      setHud({ score: state.score, time: Math.max(0, 30 - state.elapsed), lives: state.lives });
    };
    function draw(now) {
      const dt = last ? Math.min((now-last)/1000, 0.05) : 0; last = now;
      const running = round > 0 && !state.finished;
      if (running) {
        state.elapsed += dt; state.invincible = Math.max(0, state.invincible-dt);
        if (state.elapsed >= state.next) {
          state.objects.push({lane:Math.floor(random()*3), y:-30, coin:random()>0.4});
          state.next += Math.max(0.24,0.65-state.elapsed*0.011);
        }
        state.objects.forEach(o => {
          o.y += dt*(150+state.elapsed*6);
          if (!o.used && o.lane===state.lane && Math.abs(o.y-435)<25) {
            o.used = true;
            if (o.coin) state.score += 10;
            else if (state.invincible===0) { state.lives--; state.invincible=0.8; }
          }
        });
        state.objects=state.objects.filter(o=>o.y<540);
        if (state.lives<=0 || state.elapsed>=30) finish();
        if (now-lastHud>100) { setHud({ score:state.score, time:Math.max(0,30-state.elapsed), lives:state.lives }); lastHud=now; }
      }
      ctx.fillStyle="#080c14"; ctx.fillRect(0,0,480,520);
      const gradient=ctx.createLinearGradient(0,0,0,520); gradient.addColorStop(0,"#181528"); gradient.addColorStop(1,"#091310"); ctx.fillStyle=gradient; ctx.fillRect(30,0,420,520);
      ctx.strokeStyle="#ffffff12"; ctx.lineWidth=1;
      for(let x=30;x<=450;x+=140){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,520);ctx.stroke(); }
      const offset=(state.elapsed*100)%50;
      for(let y=offset;y<520;y+=50){ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(450,y);ctx.stroke();}
      ctx.fillStyle="#ffffff25";
      for(let i=0;i<35;i++){const x=(i*137)%480,y=(i*73+state.elapsed*12)%520;ctx.fillRect(x,y,1.5,1.5);}
      state.objects.filter(o=>!o.used).forEach(o=> {
        const x=100+o.lane*140;
        if(o.coin){ctx.fillStyle="#f5cc59";ctx.beginPath();ctx.arc(x,o.y,15,0,Math.PI*2);ctx.fill();ctx.fillStyle="#382907";ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillText("GG",x,o.y+4);}
        else {ctx.fillStyle="#fa6172";ctx.fillRect(x-18,o.y-18,36,36);ctx.strokeStyle="#ff9eaa";ctx.strokeRect(x-12,o.y-12,24,24);}
      });
      const x=100+state.lane*140;
      if(state.invincible===0 || Math.floor(now/90)%2===0){ctx.shadowBlur=20;ctx.shadowColor=goldRef.current?"#f5cc59":"#9af5ce";ctx.fillStyle=goldRef.current?"#f5cc59":"#9af5ce";ctx.beginPath();ctx.moveTo(x,410);ctx.lineTo(x+22,455);ctx.lineTo(x,445);ctx.lineTo(x-22,455);ctx.closePath();ctx.fill();ctx.shadowBlur=0;}
      frame.current=requestAnimationFrame(draw);
    }
    frame.current=requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame.current);
  },[round]);
  const move = dir => { if(engine.current) engine.current.lane=Math.max(0,Math.min(2,engine.current.lane+dir)); };
  const start = () => { setNotice("");setHud({score:0,time:30,lives:3});setPhase("playing");setRound(n=>n+1);canvas.current?.focus(); };
  const share = async () => { try { setNotice(await shareChallenge(hud.score)); } catch(e) { if(e?.name!=="AbortError") setNotice("Sharing is unavailable. Your challenge link: https://goodgame.center/arena?beat="+hud.score); } };
  return <div className="gg-moon-game">
    <div className="gg-game-hud"><span>SCORE <b>{String(hud.score).padStart(4,"0")}</b></span><span>TIME <b>{Math.ceil(hud.time)}s</b></span><span>LIVES <b>{"♥".repeat(hud.lives) || "—"}</b></span></div>
    <div className="gg-canvas-wrap"><canvas ref={canvas} width={480} height={520} tabIndex={0} aria-label="Moon Dash. Use left and right arrow keys or A and D to switch lanes. Collect gold GG coins and avoid red blocks." onKeyDown={e=>{if(["ArrowLeft","a","A","ArrowRight","d","D"].includes(e.key)){e.preventDefault();move(["ArrowLeft","a","A"].includes(e.key)?-1:1);}}} onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();engine.current.lane=Math.min(2,Math.max(0,Math.floor((e.clientX-r.left)/r.width*3)));}} />
      {phase!=="playing" && <div className="gg-game-overlay"><span className="gg-kicker">{phase==="done"?"GOOD RUN. GOOD GAME.":"A GOODGAME ORIGINAL"}</span><h2>{phase==="done"?`${hud.score} points`:"GG Moon Dash"}</h2><p>{phase==="done"?"Your run is in your device passport. Send a challenge to a friend.":"Collect the gold. Dodge the red. Make your 30 seconds count."}</p><button className="gg-button" onClick={start}>{phase==="done"?<RotateCcw size={17}/>:<Play size={17}/>} {phase==="done"?"Run it back":"Start a free run"}</button>{phase==="done" && <button className="gg-button gg-button-outline" onClick={share}><Share2 size={16}/> Challenge a friend</button>}</div>}
    </div>
    <div className="gg-touch-controls"><button onClick={()=>move(-1)} aria-label="Move left"><ArrowLeft size={20}/></button><span>← → or A / D · tap a lane on mobile</span><button onClick={()=>move(1)} aria-label="Move right"><ArrowRight size={20}/></button></div>
    <p className="gg-muted" role="status">{notice || (gold?"Gold pilot active · cosmetic only, same game for everyone":"Guest pilot · game coins are points, not real GG")}</p>
  </div>;
}
