// GoodGame.center design system — calm, premium, spacious.
// Near-black base, slate panels, ONE accent per object (no rainbow), generative
// cover art (no monograms), gold for prizes, red only for danger. One action per card.
export const CSS = `
:root{
  --bg:#1b2838;
  --bg-2:#171a21;
  --panel:#16202d;
  --panel-2:#1b2838;
  --panel-3:#2a475e;
  --line:#000000;
  --line-soft:rgba(0,0,0,.22);
  --text:#ffffff;
  --text-2:#c7d5e0;
  --text-3:#8f98a0;
  --brand:#66c0f4;
  --brand-2:#1a9fff;
  --gold:#f2c14e;
  --good:#a1cd44;
  --green-1:#a1cd44;
  --green-2:#688f1a;
  --danger:#e8556b;
  --radius:4px;
  --radius-sm:3px;
  --maxw:1235px;
  --nav-h:60px;
  --font:"Motiva Sans",Arial,"Helvetica Neue",Helvetica,"Segoe UI",sans-serif;
  --font-display:"Motiva Sans",Arial,Helvetica,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --grain:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;color:var(--text-2);font-family:var(--font);
  font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;
  background:linear-gradient(to bottom,#171a21 0,#1b2838 340px) no-repeat,#1b2838;}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
h1,h2,h3,h4{margin:0;line-height:1.2;font-family:var(--font);font-weight:500;letter-spacing:normal;color:var(--text)}
p{margin:0}
button{font-family:inherit}
.container{max-width:var(--maxw);margin:0 auto;padding:0 28px}
.muted{color:var(--text-2)}
.dim{color:var(--text-3)}
.mono{font-family:var(--mono)}
.gold{color:var(--gold)}.good{color:var(--good)}.danger{color:var(--danger)}
.center{text-align:center}
.row{display:flex;align-items:center;gap:12px}
.row.wrap{flex-wrap:wrap}
.spread{display:flex;align-items:center;justify-content:space-between;gap:16px}
.stack{display:flex;flex-direction:column;gap:6px}
.grow{flex:1}
.sep{height:1px;background:var(--line-soft);border:0;margin:0}

/* ---------- generative art (covers, hero backgrounds) ---------- */
.art,.cover{position:relative;overflow:hidden;
  --gx:72%;--gy:20%;--accent:#6b93ff;
  background:
    radial-gradient(100% 130% at var(--gx) var(--gy), color-mix(in srgb,var(--accent),#fff 30%), transparent 60%),
    radial-gradient(90% 100% at 12% 116%, color-mix(in srgb,var(--accent),#0a0f1c 18%), transparent 62%),
    radial-gradient(70% 80% at 104% 106%, color-mix(in srgb,var(--accent),#5b3bff 18%), transparent 55%),
    linear-gradient(155deg, color-mix(in srgb,var(--accent),#0b1120 42%) 0%, #0b1020 60%, #0a0e18 100%);
}
.art::before,.cover::before{content:"";position:absolute;inset:0;
  background:
    repeating-linear-gradient(58deg, rgba(255,255,255,.05) 0 1px, transparent 1px 24px),
    radial-gradient(50% 55% at var(--gx) var(--gy), color-mix(in srgb,var(--accent),#fff 45%) 0%, transparent 62%);
  mix-blend-mode:soft-light;opacity:.9}
.art::after,.cover::after{content:"";position:absolute;inset:0;
  background-image:var(--grain);background-size:160px;opacity:.05;mix-blend-mode:overlay}
.cover{aspect-ratio:16/10}
.cover .veil{position:absolute;inset:0;background:linear-gradient(transparent 46%, rgba(5,7,12,.62));z-index:1}
.cover .corner{position:absolute;top:11px;left:11px;z-index:3;display:flex;gap:6px}
.cover .corner-r{position:absolute;top:11px;right:11px;z-index:3}
.scene-art{position:absolute;inset:0;z-index:0}
.scene-art svg,.scene-art img{width:100%;height:100%;display:block;object-fit:cover}
.cover.has-scene::before,.cover.has-scene::after{display:none}

/* ---------- nav ---------- */
.nav{position:sticky;top:0;z-index:60;height:var(--nav-h);background:#171a21;border-bottom:1px solid #000}
.nav .container{display:flex;align-items:center;gap:16px;height:var(--nav-h)}
.brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:19px;color:#fff}
.brand .logo{width:30px;height:30px;display:flex;line-height:0}
.brand .logo svg{width:30px;height:30px;display:block}
.brand span{color:#8f98a0;font-weight:400}
.nav-links{display:flex;gap:2px;margin-left:14px}
.nav-links a{padding:8px 12px;color:#c7d5e0;font-weight:500;font-size:13px;text-transform:uppercase;letter-spacing:.04em;transition:.12s}
.nav-links a:hover{color:#fff}
.nav-links a.active{color:#fff}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.search-mini{display:flex;align-items:center;gap:9px;background:#316282;
  background:linear-gradient(to right,#1a2c3f,#101822);
  border:1px solid #000;border-radius:3px;padding:8px 12px;color:#67c1f5;
  font-size:13px;min-width:200px;transition:.14s}
.search-mini:focus-within{border-color:#67c1f5}
.search-mini input{all:unset;color:#fff;width:100%;font-size:13px}

/* ---------- buttons ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:10px 18px;border-radius:2px;font-weight:400;font-size:14px;cursor:pointer;
  border:0;transition:.12s;white-space:nowrap;color:#fff}
/* Steam green — play / install / buy */
.btn-accent{background:linear-gradient(to bottom,#a1cd44 5%,#688f1a 95%);color:#d2efa9}
.btn-accent:hover{background:linear-gradient(to bottom,#b6e05a 5%,#80a625 95%);color:#fff}
/* Steam blue — store / connect */
.btn-primary{background:linear-gradient(to right,#06bfff 0,#2d73ff 100%);color:#fff}
.btn-primary:hover{filter:brightness(1.12)}
/* translucent secondary */
.btn-ghost{background:rgba(103,193,245,.2);color:#67c1f5}
.btn-ghost:hover{background:rgba(103,193,245,.34);color:#fff}
.btn-gold{background:linear-gradient(to bottom,#e5c14e,#caa12f);color:#3a2c05}
.btn-sm{padding:7px 13px;font-size:13px}
.btn-block{width:100%}
.btn.on{background:rgba(103,193,245,.38);color:#fff}
.btn[disabled]{opacity:.55;cursor:default}

/* ---------- badges ---------- */
.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;
  font-size:11.5px;font-weight:650;letter-spacing:.01em;
  background:color-mix(in srgb,var(--bg),transparent 25%);color:var(--text-2);
  border:1px solid var(--line);backdrop-filter:blur(6px)}
.badge.gold{color:var(--gold);background:rgba(242,193,78,.13);border-color:rgba(242,193,78,.3)}
.badge.good{color:var(--good);background:rgba(65,211,154,.12);border-color:rgba(65,211,154,.28)}
.badge.live{color:#fff;background:rgba(240,85,107,.18);border-color:rgba(240,85,107,.42)}
.badge.live .dot{width:6px;height:6px;border-radius:50%;background:var(--danger);
  box-shadow:0 0 0 3px rgba(240,85,107,.28);animation:pulse 1.6s infinite}
@keyframes pulse{50%{opacity:.4}}
.pill{display:inline-flex;padding:6px 12px;border-radius:9px;font-size:13px;font-weight:550;
  background:var(--panel);border:1px solid var(--line-soft);color:var(--text-2);transition:.14s}
.pill:hover{color:var(--text);border-color:var(--line);background:var(--panel-2)}
.pill.on{color:var(--text);border-color:var(--brand);background:color-mix(in srgb,var(--brand),transparent 86%)}
.star-off{color:var(--gold)}
.tags{display:flex;gap:7px;flex-wrap:wrap}
.ofc{color:var(--gold);font-size:.85em}

/* ---------- cards ---------- */
.panel{background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--radius)}
/* Steam capsule */
.capsule{display:block;background:#16202d;border-radius:3px;overflow:hidden;transition:.1s;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.capsule .cover{border-radius:0}
.capsule:hover{transform:translateY(-2px);box-shadow:0 0 0 1px #67c1f5,0 6px 16px -4px rgba(0,0,0,.7)}
.capsule:hover .cover>img,.capsule:hover .cover .scene-art{filter:brightness(1.12)}
.capsule-name{position:absolute;left:11px;bottom:9px;right:11px;z-index:3;font-weight:700;font-size:15px;
  color:#fff;text-shadow:0 1px 5px rgba(0,0,0,.95),0 0 2px rgba(0,0,0,.8);line-height:1.15;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.capsule-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 11px}
.capsule-tags{font-size:11.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.capsule-price{font-size:13px;color:#fff;white-space:nowrap}
.capsule-price.free{color:#66c1f5}
/* generic card kept for clips/news/creators */
.card{display:flex;flex-direction:column;border-radius:4px;overflow:hidden;transition:.1s;background:#16202d}
.card:hover{transform:translateY(-2px);box-shadow:0 0 0 1px #67c1f5}
.card .cover{border-radius:0}
.card .body{padding:9px 11px;display:flex;flex-direction:column;gap:4px}
.card .title{font-weight:500;font-size:14px;color:var(--text);
  display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text-3)}
.card .meta b{color:var(--text-2);font-weight:400}
.card:hover .title{color:#fff}

.grid{display:grid;gap:14px}
.grid.g5{grid-template-columns:repeat(5,1fr)}
.grid.g4{grid-template-columns:repeat(4,1fr)}
.grid.g3{grid-template-columns:repeat(3,1fr)}
.grid.g2{grid-template-columns:repeat(2,1fr)}

.rail-head{display:flex;align-items:flex-end;justify-content:space-between;margin:0 0 14px;
  border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:8px}
.rail-head h2{font-size:19px;font-weight:400;color:#fff}
.rail-head .eyebrow{display:none}
.rail-head a.more{font-size:12px;font-weight:400;color:var(--brand);text-transform:uppercase;letter-spacing:.05em}
.rail-head a.more:hover{color:#fff}
.rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(250px,1fr);gap:14px;
  overflow-x:auto;padding-bottom:10px;scrollbar-width:none;scroll-snap-type:x proximity}
.rail::-webkit-scrollbar{display:none}
.rail>*{scroll-snap-align:start}
.rail.clips{grid-auto-columns:minmax(290px,1fr)}
section.block{margin:48px 0}
section.block:first-child{margin-top:28px}

/* clip card */
.clip .cover{aspect-ratio:16/9}
.clip .play{position:absolute;inset:0;display:grid;place-items:center;z-index:2}
.clip .play span{width:52px;height:52px;border-radius:50%;
  background:rgba(7,10,17,.5);border:1px solid rgba(255,255,255,.5);display:grid;place-items:center;
  backdrop-filter:blur(6px);transition:.16s}
.clip:hover .play span{transform:scale(1.08);background:rgba(7,10,17,.7)}
.clip .dur{position:absolute;right:10px;bottom:10px;z-index:2;background:rgba(0,0,0,.72);
  padding:3px 8px;border-radius:7px;font-size:11.5px;font-weight:650}

/* avatar */
.avatar{border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;
  flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}

/* ---------- split hero ---------- */
.hero2{display:grid;grid-template-columns:1.05fr 1fr;gap:46px;align-items:center;margin:44px 0 8px}
.hero2-text .eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-2);margin-bottom:16px}
.hero2-text h1{font-weight:500;font-size:34px;letter-spacing:normal;line-height:1.1;margin-bottom:14px;color:#fff}
.hero2-text .eyebrow{color:var(--brand)}
.hero2-text .pitch{font-size:15px;color:var(--text-2);margin-bottom:24px;max-width:46ch;line-height:1.5}
.hero2-text .cta{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.hero2-art{position:relative;display:block;border-radius:4px;overflow:hidden;border:1px solid #000;aspect-ratio:460/215;box-shadow:0 0 0 1px rgba(255,255,255,.06),0 30px 60px -40px rgba(0,0,0,.95)}
.hero2-art .cover{position:absolute;inset:0;aspect-ratio:auto;height:100%;transition:transform .35s}
.hero2-art:hover .cover{transform:scale(1.035)}
.hero2-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.94);display:grid;place-items:center;z-index:4;box-shadow:0 12px 34px -8px rgba(0,0,0,.7);transition:transform .2s}
.hero2-art:hover .hero2-play{transform:translate(-50%,-50%) scale(1.08)}
.hero2-play svg{margin-left:3px}
@media(max-width:860px){.hero2{grid-template-columns:1fr;gap:22px}.hero2-art{order:-1}.hero2-text h1{font-size:38px}}

/* ---------- hero ---------- */
.hero{position:relative;border-radius:24px;overflow:hidden;min-height:460px;
  display:flex;align-items:flex-end;margin:32px 0 0;border:1px solid var(--line-soft)}
.hero .art{position:absolute;inset:0;z-index:0}
.hero .shade{position:absolute;inset:0;z-index:1;
  background:linear-gradient(95deg,rgba(7,9,15,.97) 0%,rgba(7,9,15,.92) 36%,rgba(7,9,15,.5) 70%,rgba(7,9,15,.12) 100%),
  linear-gradient(0deg,rgba(7,9,15,.92) 2%,transparent 48%)}
.hero .inner{position:relative;z-index:2;padding:46px;max-width:620px}
.hero .eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:var(--brand-2);margin-bottom:16px}
.hero h1{font-size:52px;letter-spacing:-.035em;margin-bottom:14px;line-height:1.02}
.hero .pitch{font-size:18px;color:var(--text);opacity:.9;margin-bottom:26px;max-width:48ch}
.hero .cta{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.hero .meta-inline{color:var(--text-2);font-size:14px;margin-left:4px}

/* ---------- game page ---------- */
.crumb{font-size:13px;color:var(--text-3);display:flex;gap:9px;margin:24px 0 0}
.crumb a:hover{color:var(--text-2)}
.gp-grid{display:grid;grid-template-columns:1fr 360px;gap:34px;margin-top:26px;align-items:start}
.gp-media{border-radius:18px;overflow:hidden;aspect-ratio:16/9;position:relative;display:block;border:1px solid var(--line-soft)}
.gp-aside{display:flex;flex-direction:column;gap:18px;position:sticky;top:84px}
.tabs{display:flex;gap:6px;border-bottom:1px solid var(--line-soft);margin:30px 0 26px;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tabs a{padding:12px 4px;margin-right:18px;font-weight:550;font-size:14.5px;color:var(--text-3);
  border-bottom:2px solid transparent;white-space:nowrap;transition:.14s}
.tabs a:hover{color:var(--text-2)}
.tabs a.active{color:var(--text);border-bottom-color:#fff}
.kv{display:flex;justify-content:space-between;gap:12px;padding:11px 0;
  border-bottom:1px solid var(--line-soft);font-size:14px}
.kv:last-child{border-bottom:0}
.kv .k{color:var(--text-3)}.kv .v{color:var(--text);font-weight:550;text-align:right}
.trust{display:flex;flex-direction:column;gap:11px;padding:18px}
.trust .t{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--text-2)}
.trust .t b{color:var(--text);font-weight:600}
.tick{color:var(--good);font-weight:800}
.stat-row{display:flex;text-align:center}
.stat-row .s{flex:1;padding:14px 8px}
.stat-row .s+.s{border-left:1px solid var(--line-soft)}
.stat-row .n{font-size:21px;font-weight:750;letter-spacing:-.02em}
.stat-row .l{font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.prose{color:var(--text-2);font-size:15.5px;line-height:1.75;max-width:68ch}
.prose p+p{margin-top:16px}

/* play frame */
.playframe{position:relative;width:100%;height:100%;display:grid;place-items:center;z-index:2}
.playframe .disc{width:80px;height:80px;border-radius:50%;background:rgba(7,10,17,.45);
  border:1px solid rgba(255,255,255,.55);display:grid;place-items:center;backdrop-filter:blur(6px);transition:.16s}
.playframe a:hover .disc,.gp-media:hover .disc{transform:scale(1.07);background:rgba(7,10,17,.65)}

/* lists */
.list{display:flex;flex-direction:column}
.li{display:flex;gap:15px;padding:18px;border-bottom:1px solid var(--line-soft)}
.li:last-child{border-bottom:0}
.li .ic{width:54px;height:54px;border-radius:12px;flex:none}
.review{padding:20px;border:1px solid var(--line-soft);border-radius:14px;background:var(--panel)}
.stars{color:var(--gold);letter-spacing:1.5px;font-size:13px}
.ev-hero{display:flex;gap:24px;align-items:center;padding:26px;flex-wrap:wrap}
.ev-prize{font-size:26px;font-weight:750;color:var(--gold);letter-spacing:-.02em}


/* ---------- browser arcade flagship ---------- */
.browser-page{padding-top:34px}
.browser-hero{position:relative;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(360px,.72fr);gap:28px;align-items:stretch;margin:8px 0 22px}
.browser-hero:before{content:"";position:absolute;inset:-40px -28px auto -28px;height:360px;z-index:-1;background:radial-gradient(70% 80% at 18% 12%,rgba(102,192,244,.18),transparent 62%),radial-gradient(42% 58% at 78% 12%,rgba(161,205,68,.14),transparent 64%)}
.browser-copy{padding:42px 0 34px}
.browser-copy .eyebrow,.browser-section .eyebrow,.upload-path .eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);margin-bottom:13px}
.browser-copy h1{font-size:56px;line-height:.98;letter-spacing:-.055em;max-width:750px;font-weight:700}
.browser-copy .pitch{font-size:18px;line-height:1.55;color:var(--text-2);max-width:66ch;margin:18px 0 26px}
.browser-copy .cta{display:flex;gap:12px;flex-wrap:wrap}
.browser-trust-row{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}
.browser-trust-row span{font-size:12px;color:var(--text-2);background:rgba(0,0,0,.2);border:1px solid rgba(103,193,245,.22);padding:7px 10px;border-radius:999px}
.browser-console{padding:22px;align-self:center;background:linear-gradient(180deg,#101823,#0b1018);box-shadow:0 18px 60px -34px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.04)}
.console-top{display:flex;align-items:center;gap:8px;color:var(--text-3);font-family:var(--mono);font-size:12px;margin-bottom:20px}
.console-top .dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--good);box-shadow:0 0 18px rgba(161,205,68,.65)}
.console-title{font-size:22px;line-height:1.15;font-weight:700;color:#fff;letter-spacing:-.03em;margin-bottom:17px}
.console-code{display:grid;gap:8px;margin-bottom:20px;counter-reset:step}
.console-code span{font-family:var(--mono);font-size:12.5px;color:#c7d5e0;background:#06090f;border:1px solid rgba(103,193,245,.13);border-radius:8px;padding:10px 11px}
.console-code span:before{counter-increment:step;content:"0" counter(step) "  ";color:var(--good)}
.arcade-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.arcade-stat{padding:12px 10px;border-radius:8px;background:rgba(103,193,245,.08);border:1px solid rgba(103,193,245,.13);text-align:center}
.arcade-stat b{display:block;font-size:22px;line-height:1;color:#fff;letter-spacing:-.03em}
.arcade-stat span{display:block;margin-top:6px;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em}
.browser-filterbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:10px 0 34px;flex-wrap:wrap}
.filters.compact{margin:0}
.sorters{margin-left:auto}
.browser-section{margin:54px 0}
.browser-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:22px;margin-bottom:18px}
.browser-section-head h2,.upload-path h2{font-size:28px;letter-spacing:-.035em;font-weight:700}
.browser-section-head p,.upload-path p{max-width:68ch;color:var(--text-2);font-size:15px;line-height:1.65;margin-top:8px}
.engine-strip{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
.engine-strip span{font-family:var(--mono);font-size:11px;color:var(--brand);background:rgba(103,193,245,.11);border:1px solid rgba(103,193,245,.2);padding:6px 8px;border-radius:7px}
.playable-grid{margin-top:16px}
.browser-empty{display:flex;flex-direction:column;align-items:center;gap:12px;border:1px dashed rgba(103,193,245,.3);border-radius:12px;background:rgba(103,193,245,.06)}
.browser-empty b{color:#fff;font-size:18px}.browser-empty span{color:var(--text-3)}
.upload-path{padding:28px;background:linear-gradient(135deg,rgba(103,193,245,.12),rgba(0,0,0,.16) 54%,rgba(161,205,68,.09));border-color:rgba(103,193,245,.24)}
.upload-path code{font-family:var(--mono);font-size:.9em;background:#06090f;border:1px solid rgba(255,255,255,.08);padding:1px 6px;border-radius:6px;color:#fff}
.upload-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:22px}
.upload-steps div,.why-card{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px}
.upload-steps b{width:28px;height:28px;border-radius:8px;background:rgba(161,205,68,.16);color:var(--good);display:grid;place-items:center;margin-bottom:12px}
.upload-steps span{display:block;color:#fff;font-weight:650}
.why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.why-card b{display:block;color:#fff;font-size:15px;margin-bottom:6px}.why-card span{color:var(--text-3);font-size:13.5px;line-height:1.55}
.browser-featured{padding:20px;border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)}
@media(max-width:980px){.browser-hero{grid-template-columns:1fr}.browser-console{align-self:auto}.browser-copy h1{font-size:44px}.upload-steps,.why-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:720px){.browser-page{padding-top:18px}.browser-copy{padding:22px 0}.browser-copy h1{font-size:36px}.browser-copy .pitch{font-size:16px}.browser-section-head{display:block}.engine-strip{justify-content:flex-start;margin-top:14px}.arcade-stats,.upload-steps,.why-grid{grid-template-columns:1fr}.sorters{margin-left:0}}

/* page header */
.phead{padding:44px 0 6px}
.phead h1{font-size:40px;letter-spacing:-.035em}
.phead p{color:var(--text-2);margin-top:12px;max-width:60ch;font-size:16px}
.filters{display:flex;gap:9px;flex-wrap:wrap;margin:24px 0 34px;align-items:center}

/* article */
.article{max-width:720px;margin:0 auto}
.article h1{font-size:40px;letter-spacing:-.035em;margin-bottom:16px;line-height:1.05}
.article .lede{font-size:19px;color:var(--text-2);margin-bottom:26px;line-height:1.6}

/* footer */
.footer{border-top:1px solid var(--line-soft);margin-top:100px;padding:56px 0 72px}
.footer .cols{display:grid;grid-template-columns:1.6fr repeat(4,1fr);gap:32px}
.footer h4{font-size:11.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);margin-bottom:14px;font-weight:700}
.footer a{display:block;color:var(--text-2);font-size:14px;padding:5px 0}
.footer a:hover{color:var(--text)}
.footer .tag{color:var(--text-3);font-size:14px;margin-top:14px;max-width:32ch;line-height:1.6}
.footer .legal{margin-top:40px;padding-top:24px;border-top:1px solid var(--line-soft);
  display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;color:var(--text-3);font-size:13px}

/* misc */
.empty{padding:72px 20px;text-align:center;color:var(--text-3)}
.notice{padding:15px 18px;border-radius:13px;background:color-mix(in srgb,var(--brand),transparent 90%);
  border:1px solid color-mix(in srgb,var(--brand),transparent 72%);color:var(--text-2);font-size:14px}
.codeblock{background:#06090f;border:1px solid var(--line-soft);border-radius:12px;padding:18px;
  font-family:var(--mono);font-size:12.5px;color:var(--text-2);overflow-x:auto;white-space:pre;line-height:1.7}

/* create form */
.form-grid{display:flex;flex-direction:column;gap:22px;max-width:740px;margin-top:8px}
.field>label{display:block;font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:8px}
.field input[type=text],.field textarea{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:12px 15px;color:var(--text);font-family:inherit;font-size:14.5px}
.field input[type=text]:focus,.field textarea:focus{outline:none;border-color:var(--brand);background:var(--panel-2)}
.field textarea{min-height:130px;resize:vertical;line-height:1.65}
.field .hint{font-size:12px;color:var(--text-3);margin-top:7px}
.field .hint code{font-family:var(--mono);font-size:11px;background:var(--panel-2);padding:1px 5px;border-radius:5px}
.field input[type=file]{width:100%;background:var(--panel);border:1.5px dashed var(--line);border-radius:12px;padding:18px;color:var(--text-2);font-family:inherit;font-size:14px;cursor:pointer;transition:.14s}
.field input[type=file]:hover{border-color:var(--brand);background:var(--panel-2)}
.field input[type=file]::file-selector-button{background:var(--panel-3);color:var(--text);border:1px solid var(--line);border-radius:9px;padding:9px 15px;margin-right:13px;cursor:pointer;font-family:inherit;font-weight:600;font-size:13px}
.divider-or{display:flex;align-items:center;gap:14px;color:var(--text-3);font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:4px 0}
.divider-or:before,.divider-or:after{content:"";height:1px;background:var(--line-soft);flex:1}
.swatches{display:flex;gap:11px;flex-wrap:wrap}
.swatches input{position:absolute;width:0;height:0;opacity:0}
.swatches label{width:36px;height:36px;border-radius:10px;cursor:pointer;border:2px solid transparent;display:block;transition:.12s}
.swatches input:checked+label{border-color:#fff;box-shadow:0 0 0 2px var(--bg),0 0 16px -1px currentColor}
.tmpls{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.tmpls input{position:absolute;width:0;height:0;opacity:0}
.tmpls label{display:block;cursor:pointer;border:1px solid var(--line-soft);border-radius:13px;padding:15px;transition:.14s;background:var(--panel)}
.tmpls label:hover{border-color:var(--line)}
.tmpls input:checked+label{border-color:var(--brand);background:color-mix(in srgb,var(--brand),transparent 90%)}
.tmpls .nm{font-weight:650;font-size:14.5px}
.tmpls .bl{font-size:12.5px;color:var(--text-3);margin-top:5px;line-height:1.45}
.playwrap{position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--line);background:#070a11;aspect-ratio:16/10}
.playwrap iframe{width:100%;height:100%;border:0;display:block}
@media(max-width:720px){.tmpls{grid-template-columns:1fr}.playwrap{aspect-ratio:3/4}}

/* wallet connect modal */
.wm-overlay{position:fixed;inset:0;z-index:200;background:rgba(5,7,12,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px}
.wm-overlay[hidden]{display:none}
.wm-panel{width:100%;max-width:420px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 30px 80px -20px rgba(0,0,0,.7)}
.wm-head{display:flex;align-items:center;justify-content:space-between;font-size:18px;letter-spacing:-.02em}
.wm-x{background:none;border:0;color:var(--text-3);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:8px}
.wm-x:hover{color:var(--text);background:var(--panel-2)}
.wm-sub{color:var(--text-3);font-size:13px;margin:8px 0 18px;line-height:1.55}
.wm-list{display:flex;flex-direction:column;gap:9px}
.wm-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--panel-2);border:1px solid var(--line-soft);border-radius:12px;padding:13px 15px;cursor:pointer;color:var(--text);font:inherit;font-weight:600;transition:.14s}
.wm-item:hover{border-color:var(--brand);background:var(--panel-3);transform:translateY(-1px)}
.wm-item img{width:28px;height:28px;border-radius:7px}
.wm-dot{width:24px;height:24px;border-radius:7px;display:inline-block}
.wm-name{flex:1}
.wm-chain{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--text-3);background:var(--bg);padding:3px 8px;border-radius:6px}
.wm-msg{margin-top:14px;font-size:13px;color:var(--text-3);min-height:18px;text-align:center}
.wm-empty{color:var(--text-3);font-size:13.5px;line-height:1.6;padding:8px 2px}
.wm-empty a{color:var(--brand-2)}
.wm-ava{width:16px;height:16px;border-radius:50%;display:inline-block;margin-right:7px;vertical-align:-3px}

@media(max-width:1040px){
  .gp-grid{grid-template-columns:1fr}.gp-aside{position:static}
  .grid.g5{grid-template-columns:repeat(3,1fr)}
  .footer .cols{grid-template-columns:1fr 1fr}
  .hero h1{font-size:42px}
}
@media(max-width:720px){
  .container{padding:0 18px}
  .nav-links,.search-mini{display:none}
  .hero{min-height:380px}.hero .inner{padding:28px}.hero h1{font-size:34px}.hero .pitch{font-size:16px}
  .grid.g5,.grid.g4,.grid.g3,.grid.g2{grid-template-columns:repeat(2,1fr);gap:16px}
  .phead h1{font-size:30px}.article h1{font-size:30px}
  section.block{margin:60px 0}
  .footer .cols{grid-template-columns:1fr 1fr}
}
`;

// Content hash so the <link> URL changes whenever the CSS changes (cache-bust).
let _h = 5381;
for (let i = 0; i < CSS.length; i++) _h = ((_h << 5) + _h + CSS.charCodeAt(i)) >>> 0;
export const CSS_VERSION = _h.toString(36);
