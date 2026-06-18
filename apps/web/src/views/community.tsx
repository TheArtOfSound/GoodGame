import { Document, CommunityCard, EventCard, Avatar, RailHead, VerifiedTick } from '../components';
import {
  artVars, fmtCount, relTime, fmtDate, eventLd, breadcrumbLd,
  type Env, type Community, type EventRow,
} from '../lib';

export function CommunitiesDirectory(props: { env: Env; communities: Community[] }) {
  const { env } = props;
  return (
    <Document env={env} active="community"
      meta={{ title: 'Communities — GoodGame.center', description: 'Public hubs around games, genres, creators, game jams, and the official GG team. Join the conversation and find your people.', path: '/community' }}
      jsonld={[breadcrumbLd(env, [{ name: 'Communities', path: '/community' }])]}>
      <div class="container">
        <div class="phead"><h1>Communities</h1><p>Public hubs around games, creators, jams, and the GG team. Join one, post, and bring your squad.</p></div>
        {props.communities.length
          ? <div class="grid g3" style="margin-top:8px">{props.communities.map((c) => <CommunityCard c={c} />)}</div>
          : <div class="empty" style="margin-top:20px">No communities yet. Create the first one for a game you love.</div>}
      </div>
    </Document>
  );
}

export function CommunityPage(props: { env: Env; c: Community; events: EventRow[] }) {
  const { env, c } = props;
  return (
    <Document env={env} active="community"
      meta={{ title: `${c.name} community | GoodGame.center`, description: `${c.description} Join the ${c.name} community on GoodGame.center.`, path: `/community/${c.slug}` }}
      jsonld={[breadcrumbLd(env, [{ name: 'Communities', path: '/community' }, { name: c.name, path: `/community/${c.slug}` }])]}>
      <div class="art" style={'height:180px;position:relative;' + artVars(c.accent, c.slug)} />
      <div class="container" style="margin-top:-48px;position:relative">
        <div class="spread" style="flex-wrap:wrap;gap:14px;align-items:flex-end">
          <div class="row" style="gap:15px;align-items:flex-end">
            <span class="ic art" style={artVars(c.accent, c.slug) + ';width:84px;height:84px;border-radius:18px;border:2px solid var(--bg)'} />
            <div style="padding-bottom:4px">
              <h1 style="font-size:27px">{c.name} {c.official ? <VerifiedTick /> : null}</h1>
              <div class="row wrap dim" style="font-size:13px;gap:9px;margin-top:5px"><span><b style="color:var(--text-2)">{fmtCount(c.member_count)}</b> members</span>{c.game_title ? <><span>·</span><a href={`/games/${c.game_slug}`} class="gold">{c.game_title}</a></> : null}{c.official ? <><span>·</span><span class="badge gold">★ Official GG</span></> : null}</div>
            </div>
          </div>
          <a class="btn btn-primary" href="/login">Join community</a>
        </div>
        <p class="prose" style="margin-top:18px">{c.description}</p>

        <div class="gp-grid" style="margin-top:26px">
          <div>
            <RailHead title="Pinned" />
            <div class="panel" style="padding:20px">
              <div class="row" style="gap:10px"><Avatar name={c.owner_name} accent={c.accent} size={32} /><b>{c.owner_name}</b><span class="badge">owner</span></div>
              <p class="muted" style="margin-top:12px">Welcome to {c.name}. {c.rules}</p>
            </div>
            <div class="empty" style="margin-top:18px">Posts and discussions appear here once the social workstream is live — the structure, roles, and moderation are already in the data model.</div>
          </div>
          <aside class="gp-aside">
            <div class="panel" style="padding:18px"><b>Community rules</b><p class="muted" style="font-size:13.5px;margin-top:8px">{c.rules}</p></div>
            {props.events.length ? (
              <div class="panel" style="padding:18px">
                <b>Events</b>
                <div class="stack" style="margin-top:12px;gap:11px">
                  {props.events.map((e) => <a href={`/arena/events/${e.slug}`} class="row" style="gap:9px;font-size:13.5px"><span class="badge gold">{e.type}</span><span style="font-weight:600">{e.title}</span></a>)}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </Document>
  );
}

export function ArenaPage(props: { env: Env; events: EventRow[] }) {
  const { env } = props;
  const live = props.events.filter((e) => e.status === 'live');
  const upcoming = props.events.filter((e) => e.status !== 'live');
  return (
    <Document env={env} active="arena"
      meta={{ title: 'GG Arena — Tournaments, jams, and events | GoodGame.center', description: 'Join tournaments, game jams, playtests, and leagues on GG Arena. Live brackets, prize pools, and verified results across GoodGame games.', path: '/arena' }}
      jsonld={[breadcrumbLd(env, [{ name: 'Arena', path: '/arena' }])]}>
      <div class="container">
        <div class="phead"><h1>GG Arena</h1><p>Tournaments, jams, playtests, and leagues. Join, check in, and turn your runs into verified results.</p></div>
        {props.events.length === 0 ? (
          <div class="empty" style="margin-top:20px">No events scheduled yet. Tournaments and game jams will show up here.</div>
        ) : (
          <>
            {live.length ? (
              <section class="block" style="margin-top:8px">
                <RailHead eyebrow="Happening now" title="Live events" />
                <div class="grid g3">{live.map((e) => <EventCard e={e} />)}</div>
              </section>
            ) : null}
            {upcoming.length ? (
              <section class="block">
                <RailHead eyebrow="On the schedule" title="Upcoming & open" />
                <div class="grid g3">{upcoming.map((e) => <EventCard e={e} />)}</div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </Document>
  );
}

export function EventPage(props: { env: Env; e: EventRow }) {
  const { env, e } = props;
  return (
    <Document env={env} active="arena"
      meta={{
        title: `${e.title} - Tournament, Rules, Bracket, Prize Details | GoodGame.center`,
        description: `${e.description} Prize: ${e.prize_pool}. Join, check in, and report matches on GG Arena.`,
        path: `/arena/events/${e.slug}`,
        image: `/og/event/${e.slug}.svg`,
      }}
      jsonld={[eventLd(env, e), breadcrumbLd(env, [{ name: 'Arena', path: '/arena' }, { name: e.title, path: `/arena/events/${e.slug}` }])]}>
      <div class="art" style={'height:170px;position:relative;' + artVars(e.accent, e.slug)} />
      <div class="container" style="margin-top:-44px;position:relative">
        <div class="panel ev-hero">
          <div class="grow">
            <div class="row" style="gap:8px;margin-bottom:10px">
              {e.status === 'live' ? <span class="badge live"><span class="dot" />LIVE</span> : <span class="badge gold">{e.type.toUpperCase()}</span>}
              {e.game_title ? <a href={`/games/${e.game_slug}`} class="badge">{e.game_title}</a> : null}
            </div>
            <h1 style="font-size:30px">{e.title}</h1>
            <div class="row wrap dim" style="font-size:13px;gap:9px;margin-top:8px"><span>{e.participants} entered</span><span>·</span><span>{e.status === 'upcoming' ? 'Starts ' + relTime(e.start_at) : e.status === 'live' ? 'Live now' : 'Ended ' + relTime(e.end_at)}</span><span>·</span><span>by {e.organizer_name}</span></div>
          </div>
          <div class="center">
            <div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Prize pool</div>
            <div class="ev-prize">🏆 {e.prize_pool}</div>
            <a class="btn btn-gold" href="/login" style="margin-top:10px">{e.status === 'completed' ? 'View results' : 'Join / check in'}</a>
          </div>
        </div>

        <div class="gp-grid" style="margin-top:26px">
          <div>
            <section style="margin-top:0"><h2 style="font-size:21px;margin-bottom:12px">About this event</h2><div class="prose"><p>{e.description}</p></div></section>
            <section class="block"><h2 style="font-size:21px;margin-bottom:12px">Rules & eligibility</h2><div class="panel" style="padding:20px"><p class="muted">{e.rules}</p><div class="kv" style="margin-top:12px"><span class="k">Eligibility</span><span class="v">{e.eligibility}</span></div></div></section>
            <section class="block"><h2 style="font-size:21px;margin-bottom:12px">Bracket & matches</h2><div class="empty">The live bracket, check-ins, and match reporting render here when the Arena workstream goes live. Anti-cheat and dispute flows are in the data model.</div></section>
          </div>
          <aside class="gp-aside">
            <div class="panel" style="padding:6px 18px">
              <div class="kv"><span class="k">Format</span><span class="v">{e.type}</span></div>
              <div class="kv"><span class="k">Starts</span><span class="v">{fmtDate(e.start_at)}</span></div>
              <div class="kv"><span class="k">Ends</span><span class="v">{fmtDate(e.end_at)}</span></div>
              <div class="kv"><span class="k">Entered</span><span class="v">{e.participants}</span></div>
              <div class="kv"><span class="k">Status</span><span class="v" style={e.status === 'live' ? 'color:var(--danger)' : ''}>{e.status}</span></div>
            </div>
            <div class="panel trust">
              <div class="t"><span class="tick">✔</span>Verified result reporting</div>
              <div class="t"><span class="tick">✔</span>Anti-cheat review on top results</div>
              <div class="t"><span class="tick">✔</span>Disputes frozen until resolved</div>
            </div>
          </aside>
        </div>
      </div>
    </Document>
  );
}
