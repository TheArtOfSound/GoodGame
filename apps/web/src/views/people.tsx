import { Document, GameCard, ClipCard, CreatorCard, Avatar, RailHead, VerifiedTick } from '../components';
import {
  artVars, fmtCount, dur, relTime, csv, breadcrumbLd, type Env, type Creator, type Game, type Clip,
} from '../lib';

export function CreatorsDirectory(props: { env: Env; creators: Creator[] }) {
  const { env } = props;
  return (
    <Document env={env} active="discover"
      meta={{ title: 'Creators — GoodGame.center', description: 'Discover the creators publishing games, devlogs, clips, and events on GoodGame.center. Find people worth playing with.', path: '/creators' }}
      jsonld={[breadcrumbLd(env, [{ name: 'Creators', path: '/creators' }])]}>
      <div class="container">
        <div class="phead"><h1>Creators</h1><p>Studios and solo developers shipping on GoodGame. Follow the people behind the games.</p></div>
        <div class="grid g4" style="margin-top:8px">{props.creators.map((c) => <CreatorCard c={c} />)}</div>
      </div>
    </Document>
  );
}

export function CreatorPage(props: { env: Env; c: Creator; games: Game[]; clips: Clip[] }) {
  const { env, c } = props;
  const accent = c.avatar || '#6b93ff';
  const verified = c.official || c.verification_state === 'verified';
  return (
    <Document env={env} active="discover"
      meta={{
        title: `${c.display_name} - Games, Devlogs, Clips, Events | GoodGame.center`,
        description: `${c.bio || `${c.display_name} on GoodGame.center.`} Follow ${c.display_name} for new releases, devlogs, and clips.`,
        path: `/creators/${c.username}`,
        type: 'profile',
      }}
      jsonld={[breadcrumbLd(env, [{ name: 'Creators', path: '/creators' }, { name: c.display_name, path: `/creators/${c.username}` }])]}>
      <div class="art" style={'height:190px;position:relative;' + artVars(accent, c.username)} />
      <div class="container" style="margin-top:-54px;position:relative">
        <div class="row" style="align-items:flex-end;gap:18px;flex-wrap:wrap">
          <Avatar name={c.display_name} accent={accent} size={104} />
          <div class="grow" style="padding-bottom:4px">
            <h1 style="font-size:30px">{c.display_name} {verified ? <VerifiedTick /> : null}</h1>
            <div class="row wrap dim" style="font-size:13.5px;gap:9px;margin-top:6px">
              <span>@{c.username}</span><span>·</span><span><b style="color:var(--text-2)">{fmtCount(c.follower_count || 0)}</b> followers</span>
              {c.official ? <><span>·</span><span class="badge gold">★ Official GG</span></> : (c.trust_tier ? <><span>·</span><span class="badge">{c.trust_tier} creator</span></> : null)}
            </div>
          </div>
          <a class="btn btn-primary" href="/login">★ Follow</a>
          <a class="btn btn-ghost" href="/login">Message</a>
        </div>
        {c.bio ? <p class="prose" style="margin-top:18px">{c.bio}</p> : null}

        <section class="block">
          <RailHead title={`Games (${props.games.length})`} />
          {props.games.length ? <div class="grid g4">{props.games.map((g) => <GameCard g={g} />)}</div>
            : <div class="empty">No published games yet.</div>}
        </section>

        {props.clips.length ? (
          <section class="block">
            <RailHead title="Clips" />
            <div class="rail clips">{props.clips.map((cl) => <ClipCard c={cl} />)}</div>
          </section>
        ) : null}
      </div>
    </Document>
  );
}

export function ClipsDirectory(props: { env: Env; clips: Clip[]; heading?: string }) {
  const { env } = props;
  return (
    <Document env={env} active="clips"
      meta={{ title: `${props.heading || 'Clips'} — GoodGame.center`, description: 'Watch the best moments from games on GoodGame.center — clutch plays, speedrun tech, builds, and scares. Share-ready with a clip page for every moment.', path: '/clips' }}
      jsonld={[breadcrumbLd(env, [{ name: 'Clips', path: '/clips' }])]}>
      <div class="container">
        <div class="phead"><h1>{props.heading || 'Clips'}</h1><p>Every meaningful moment becomes a shareable, indexable clip page.</p></div>
        {props.clips.length
          ? <div class="grid g4" style="margin-top:8px">{props.clips.map((c) => <ClipCard c={c} />)}</div>
          : <div class="empty" style="margin-top:20px">No clips yet — clips are captured while you play. Be the first.</div>}
      </div>
    </Document>
  );
}

export function ClipPage(props: { env: Env; c: Clip; related: Clip[] }) {
  const { env, c } = props;
  const accent = c.poster_accent || c.game_accent || '#6b93ff';
  return (
    <Document env={env} active="clips"
      meta={{
        title: `${c.caption} - ${c.game_title || 'Clip'} | GoodGame.center`,
        description: `${c.caption} — a ${dur(c.duration)} clip from ${c.game_title || 'GoodGame'} by ${c.author_name}. Watch and share on GoodGame.center.`,
        path: `/clips/${c.id}-${c.slug}`,
        type: 'video.other',
        image: `/og/clip/${c.id}.svg`,
      }}>
      <div class="container">
        <div class="gp-grid" style="margin-top:24px">
          <div>
            <div class="art" style={'position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--line);aspect-ratio:16/9;' + artVars(accent, c.slug)}>
              <span class="veil" />
              <div class="playframe"><span class="disc" style="width:86px;height:86px"><svg width="36" height="36" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span></div>
              <span class="dur" style="font-size:13px">{dur(c.duration)}</span>
            </div>
            <h1 style="font-size:25px;margin-top:18px">{c.caption}</h1>
            <div class="row wrap" style="margin-top:12px;gap:10px">
              <a class="row" href={`/creators/${c.author_username}`} style="gap:8px"><Avatar name={c.author_name} accent={accent} size={32} /><b>{c.author_name}</b></a>
              <span class="dim">· {fmtCount(c.view_count)} views · {relTime(c.created_at)}</span>
            </div>
            <div class="row" style="margin-top:16px;gap:8px">
              <a class="btn btn-ghost btn-sm" href="/login">♥ Like</a>
              <a class="btn btn-ghost btn-sm" href="#">↗ Share</a>
              <a class="btn btn-ghost btn-sm" href="/safety">⚑ Report</a>
            </div>
            <div class="tags" style="margin-top:16px">{csv(c.tags).map((t) => <span class="pill">#{t}</span>)}</div>
          </div>
          <aside class="gp-aside">
            {c.game_title ? (
              <a class="panel" href={`/games/${c.game_slug}`} style="padding:14px;display:flex;gap:13px;align-items:center">
                <span class="ic art" style={artVars(c.game_accent || accent, c.game_slug || '')} />
                <div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">From the game</div><b>{c.game_title}</b><div class="gold" style="font-size:12.5px">Play now →</div></div>
              </a>
            ) : null}
            <div class="panel" style="padding:16px">
              <b style="font-size:14px">Up next</b>
              <div class="stack" style="margin-top:12px;gap:13px">
                {props.related.slice(0, 4).map((r) => (
                  <a href={`/clips/${r.id}-${r.slug}`} class="row" style="gap:11px">
                    <span class="art" style={artVars(r.poster_accent || '#6b93ff', r.slug) + ';width:78px;height:46px;border-radius:8px;flex:none'} />
                    <span style="font-size:13px;font-weight:600">{r.caption}</span>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Document>
  );
}
