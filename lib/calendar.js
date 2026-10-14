// The calendar feed behind /calendar.ics: every planned or locked night (any
// date) and the last month's finished ones, so people subscribe once and new
// nights, locks and cancellations land in their own calendar app. Read-only,
// same public REST reads as status.js; the CDN caches the response (api/calendar.js).
import { makeRest, nightsWhere, gte } from './firestore-rest.js';
import { icsEvent, icsCalendar, parseRuntime, placeLabel } from '../public/js/logic.js';

const DAY_MS = 86400000;
const KEEP_DONE_DAYS = 30;
const DEFAULT_MINUTES = 150;

// Day keys are the site's local evenings; people are in New York.
function easternDay(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function eventFor(n, names, { siteUrl, now }) {
  const movie = n.status === 'planned' ? null : n.lockedMovie;
  const place = placeLabel(n.host);
  const runtime = movie ? parseRuntime(movie.runtime) : null;
  const description = [
    names.length ? `Coming: ${names.join(', ')}` : 'Nobody has said they are coming yet.',
    n.theme && `Theme: ${n.theme}`,
    movie && [movie.year, runtime && `${runtime} min`].filter(Boolean).join(' · '),
    siteUrl,
  ].filter(Boolean).join('\n');
  return icsEvent({
    uid: n.day,
    title: movie?.title ? `${movie.title} at ${place}` : `Movie night at ${place}`,
    start: n.startsAt,
    minutes: runtime || DEFAULT_MINUTES,
    description,
    url: siteUrl,
    stamp: now,
  });
}

export async function buildCalendar({ base, projectId, apiKey, siteUrl = '', fetchImpl = fetch, now = new Date() }) {
  const R = makeRest({ base, projectId, apiKey, fetchImpl });
  const since = easternDay(new Date(now.getTime() - KEEP_DONE_DAYS * DAY_MS));
  const [planned, locked, finished, free] = await Promise.all([
    nightsWhere(R, 'planned'),
    nightsWhere(R, 'locked'),
    nightsWhere(R, 'done'),
    // One query for everyone's marks from `since` on, not one per night.
    R.query('', { from: [{ collectionId: 'free' }], where: gte('day', since) }),
  ]);
  const coming = new Map();
  for (const f of free) coming.set(f.day, [...(coming.get(f.day) || []), f.name]);

  const nights = [...planned, ...locked, ...finished.filter((n) => n.day >= since)]
    .filter((n) => n.startsAt instanceof Date)
    .sort((a, b) => a.startsAt - b.startsAt);
  const events = nights.map((n) => eventFor(n, (coming.get(n.day) || []).sort((a, b) => a.localeCompare(b)), { siteUrl, now }));
  return icsCalendar(events, ['X-WR-CALNAME:Weberplex', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']);
}
