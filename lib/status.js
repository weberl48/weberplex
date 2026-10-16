// Flattens the next movie night into one JSON object for Home Assistant's
// REST sensor. Reads Firestore's public REST API; no credentials needed.
// Kept lean: HA polls this, and every read counts against the free 50k/day.
import { makeRest, nightsWhere, eq } from './firestore-rest.js';
import { upcomingNights, lockAt, ballotFor, pickMovie, nightPick } from '../public/js/logic.js';

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

  // Planned: the ballot and who's ahead, by the same rule the lock uses (votes
  // on the ballot, else thumbs from the people coming, else from everyone; vetoed
  // movies are out, and so is anything that doesn't fit the theme). The ballot
  // needs the whole shelf and everyone's seen marks.
  const [movies, votes, seen] = await Promise.all([R.list('movies'), R.list('votes'), R.list('seen')]);
  const watched = new Set([...finished, ...locked].map((x) => x.lockedMovieId).filter(Boolean));
  const input = { movies, votes, seen, watched, attendees: coming.map((f) => f.nameKey) };
  const rows = ballotFor(n, input);
  // Ties held still (rand: () => 0) like the page's projection: `leader_tie` says how many are level.
  const lead = pickMovie({ ...input, ...nightPick(n), rand: () => 0 });
  const decided = lead && lead.basis !== 'shelf';
  return Object.assign(out, {
    ballot: rows.slice(0, 8).map((r) => ({ title: r.movie.title, votes: r.votes.length, thumbs: r.thumbsComing })),
    leader_title: decided ? lead.movie.title : null, leader_votes: decided ? lead.score : 0,
    leader_basis: decided ? lead.basis : null, leader_tie: decided ? Math.max(1, lead.tie.length) : 0,
  });
}
