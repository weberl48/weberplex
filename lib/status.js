// Flattens the current night into one JSON object for Home Assistant's REST
// sensor. Reads Firestore's public REST API (the rules allow reads), so no
// credentials are needed anywhere.
import { tally } from '../public/js/logic.js';

const LIVE = ['open', 'locked'];

function decode(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));
}
const docOf = (d) => ({ id: d.name.split('/').pop(), ...decodeFields(d.fields || {}) });

const bigPoster = (url) => (url || '').replace('/poster/small/', '/poster/medium/');
const iso = (d) => (d instanceof Date ? d.toISOString() : null);

export async function buildStatus({ base, projectId, apiKey, siteUrl = '', fetchImpl = fetch, now = new Date() }) {
  const root = `${base}/projects/${projectId}/databases/(default)/documents`;
  const keyQs = apiKey ? `key=${encodeURIComponent(apiKey)}` : '';
  const get = async (url, init) => {
    const res = await fetchImpl(url, init);
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };
  const list = async (nightId, coll) => {
    const out = [];
    let page = '';
    do {
      const qs = [keyQs, 'pageSize=300', page && `pageToken=${encodeURIComponent(page)}`].filter(Boolean).join('&');
      const body = await get(`${root}/nights/${nightId}/${coll}?${qs}`);
      out.push(...(body.documents || []).map(docOf));
      page = body.nextPageToken || '';
    } while (page);
    return out;
  };

  const rows = await get(`${root}:runQuery${keyQs ? `?${keyQs}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'nights' }],
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 10,
      },
    }),
  });
  const nights = rows.filter((r) => r.document).map((r) => docOf(r.document));
  const current = nights.find((n) => LIVE.includes(n.status));
  const last = nights.find((n) => n.status === 'done');

  const out = {
    state: 'none',
    site_url: siteUrl,
    updated: now.toISOString(),
    last_movie: last?.lockedMovie?.title ?? null,
    last_date: iso(last?.lockedStartsAt),
  };
  if (!current) return out;

  Object.assign(out, { state: current.status, night_id: current.id, title: current.title || '' });

  // A locked night is the long-lived state, so it reads only what HA shows:
  // the RSVPs for the locked date and the snacks. Every read counts against
  // Firestore's free 50k/day, and HA polls this.
  if (current.status === 'locked') {
    const [going, snacks] = await Promise.all([
      get(`${root}/nights/${current.id}:runQuery${keyQs ? `?${keyQs}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'rsvps' }],
            where: { fieldFilter: { field: { fieldPath: 'dateId' }, op: 'EQUAL', value: { stringValue: current.lockedDateId || '' } } },
          },
        }),
      }).then((rs) => rs.filter((r) => r.document).map((r) => docOf(r.document))),
      list(current.id, 'snacks'),
    ]);
    const m = current.lockedMovie || {};
    const attendees = going.map((g) => g.name).sort((a, b) => a.localeCompare(b));
    out.snacks = snacks.map((s) => `${s.name}: ${s.item}`);
    const runtime = Number(/(\d+)/.exec(m.runtime || '')?.[1]) || null;
    return Object.assign(out, {
      starts_at: iso(current.lockedStartsAt),
      location: current.lockedPlace || null,
      warmup_at: current.lockedStartsAt ? new Date(current.lockedStartsAt.getTime() - 30 * 60000).toISOString() : null,
      ends_at: current.lockedStartsAt && runtime ? new Date(current.lockedStartsAt.getTime() + runtime * 60000).toISOString() : null,
      movie_title: m.title ?? null,
      movie_year: m.year ?? null,
      movie_imdb: m.imdbId ?? null,
      movie_poster: bigPoster(m.poster) || null,
      movie_runtime_min: runtime,
      movie_rating: m.rating ?? null,
      movie_trailer: m.trailer ? `https://www.youtube.com/watch?v=${m.trailer}` : null,
      attendees,
      attendee_count: attendees.length,
    });
  }

  const [dates, rsvps, offers, movies, votes, snacks] = await Promise.all(
    ['dates', 'rsvps', 'offers', 'movies', 'votes', 'snacks'].map((c) => list(current.id, c)),
  );
  const t = tally({ dates, rsvps, offers, movies, votes });
  const best = t.dates.find((d) => d.id === t.bestDates[0]);
  const leader = t.leaders[0];
  return Object.assign(out, {
    snacks: snacks.map((s) => `${s.name}: ${s.item}`),
    suggestion_count: movies.length,
    voter_count: new Set(votes.map((v) => v.nameKey)).size,
    dates: t.dates.map((d) => ({ starts_at: iso(d.startsAt), location: d.place || null, volunteers: d.offers.map((o) => o.name), count: d.count })),
    best_date: iso(best?.startsAt),
    best_date_location: best?.place || null,
    best_date_count: best?.count ?? 0,
    leader_title: leader?.title ?? null,
    leader_votes: leader?.votes ?? 0,
    leader_poster: bigPoster(leader?.poster) || null,
    tie: t.tie,
  });
}
