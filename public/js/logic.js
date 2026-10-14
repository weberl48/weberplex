// Pure helpers — no Firebase, no DOM. Unit-tested in tests/logic.test.mjs.

// House picks (owner-seeded) are owned by the empty key, which no guest name
// can produce (see validKey in firestore.rules).
export const HOUSE = '';
export const isHouse = (m) => m?.by === HOUSE;

// Shelf tags in display order; anything else sorts after these. Seen/unseen
// is per person now (the "seen it" marks), not a tag.
export const SHELF_ORDER = ['Recent favorite', 'Foreign', 'Found footage'];

// The filter chips a shelf needs: tags actually present, in shelf order.
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
// Names with no Latin letters or digits (e.g. "Ольга") get a stable hashed
// key instead of being refused.
export function nameKey(raw) {
  const latin = latinKey(raw);
  if (latin || !/[\p{L}\p{N}]/u.test(cleanName(raw))) return latin;
  let h = 2166136261;
  for (const ch of cleanName(raw).toLowerCase()) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return `u${h.toString(36)}`;
}
function latinKey(raw) {
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

// ---- the shelf ----------------------------------------------------------------
// Every movie anyone added, minus the ones a finished night has shown.
export function watchedIds(nights = []) {
  return new Set(nights.filter((n) => n.status === 'done' && n.lockedMovieId).map((n) => n.lockedMovieId));
}

// What a night's pick must leave out: everything watched, plus movies other
// still-upcoming nights have already locked (so back-to-back nights differ).
export function excludedFor(nights = [], day = null) {
  const out = watchedIds(nights);
  for (const n of nights) if (n.status === 'locked' && n.day !== day && n.lockedMovieId) out.add(n.lockedMovieId);
  return out;
}

// Thumbs and "seen it" marks per movie, most wanted first.
export function tallyShelf({ movies = [], votes = [], seen = [], watched = new Set() }) {
  const group = (rows) => {
    const by = new Map();
    for (const r of rows) {
      if (!by.has(r.movie)) by.set(r.movie, []);
      by.get(r.movie).push({ nameKey: r.nameKey, name: r.name });
    }
    for (const v of by.values()) v.sort((a, b) => a.name.localeCompare(b.name));
    return by;
  };
  const voters = group(votes);
  const seers = group(seen);
  const out = movies
    .filter((m) => !watched.has(m.imdbId))
    .map((m) => {
      const vs = voters.get(m.imdbId) || [];
      return { ...m, voters: vs, votes: vs.length, seenBy: seers.get(m.imdbId) || [] };
    })
    .sort((a, b) => b.votes - a.votes || toMs(a.at) - toMs(b.at) || a.title.localeCompare(b.title));
  const top = Math.max(0, ...out.map((m) => m.votes));
  const leaders = top > 0 ? out.filter((m) => m.votes === top) : [];
  return { movies: out, leaders, tie: leaders.length > 1 };
}

// The movie for a night: most thumbs from the people coming; if none of them
// voted, most thumbs overall; if nobody voted at all, anything on the shelf.
// Ties go to the reel (rand).
export function pickMovie({ movies = [], votes = [], watched = new Set(), attendees = [], rand = Math.random }) {
  const shelf = tallyShelf({ movies, votes, watched }).movies;
  if (!shelf.length) return null;
  const coming = new Set(attendees);
  const fromComing = (m) => m.voters.filter((v) => coming.has(v.nameKey)).length;
  let pool;
  let basis;
  const topComing = Math.max(0, ...shelf.map(fromComing));
  if (topComing > 0) { pool = shelf.filter((m) => fromComing(m) === topComing); basis = 'coming'; }
  else if (shelf[0].votes > 0) { pool = shelf.filter((m) => m.votes === shelf[0].votes); basis = 'everyone'; }
  else { pool = shelf; basis = 'shelf'; }
  const movie = pool[Math.floor(rand() * pool.length) % pool.length];
  return { movie, tie: pool.length > 1 ? pool.map((m) => m.imdbId) : [], basis, score: basis === 'coming' ? topComing : movie.votes };
}

// The fields a lock writes, shared by the browser and the server clock.
export function lockFields(pick) {
  const { imdbId, title, year, poster, runtime, rating, genres, trailer } = pick.movie;
  return {
    status: 'locked', lockedMovieId: imdbId,
    lockedMovie: { imdbId, title, year, poster, runtime, rating, genres, trailer },
    lockedTie: pick.tie || [],
  };
}

// ---- nights -------------------------------------------------------------------
// A night is one doc per day (id = 'YYYY-MM-DD'), created by whoever
// volunteers to host it. The movie locks itself a day before showtime, and
// the night files itself as watched the morning after.
export const LOCK_LEAD_MS = 24 * 3600 * 1000;
export const WATCHED_AFTER_MS = 12 * 3600 * 1000;
export const lockAt = (n) => new Date(toMs(n.startsAt) - LOCK_LEAD_MS);
export const lockDue = (n, now = new Date()) => n.status === 'planned' && toMs(now) >= lockAt(n).getTime();
export const doneDue = (n, now = new Date()) => n.status === 'locked' && toMs(now) >= toMs(n.startsAt) + WATCHED_AFTER_MS;

// Planned or locked nights that haven't wrapped up yet, soonest first.
export function upcomingNights(nights = [], now = new Date()) {
  return nights
    .filter((n) => (n.status === 'planned' || n.status === 'locked') && toMs(n.startsAt) + WATCHED_AFTER_MS > toMs(now))
    .sort((a, b) => toMs(a.startsAt) - toMs(b.startsAt));
}

export function pastNights(nights = []) {
  return nights.filter((n) => n.status === 'done').sort((a, b) => toMs(b.startsAt) - toMs(a.startsAt));
}

// Who has hosted how often (finished nights), most first.
export function hostCounts(nights = []) {
  const counts = new Map();
  for (const n of nights) if (n.status === 'done' && n.host) counts.set(n.host, (counts.get(n.host) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// ---- the calendar -------------------------------------------------------------
export const CALENDAR_DAYS = 28;

export function dayKey(date) {
  const d = toDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dayFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Four weeks of evenings, starting today.
export function calendarDays(now = new Date(), n = CALENDAR_DAYS) {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)));
}

// Per day: who's free, and the night on it (if someone is hosting).
export function tallyDays(days, { free = [], nights = [] }) {
  const freeBy = new Map();
  for (const f of free) {
    if (!freeBy.has(f.day)) freeBy.set(f.day, []);
    freeBy.get(f.day).push({ nameKey: f.nameKey, name: f.name });
  }
  const nightBy = new Map(nights.filter((n) => ['planned', 'locked', 'done'].includes(n.status)).map((n) => [n.day, n]));
  return days.map((day) => {
    const people = (freeBy.get(day) || []).sort((a, b) => a.name.localeCompare(b.name));
    return { day, free: people, count: people.length, night: nightBy.get(day) || null };
  });
}

export const attendeesFor = (day, free = []) => free.filter((f) => f.day === day);

// "Jo" -> "Jo's". Empty when there's no name.
export const placeLabel = (place) => (place ? `${place}'s` : '');

// ---- "Since you last looked" ------------------------------------------------
// What changed after `since` (ms), leaving out the viewer's own actions.
// Returns banner lines plus the ids to badge.
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nameList = (names) => {
  const u = [...new Set(names)];
  if (u.length <= 2) return u.join(' and ');
  return `${u.slice(0, 2).join(', ')} and ${u.length - 2} more`;
};

export function sinceLastLook({ nights = [], movies: allMovies = [], votes = [], free = [], since, meKey = '' }) {
  const watched = watchedIds(nights);
  const movies = allMovies.filter((m) => !watched.has(m.imdbId));
  const out = { items: [], movies: new Set(), votes: new Map(), days: new Set() };
  if (!since) return out;
  const fresh = (t) => toMs(t) > since;
  const theirs = (k) => k !== meKey;
  for (const n of nights) {
    if (n.status !== 'planned' && n.status !== 'locked') continue;
    if (fresh(n.createdAt) && theirs(n.hostKey)) {
      out.days.add(n.day);
      out.items.push({ kind: 'night', text: `${n.host} is hosting ${showtimeLong(n.startsAt)}`, target: '#nextSec' });
    }
    if (n.status === 'locked' && fresh(n.lockedAt)) {
      out.items.push({ kind: 'locked', text: `Locked for ${showtimeParts(n.startsAt).dow}: ${n.lockedMovie?.title || 'the movie'}`, target: '#nextSec' });
    }
  }
  const added = movies.filter((m) => fresh(m.at) && theirs(m.by));
  for (const m of added) out.movies.add(m.imdbId);
  if (added.length) {
    const titles = added.slice(0, 3).map((m) => m.title).join(', ');
    out.items.push({ kind: 'movies', text: `${plural(added.length, 'new movie')} on the shelf: ${titles}${added.length > 3 ? '…' : ''}`, target: '#shelfSec' });
  }
  const live = new Set(movies.map((m) => m.imdbId));
  const newVotes = votes.filter((v) => fresh(v.at) && theirs(v.nameKey) && live.has(v.movie));
  for (const v of newVotes) out.votes.set(v.movie, (out.votes.get(v.movie) || 0) + 1);
  if (newVotes.length) out.items.push({ kind: 'votes', text: `${plural(newVotes.length, 'new thumbs-up', 'new thumbs-up')} on ${plural(out.votes.size, 'movie')}`, target: '#shelfSec' });
  const marks = free.filter((f) => fresh(f.at) && theirs(f.nameKey));
  for (const f of marks) out.days.add(f.day);
  if (marks.length) out.items.push({ kind: 'free', text: `${nameList(marks.map((f) => f.name))} marked free evenings`, target: '#calSec' });
  return out;
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
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weberplex//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@weberplex`,
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
