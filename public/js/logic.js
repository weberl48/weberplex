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

// Could two names be the same person? "Gma" and "Grandma", "Sam" and
// "Samantha", "Jon" and "Jo": one is the other with letters left out, or they
// are one typo apart. Used to ask once before making a second person.
export function looksLike(a, b) {
  const x = nameKey(a).replace(/-/g, '');
  const y = nameKey(b).replace(/-/g, '');
  if (x.length < 2 || y.length < 2 || x === y) return false;
  const within = (s, t) => { let i = 0; for (const ch of t) if (ch === s[i]) i += 1; return i === s.length; };
  if (within(x, y) || within(y, x)) return true;
  if (Math.abs(x.length - y.length) > 1) return false;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= y.length; j += 1) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[y.length] <= 1;
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

// ---- themes and vetoes ------------------------------------------------------
// A night can carry a theme (a shelf tag or a genre) and each person coming
// can veto one movie. Both live on the night doc, so the clock needs no more reads.
export const THEME_MAX = 40;
export const cleanTheme = (raw) => String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, THEME_MAX);

// The movies a night has vetoed (nameKey -> imdbId on the doc).
export const vetoedFor = (night) => new Set(Object.values(night?.vetoes || {}));

const movieTags = (m) => [...(m.shelf || []), ...(m.genres || [])].map((t) => String(t).toLowerCase());
export const fitsTheme = (m, theme) => !theme || movieTags(m).includes(String(theme).trim().toLowerCase());

