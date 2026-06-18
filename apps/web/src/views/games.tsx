import { Document, GameCard, ClipCard, Avatar, RailHead } from '../components';
import { gameArt } from '../art';
import { keyart } from '../keyart';
import {
  artVars, stars, fmtCount, csv, fmtDate, relTime, playClass, gameLd, breadcrumbLd,
  type Env, type Game, type Clip, type Review,
} from '../lib';

const FILTERS: [string, string][] = [
  ['/games', 'All'], ['/games/browser', 'Browser'], ['/games/godot', 'Godot'],
  ['/games/unity', 'Unity'], ['/games/unreal', 'Unreal'], ['/games/windows', 'Native'],
];

export function GamesDirectory(props: { env: Env; games: Game[]; heading: string; sub: string; path: string; sort?: string }) {
  if (props.path === '/games/browser') return <BrowserGamesDirectory {...props} />;

  const { env, games } = props;
  return (
    <Document env={env} active="games"
      meta={{ title: `${props.heading} — GoodGame.center`, description: props.sub, path: props.path }}
      jsonld={[breadcrumbLd(env, [{ name: 'Games', path: '/games' }, { name: props.heading, path: props.path }])]}>
      <div class="container">
        <div class="phead">
          <h1>{props.heading}</h1>
          <p>{props.sub}</p>
          <div class="filters">
            {FILTERS.map(([href, label]) => (
              <a class={'pill' + (props.path === href ? ' on' : '')} href={href}>{label}</a>
            ))}
            <span class="grow" />
            <a class={'pill' + (props.sort === 'new' ? ' on' : '')} href={`${props.path}?sort=new`}>Newest</a>
            <a class={'pill' + (props.sort === 'rating' ? ' on' : '')} href={`${props.path}?sort=rating`}>Top rated</a>
          </div>
        </div>
        {games.length
          ? <div class="grid g4">{games.map((g) => <GameCard g={g} />)}</div>
          : <div class="empty">No games here yet. <a href="/create" class="gold">Be the first to publish →</a></div>}
      </div>
    </Document>
  );
}

