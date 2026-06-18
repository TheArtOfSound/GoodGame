import { Document, Cover, GameCard, RailHead } from '../components';
import { siteLd, type Env, type Game } from '../lib';
import { keyart } from '../keyart';

export function Home(props: { env: Env; data: Awaited<ReturnType<typeof import('../db').homeData>> }) {
  const { env, data } = props;
  const f = data.featured;
  const games: Game[] = data.popular;
  const playable = games.filter((g) => g.play_template || g.upload_entry);
  const rest = games.filter((g) => !(g.play_template || g.upload_entry));
  return (
    <Document env={env} active="discover"
      meta={{ title: 'GoodGame.center — Play and publish browser games', description: 'Play games instantly in your browser and publish your own. A creator-first gaming platform — connect a wallet, upload a build, and ship a real game page.', path: '/' }}
      jsonld={[siteLd(env)]}>
      <div class="container">
        {f ? (
          <section class="hero2">
            <div class="hero2-text">
              <div class="eyebrow">Featured · Official GG game</div>
              <h1>{f.title}</h1>
              <p class="pitch">{f.pitch}</p>
              <div class="cta">
                <a class="btn btn-accent" href={`/games/${f.slug}/play`}>▶ Play now</a>
                <a class="btn btn-ghost" href={`/games/${f.slug}`}>Details</a>
                <span class="meta-inline">Free · plays in your browser</span>
              </div>
            </div>
            <a class="hero2-art" href={`/games/${f.slug}/play`} aria-label={`Play ${f.title}`}>
              {keyart(f.slug)
                ? <div class="cover has-scene" style="position:absolute;inset:0;height:100%"><div class="scene-art" dangerouslySetInnerHTML={{ __html: keyart(f.slug) || '' }} /></div>
                : <Cover accent={f.accent} seed={f.slug} kind={f.play_template || 'default'} img={f.cover_image || undefined} ratio="16/10" veil={false} />}
              <span class="hero2-play"><svg width="22" height="22" viewBox="0 0 24 24" fill="#0a0e18"><path d="M8 5v14l11-7z" /></svg></span>
            </a>
          </section>
        ) : null}

        <section class="block">
          <RailHead title="Play now in your browser" more="/games/browser" />
          <div class="grid g5">{playable.map((g) => <GameCard g={g} />)}</div>
        </section>

        {rest.length ? (
          <section class="block">
            <RailHead title="More games" more="/games" />
            <div class="grid g5">{rest.map((g) => <GameCard g={g} />)}</div>
          </section>
        ) : null}

        <section class="block">
          <div class="panel" style="padding:36px;display:flex;gap:28px;align-items:center;justify-content:space-between;flex-wrap:wrap">
            <div style="max-width:50ch">
              <div style="color:var(--brand);font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">For creators</div>
              <h2 style="font-size:24px;margin:10px 0 8px">Publish your game on GoodGame</h2>
              <p class="muted">Connect a wallet, upload a web/WebGL/Unity/Godot build, and get a live game page that's instantly playable — or price it in crypto and sell it. No gatekeepers.</p>
            </div>
            <div class="row">
              <a class="btn btn-primary" href="/create">Upload a game</a>
              <a class="btn btn-ghost" href="/docs/upload-browser-game">Read the guide</a>
            </div>
          </div>
        </section>
      </div>
    </Document>
  );
}