// What the theme menu offers: the shelf's tags in shelf order, then the genres
// on the shelf, each once. `movies` is the unwatched shelf.
export function themeOptions(movies = []) {
  const out = [];
  const seen = new Set();
  const add = (t) => {
    const k = String(t).toLowerCase();
    if (!t || t.length > THEME_MAX || seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  shelfTags(movies).forEach(add);
  [...new Set(movies.flatMap((m) => m.genres || []))].sort().forEach(add);
  return out;
}

// What a night may pick from, out of the unwatched shelf: vetoed movies are
// out (unless that would empty it), then a theme narrows what's left to movies
// tagged or classed with it. When none fit, the theme is dropped (`themeFallback`).
export function pickable(shelf = [], { vetoed = new Set(), theme = '' } = {}) {
  const open = shelf.filter((m) => !vetoed.has(m.imdbId));
  const movies = open.length ? open : shelf;
  if (!theme) return { movies, themeFallback: false };
  const fits = movies.filter((m) => fitsTheme(m, theme));
  return fits.length ? { movies: fits, themeFallback: false } : { movies, themeFallback: true };
}

// The movie for a night, from what's pickable: most thumbs from the people
// coming; if none of them voted, most thumbs overall; if nobody voted at all,
// anything left. Ties go to the reel (rand).
export function pickMovie({ movies = [], votes = [], watched = new Set(), attendees = [], vetoed = new Set(), theme = '', rand = Math.random }) {
  const { movies: shelf, themeFallback } = pickable(tallyShelf({ movies, votes, watched }).movies, { vetoed, theme });
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
  return { movie, tie: pool.length > 1 ? pool.map((m) => m.imdbId) : [], basis, score: basis === 'coming' ? topComing : movie.votes, themeFallback };
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

// ---- stats and history --------------------------------------------------------
// What the Stats section shows, all derived from the shelf, thumbs and nights
// the page already holds.

// With fewer thumbs than this, "you agree 100%" just means two people liked
// one movie.
export const MIN_TASTE_THUMBS = 3;

// Who agrees with `meKey`: the Jaccard similarity of two people's thumbs
// (|A∩B| / |A∪B|) over every movie, watched ones included. Anyone with fewer
// than `minThumbs` thumbs is left out (me too: then there is nobody to compare).
// Most alike first, ties by name.
export function tasteMatch(votes = [], meKey, { minThumbs = MIN_TASTE_THUMBS } = {}) {
  const thumbs = new Map();
  for (const v of votes) {
    if (!thumbs.has(v.nameKey)) thumbs.set(v.nameKey, { name: v.name || v.nameKey, movies: new Set() });
    thumbs.get(v.nameKey).movies.add(v.movie);
  }
  const mine = thumbs.get(meKey)?.movies;
  if (!mine || mine.size < minThumbs) return [];
  const rows = [];
  for (const [key, p] of thumbs) {
    if (key === meKey || p.movies.size < minThumbs) continue;
    let shared = 0;
    for (const id of p.movies) if (mine.has(id)) shared += 1;
    const sim = shared / (mine.size + p.movies.size - shared);
    rows.push({ sim, row: { nameKey: key, name: p.name, pct: Math.round(sim * 100), shared } });
  }
  return rows.sort((a, b) => b.sim - a.sim || a.row.name.localeCompare(b.row.name)).map((x) => x.row);
}

// Whose shelf additions became the movie of a locked or watched night, most
// first. Every house pick counts toward one "House".
export function pickLeaders(nights = [], movies = []) {
  const byId = new Map(movies.map((m) => [m.imdbId, m]));
  const tally = new Map();
  for (const n of nights) {
    if ((n.status !== 'locked' && n.status !== 'done') || !n.lockedMovieId) continue;
    const m = byId.get(n.lockedMovieId);
    if (!m || (!isHouse(m) && !m.by)) continue;
    const key = isHouse(m) ? HOUSE : m.by;
    if (!tally.has(key)) tally.set(key, { nameKey: key, name: isHouse(m) ? 'House' : m.byName || m.by, picks: 0 });
    tally.get(key).picks += 1;
  }
  return [...tally.values()].sort((a, b) => b.picks - a.picks || a.name.localeCompare(b.name));
}

// The unwatched movies people want most. `shelfMovies` is tallyShelf().movies
// (watched ones already left out, each with its `votes`); a movie nobody has
// thumbed up doesn't make the list.
export function mostWanted(shelfMovies = [], n = 5) {
  return shelfMovies.filter((m) => m.votes > 0).sort((a, b) => b.votes - a.votes).slice(0, n);
}

// The long view: finished nights and their hours (from the movies' runtimes),
// every movie ever added to the shelf (watched ones too), every thumbs-up, and
// who has given the most.
export function recap(nights = [], votes = [], movies = []) {
  const done = nights.filter((n) => n.status === 'done');
  const minutes = done.reduce((s, n) => s + (parseRuntime(n.lockedMovie?.runtime) || 0), 0);
  const given = new Map();
  for (const v of votes) {
    if (!given.has(v.nameKey)) given.set(v.nameKey, { nameKey: v.nameKey, name: v.name || v.nameKey, thumbs: 0 });
    given.get(v.nameKey).thumbs += 1;
  }
  const topVoter = [...given.values()].sort((a, b) => b.thumbs - a.thumbs || a.name.localeCompare(b.name))[0] || null;
  return { nights: done.length, hours: Math.round(minutes / 60), shelf: movies.length, thumbs: votes.length, topVoter };
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
// Returns the updates (`items`, shown as walkthrough cards through `cards`)
// plus the ids to badge. Each item: { kind, text (headline), detail, target,
// and what its card draws: poster/title, names, theme, struck }.
// Every kind it can produce is listed in NEWS_KINDS; tests/news.test.mjs fails
// when a new kind of change is made without being announced here (or marked
// quiet there), so the walkthrough stays complete as the site grows.
export const NEWS_KINDS = ['night', 'cancelled', 'moved', 'theme', 'veto', 'locked', 'watched', 'movies', 'votes', 'free', 'snack', 'review'];
export const MAX_NEWS_CARDS = 8;

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nameList = (names) => {
  const u = [...new Set(names)];
  if (u.length <= 2) return u.join(' and ');
  return `${u.slice(0, 2).join(', ')} and ${u.length - 2} more`;
};
// "Friday" for a night's start (local time, like showtimeLong).
const dayName = (when) => toDate(when).toLocaleDateString(undefined, { weekday: 'long' });
// "4 stars", read the same by eye and by a screen reader.
const starsOf = (n) => plural(Math.max(0, Math.min(5, n)), 'star');

// `subs`: day -> { snacks, reviews } for the nights the page follows.
// `people`: for a veto owner's name (the host's own name is on the night).
export function sinceLastLook({ nights = [], movies: allMovies = [], votes = [], free = [], people = [], subs = new Map(), since, meKey = '' }) {
  const watched = watchedIds(nights);
  const movies = allMovies.filter((m) => !watched.has(m.imdbId));
  const out = { items: [], cards: [], movies: new Set(), votes: new Map(), days: new Set() };
  if (!since) return out;
  const fresh = (t) => toMs(t) > since;
  const theirs = (k) => k !== meKey;
  const push = (item) => out.items.push({ detail: '', ...item });
  const titleOf = (id) => allMovies.find((m) => m.imdbId === id)?.title || 'a movie that left the shelf';
  const nameOf = (n, key) => (key === n.hostKey ? n.host : people.find((p) => p.id === key)?.name || key);
  const imFree = (day) => free.some((f) => f.day === day && f.nameKey === meKey);
  const newsForNight = (n) => {
    const dow = n.startsAt ? dayName(n.startsAt) : '';
    const title = n.lockedMovie?.title || '';
    const poster = n.lockedMovie?.poster || '';
    if (n.status === 'cancelled') {
      if (fresh(n.finishedAt) && theirs(n.hostKey)) push({ kind: 'cancelled', text: `${placeLabel(n.host)} ${dow} movie night is off`, detail: 'Pick another evening if you still want a movie night.', target: '#calSec' });
      return;
    }
    if (n.status === 'done') {
      if (fresh(n.finishedAt)) push({ kind: 'watched', text: `${title || 'The movie'} is filed under Watched`, detail: 'Rate it while it is fresh.', target: '#watchedSec', title, poster });
    } else {
      if (fresh(n.createdAt) && theirs(n.hostKey)) {
        out.days.add(n.day);
        // Free that evening already? Then you're on this night's list.
        push({ kind: 'night', text: `${n.host} is hosting ${showtimeLong(n.startsAt)}`, detail: [n.theme && `Theme: ${n.theme}.`, imFree(n.day) && 'You’re free that evening, so you’re on the list.'].filter(Boolean).join(' '), target: '#nextSec' });
      }
      if (n.status === 'locked' && fresh(n.lockedAt)) {
        push({ kind: 'locked', text: `Locked for ${showtimeParts(n.startsAt).dow}: ${title || 'the movie'}`, detail: `${placeLabel(n.host)} ${dow} night, ${showtimeParts(n.startsAt).time}.`, target: '#nextSec', title, poster });
      }
      if (fresh(n.movedAt) && theirs(n.hostKey)) {
        out.days.add(n.day);
        push({ kind: 'moved', text: `${dow}'s night now starts at ${showtimeParts(n.startsAt).time}`, detail: `${placeLabel(n.host)} night, ${showtimeLong(n.startsAt)}.`, target: '#nextSec' });
      }
      if (fresh(n.themeAt) && theirs(n.hostKey)) {
        out.days.add(n.day);
        push(n.theme
          ? { kind: 'theme', text: `${dow} is ${/^[aeiou]/i.test(n.theme) ? 'an' : 'a'} ${n.theme} night now`, detail: 'The pick sticks to the theme when it can.', target: '#nextSec', theme: n.theme }
          : { kind: 'theme', text: `${dow}'s theme was cleared`, detail: 'Anything on the shelf can be picked.', target: '#nextSec' });
      }
      const vetoed = Object.entries(n.vetoAt || {}).filter(([k, t]) => fresh(t) && theirs(k) && n.vetoes?.[k]);
      if (vetoed.length) {
        out.days.add(n.day);
        const titles = vetoed.map(([k]) => titleOf(n.vetoes[k]));
        push({
          kind: 'veto', target: '#nextSec', struck: titles[0],
          text: vetoed.length === 1 ? `${nameOf(n, vetoed[0][0])} vetoed ${titles[0]} for ${dow}` : `${plural(vetoed.length, 'veto')} for ${dow}`,
          detail: vetoed.length === 1 ? 'A vetoed movie is out for that night.' : vetoed.map(([k], i) => `${nameOf(n, k)}: ${titles[i]}`).join(' · '),
        });
      }
    }
    const sub = subs.get(n.day);
    if (!sub) return;
    const snacks = (sub.snacks || []).filter((x) => fresh(x.at) && theirs(x.nameKey));
    if (snacks.length) push({
      kind: 'snack', target: '#nextSec',
      text: snacks.length === 1 ? `${snacks[0].name} is bringing ${snacks[0].item} on ${dow}` : `${plural(snacks.length, 'new snack')} for ${dow}`,
      detail: snacks.length === 1 ? 'Call yours too, so nobody doubles up.' : snacks.map((x) => `${x.name}: ${x.item}`).join(' · '),
    });
    const reviews = (sub.reviews || []).filter((x) => fresh(x.at) && theirs(x.nameKey));
    if (reviews.length) push({
      kind: 'review', target: '#watchedSec', title, poster,
      text: reviews.length === 1 ? `${reviews[0].name} gave ${title || 'the movie'} ${starsOf(reviews[0].stars)}` : `${plural(reviews.length, 'new review')} of ${title || 'the movie'}`,
      detail: reviews.length === 1 ? reviews[0].line || '' : reviews.map((x) => `${x.name}: ${starsOf(x.stars)}`).join(' · '),
    });
  };
  for (const n of nights) {
    const mark = out.items.length;
    newsForNight(n);
    for (const it of out.items.slice(mark)) it.day = n.day;
  }
  const added = movies.filter((m) => fresh(m.at) && theirs(m.by));
  for (const m of added) out.movies.add(m.imdbId);
  if (added.length) {
    const titles = added.slice(0, 3).map((m) => m.title).join(', ');
    push({
      kind: 'movies', text: `${plural(added.length, 'new movie')} on the shelf: ${titles}${added.length > 3 ? '…' : ''}`, detail: 'Thumbs-up any you would watch.', target: '#shelfSec',
      title: added[0].title, poster: added[0].poster || '', ids: added.slice(0, 3).map((m) => ({ id: m.imdbId, title: m.title })),
    });
  }
  const live = new Set(movies.map((m) => m.imdbId));
  const newVotes = votes.filter((v) => fresh(v.at) && theirs(v.nameKey) && live.has(v.movie));
  for (const v of newVotes) out.votes.set(v.movie, (out.votes.get(v.movie) || 0) + 1);
  if (newVotes.length) {
    const titles = [...out.votes.keys()].slice(0, 3).map(titleOf);
    push({ kind: 'votes', text: `${plural(newVotes.length, 'new thumbs-up', 'new thumbs-up')} on ${plural(out.votes.size, 'movie')}`, detail: `${titles.join(', ')}${out.votes.size > 3 ? '…' : ''}`, target: '#shelfSec' });
  }
  const marks = free.filter((f) => fresh(f.at) && theirs(f.nameKey));
  for (const f of marks) out.days.add(f.day);
  if (marks.length) push({ kind: 'free', text: `${nameList(marks.map((f) => f.name))} marked free evenings`, detail: 'Their evenings show on the calendar.', target: '#calSec', names: [...new Set(marks.map((f) => f.name))] });
  // Most useful first: what happened to a night you're coming to or hosting,
  // then other nights, new movies and thumbs-ups, free evenings, and last the
  // after-party (snacks, reviews, nights filed as watched). Ties keep their order.
  const mine = new Set([...free.filter((f) => f.nameKey === meKey).map((f) => f.day), ...nights.filter((n) => n.hostKey === meKey).map((n) => n.day)]);
  const LATER = { movies: 2, votes: 2, free: 3, snack: 4, review: 4, watched: 4 };
  const tier = (it) => (LATER[it.kind] ?? (it.day && mine.has(it.day) ? 0 : 1));
  out.items = out.items.map((it, i) => [it, i]).sort((a, b) => tier(a[0]) - tier(b[0]) || a[1] - b[1]).map(([it]) => it);
  // At most MAX_NEWS_CARDS cards; the rest are counted on the last one, which
  // also lists them (`rest`), so nothing is left out.
  out.cards = out.items.slice(0, MAX_NEWS_CARDS);
  const extra = out.items.length - out.cards.length;
  if (extra > 0) {
    const last = out.cards[out.cards.length - 1];
    out.cards[out.cards.length - 1] = {
      ...last,
      detail: [last.detail, `…and ${plural(extra, 'more thing')}.`].filter(Boolean).join(' '),
      rest: out.items.slice(MAX_NEWS_CARDS).map((x) => x.text),
    };
  }
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

// How far off something is, the way a person says it: "in 19 days",
// "tomorrow", "in 5 hr 20 min", "in 40 min". Days count by the calendar.
export function whenWords(target, now = new Date()) {
  const t = toDate(target);
  const n = toDate(now);
  const ms = t.getTime() - n.getTime();
  if (ms <= 0) return 'now';
  const mins = Math.max(1, Math.round(ms / 60000));
  const days = Math.round((dayFromKey(dayKey(t)) - dayFromKey(dayKey(n))) / 86400000);
  if (days >= 2) return `in ${days} days`;
  if (days === 1 && mins >= 12 * 60) return 'tomorrow';
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  return mins % 60 ? `in ${h} hr ${mins % 60} min` : `in ${h} hr`;
}

// "Add to Google Calendar" for one night: everyone is on Android, where a
// downloaded .ics may have nowhere to go.
export function googleCalendarUrl({ title, start, minutes = 150, details = '', location = '' }) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const s = toDate(start);
  const e = new Date(s.getTime() + minutes * 60000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${fmt(s)}/${fmt(e)}`, details, location });
  return `https://calendar.google.com/calendar/render?${q}`;
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

// The time and its AM/PM never part across a line break ("9:00 / PM" on a
// phone): browsers now put a plain space there.
export function showtimeLong(when, locale = undefined) {
  const d = toDate(when);
  return d.toLocaleString(locale, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .replace(/(\d)[  ]([AP]\.?M\.?)/gi, '$1 $2');
}

// "Friday 8 PM" (":30" only when it isn't on the hour), for the reveal.
export function showtimeShort(when, locale = undefined) {
  const d = toDate(when);
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', ...(d.getMinutes() ? { minute: '2-digit' } : {}) });
  return `${d.toLocaleDateString(locale, { weekday: 'long' })} ${time}`.replace(/\u202f/g, ' ');
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

// ---- calendar files (RFC 5545) ----------------------------------------------------
// One VEVENT formatter serves the single-night "Add to calendar" download and
// the subscribable feed (lib/calendar.js).
const icsStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/([,;])/g, '\\$1');

// Content lines fold at 75 octets (UTF-8 bytes, never mid-character); every
// continuation line starts with one space. Returns the line, CRLF-joined if folded.
export function icsFold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = '';
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > 75) { parts.push(cur); cur = ' '; size = 1; }
    cur += ch;
    size += n;
  }
  parts.push(cur);
  return parts.join('\r\n');
}

// One VEVENT as folded lines. The UID is stable per night, so a calendar that
// already has the event updates it instead of adding a second one.
export function icsEvent({ uid, title, start, minutes = 150, description = '', location = '', url = '', stamp = new Date() }) {
  const startD = toDate(start);
  const end = new Date(startD.getTime() + minutes * 60000);
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@weberplex`,
    `DTSTAMP:${icsStamp(toDate(stamp))}`,
    `DTSTART:${icsStamp(startD)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    description && `DESCRIPTION:${icsEscape(description)}`,
    location && `LOCATION:${icsEscape(location)}`,
    url && `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(title)}`, 'END:VALARM',
    'END:VEVENT',
  ].filter(Boolean).map(icsFold);
}

// A whole calendar from icsEvent() results; `headers` are extra calendar-level lines.
export function icsCalendar(events = [], headers = []) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weberplex//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...headers.map(icsFold), ...events.flat(), 'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

// RFC 5545 calendar file for "Add to calendar".
export const buildIcs = (event) => icsCalendar([icsEvent(event)]);

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