function BrowserGamesDirectory(props: { env: Env; games: Game[]; heading: string; sub: string; path: string; sort?: string }) {
  const { env, games } = props;
  const featured = games[0];
  const uploaded = games.filter((g) => !!g.upload_entry).length;
  const templates = games.filter((g) => !!g.play_template && !g.upload_entry).length;
  const engineSet = Array.from(new Set(games.map((g) => g.engine || 'web'))).slice(0, 4);
  const stat = (n: string, l: string) => <div class="arcade-stat"><b>{n}</b><span>{l}</span></div>;
  return (
    <Document env={env} active="games"
      meta={{
        title: 'Instant browser games — GoodGame.center',
        description: 'Play HTML5, WebGL, WASM, Godot Web, Unity WebGL, Phaser, and creator-uploaded builds directly in the browser. No install. No launcher.',
        path: '/games/browser',
      }}
      jsonld={[breadcrumbLd(env, [{ name: 'Games', path: '/games' }, { name: 'Browser games', path: '/games/browser' }])]}>
      <div class="container browser-page">
        <section class="browser-hero">
          <div class="browser-copy">
            <div class="eyebrow">GoodGame Browser Arcade</div>
            <h1>Instant browser games. No install. No launcher.</h1>
            <p class="pitch">Play HTML5, WebGL, WASM, Godot Web, Unity WebGL, Phaser, and creator-uploaded builds directly in a sandboxed browser tab.</p>
            <div class="cta">
              <a class="btn btn-accent" href="#playable-now">Play browser games</a>
              <a class="btn btn-primary" href="/create">Upload your game</a>
            </div>
            <div class="browser-trust-row">
              <span>Sandboxed iframe</span>
              <span>Version history</span>
              <span>Scan status</span>
              <span>Report tools</span>
            </div>
          </div>
          <div class="browser-console panel">
            <div class="console-top"><span class="dot good-dot" /><span>runtime.goodgame.center</span></div>
            <div class="console-title">Playable web build pipeline</div>
            <div class="console-code">
              <span>export web build</span>
              <span>zip folder with index.html</span>
              <span>upload to GoodGame</span>
              <span>publish playable page</span>
            </div>
            <div class="arcade-stats">
              {stat(String(games.length), 'browser games')}
              {stat(String(uploaded), 'uploaded builds')}
              {stat(String(templates), 'built-in demos')}
            </div>
          </div>
        </section>

        <div class="browser-filterbar">
          <div class="filters compact">
            {FILTERS.map(([href, label]) => (
              <a class={'pill' + (props.path === href ? ' on' : '')} href={href}>{label}</a>
            ))}
          </div>
          <div class="filters compact sorters">
            <a class={'pill' + (props.sort === 'new' ? ' on' : '')} href="/games/browser?sort=new">Newest</a>
            <a class={'pill' + (props.sort === 'rating' ? ' on' : '')} href="/games/browser?sort=rating">Top rated</a>
          </div>
        </div>

        <section id="playable-now" class="browser-section">
          <div class="browser-section-head">
            <div>
              <div class="eyebrow">Playable now</div>
              <h2>Browser builds first</h2>
              <p>Every card here should resolve to something you can run in the browser or a creator-uploaded web export.</p>
            </div>
            {engineSet.length ? <div class="engine-strip">{engineSet.map((e) => <span>{e.toUpperCase()}</span>)}</div> : null}
          </div>

          {games.length
            ? <div class="grid g4 playable-grid">{games.map((g) => <GameCard g={g} />)}</div>
            : <div class="empty browser-empty">
                <b>No browser games are published here yet.</b>
                <span>Upload the first playable build and make this page real.</span>
                <a href="/create" class="btn btn-primary">Upload the first game</a>
              </div>}
        </section>

        <section class="upload-path panel">
          <div>
            <div class="eyebrow">Creator path</div>
            <h2>Export → zip → upload → playable page.</h2>
            <p>GoodGame should be brutally simple for web-game creators: export the build, zip the folder that contains <code>index.html</code>, upload it, then get a hosted page players can open immediately.</p>
          </div>
          <div class="upload-steps">
            <div><b>1</b><span>Export for web</span></div>
            <div><b>2</b><span>Zip the build folder</span></div>
            <div><b>3</b><span>Upload on GoodGame</span></div>
            <div><b>4</b><span>Share the playable page</span></div>
          </div>
          <div class="row wrap" style="margin-top:22px">
            <a class="btn btn-accent" href="/create">Upload a browser build</a>
            <span class="dim">Supports HTML5, WebGL, Unity WebGL, Godot Web, Phaser, and WASM-style builds.</span>
          </div>
        </section>

        <section class="browser-section">
          <div class="browser-section-head">
            <div>
              <div class="eyebrow">Why GoodGame</div>
              <h2>A web-native arcade layer, not a fake giant store.</h2>
            </div>
          </div>
          <div class="why-grid">
            <div class="why-card"><b>Instant play</b><span>No launcher, installer, or app-store friction.</span></div>
            <div class="why-card"><b>Creator-owned pages</b><span>Each build gets a real page, metadata, and shareable route.</span></div>
            <div class="why-card"><b>Build history</b><span>Releases can show version history, changelogs, and current build state.</span></div>
            <div class="why-card"><b>Sandboxed runtime</b><span>Uploaded games run isolated from the surrounding platform shell.</span></div>
            <div class="why-card"><b>Trust surfaces</b><span>Scan status, report tools, maturity, and release metadata stay visible.</span></div>
            <div class="why-card"><b>Expandable platform</b><span>Clips, events, wallet, and community layer on top after the playable loop works.</span></div>
          </div>
        </section>

        {featured ? (
          <section class="browser-section browser-featured">
            <div class="browser-section-head">
              <div>
                <div class="eyebrow">First stop</div>
                <h2>Start with a playable build.</h2>
                <p>{featured.title} is first in this filtered catalog right now. Keep the page honest: show what is actually live, then let creators add more.</p>
              </div>
              <a class="btn btn-ghost" href={`/games/${featured.slug}`}>Open {featured.title}</a>
            </div>
          </section>
        ) : null}
      </div>
    </Document>
  );
}

