// Pure helpers — no Firebase, no DOM. Unit-tested in tests/logic.test.mjs.

export const MAX_PICKS = 5;

export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

// "Sam O'Neil" -> "sam-o-neil". Must satisfy validKey() in firestore.rules.
export function nameKey(raw) {
  return cleanName(raw)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '');
}

export function initials(name) {
  const parts = cleanName(name).split(' ').filter(Boolean);
  if (!parts.length) return '?';
  const first = [...parts[0]][0] || '';
  const last = parts.length > 1 ? [...parts[parts.length - 1]][0] || '' : '';
  return (first + last).toUpperCase();
}

const toDate = (v) => (v instanceof Date ? v : v?.toDate ? v.toDate() : v ? new Date(v) : null);
const toMs = (v) => toDate(v)?.getTime() ?? 0;

// The whole ballot in one pass: who's going when, and what's winning.
export function tally({ dates = [], rsvps = [], movies = [], votes = [] }) {
  const going = new Map();
  for (const r of rsvps) {
    if (!going.has(r.dateId)) going.set(r.dateId, []);
    going.get(r.dateId).push({ nameKey: r.nameKey, name: r.name });
  }
  const datesOut = dates
    .map((d) => {
      const g = (going.get(d.id) || []).sort((a, b) => a.name.localeCompare(b.name));
      return { ...d, startsAt: toDate(d.startsAt), going: g, count: g.length };
    })
    .sort((a, b) => toMs(a.startsAt) - toMs(b.startsAt));
  const topCount = Math.max(0, ...datesOut.map((d) => d.count));
  const bestDates = topCount > 0 ? datesOut.filter((d) => d.count === topCount).map((d) => d.id) : [];

  const movieIds = new Set(movies.map((m) => m.imdbId));
  const voters = new Map();
  for (const v of votes) {
    if (!movieIds.has(v.movie)) continue; // orphan vote from a removed movie
    if (!voters.has(v.movie)) voters.set(v.movie, []);
    voters.get(v.movie).push({ nameKey: v.nameKey, name: v.name });
  }
  const moviesOut = movies
    .map((m) => {
      const vs = (voters.get(m.imdbId) || []).sort((a, b) => a.name.localeCompare(b.name));
      return { ...m, voters: vs, votes: vs.length };
    })
    .sort((a, b) => b.votes - a.votes || toMs(a.at) - toMs(b.at) || a.title.localeCompare(b.title));
  const topVotes = Math.max(0, ...moviesOut.map((m) => m.votes));
  const leaders = topVotes > 0 ? moviesOut.filter((m) => m.votes === topVotes) : [];

  return { dates: datesOut, bestDates, movies: moviesOut, leaders, tie: leaders.length > 1 };
}

// Lowest free slot 1..5 for this person, or null when all five are used.
export function nextFreeSlot(takenSlots) {
  const taken = new Set(takenSlots);
  for (let s = 1; s <= MAX_PICKS; s++) if (!taken.has(s)) return s;
  return null;
}

export function countdownParts(target, now = new Date()) {
  const ms = toMs(target) - toMs(now);
  if (ms <= 0) return { past: true, days: 0, hours: 0, minutes: 0 };
  const mins = Math.floor(ms / 60000);
  return { past: false, days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60), minutes: mins % 60 };
}

export function countdownText(target, now = new Date()) {
  const c = countdownParts(target, now);
  if (c.past) return 'Rolling now';
  if (c.days > 0) return `${c.days}d ${c.hours}h`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`;
  return `${c.minutes}m`;
}

export function showtimeParts(when, locale = undefined) {
  const d = toDate(when);
  return {
    dow: d.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase(),
    mon: d.toLocaleDateString(locale, { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    time: d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
  };
}

export function showtimeLong(when, locale = undefined) {
  const d = toDate(when);
  return d.toLocaleString(locale, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function parseRuntime(text) {
  const m = /(\d+)/.exec(String(text ?? ''));
  return m ? Number(m[1]) : null;
}

// Six-digit "ticket number" that stays the same for a person on a night.
export function ticketNumber(key, nightId = '') {
  let h = 2166136261;
  for (const ch of `${nightId}:${key}`) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return String(h % 1000000).padStart(6, '0');
}

export function reviewSummary(reviews = []) {
  if (!reviews.length) return { avg: null, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.stars, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function pickRandom(list, rand = Math.random) {
  return list.length ? list[Math.floor(rand() * list.length) % list.length] : null;
}

// RFC 5545 calendar file for "Add to calendar".
export function buildIcs({ uid, title, start, minutes = 150, description = '', location = '', url = '' }) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const startD = toDate(start);
  const end = new Date(startD.getTime() + minutes * 60000);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Speakeasy Picture Show//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@speakeasy-picture-show`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startD)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(title)}`,
    description && `DESCRIPTION:${esc(description)}`,
    location && `LOCATION:${esc(location)}`,
    url && `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n') + '\r\n';
}

// Cinemeta meta -> the movie fields we store (sizes match firestore.rules).
export function movieFromMeta(meta) {
  const trailer = meta.trailerStreams?.[0]?.ytId || meta.trailers?.find((t) => t.type === 'Trailer')?.source || '';
  return {
    imdbId: meta.imdb_id || meta.id,
    title: String(meta.name || 'Untitled').slice(0, 120),
    year: String(meta.year || meta.releaseInfo || '').slice(0, 12),
    poster: String(meta.poster || '').slice(0, 300),
    runtime: String(meta.runtime || '').slice(0, 20),
    rating: String(meta.imdbRating || '').slice(0, 6),
    genres: (meta.genres || meta.genre || []).slice(0, 6).map((g) => String(g).slice(0, 24)),
    trailer: String(trailer).slice(0, 32),
    description: String(meta.description || '').slice(0, 600),
  };
}

export function randomId(len = 24, rand = Math.random) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += abc[Math.floor(rand() * abc.length)];
  return out;
}
