// Pure helpers — no Firebase, no DOM. Unit-tested in tests/logic.test.mjs.

export const MAX_PICKS = 5;

// House picks (host-seeded) are owned by the empty key, which no guest name
// can produce (see validKey in firestore.rules).
export const HOUSE = '';
export const isHouse = (m) => m?.by === HOUSE;

// Shelf tags in display order; anything else sorts after these.
export const SHELF_ORDER = ['Unseen', 'Rewatch', 'Recent favorite', 'Foreign', 'Found footage'];

// The filter chips a ballot needs: tags actually present, in shelf order.
export function shelfTags(movies) {
  const present = new Set(movies.flatMap((m) => m.shelf || []));
  const known = SHELF_ORDER.filter((t) => present.has(t));
  const rest = [...present].filter((t) => !SHELF_ORDER.includes(t)).sort();
  return [...known, ...rest];
}

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

// ---- "For you" recommendations ----------------------------------------------
// Content-based: no account-backed "people also liked" source is available
// keylessly, so taste comes from the movies a person liked (votes + picks).

const ENGLISH_COUNTRIES = ['united states', 'usa', 'united kingdom', 'uk', 'canada', 'australia', 'ireland', 'new zealand'];
export function isForeign(meta) {
  const c = String(meta?.country || '').toLowerCase();
  if (!c) return false;
  return !c.split(',').map((s) => s.trim()).some((x) => ENGLISH_COUNTRIES.includes(x));
}
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(String).filter(Boolean);

export function tasteProfile(liked) {
  const genres = new Map();
  const people = { director: new Map(), writer: new Map(), cast: new Map() };
  let foreign = 0;
  for (const m of liked) {
    const gs = list(m.genres || m.genre);
    for (const g of gs) genres.set(g, (genres.get(g) || 0) + 1 / gs.length);
    for (const role of ['director', 'writer']) for (const p of list(m[role])) people[role].set(p, m);
    for (const p of list(m.cast).slice(0, 4)) people.cast.set(p, m);
    if (isForeign(m)) foreign += 1;
  }
  const total = [...genres.values()].reduce((a, b) => a + b, 0) || 1;
  for (const [g, w] of genres) genres.set(g, w / total);
  const topGenres = [...genres.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  return { genres, people, foreignShare: liked.length ? foreign / liked.length : 0, topGenres, liked };
}

export function recommend(profile, candidates, exclude = new Set(), max = 24) {
  const out = [];
  for (const c of candidates) {
    const id = c.imdb_id || c.id;
    if (exclude.has(id)) continue;
    let score = 0;
    let reason = null;
    const credit = (role, weight, cap) => {
      let hits = 0;
      for (const p of list(c[role])) {
        const from = profile.people[role].get(p);
        if (!from || hits >= cap) continue;
        hits += 1;
        score += weight;
        if (!reason || reason.weight < weight) {
          reason = { weight, text: role === 'cast' ? `With ${p}, from ${from.name}` : `Because you liked ${from.name} (${p})` };
        }
      }
    };
    credit('director', 4, 1);
    credit('writer', 2.5, 1);
    credit('cast', 1, 3);
    const gs = list(c.genres || c.genre);
    const genreFit = gs.reduce((s, g) => s + (profile.genres.get(g) || 0), 0);
    score += genreFit * 4;
    if (profile.foreignShare >= 0.25 && isForeign(c)) score += 1.5 * profile.foreignShare;
    const rating = parseFloat(c.imdbRating);
    if (!Number.isNaN(rating)) score += (rating - 6.5) * 0.7;
    if (!reason && genreFit > 0) {
      const shared = gs.filter((g) => profile.genres.has(g)).slice(0, 2);
      const like = profile.liked.find((m) => list(m.genres || m.genre).some((g) => shared.includes(g)));
      reason = { weight: 0, text: `More ${shared.join(' · ')}${like ? `, like ${like.name}` : ''}` };
    }
    if (score > 0) out.push({ meta: c, score: Math.round(score * 100) / 100, reason: reason?.text || 'Highly rated' });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max);
}

// The genre the ballot leans toward, for the "Trending in <genre>" tab.
export function ballotGenre(movies) {
  const counts = new Map();
  for (const m of movies) for (const g of m.genres || []) counts.set(g, (counts.get(g) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

export const stremioUrl = (imdbId) => `https://web.stremio.com/#/detail/movie/${imdbId}`;

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