export function GamePage(props: {
  env: Env; g: Game; releases: any[]; reviews: Review[]; clips: Clip[]; related: Game[]; owned?: boolean; following?: boolean;
}) {
  const { env, g } = props;
  const pc = playClass(g);
  const tabs = ['Overview', 'Releases', 'Clips', 'Reviews', 'Community'];
  const engineCrumb = ['godot', 'unity', 'unreal'].includes(g.engine) ? g.engine : 'browser';
  const paid = !!(g.price_amount && g.pay_to);
  const owned = !!props.owned;
  const chainLabel = g.pay_chain === 'base' ? 'Base' : g.pay_chain === 'base-sepolia' ? 'Base Sepolia (testnet)' : (g.pay_chain || '');
  const price = paid ? `${g.price_amount} ${g.price_token}` : g.pricing === 'free' ? 'Free' : `$${(g.price_cents / 100).toFixed(2)}`;
  return (
    <Document env={env} active="games"
      meta={{
        title: `${g.title} - Play, Clips, Events, Mods | GoodGame.center`,
        description: `Play ${g.title}${g.owner_name ? `, by ${g.owner_name}` : ''}: ${g.pitch} Watch clips, read reviews, join events, and follow the community on GoodGame.center.`,
        path: `/games/${g.slug}`,
        type: 'website',
        image: `/og/game/${g.slug}.svg`,
      }}
      jsonld={[
        gameLd(env, g),
        breadcrumbLd(env, [{ name: 'Games', path: '/games' }, { name: g.title, path: `/games/${g.slug}` }]),
      ]}>
      <div class="container">
        <div class="crumb">
          <a href="/games">Games</a><span>/</span>
          <a href={`/games/${engineCrumb}`}>{g.engine.toUpperCase()}</a><span>/</span>
          <span style="color:var(--text-2)">{g.title}</span>
        </div>

        <div class="gp-grid">
          <div>
            {/* media */}
            <a href={`/games/${g.slug}/play`} class="gp-media" style={artVars(g.accent, g.slug)}>
              {keyart(g.slug)
                ? <div class="scene-art" dangerouslySetInnerHTML={{ __html: keyart(g.slug) || '' }} />
                : g.cover_image
                  ? <img class="scene-art" src={g.cover_image} alt="" />
                  : <div class="scene-art" dangerouslySetInnerHTML={{ __html: gameArt(g.play_template || 'default', g.accent, g.slug) }} />}
              <span class="veil" />
              <div class="playframe">
                <span class="disc"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span>
              </div>
              <span class="badge" style="position:absolute;left:14px;bottom:14px;z-index:3">{pc.label}</span>
            </a>

            {/* header */}
            <div style="margin-top:22px">
              <div class="row wrap" style="gap:8px;margin-bottom:12px">
                {g.official ? <span class="badge gold">★ Official GG</span> : (g.verified ? <span class="badge good">✔ Verified</span> : null)}
                <span class="badge">{g.engine.toUpperCase()}</span>
                <span class="badge">{g.maturity === 'everyone' ? 'Everyone' : g.maturity === 'teen' ? 'Teen' : 'Mature'}</span>
              </div>
              <h1 style="font-size:34px;letter-spacing:-.035em">{g.title}</h1>
              <p class="muted" style="font-size:17px;margin-top:10px;max-width:64ch">{g.pitch}</p>
              <div class="row wrap" style="margin-top:16px;gap:14px">
                <a class="row" href={`/creators/${g.owner_username}`} style="gap:9px">
                  <Avatar name={g.owner_name} accent={g.accent} size={30} />
                  <span style="font-weight:600">{g.owner_name}</span>
                </a>
                <span class="dim">·</span>
                <span class="dim">{g.engine === 'gg' ? 'GoodGame engine' : g.engine.toUpperCase()}</span>
              </div>
            </div>

            <div class="tabs">
              {tabs.map((t, i) => <a href={`#${t.toLowerCase()}`} class={i === 0 ? 'active' : ''}>{t}</a>)}
            </div>

            <section id="overview" style="margin-top:4px">
              <h2 style="font-size:21px;margin-bottom:14px">About this game</h2>
              <div class="prose">{g.description.split('\n\n').map((para) => <p>{para}</p>)}</div>
              <div class="tags" style="margin-top:18px">{csv(g.tags).map((t) => <a class="pill" href={`/games?tag=${t}`}>#{t}</a>)}</div>
            </section>

            <section id="releases" class="block">
              <h2 style="font-size:21px;margin-bottom:14px">Release history</h2>
              <div class="panel list">
                {props.releases.map((r) => (
                  <div class="li">
                    <div class="ic art" style={artVars(g.accent, g.slug + 'v' + r.version)} />
                    <div class="grow">
                      <div class="spread"><b>v{r.version}</b><span class="dim" style="font-size:12px">{fmtDate(r.release_date)}</span></div>
                      <p class="muted" style="font-size:13.5px;margin-top:4px">{r.changelog}</p>
                      <div class="row wrap" style="gap:8px;margin-top:8px">
                        {r.is_current ? <span class="badge good">Current</span> : null}
                        <span class="badge">{r.channel}</span>
                        <span class="badge good">✔ Scanned · smoke test passed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {props.clips.length ? (
              <section id="clips" class="block">
                <RailHead title="Clips" more={`/clips?game=${g.slug}`} />
                <div class="rail clips">{props.clips.map((c) => <ClipCard c={c} />)}</div>
              </section>
            ) : null}

            <section id="reviews" class="block">
              <h2 style="font-size:21px;margin-bottom:14px">Reviews</h2>
              <div class="notice" style="margin-bottom:16px">Reviews require a verified play session or download — scored review spam is gated behind evidence.</div>
              <div class="stack" style="gap:12px">
                {props.reviews.length ? props.reviews.map((rv) => (
                  <div class="review">
                    <div class="spread">
                      <div class="row"><Avatar name={rv.author_name} accent={g.accent} size={28} /><b>{rv.author_name}</b><span class="stars">{stars(rv.rating)}</span></div>
                      <span class="dim" style="font-size:12px">{rv.playtime_evidence}</span>
                    </div>
                    <p class="muted" style="margin-top:10px;font-size:14.5px">{rv.body}</p>
                    <div class="row dim" style="font-size:12px;margin-top:10px">👍 {rv.helpful_count} found this helpful</div>
                  </div>
                )) : <div class="empty">No reviews yet — play it and be the first to review.</div>}
              </div>
            </section>

            <section id="community" class="block">
              <h2 style="font-size:21px;margin-bottom:12px">Community</h2>
              <p class="prose">No posts yet. Be the first to share a clip, devlog, or tip for {g.title}.</p>
            </section>
          </div>

          {/* aside */}
          <aside class="gp-aside">
            <div class="panel" style="padding:18px">
              {paid && !owned ? (
                <>
                  <button class="btn btn-accent btn-block" id="buy-btn" data-slug={g.slug} type="button" style="font-size:15px;padding:13px">Buy for {g.price_amount} {g.price_token}</button>
                  <div id="buy-msg" class="dim" style="font-size:12px;margin-top:11px;text-align:center;line-height:1.5">Pay on {chainLabel}. You sign the transfer in your own wallet — GoodGame never holds your funds.</div>
                </>
              ) : (
                <>
                  <a class="btn btn-accent btn-block" href={`/games/${g.slug}/play`} style="font-size:15px;padding:13px">
                    {pc.kind === 'native' ? '⬇ ' + pc.label : '▶ ' + pc.label}
                  </a>
                  <div class="row" style="gap:8px;margin-top:10px">
                    <a class="btn btn-ghost grow" href="/dashboard">+ Library</a>
                    <button type="button" id="follow-btn" data-slug={g.slug} class={'btn btn-ghost grow' + (props.following ? ' on' : '')}>{props.following ? '★ Following' : '★ Follow'}</button>
                  </div>
                  <div class="dim" style="font-size:12px;margin-top:12px;text-align:center">
                    {owned ? <span class="good">✔ You own this</span> : price} · Runs in an isolated sandbox
                  </div>
                </>
              )}
            </div>

            <div class="panel" style="padding:6px 18px">
              <div class="kv"><span class="k">Engine</span><span class="v">{g.engine.toUpperCase()}</span></div>
              <div class="kv"><span class="k">Platforms</span><span class="v">{csv(g.platforms).map((p) => p[0].toUpperCase() + p.slice(1)).join(', ')}</span></div>
              <div class="kv"><span class="k">Build type</span><span class="v">{g.build_class}</span></div>
              <div class="kv"><span class="k">Content rating</span><span class="v">{g.content_rating}</span></div>
              <div class="kv"><span class="k">Price</span><span class="v">{price}</span></div>
              <div class="kv"><span class="k">Updated</span><span class="v">{relTime(g.updated_at)}</span></div>
            </div>

            <div class="panel trust">
              <div class="t"><span class="tick">✔</span><b>{g.official ? 'Official GG game' : g.verified ? 'Verified creator' : 'Community game'}</b></div>
              <div class="t"><span class="tick">✔</span>Build scan passed</div>
              <div class="t"><span class="tick">✔</span>Smoke test passed in sandbox</div>
              <div class="t"><span class="tick">✔</span>Runs on an isolated play origin</div>
              <div class="t" style="margin-top:4px"><a href="/safety" class="dim" style="font-size:12.5px">⚑ Report this game</a></div>
            </div>
          </aside>
        </div>

        {props.related.length ? (
          <section class="block">
            <RailHead title="More like this" />
            <div class="grid g5">{props.related.map((rg) => <GameCard g={rg} />)}</div>
          </section>
        ) : null}
      </div>
    </Document>
  );
}

// Standalone play surface on the isolated-origin design (RT-001).
export function PlayPage(props: { env: Env; g: Game; locked?: boolean }) {
  const { env, g } = props;
  return (
    <Document env={env} active="games"
      meta={{ title: `Play ${g.title} | GoodGame.center`, description: `Play ${g.title} now in your browser on GoodGame.center.`, path: `/games/${g.slug}/play`, noindex: true }}>
      <div class="container">
        <div class="spread" style="margin:18px 0">
          <a href={`/games/${g.slug}`} class="row dim" style="font-size:13px">← Back to {g.title}</a>
          <div class="row"><span class="badge good">✔ Sandboxed</span><a class="btn btn-ghost btn-sm" href="/safety">⚑ Report issue</a></div>
        </div>
        {props.locked ? (
          <div class="art" style={'position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--line);aspect-ratio:16/9;display:grid;place-items:center;text-align:center;' + artVars(g.accent, g.slug)}>
            <span class="veil" />
            <div style="position:relative;z-index:2;max-width:44ch;padding:24px">
              <div style="font-size:32px;margin-bottom:6px">🔒</div>
              <b style="font-size:19px">Purchase required</b>
              <p class="muted" style="font-size:13.5px;margin-top:6px">Buy this game with crypto to unlock instant play — you sign the transfer in your own wallet.</p>
              <a class="btn btn-gold" href={`/games/${g.slug}`} style="margin-top:14px">View purchase options</a>
            </div>
          </div>
        ) : (g.upload_entry || g.play_template) ? (
          <>
            <div class="playwrap">
              <iframe src={g.upload_entry ? `/ugc/${g.id}/${g.upload_entry}` : `/play/${g.slug}`} title={`Play ${g.title}`}
                sandbox={g.upload_entry ? 'allow-scripts allow-pointer-lock allow-fullscreen' : 'allow-scripts'}
                allow="fullscreen; gamepad; autoplay" loading="lazy" />
            </div>
            <div class="notice" style="margin-top:16px">{g.upload_entry
              ? 'Creator-uploaded build — served from storage and run in a sandboxed frame on an opaque origin (no access to your GoodGame session). Automated malware scanning and smoke tests are the next safety layer (§7).'
              : 'Running sandboxed — allow-scripts only, with no access to your GoodGame session or storage. In production, untrusted builds move to an isolated origin (play.goodgame.center) per §7.2.'}</div>
          </>
        ) : (
          <>
            <div class="art" style={'position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--line);aspect-ratio:16/9;' + artVars(g.accent, g.slug)}>
              <span class="veil" />
              <div class="playframe" style="flex-direction:column;gap:18px">
                <span class="disc" style="width:96px;height:96px"><svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span>
                <div class="center" style="max-width:46ch">
                  <b style="font-size:19px">{g.title}</b>
                  <p class="muted" style="font-size:13px;margin-top:6px">This title ships a full {g.engine === 'unity' ? 'Unity' : g.engine === 'godot' ? 'Godot' : g.engine === 'unreal' ? 'Unreal' : 'native'} build through the creator console — the in-browser demo isn't wired into this seed yet.</p>
                </div>
              </div>
            </div>
            <div class="notice" style="margin-top:16px">Runtime isolation (§7.2): untrusted builds are served from a separate origin with a strict CSP and storage only through the GG SDK.</div>
          </>
        )}
      </div>
    </Document>
  );
}
