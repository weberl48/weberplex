// Flattens the next movie night into one JSON object for Home Assistant's
// REST sensor. Reads Firestore's public REST API; no credentials needed.
// Kept lean: HA polls this, and every read counts against the free 50k/day.
import { makeRest, nightsWhere, eq } from './firestore-rest.js';
import { upcomingNights, lockAt, vetoedFor, fitsTheme } from '../public/js/logic.js';

const bigPoster = (url) => (url || '').replace('/poster/small/', '/poster/medium/');
const iso = (d) => (d instanceof Date ? d.toISOString() : null);

export async function buildStatus({ base, projectId, apiKey, siteUrl = '', fetchImpl = fetch, now = new Date() }) {
  const R = makeRest({ base, projectId, apiKey, fetchImpl });
  const [planned, locked, finished] = await Promise.all(['planned', 'locked', 'done'].map((s) => nightsWhere(R, s)));
  const upcoming = upcomingNights([...planned, ...locked], now);
  const last = finished.sort((a, b) => b.startsAt - a.startsAt)[0];
  const out = {
    state: 'none',
    site_url: siteUrl,
    updated: now.toISOString(),
    upcoming: upcoming.slice(0, 5).map((n) => ({ day: n.day, host: n.host, starts_at: iso(n.startsAt), status: n.status })),
    last_movie: last?.lockedMovie?.title ?? null,
    last_date: iso(last?.startsAt),
  };
  const n = upcoming[0];
  if (!n) return out;

  const [coming, snacks] = await Promise.all([
    R.query('', { from: [{ collectionId: 'free' }], where: eq('day', n.day) }),
    R.list(`nights/${n.day}/snacks`),
  ]);
  const attendees = coming.map((f) => f.name).sort((a, b) => a.localeCompare(b));
  Object.assign(out, {
    state: n.status,
    night_day: n.day,
    location: n.host,
    host: n.host,
    starts_at: iso(n.startsAt),
    lock_at: iso(lockAt(n)),
    warmup_at: new Date(n.startsAt.getTime() - 30 * 60000).toISOString(),
    attendees,
    attendee_count: attendees.length,
    snacks: snacks.map((s) => `${s.name}: ${s.item}`),
    theme: n.theme || null,
    vetoes: Object.keys(n.vetoes || {}).length,
  });

  if (n.status === 'locked') {
    const m = n.lockedMovie || {};
    const runtime = Number(/(\d+)/.exec(m.runtime || '')?.[1]) || null;
    return Object.assign(out, {
      ends_at: runtime ? new Date(n.startsAt.getTime() + runtime * 60000).toISOString() : null,
      movie_title: m.title ?? null,
      movie_year: m.year ?? null,
      movie_imdb: m.imdbId ?? null,
      movie_poster: bigPoster(m.poster) || null,
      movie_runtime_min: runtime,
      movie_rating: m.rating ?? null,
      movie_trailer: m.trailer ? `https://www.youtube.com/watch?v=${m.trailer}` : null,
    });
  }

  // Planned: who's ahead, by the same rule the lock uses (thumbs from the
  // people coming, else from everyone; vetoed movies are out, and so is
  // anything that doesn't fit the theme). Votes carry the title.
  const votes = await R.list('votes');
  const excluded = new Set([...finished, ...locked].map((x) => x.lockedMovieId).filter(Boolean));
  const vetoed = vetoedFor(n);
  // The theme needs each movie's tags, so the shelf is read only for themed
  // nights; a theme nothing left on the shelf fits is ignored, as in the pick.
  const fits = n.theme
    ? new Set((await R.list('movies')).filter((m) => fitsTheme(m, n.theme) && !excluded.has(m.imdbId) && !vetoed.has(m.imdbId)).map((m) => m.imdbId))
    : null;
  const themed = fits?.size > 0;
  const att = new Set(coming.map((f) => f.nameKey));
  const top = (only) => {
    const score = new Map();
    for (const v of votes) {
      if (excluded.has(v.movie) || vetoed.has(v.movie) || (themed && !fits.has(v.movie)) || (only && !att.has(v.nameKey))) continue;
      const s = score.get(v.movie) || { title: v.title, votes: 0 };
      s.votes += 1;
      score.set(v.movie, s);
    }
    const list = [...score.values()].sort((a, b) => b.votes - a.votes);
    return { leader: list[0], tie: list.filter((x) => x.votes === list[0]?.votes).length };
  };
  let basis = 'coming';
  let t = top(true);
  if (!t.leader) { basis = 'everyone'; t = top(false); }
  return Object.assign(out, {
    leader_title: t.leader?.title ?? null, leader_votes: t.leader?.votes ?? 0,
    leader_basis: t.leader ? basis : null, leader_tie: t.leader ? t.tie : 0,
  });
}
