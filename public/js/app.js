// The guest page: up next, the calendar, the shelf, and what we've watched.
// State comes from live Firestore subscriptions; render() repaints the
// dynamic containers. Inputs live in static markup so a live update never
// steals focus or wipes what someone is typing.
import { db, F } from './firebase.js';
import { SITE_URL, OWNER } from './config.js';
import { makeActions, AlreadyOnShelfError } from './actions.js';
import { watch, watchNights, watchFree, watchDoc, loadRows } from './store.js';
import { searchMovies, movieMeta, topMovies } from './cinemeta.js';
import { browseTabs, tabsHtml, loadTab, tilesHtml } from './browse.js';
import { spinReel } from './reel.js';
import { revealMovie } from './reveal.js';
import { openTour } from './tour.js';
import { newsSteps } from './news.js';
import * as L from './logic.js';
import { $, esc, THUMB, HOUSE, CHECK, STAR, faces, posterImg, saveLocal, loadLocal, dropLegacyLocal, toast, downloadFile, writeError, armed, paint, keyOf } from './ui.js';

const A = makeActions(db, F);
// The browser keeps only who you are (ps.me). Everything else about you is on
// your people doc. Older versions kept more here: read it once, then drop it.
const legacy = { since: loadLocal('ps.lastSeen'), toured: loadLocal('ps.toured') };
dropLegacyLocal();
const S = {
  loaded: new Set(),
  nights: [], movies: [], votes: [], seen: [], free: [], people: [], season: null,
  me: loadLocal('ps.me'),            // { name, nameKey }
  since: null,                       // "since you last looked" (ms), from your people doc
  news: null,
  walked: false,                     // the "since you last looked" cards had their one chance this visit (on load)
  day: null,                         // calendar day shown in detail
  hostTime: '20:00',                 // your usual start time, from your people doc
  toured: !!legacy.toured,           // walkthrough done this visit (saved once you have a name)
  reelsSeen: new Set(),              // tie reels and movie reveals played this visit, as `${nameKey}|${key}` ('' when signed out)
  sort: 'wanted', filter: 'All',
  tab: 'search', tabItems: [], tabNote: '', tabLoading: false,
  flipped: new Set(), lastVotes: new Map(), // shelf cards turned over to their backs
  revealing: null,                   // the reel or reveal on screen right now (its key)
  nightSub: new Map(),               // day -> { snacks, reviews } for nights on screen
  subLoaded: new Set(),              // `${day}:${collection}` once its first snapshot is in
  pastReviews: new Map(),
  stars: {},                         // day -> stars picked but not yet posted
  hostSlip: null,                    // the day whose hosting slip is open (confirm before hosting)
  hostTheme: '',                     // the theme picked in the day panel's hosting block
  rateDay: null,                     // which of this week's nights the rating stub is showing
};
// Overlays add history entries (Android back closes them); coming back through
// those entries must not jump the page around.
try { history.scrollRestoration = 'manual'; } catch { /* old browser */ }
const busy = new Set();
const ready = () => ['nights', 'movies', 'votes', 'seen', 'free'].every((k) => S.loaded.has(k));
const got = (key) => (rows) => { S[key] = rows; S.loaded.add(key); render(); clock(); };

// ---- your settings (people/{nameKey}) ------------------------------------------
const myDoc = () => (S.me ? S.people.find((p) => p.id === S.me.nameKey) : null);
const savePrefs = (prefs) => { if (S.me) A.savePrefs(S.me, prefs).catch((e) => console.warn('settings not saved', e)); };
// Read your settings in once per name: later snapshots (your own lastSeen
// write when you leave) mustn't move this visit's "since you last looked".
let prefsFor = null;
function applyPrefs() {
  const d = myDoc();
  if (!d || prefsFor === S.me.nameKey) return;
  prefsFor = S.me.nameKey;
  S.since = d.lastSeen?.toMillis?.() ?? legacy.since ?? null;
  if (d.hostTime) S.hostTime = d.hostTime;
  // A real look (4 s+) counts as seen. Saved now, while the page is surely
  // alive; the write on leaving below may not land if the tab is closing.
  // Not while there's news you haven't been through: only Got it, Skip or Esc
  // mark that seen.
  setTimeout(() => { if (document.visibilityState === 'visible' && prefsFor === d.id && !unreadNews()) savePrefs({ lastSeen: true }); }, 4000);
  if (!d.toured && S.toured) savePrefs({ toured: true });
  else if (!d.toured && !document.querySelector('.tour-overlay')) startTour();
}

// ---- subscriptions ----------------------------------------------------------
const onErr = (e) => { console.error(e); toast('Lost the connection to the box office. Reload to try again.', true); };
watchNights(db, F, (rows) => { got('nights')(rows); clock(); syncNightSubs(); }, onErr);
watch(db, F, 'movies', got('movies'), onErr);
watch(db, F, 'votes', got('votes'), onErr);
watch(db, F, 'seen', got('seen'), onErr);
watch(db, F, 'people', (rows) => { S.people = rows; S.loaded.add('people'); applyPrefs(); render(); }, () => {});
watchFree(db, F, L.dayKey(new Date(Date.now() - 86400000)), got('free'), onErr);
watchDoc(db, F, 'config/season', (d) => { S.season = d?.title || null; render(); }, () => {});

// Snacks and reviews live under each night; follow the ones on screen.
const subs = new Map();
function syncNightSubs() {
  const want = new Set(L.upcomingNights(S.nights).slice(0, 1).map((n) => n.day));
  for (const n of recentDone()) want.add(n.day);
  for (const [day, un] of subs) if (!want.has(day)) { un.forEach((u) => u()); subs.delete(day); S.nightSub.delete(day); }
  for (const day of want) {
    if (subs.has(day)) continue;
    S.nightSub.set(day, { snacks: [], reviews: [] });
    subs.set(day, ['snacks', 'reviews'].map((c) => watch(db, F, `nights/${day}/${c}`, (rows) => {
      S.nightSub.get(day)[c] = rows;
      S.subLoaded.add(`${day}:${c}`);
      render();
    }, () => { S.subLoaded.add(`${day}:${c}`); render(); })));
  }
}
const recentDone = () => L.pastNights(S.nights).filter((n) => Date.now() - n.startsAt.toMillis() < 7 * 86400000);

// ---- the site's clock ---------------------------------------------------------
// Any phone that notices a night is due does the work: lock the movie a day
// before, file the night the morning after. Transactions keep two phones from
// disagreeing; the server clock (HA's poll, a daily cron) covers quiet weeks.
// Idle passes are throttled to one a minute; a pass with something due is not
// (a night hosted under a day out is due the moment it is created), and only
// one runs at a time.
let lastClock = 0;
let clockRunning = false;
async function clock() {
  if (!ready() || clockRunning) return;
  const due = S.nights.some((n) => L.lockDue(n) || L.doneDue(n));
  if (!due && Date.now() - lastClock < 60000) return;
  clockRunning = true;
  lastClock = Date.now();
  try {
    const lockedNow = new Set();
    for (const n of S.nights) {
      try {
        if (L.lockDue(n)) {
          const watched = new Set([...L.excludedFor(S.nights, n.day), ...lockedNow]);
          const pick = L.pickMovie({ movies: S.movies, votes: S.votes, watched, attendees: comingTo(n.day).map((f) => f.nameKey), vetoed: L.vetoedFor(n), theme: n.theme || '' });
          if (pick && await A.lockNight(n.day, pick)) lockedNow.add(pick.movie.imdbId);
        } else if (L.doneDue(n)) {
          await A.finishNight(n.day);
        }
      } catch (e) { console.warn('clock', n.day, e); }
    }
  } finally { clockRunning = false; }
}

// ---- derived ------------------------------------------------------------------
const comingTo = (day) => S.free.filter((f) => f.day === day).sort((a, b) => a.name.localeCompare(b.name));
const shelfNow = () => L.tallyShelf({ movies: S.movies, votes: S.votes, seen: S.seen, watched: L.watchedIds(S.nights) });
const isMine = (n) => S.me && n?.hostKey === S.me.nameKey;
const imFree = (day) => !!S.me && S.free.some((f) => f.day === day && f.nameKey === S.me.nameKey);
const showing = (n) => n.status === 'locked' && n.startsAt.toDate() <= new Date();
const started = (n) => n.startsAt.toDate() <= new Date();

// The host's controls for one of their nights. They show up in Up next and in
// the calendar's day panel, so `scope` ('next' or 'dd') keeps the ids unique.
function hostTools(n, scope) {
  if (!isMine(n)) return '';
  const tools = [];
  if (n.status === 'planned') {
    tools.push(timeSelect(`${scope}-time-${n.day}`, timeOf(n.startsAt.toDate())),
      `<button class="btn btn-ghost btn-small" type="button" data-action="night-time" data-day="${n.day}">Change time</button>`,
      themeSelect(`${scope}-theme-${n.day}`, n.theme, `data-theme-day="${n.day}"`),
      `<button class="btn btn-ghost btn-small" type="button" data-action="lock-now" data-day="${n.day}">Lock the movie now</button>`);
  }
  if (n.status === 'locked' && showing(n)) tools.push(`<button class="btn btn-primary btn-small" type="button" data-action="finish-night" data-day="${n.day}">We watched it</button>`);
  if (n.status === 'locked' && new Date() < L.lockAt(n)) tools.push(`<button class="btn btn-ghost btn-small" type="button" data-action="unlock-night" data-day="${n.day}">Unlock and re-pick</button>`);
  if (!started(n)) tools.push(`<button class="btn btn-ghost btn-small" type="button" data-action="cancel-night" data-day="${n.day}">Cancel night</button>`);
  return tools.length ? `<div class="row host-tools"><span class="label">You’re hosting</span>${tools.join('')}</div>` : '';
}

// What the people coming would watch, best first (thumbs from them). Vetoed
// movies are out and a theme narrows the field, exactly as in the pick.
function leadersFor(n, shelf) {
  const coming = new Set(comingTo(n.day).map((f) => f.nameKey));
  return L.pickable(shelf.movies, { vetoed: L.vetoedFor(n), theme: n.theme }).movies
    .map((m) => ({ m, n: m.voters.filter((v) => coming.has(v.nameKey)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || b.m.votes - a.m.votes)
    .slice(0, 3);
}

// What a planned night would lock to right now: the same pick the lock makes
// (ties held still so the page doesn't flicker; the reel settles them).
function projection(n) {
  if (n?.status !== 'planned') return null;
  return L.pickMovie({
    movies: S.movies, votes: S.votes, watched: L.excludedFor(S.nights, n.day),
    attendees: comingTo(n.day).map((f) => f.nameKey), vetoed: L.vetoedFor(n), theme: n.theme || '', rand: () => 0,
  });
}
const titlesOf = (ids) => ids.map((id) => S.movies.find((m) => m.imdbId === id)?.title).filter(Boolean);
// "Jaws", or "Alien or Jaws" for a tie.
const pickName = (p) => (p.tie.length > 1 ? titlesOf(p.tie).join(' or ') : p.movie.title);

// A veto's owner, by name (the host's, or anyone's from the people list).
const nameOf = (n, key) => (key === n.hostKey ? n.host : S.people.find((p) => p.id === key)?.name || key);

// The movies a night has vetoed and who vetoed each, for the struck-through list.
function vetoesFor(n, shelf) {
  const by = new Map();
  for (const [key, id] of Object.entries(n.vetoes || {})) by.set(id, [...(by.get(id) || []), key]);
  return [...by].map(([id, keys]) => ({
    id, keys, title: shelf.movies.find((m) => m.imdbId === id)?.title || 'A movie that left the shelf',
    names: keys.map((k) => nameOf(n, k)).sort((a, b) => a.localeCompare(b)),
  })).sort((a, b) => a.title.localeCompare(b.title));
}

// ---- render --------------------------------------------------------------
// Coalesce a burst of updates into one paint (a microtask, not rAF or a
// timer: both stall in hidden tabs).
let queued = false;
// `out(sel).innerHTML = html` repaints through paint(): skipped when nothing
// changed, and it keeps focus, typed text and armed buttons.
const out = (sel) => ({ set innerHTML(html) { paint($(sel), html); } });function render() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const shelf = shelfNow();
    const upcoming = L.upcomingNights(S.nights);
    S.news = L.sinceLastLook({ nights: S.nights, movies: S.movies, votes: S.votes, free: S.free, people: S.people, subs: S.nightSub, since: S.since, meKey: S.me?.nameKey });
    renderBoard(upcoming[0], shelf);
    renderWho();
    renderPass();
    renderNews();
    // The movie comes first: the reel or reveal plays before the news cards,
    // which then wait for it (a lock card would give the movie away).
    maybeRevealTie(upcoming[0]);
    maybeRevealMovie(upcoming[0]);
    maybeWalk();
    renderNext(upcoming, shelf);
    renderCalendar();
    renderShelf(shelf);
    renderWatched();
    renderStats(shelf);
  });
}

// The reel or reveal this person hasn't seen yet for night n, or null. Until
// they have, the page keeps the movie face down (marquee, ticket, day panel).
function pendingShow(n) {
  if (n?.status !== 'locked' || !n.lockedMovie) return null;
  const tie = n.lockedTie?.length > 1;
  if (!tie && started(n)) return null;
  const key = tie ? `${n.day}.${n.lockedMovieId}` : `r:${n.day}.${n.lockedMovieId}`;
  if (S.reelsSeen.has(seenKey(key)) || myDoc()?.reels?.includes(key)) return null;
  if (!tie) return { key, tie };
  const pool = n.lockedTie.map((id) => S.movies.find((m) => m.imdbId === id)).filter(Boolean);
  const winner = pool.find((m) => m.imdbId === n.lockedMovieId);
  return pool.length < 2 || !winner ? null : { key, tie, pool, winner };
}
// Is the movie for night n still a surprise to whoever is looking?
const faceDown = (n) => !!n && (S.revealing?.day === n.day || (n.day === L.upcomingNights(S.nights)[0]?.day && !!pendingShow(n)));
// Signed in, which reveals you've seen is on your people doc: until it is in,
// the marquee doesn't know whether to show the movie.
const knowsMe = () => !S.me || S.loaded.has('people');

function renderBoard(n, shelf) {
  let kicker, title, sub, count = '';
  if (!ready() || !knowsMe()) {
    kicker = 'Tonight'; title = 'Weberplex'; sub = 'Warming up the projector…';
  } else if (!n) {
    kicker = S.season || 'The house is dark'; title = 'No night planned';
    sub = 'Pick an evening on the calendar and host one';
    count = `${shelf.movies.length} movies on the shelf`;
  } else if (n.status === 'planned') {
    // What would win if it locked now, always on the board.
    const p = projection(n);
    kicker = S.season || 'Coming up'; title = `Movie night at ${L.placeLabel(n.host)}`;
    sub = [L.showtimeLong(n.startsAt), n.theme && `Theme: ${n.theme}`].filter(Boolean).join(' · ');
    count = [L.lockDue(n) ? 'Locking now…' : `Movie locks ${L.whenWords(L.lockAt(n))}`, p && `Leading: ${pickName(p)}`].filter(Boolean).join(' · ');
  } else {
    kicker = showing(n) ? 'Now showing' : (S.season ? `${S.season} · now booking` : 'Now booking');
    // Face down until your reveal has played: the letters wait for the card.
    title = faceDown(n) ? 'The movie is…' : n.lockedMovie?.title || 'Movie night';
    sub = `${L.showtimeLong(n.startsAt)} · at ${L.placeLabel(n.host)}`;
    count = showing(n) ? 'Rolling now' : `Starts ${L.whenWords(n.startsAt)}`;
  }
  out('#board').innerHTML = `
    <p class="kicker">${esc(kicker)}</p>
    <h1>${esc(title)}</h1>
    ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    ${count ? `<span class="count">${esc(count)}</span>` : ''}`;
}

// Who this phone is, as their name on the guest list. "Not you?" asks twice:
// one stray tap shouldn't drop someone off their own phone.
function renderWho() {
  $('#ownerLink').hidden = S.me?.nameKey !== OWNER;
  out('#whoami').innerHTML = S.me
    ? `${faces([S.me], S.me.nameKey, 1, { named: false })}<b>${esc(S.me.name)}</b> <button class="linkish" type="button" data-action="switch">Not you?</button>`
    : '';
}

function renderPass() {
  const need = !S.me && ready();
  $('#pass').hidden = !need;
  if (!need) return;
  const people = [...S.people].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30);
  $('#passPeople').hidden = !people.length;
  out('#passChips').innerHTML = people
    .map((x) => `<button class="chip guest-chip" type="button" data-action="join" data-name="${esc(x.name)}">${faces([{ name: x.name, nameKey: x.id }], '', 1, { named: false })}<span>${esc(x.name)}</span></button>`).join('');
}

// ---- since you last looked ----------------------------------------------------
// The news is a walkthrough (tour.js): it opens by itself once per visit, and
// the slim bar keeps "Walk me through" for opening it again. Got it, Skip and
// Esc mark everything seen; Show me closes the cards and scrolls to the section.
function renderNews() {
  const items = S.news?.items || [];
  $('#news').hidden = !items.length;
  if (!items.length) return;
  // The bar is a live region: write only what changed, so a screen reader
  // doesn't repeat it on every 30-second repaint.
  const set = (sel, text) => { if ($(sel).textContent !== text) $(sel).textContent = text; };
  set('#newsCount', `${items.length} ${items.length === 1 ? 'update' : 'updates'}`);
  set('#newsWhen', `since ${sinceText()}`);
}
const sinceText = () => new Date(S.since).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const scrollToSection = (sel) => $(sel)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
function walkNews() {
  const cards = S.news?.cards || [];
  const voted = new Set(S.votes.filter((v) => v.nameKey === S.me?.nameKey).map((v) => v.movie));
  openTour({
    steps: newsSteps(cards, { voted, items: S.news?.items || [], since: sinceText() }), label: 'Since you last looked', doneText: 'Got it',
    onDone: ({ how, target }) => {
      if (how === 'show') { scrollToSection(target); render(); return; }
      markSeen();
      // Got it hides the bar, and with it the Walk me through button that had
      // focus: keep the place in the page instead of dropping to <body>. Done
      // now, not after the repaint, so there's no moment with focus nowhere.
      const a = document.activeElement;
      if (!a || a === document.body || a.closest('#news')) {
        const sec = $('#nextSec');
        sec.setAttribute('tabindex', '-1');
        sec.focus({ preventScroll: true });
      }
    },
  });
}
// On load, once your settings and every list are in (snacks and reviews
// included): if there is news the cards open, once per visit. They wait for
// How it works, and for a reel or reveal you haven't seen yet: the movie comes
// first, so a "Locked for Friday" card never spoils it. News that arrives
// while you are on the page only reaches the slim bar.
let walkRetry = false;
const subsLoaded = () => [...subs.keys()].every((day) => S.subLoaded.has(`${day}:snacks`) && S.subLoaded.has(`${day}:reviews`));
function maybeWalk() {
  if (S.walked || !ready() || !S.me || !myDoc() || !subsLoaded()) return;
  if (!myDoc().toured && !S.toured) return; // How it works comes first
  if (document.querySelector('.tour-overlay')) return;
  if (S.revealing || pendingShow(L.upcomingNights(S.nights)[0])) return; // then the movie
  if (!S.news?.cards.length) { S.walked = true; return; }
  if (document.querySelector('.reel-overlay, .reveal-overlay')) {
    if (!walkRetry) { walkRetry = true; setTimeout(() => { walkRetry = false; render(); }, 1500); }
    return;
  }
  S.walked = true;
  walkNews();
}
function markSeen() { S.since = Date.now(); savePrefs({ lastSeen: true }); render(); }
// Leaving after a real look (4 s+) counts as seen; the next banner starts here.
let visibleAt = Date.now();
const unreadNews = () => !!S.news?.items.length || !!document.querySelector('.tour-overlay');
const leaving = () => { if (Date.now() - visibleAt >= 4000 && !unreadNews()) { visibleAt = Date.now(); savePrefs({ lastSeen: true }); } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving(); else visibleAt = Date.now(); });
window.addEventListener('pagehide', leaving);

// ---- up next ----------------------------------------------------------------------
const TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
const timeLabel = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
const timeOf = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const startsAtFor = (day, hhmm) => { const d = L.dayFromKey(day); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
const timeSelect = (id, value) => `<label class="sr-only" for="${id}">Start time</label><select class="field place" id="${id}">${TIMES.map((x) => `<option value="${x}"${x === value ? ' selected' : ''}>${timeLabel(x)}</option>`).join('')}</select>`;

// Saying you're coming to a night, the same button everywhere a night shows
// (Up next, Also planned, the day panel): "Count me in", then "You're in ✓".
// Dropping out takes a second tap; a stray one shouldn't cost a ticket.
const rsvp = (n, extra = '') => {
  const going = imFree(n.day);
  return `<button class="btn btn-rsvp ${going ? 'btn-ghost on' : 'btn-bulb'}${extra}" type="button" data-action="free" data-day="${n.day}" data-night="1" aria-pressed="${going}">${going ? `You’re in ${CHECK}` : 'Count me in'}</button>`;
};
// A thumbs-up count in a list: the number and the house thumb.
const thumbs = (k) => `<span class="v">${k}<span class="sr-only"> thumbs-up</span>${THUMB}</span>`;

function renderNext(upcoming, shelf) {
  const n = upcoming[0];
  if (!ready()) { out('#next').innerHTML = ''; return; }
  if (!n) {
    out('#next').innerHTML = '<p class="empty">Nobody is hosting yet. Pick an evening on the calendar below and tap <b>I can host</b>.</p>';
    out('#moreNights').innerHTML = '';
    return;
  }
  const coming = comingTo(n.day);
  const going = imFree(n.day);
  const sub = S.nightSub.get(n.day) || { snacks: [], reviews: [] };
  let body;
  if (n.status === 'planned') {
    const leads = leadersFor(n, shelf);
    const vetoes = vetoesFor(n, shelf);
    const myVeto = S.me && n.vetoes?.[S.me.nameKey];
    const canVeto = !!S.me && (isMine(n) || going);
    const noFit = n.theme && L.pickable(shelf.movies, { vetoed: L.vetoedFor(n), theme: n.theme }).themeFallback;
    // The theme's movies exist but every one is vetoed (as opposed to none fitting).
    const allVetoed = noFit && shelf.movies.some((m) => L.fitsTheme(m, n.theme));
    // The people coming have thumbs, but all on movies that are vetoed or off-theme.
    const comingKeys = new Set(coming.map((f) => f.nameKey));
    const thumbsOut = !leads.length && shelf.movies.some((m) => m.voters.some((v) => comingKeys.has(v.nameKey)));
    const vetoBtn = (action, label, id, title) => `<button class="mini veto" type="button" data-action="${action}" data-day="${n.day}" data-id="${esc(id)}" aria-label="${label}: ${esc(title)}">${label}</button>`;
    // If it locked now: the movie, and why it's that one. Its Veto sits here
    // unless it's already in the list of what the people coming want.
    const p = projection(n);
    const tie = !!p && p.tie.length > 1;
    const outThumbs = 'Their thumbs are all on vetoed or off-theme movies';
    const why = !p ? 'The shelf is empty. Add a movie to give it something to pick.'
      : p.basis === 'coming' ? 'The most thumbs from the people coming.'
      : p.basis === 'everyone' ? `${thumbsOut ? outThumbs : 'No thumbs from the people coming yet'}, so it’s the most thumbs from everyone.`
      : `${thumbsOut ? outThumbs : 'Nobody has thumbed up anything that fits'}, so it’s anything on the shelf${n.theme && !noFit ? ' that fits the theme' : ''}.`;
    const pickNow = p ? `
        <div class="pick-now">
          <h4 class="label">If it locked now</h4>
          <p class="pick-line"><b>${esc(pickName(p))}</b>${tie ? ' <span class="hint">a tie: the reel decides at the lock</span>' : ''}${canVeto && !myVeto && !tie && p.basis !== 'coming' ? ` ${vetoBtn('veto', 'Veto', p.movie.imdbId, p.movie.title)}` : ''}</p>
          <p class="hint">${why}</p>
        </div>` : `<p class="hint">${why}</p>`;
    body = `
      <div class="host-card night-card">
        <div class="nc-head">
          <h3>${esc(L.showtimeLong(n.startsAt))}</h3><p class="hint">At ${esc(L.placeLabel(n.host))} · the movie locks ${esc(L.showtimeLong(L.lockAt(n)))}</p>
          ${n.theme ? `<p class="theme-line"><span class="label">Theme</span> <span class="theme-chip">${esc(n.theme)}</span>${noFit ? ` <span class="hint">${allVetoed ? 'Everything that fits is vetoed, so the whole shelf is in play.' : 'Nothing on the shelf fits yet, so the whole shelf is in play.'}</span>` : ''}</p>` : ''}
        </div>
        <div class="rsvp-row">${rsvp(n)}
          <p class="dd-line">${coming.length ? `${faces(coming, S.me?.nameKey, 8, { named: false })} ${esc(coming.map((c) => c.name).join(', '))}` : 'Nobody has said they’re in yet.'}</p></div>
        ${canVeto ? '' : `<p class="hint">${S.me ? 'Count yourself in' : 'Put your name down and count yourself in'} to veto a movie and call a snack.</p>`}
        ${pickNow}
        <div>
          ${leads.length ? `<h4 class="label">What the people coming want</h4>
          <ol class="leaders">${leads.map((x) => `<li>${esc(x.m.title)} ${thumbs(x.n)}${canVeto && !myVeto ? ` ${vetoBtn('veto', 'Veto', x.m.imdbId, x.m.title)}` : ''}</li>`).join('')}</ol>` : ''}
          ${vetoes.length ? `<ul class="vetoes">${vetoes.map((x) => `<li><s>${esc(x.title)}</s> <span class="hint">vetoed by ${esc(x.names.join(', '))}</span>${canVeto && myVeto === x.id ? ` ${vetoBtn('unveto', 'Undo veto', x.id, x.title)}` : ''}</li>`).join('')}</ul>` : ''}
          <p class="hint">One veto each. Vetoed movies can’t be picked this night.</p>
        </div>
        ${hostTools(n, 'next')}
      </div>`;
  } else {
    const m = n.lockedMovie || {};
    const meta = [m.year, m.runtime].filter(Boolean).join(' · ');
    const hide = faceDown(n);
    const title = hide ? 'The movie is…' : m.title || 'The movie';
    const ticket = going && S.me ? `
      <div class="ticket">
        <div class="ticket-main">
          <p class="admit">ADMIT ONE</p>
          <h3>${esc(title)}</h3>
          <dl>
            <dt>When</dt><dd>${esc(L.showtimeLong(n.startsAt))}</dd>
            <dt>Where</dt><dd>${esc(L.placeLabel(n.host))}</dd>
            <dt>Guest</dt><dd>${esc(S.me.name)}</dd>
            ${meta && !hide ? `<dt>Running</dt><dd>${esc(meta)}</dd>` : ''}
          </dl>
        </div>
        <div class="ticket-stub"><span>No. ${L.ticketNumber(S.me.nameKey, n.day)}</span></div>
      </div>` : `
      <div class="host-card"><h3>${esc(title)}</h3>
        <p class="hint">${esc(L.showtimeLong(n.startsAt))} · at ${esc(L.placeLabel(n.host))}</p>
        ${showing(n) ? '' : `<div class="row">${rsvp(n)}</div>`}
      </div>`;
    body = `
      ${ticket}
      ${going && !showing(n) ? `<div class="row ticket-actions"><a class="btn btn-bulb" href="${esc(gcalUrl(n, m, hide))}" target="_blank" rel="noopener">Add to calendar</a>${rsvp(n)}</div>
      <p class="hint">Not on Google Calendar? <button class="linkish" type="button" data-action="ics">Download the invite</button></p>` : ''}
      ${hide || !(m.trailer || m.imdbId) ? '' : `<div class="row links-row">
        ${m.trailer ? `<a class="btn btn-ghost" href="https://www.youtube.com/watch?v=${esc(m.trailer)}" target="_blank" rel="noopener">Watch the trailer</a>` : ''}
        ${m.imdbId ? `<a class="btn btn-ghost" href="${esc(L.stremioUrl(m.imdbId))}" target="_blank" rel="noopener">Watch in Stremio</a>` : ''}
      </div>`}
      <p class="dd-line" style="margin-top:10px">${coming.length} coming: ${faces(coming, S.me?.nameKey, 8, { named: false })} ${esc(coming.map((c) => c.name).join(', '))}</p>
      ${n.theme ? `<p class="dd-line">Theme: <span class="theme-chip">${esc(n.theme)}</span></p>` : ''}
      ${hostTools(n, 'next')}
      ${showing(n) ? reviewBox(n, sub.reviews) : ''}`;
  }
  out('#next').innerHTML = body + snackBox(n, sub.snacks, going || isMine(n));
  const more = upcoming.slice(1);
  out('#moreNights').innerHTML = more.length ? `
    <h3 class="label" style="margin:16px 0 6px">Also planned</h3>
    <ul class="date-list">${more.map((x) => `
      <li class="date-item"><span>${esc(L.showtimeLong(x.startsAt))} · at ${esc(L.placeLabel(x.host))} · ${comingTo(x.day).length} in</span>
        ${rsvp(x, ' btn-small')}</li>`).join('')}</ul>` : '';
}

// Concessions: everyone sees who's bringing what; the people coming (and the
// host) call snacks.
function snackBox(n, snacks, canCall) {
  const sorted = [...snacks].sort((a, b) => (a.at?.toMillis?.() ?? 0) - (b.at?.toMillis?.() ?? 0));
  return `
    <div class="snack-box">
      <h4 class="label">Concessions</h4>
      <ul class="snacks">${sorted.length ? sorted.map((s) => `
        <li class="snack"><div><b>${esc(s.item)}</b> <span>· ${esc(s.name)}</span></div>
          ${S.me && s.nameKey === S.me.nameKey ? `<button class="mini" type="button" data-action="unsnack" data-day="${n.day}" data-id="${esc(s.id)}">Remove</button>` : ''}</li>`).join('')
        : '<li class="empty">Nobody has called snacks yet.</li>'}</ul>
      ${canCall ? `<div class="chips">${['Popcorn', 'Candy', 'Drinks', 'Pizza'].map((x) => `<button class="chip" type="button" data-action="quick-snack" data-day="${n.day}" data-item="${x}">${x}</button>`).join('')}</div>
      <form class="snack-form" data-day="${n.day}">
        <label class="sr-only" for="snackItem">What you're bringing</label>
        <input class="field" id="snackItem" maxlength="40" placeholder="I'll bring…">
        <button class="btn btn-ghost" type="submit">Add</button>
      </form>` : ''}
    </div>`;
}

// "Add to calendar" for a night you're coming to: Google's add-event page
// (everyone is on Android). Face down, it names the night, not the movie.
function gcalUrl(n, m, hide) {
  const runtime = L.parseRuntime(m.runtime);
  return L.googleCalendarUrl({
    title: hide ? `Movie night at ${L.placeLabel(n.host)}` : `Movie night: ${m.title}`,
    start: n.startsAt.toDate(), minutes: runtime ? runtime + 30 : 150,
    details: `Weberplex${hide ? '' : `: ${m.title}${m.year ? ` (${m.year})` : ''}`} at ${L.placeLabel(n.host)}.${n.theme ? ` Theme: ${n.theme}.` : ''} ${SITE_URL}`,
    location: L.placeLabel(n.host),
  });
}

// A night's reviews, for everyone; the stars and the line only for the people
// who were there (or hosted).
const reviewsOf = (n) => S.nightSub.get(n.day)?.reviews || S.pastReviews.get(n.day) || [];
const myReviewOf = (n) => S.me && reviewsOf(n).find((r) => r.nameKey === S.me.nameKey);
// The people who were there rate a night (and the host). The page only holds
// free marks from yesterday on; for an older night it can't tell who came, so
// anyone signed in may rate it.
function canRateNight(n) {
  const knowsWhoCame = n.day >= L.dayKey(new Date(Date.now() - 86400000));
  return !!S.me && (!knowsWhoCame || imFree(n.day) || isMine(n) || !!myReviewOf(n));
}

// A night's reviews for everyone; with `form`, the stars and the line too, for
// whoever may rate it.
function reviewBox(n, reviews, { form = true } = {}) {
  const sorted = [...reviews].sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0));
  const sum = L.reviewSummary(sorted);
  const mine = S.me && sorted.find((r) => r.nameKey === S.me.nameKey);
  const stars = S.stars[n.day] || mine?.stars || 0;
  const canRate = form && canRateNight(n);
  if (!canRate && !sorted.length) return '';
  const title = esc(n.lockedMovie?.title || 'it');
  return `
    <div class="review-form" style="margin-top:14px">
      <h3 class="prompt">${canRate ? `How was ${title}?` : `Reviews of ${title}`}${sum.count ? ` <span class="hint">★ ${sum.avg} from ${sum.count}</span>` : ''}</h3>
      ${canRate ? `<div class="stars" role="radiogroup" aria-label="Stars">${[1, 2, 3, 4, 5].map((k) => `<button class="star${k <= stars ? ' on' : ''}" type="button" data-action="star" data-day="${n.day}" data-star="${k}" role="radio" aria-checked="${k === stars}" aria-label="${k} star${k > 1 ? 's' : ''}">${STAR}</button>`).join('')}</div>
        <div class="row"><label class="sr-only" for="review-${n.day}">One-line review</label>
          <input class="field" id="review-${n.day}" maxlength="140" placeholder="One line, optional" value="${esc(mine?.line || '')}" style="flex:1 1 12rem">
          <button class="btn btn-primary" type="button" data-action="review" data-day="${n.day}">Post</button></div>` : ''}
      <div class="reviews">${sorted.map((r) => `<div class="review"><div class="who"><span>${esc(r.name)}</span><span class="s" aria-label="${r.stars} of 5 stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></div>${r.line ? `<p>${esc(r.line)}</p>` : ''}</div>`).join('')}</div>
    </div>`;
}

// Seen marks are per person: after "Not you?" the next person on this phone
// still gets their reel and reveal. Signed out, they belong to nobody ('').
const seenKey = (key) => `${S.me?.nameKey || ''}|${key}`;

// Play a reel or reveal once: not again this visit, and saved as seen on your
// people doc only once it has played through (back before it lands means it
// plays again next visit). The movie stays face down until it closes, and
// someone coming lands on their ticket.
function play(n, key, show) {
  S.reelsSeen.add(seenKey(key));
  S.revealing = { key, day: n.day };
  show().then(({ seen }) => {
    if (seen) savePrefs({ reels: [...(myDoc()?.reels || []), key] });
    S.revealing = null;
    render();
    if (!seen || !imFree(n.day)) return;
    setTimeout(() => {
      const t = $('#next .ticket');
      if (!t) return;
      t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
      t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }, 0);
  });
}
const doneFor = (n) => (imFree(n.day) ? 'See my ticket' : 'OK');
const blocked = () => !!document.querySelector('.tour-overlay, .reel-overlay, .reveal-overlay');

// The reel settled a tie: play it once per person so everyone sees how.
function maybeRevealTie(n) {
  if (S.me && !myDoc()) return; // wait until we know which reels you've seen
  const p = pendingShow(n);
  if (!p?.tie || blocked()) return;
  play(n, p.key, () => spinReel(p.pool, p.winner, { title: `${p.pool.length}-way tie. The reel decides…`, done: imFree(n.day) ? 'See my ticket' : 'Nice' }));
}

// The moment the movie is revealed: once per person (once per phone while
// signed out), for the next night once it's locked with no tie (ties get the
// reel) and before it starts. After How it works, before the news cards.
function maybeRevealMovie(n) {
  if (S.me && !myDoc()) return; // wait until we know which reveals you've seen
  const p = pendingShow(n);
  if (!p || p.tie || blocked()) return;
  play(n, p.key, () => revealMovie(n.lockedMovie, { when: L.showtimeShort(n.startsAt), place: L.placeLabel(n.host), doneText: doneFor(n) }));
}

// ---- the calendar --------------------------------------------------------------
// The theme menu: none, then the shelf's tags and genres. A theme already set
// stays in the list even if the movies behind it have left the shelf.
function themeSelect(id, value = '', attrs = '') {
  const options = L.themeOptions(shelfNow().movies);
  if (value && !options.some((t) => t.toLowerCase() === value.toLowerCase())) options.unshift(value);
  return `<label class="sr-only" for="${id}">Theme</label><select class="field place" id="${id}" ${attrs}>
    <option value="">No theme</option>${options.map((t) => `<option value="${esc(t)}"${t.toLowerCase() === (value || '').toLowerCase() ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
}

function renderCalendar() {
  const days = L.tallyDays(L.calendarDays(), { free: S.free, nights: S.nights });
  if (!S.day || !days.some((d) => d.day === S.day)) S.day = days.find((d) => d.night && d.night.status !== 'done')?.day || days[0].day;
  const lead = L.dayFromKey(days[0].day).getDay();
  // A tap on a day only shows it in the panel below (the box office window);
  // saying you're free or hosting happens there. One Tab stop for the whole
  // grid: the arrow keys move between days.
  out('#calendar').innerHTML = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span class="cal-head" aria-hidden="true">${x}</span>`).join('')
    + '<span class="cal-blank"></span>'.repeat(lead)
    + days.map((d, i) => {
      const date = L.dayFromKey(d.day);
      const mine = imFree(d.day);
      const sel = d.day === S.day;
      const first = i === 0 || date.getDate() === 1;
      const live = d.night && d.night.status !== 'done' ? d.night : null;
      const label = `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${d.count} free${live ? `, ${live.host} hosting` : ''}${mine ? ', you’re free' : ''}`;
      return `
        <button class="day${mine ? ' on' : ''}${sel ? ' sel' : ''}${live ? ' lead' : ''}${S.news?.days.has(d.day) ? ' fresh' : ''}"
          type="button" role="radio" data-action="day" data-day="${d.day}" aria-checked="${sel}" aria-controls="dayDetail" tabindex="${sel ? 0 : -1}" aria-label="${esc(label)}">
          <span class="d-dow">${first ? esc(date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()) : '&nbsp;'}</span>
          <span class="d-num">${date.getDate()}</span>
          <span class="d-meta">${d.count || ''}${live ? `<span class="d-host" title="Movie night">${HOUSE}</span>` : ''}</span>
        </button>`;
    }).join('');
  const d = days.find((x) => x.day === S.day);
  const date = L.dayFromKey(d.day);
  const mine = imFree(d.day);
  const night = d.night && d.night.status !== 'done' ? d.night : null;
  const freeBtn = night ? rsvp(night)
    : `<button class="btn btn-rsvp ${mine ? 'btn-ghost on' : 'btn-bulb'}" type="button" data-action="free" data-day="${d.day}" aria-pressed="${mine}">${mine ? `You’re free ${CHECK}` : 'I’m free that evening'}</button>`;
  out('#dayDetail').innerHTML = `
    <div class="dd-head"><h3>${esc(date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}</h3></div>
    <p class="dd-line">${d.count ? `${faces(d.free, S.me?.nameKey, 8, { named: false })} ${esc(d.free.map((f) => f.name).join(', '))}` : 'Nobody has said they’re free yet.'}</p>
    ${d.night?.status === 'done'
      ? `<p class="dd-line">Watched ${esc(d.night.lockedMovie?.title || '')} at ${esc(L.placeLabel(d.night.host))}.</p>`
      : night
      ? `<p class="dd-line"><span><b>${esc(night.host)}</b> is hosting at ${esc(L.showtimeParts(night.startsAt).time)}${night.theme ? ` · ${esc(night.theme)} night` : ''}${night.status === 'locked' ? (faceDown(night) ? ' · the movie is locked' : ` · showing ${esc(night.lockedMovie?.title || '')}`) : ''}</span></p>
         <div class="row dd-actions">${freeBtn}</div>${hostTools(night, 'dd')}`
      : `<div class="row dd-actions">${freeBtn}</div>
         <p class="hint">Free that evening puts you on the list if someone hosts it.</p>
         <div class="dd-host">
           <h4 class="label">Host this evening</h4>
           <div class="row">${timeSelect('hostTime', S.hostTime)}${themeSelect('hostTheme', S.hostTheme)}
             ${S.hostSlip === d.day ? '' : `<button class="btn btn-ghost" type="button" data-action="host-slip" data-day="${d.day}">I can host</button>`}</div>
           ${S.hostSlip === d.day ? hostSlip(d.day) : '<p class="hint">You’ll be counted in. A theme is optional: the pick sticks to it when it can.</p>'}
         </div>`}`;
}

// Hosting puts a night on the marquee for everyone, so it's printed on a slip
// first and takes a confirming tap.
function hostSlip(day) {
  const when = startsAtFor(day, S.hostTime);
  return `
    <div class="host-slip" role="group" aria-labelledby="slip-${day}">
      <p class="admit">Now booking</p>
      <h4 id="slip-${day}">Movie night at ${esc(L.placeLabel(S.me?.name || 'your'))}</h4>
      <p class="slip-when">${esc(L.showtimeLong(when))}${S.hostTheme ? ` · ${esc(S.hostTheme)} night` : ''}</p>
      <p class="slip-note">It goes up on the marquee for everyone, and you’re counted in. The movie locks a day before.</p>
      <div class="row">
        <button class="btn btn-primary" type="button" data-action="host" data-day="${day}">Put it on the marquee</button>
        <button class="btn btn-ghost" type="button" data-action="host-cancel" data-day="${day}">Not yet</button>
      </div>
    </div>`;
}

// ---- the shelf ------------------------------------------------------------------
const SORTS = [['wanted', 'Most wanted'], ['new', 'Newest'], ['unseen', 'Least seen'], ['short', 'Shortest']];
function sorted(list) {
  const out = [...list];
  if (S.sort === 'new') out.sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0));
  if (S.sort === 'unseen') out.sort((a, b) => a.seenBy.length - b.seenBy.length || b.votes - a.votes);
  if (S.sort === 'short') out.sort((a, b) => (L.parseRuntime(a.runtime) || 999) - (L.parseRuntime(b.runtime) || 999));
  return out;
}
const matches = (m) => S.filter === 'All'
  || (S.filter === 'Unseen by me' ? !m.seenBy.some((x) => x.nameKey === S.me?.nameKey)
    : S.filter === 'Added by me' ? m.by === S.me?.nameKey
      : (m.shelf || []).includes(S.filter));

function renderShelf(shelf) {
  $('#shelfCount').textContent = `${shelf.movies.length} movies`;
  const genre = L.ballotGenre(shelf.movies);
  out('#browseTabs').innerHTML = tabsHtml(browseTabs(genre), S.tab);
  const searching = S.tab === 'search';
  $('#searchRow').hidden = !searching;
  $('#results').hidden = !searching || !$('#results').innerHTML;
  $('#browseNote').hidden = searching || !(S.tabLoading || S.tabNote);
  $('#browseNote').textContent = S.tabLoading ? 'Loading…' : S.tabNote;
  const taken = new Set(S.movies.map((m) => m.imdbId));
  $('#browseGrid').hidden = searching || S.tabLoading || !S.tabItems.length;
  if (!searching) paint($('#browseGrid'), tilesHtml(S.tabItems, { taken, watched: L.watchedIds(S.nights) }));

  out('#sortChips').innerHTML = SORTS.map(([k, label]) => `<button class="chip${S.sort === k ? ' on' : ''}" type="button" data-action="sort" data-sort="${k}" aria-pressed="${S.sort === k}">${label}</button>`).join('');
  const filters = ['All', ...(S.me ? ['Unseen by me', 'Added by me'] : []), ...L.shelfTags(shelf.movies)];
  if (!filters.includes(S.filter)) S.filter = 'All';
  out('#shelfChips').innerHTML = filters.map((f) => `<button class="chip${S.filter === f ? ' on' : ''}" type="button" data-action="filter" data-tag="${esc(f)}" aria-pressed="${S.filter === f}">${esc(f)}</button>`).join('');

  const list = sorted(shelf.movies).filter(matches);
  if (!ready()) { out('#shelf').innerHTML = ''; return; }
  if (!list.length) {
    out('#shelf').innerHTML = `<p class="empty">${shelf.movies.length ? 'Nothing matches that filter.' : 'The shelf is empty. Add the first movie.'}</p>`;
    return;
  }
  // Each movie is a lobby card. The front is the poster and the one thing
  // people do most, the thumbs-up; tap the poster to turn it over for the
  // back, printed on admit-one stock: Seen it, the trailer, Stremio, the plot.
  // The crown belongs to the next night: with one planned, its projected pick
  // wears "Leading Tue" (themes and vetoes decide); otherwise the shelf's
  // overall favorites wear "Most wanted". Overall popularity lives in Stats.
  const next = L.upcomingNights(S.nights)[0];
  const p = projection(next);
  const leadIds = new Set(p ? (p.tie.length > 1 ? p.tie : [p.movie.imdbId]) : shelf.leaders.map((m) => m.imdbId));
  const crown = p ? `Leading ${L.showtimeParts(next.startsAt).dow.slice(0, 3)}` : 'Most wanted';
  out('#shelf').innerHTML = list.map((m) => {
    const id = esc(m.imdbId);
    const mine = S.me && m.by === S.me.nameKey;
    const voted = S.me && m.voters.some((v) => v.nameKey === S.me.nameKey);
    const iSaw = S.me && m.seenBy.some((v) => v.nameKey === S.me.nameKey);
    const back = S.flipped.has(m.imdbId);
    const prev = S.lastVotes.get(m.imdbId);
    const bump = prev != null && m.votes > prev;
    S.lastVotes.set(m.imdbId, m.votes);
    const fresh = S.news?.movies.has(m.imdbId);
    const newVotes = S.news?.votes.get(m.imdbId) || 0;
    const meta = [m.year, m.runtime, m.rating && `★ ${m.rating}`].filter(Boolean).join(' · ');
    const hidden = ' aria-hidden="true" inert';
    return `
      <article class="card lobby${leadIds.has(m.imdbId) ? ' lead' : ''}${back ? ' flipped' : ''}">
        <div class="lc">
          <div class="lc-face lc-front"${back ? hidden : ''}>
            <button class="lc-turn" type="button" data-action="flip" data-id="${id}" aria-expanded="false" aria-controls="back-${id}" aria-label="Turn over ${esc(m.title)}: Seen it, trailer, plot">
              ${posterImg(m.poster, m.title)}<span class="lc-ear" aria-hidden="true"></span></button>
            ${fresh ? '<span class="new-chip">New</span>' : ''}
            ${leadIds.has(m.imdbId) ? `<span class="ribbon">${crown}</span>` : ''}</div>
          <div class="lc-face lc-back" id="back-${id}"${back ? '' : hidden}>
            <button class="lc-ear lc-back-turn" type="button" data-action="unflip" data-id="${id}" aria-label="Turn ${esc(m.title)} back over"></button>
            <div class="lc-actions">
              <button class="mini${iSaw ? ' on' : ''}" type="button" data-action="seen" data-id="${id}" aria-pressed="${!!iSaw}">${iSaw ? `Seen ${CHECK}` : 'Seen it'}</button>
              ${m.trailer ? `<a class="mini" href="https://www.youtube.com/watch?v=${esc(m.trailer)}" target="_blank" rel="noopener" aria-label="Trailer for ${esc(m.title)}">Trailer</a>` : ''}
              <a class="mini" href="${esc(L.stremioUrl(m.imdbId))}" target="_blank" rel="noopener" aria-label="Open ${esc(m.title)} in Stremio">Stremio</a>
              ${mine ? `<button class="mini" type="button" data-action="remove-movie" data-id="${id}">Remove</button>` : ''}
            </div>
            <p class="seen-line">${m.seenBy.length ? `Seen by ${esc(m.seenBy.map((x) => x.name).join(', '))}` : 'Nobody has marked it seen'}</p>
            <p class="lc-plot">${m.description ? esc(m.description) : 'No plot on file for this one.'}</p>
          </div>
        </div>
        <div class="card-body">
          <h3>${esc(m.title)}</h3>
          ${meta ? `<p class="meta">${esc(meta)}</p>` : ''}
          ${m.shelf?.length ? `<div class="tags">${m.shelf.map((x) => `<span class="tag-chip" data-tag="${esc(x)}">${esc(x)}</span>`).join('')}</div>` : ''}
          ${m.pitch ? `<p class="pitch">“${esc(m.pitch)}”</p>` : ''}
          <p class="by">${L.isHouse(m) ? 'House pick' : `Added by ${mine ? 'you' : esc(m.byName)}`}</p>
          <div class="card-actions">
            <button class="vote${voted ? ' on' : ''}${bump ? ' bump' : ''}" type="button" data-action="vote" data-id="${id}"
              aria-pressed="${!!voted}" aria-label="I'd watch ${esc(m.title)} (${m.votes})">${THUMB}<span class="n">${m.votes}</span>${newVotes ? `<span class="vote-new">+${newVotes}</span>` : ''}</button>
            ${faces(m.voters, S.me?.nameKey, 4)}
          </div>
        </div>
      </article>`;
  }).join('');
}

// What "For you" learns from: my thumbs-ups, else the house list.
function likedForMe() {
  if (S.me) {
    const mine = S.votes.filter((v) => v.nameKey === S.me.nameKey).map((v) => v.movie);
    if (mine.length) return { ids: mine, basis: 'Based on what you thumbed up.' };
  }
  const house = S.movies.filter(L.isHouse).map((m) => m.imdbId);
  return { ids: house, basis: house.length ? 'Based on the house list. Thumb a few movies to make these yours.' : '' };
}

let tabToken = 0;
async function openTab(id) {
  S.tab = id; S.tabItems = []; S.tabNote = '';
  if (id === 'search') { render(); $('#q').focus(); return; }
  const token = ++tabToken;
  S.tabLoading = true;
  render();
  const liked = likedForMe();
  const res = await loadTab(id, {
    genre: L.ballotGenre(shelfNow().movies), likedIds: liked.ids, basis: liked.basis,
    exclude: new Set(S.movies.map((m) => m.imdbId)),
  }).catch(() => ({ items: [], note: 'The movie catalog is not answering right now.' }));
  if (token !== tabToken) return;
  S.tabLoading = false; S.tabItems = res.items;
  S.tabNote = res.note || (res.items.length ? '' : 'Nothing here right now.');
  render();
}

// ---- watched ----------------------------------------------------------------------
function renderWatched() {
  const past = L.pastNights(S.nights);
  $('#watchedSec').hidden = !past.length;
  $('#navWatched').hidden = !past.length;
  if (!past.length) return;
  for (const n of past.slice(0, 12)) {
    if (S.pastReviews.has(n.day)) continue;
    S.pastReviews.set(n.day, []);
    loadRows(db, F, `nights/${n.day}/reviews`).then((r) => { S.pastReviews.set(n.day, r); render(); }).catch(() => {});
  }
  const minutes = past.reduce((s, n) => s + (L.parseRuntime(n.lockedMovie?.runtime) || 0), 0);
  const hours = Math.round(minutes / 60);
  $('#statsLine').textContent = `${past.length} night${past.length === 1 ? '' : 's'} · ${hours} hour${hours === 1 ? '' : 's'} of movies`;
  const hosts = L.hostCounts(S.nights);
  $('#hostsLine').textContent = hosts.length ? `Hosted so far: ${hosts.map(([h, c]) => `${h} ${c}`).join(' · ')}` : '';
  // One rating stub at a time: the newest night you haven't rated yet, with
  // the week's other unrated nights a tap away. Other nights' reviews show for
  // everyone, read-only.
  const recent = recentDone();
  const unrated = recent.filter((n) => canRateNight(n) && !myReviewOf(n));
  const stub = unrated.find((n) => n.day === S.rateDay) || unrated[0];
  const others = unrated.filter((n) => n !== stub);
  paint($('#rateBox'), (stub ? reviewBox(stub, reviewsOf(stub)) : '')
    + (others.length ? `<p class="hint also-rate">Also to rate: ${others.map((n) => `<button class="linkish" type="button" data-action="rate-night" data-day="${n.day}">${esc(n.lockedMovie?.title || 'that night')}</button>`).join(' · ')}</p>` : '')
    + recent.filter((n) => n !== stub && reviewsOf(n).length).map((n) => reviewBox(n, reviewsOf(n), { form: false })).join(''));
  out('#past').innerHTML = past.slice(0, 12).map((n) => {
    const r = L.reviewSummary((S.nightSub.get(n.day)?.reviews) || S.pastReviews.get(n.day) || []);
    const when = n.startsAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `
      <div class="past-row">
        ${posterImg(n.lockedMovie?.poster, n.lockedMovie?.title || '')}
        <div><div class="t">${esc(n.lockedMovie?.title || '')}</div><div class="d">${esc(`${when} · at ${L.placeLabel(n.host)}`)}</div></div>
        <span class="s">${r.count ? `★ ${r.avg}` : ''}</span>
      </div>`;
  }).join('');
}

// ---- stats --------------------------------------------------------------------------
// All of it comes from what the page already holds: no reads of its own.
function renderStats(shelf) {
  $('#statsSec').hidden = !ready();
  $('#navStats').hidden = !ready();
  if (!ready()) return;
  const r = L.recap(S.nights, S.votes, S.movies);
  // The long view is spelled out on a letter board, one line per number.
  const line = (n, one, many) => `<li><b>${n}</b> <span>${n === 1 ? one : many}</span></li>`;
  out('#statTiles').innerHTML = [
    line(r.nights, 'Night watched', 'Nights watched'), line(r.hours, 'Hour of movies', 'Hours of movies'),
    line(r.shelf, 'Movie added', 'Movies added'), line(r.thumbs, 'Thumbs-up', 'Thumbs-ups'),
  ].join('');
  $('#topVoter').hidden = !r.topVoter;
  if (r.topVoter) $('#topVoter').textContent = `Most thumbs-ups: ${r.topVoter.name} (${r.topVoter.thumbs})`;

  const wanted = L.mostWanted(shelf.movies);
  out('#topWanted').innerHTML = wanted.length
    ? `<ol class="leaders">${wanted.map((m) => `<li>${esc(m.title)} ${thumbs(m.votes)}</li>`).join('')}</ol>`
    : `<p class="hint">${r.thumbs === 0 ? 'No thumbs-ups yet. Tap the thumb on a movie you’d watch.' : 'Nothing on the shelf has a thumbs-up right now. Tap the thumb on a movie you’d watch.'}</p>`;

  const leaders = L.pickLeaders(S.nights, S.movies);
  out('#pickBoard').innerHTML = leaders.length
    ? `<ol class="leaders">${leaders.map((x) => `<li>${esc(x.name)}${S.me && x.nameKey === S.me.nameKey ? ' (you)' : ''} <span class="v">${x.picks} ${x.picks === 1 ? 'pick' : 'picks'}</span></li>`).join('')}</ol>`
    : '<p class="hint">No shelf pick has made a night yet. Whoever added the first winner tops this board.</p>';

  // Who you agree with: only for someone signed in, and only once there are
  // enough thumbs on both sides to compare.
  $('#tasteCard').hidden = !S.me;
  if (!S.me) return;
  const mine = S.votes.filter((v) => v.nameKey === S.me.nameKey).length;
  const match = L.tasteMatch(S.votes, S.me.nameKey).slice(0, 3);
  out('#tasteBox').innerHTML = match.length
    ? `<ul class="stat-list">${match.map((x) => `
        <li class="taste"><span>You and <b>${esc(x.name)}</b> agree <span class="v">${x.pct}%</span></span>
          <span class="meter" style="--p:${x.pct}%" aria-hidden="true"></span>
          <span class="hint">${x.shared} ${x.shared === 1 ? 'movie' : 'movies'} in common</span></li>`).join('')}</ul>`
    : `<p class="hint">${mine < L.MIN_TASTE_THUMBS ? 'Thumbs-up a few movies to see who you agree with.' : 'Nobody else has thumbed up enough movies to compare with yet.'}</p>`;
}

// ---- actions -------------------------------------------------------------
// What a tap before you gave a name was for: once you do, it goes through
// (the control is found again by its key, since the page repaints). `done`
// says what happened, after the welcome.
let pending = null;
function requireMe(el = null, done = '') {
  if (S.me) return S.me;
  pending = el ? { key: keyOf(el), done } : null;
  const pass = $('#pass');
  pass.hidden = false;
  pass.classList.remove('flash');
  void pass.offsetWidth;
  pass.classList.add('flash');
  pass.scrollIntoView({ behavior: 'smooth', block: 'center' });
  focusPass();
  toast(el ? 'Put your name down first. Then that counts.' : 'Add your name first so it counts.');
  return null;
}
// The name form. With names already on the list, focus lands on the form, not
// the text field, so a phone keyboard doesn't cover "tap your name".
function focusPass() {
  if (!S.people.length) { $('#passName').focus({ preventScroll: true }); return; }
  const pass = $('#pass');
  pass.setAttribute('tabindex', '-1');
  pass.focus({ preventScroll: true });
}
async function once(key, fn) {
  if (busy.has(key)) return;
  busy.add(key);
  try { await fn(); } catch (e) { console.error(e); toast(writeError(e), true); } finally { busy.delete(key); }
}
async function join(name) {
  try {
    const who = await A.join(name);
    S.me = who;
    saveLocal('ps.me', who);
    // What this phone showed before you gave a name is yours too: don't replay it.
    const carried = [...S.reelsSeen].filter((k) => k.startsWith('|')).map((k) => k.slice(1));
    for (const k of carried) S.reelsSeen.add(seenKey(k));
    const had = myDoc()?.reels || [];
    if (carried.some((k) => !had.includes(k))) savePrefs({ reels: [...had, ...carried.filter((k) => !had.includes(k))] });
    applyPrefs();
    $('#passName').value = '';
    $('#passMsg').hidden = true;
    toast(`Welcome, ${who.name}.`);
    render();
    // Then the tap that brought you here, unless it's already done (you were
    // on the list and had thumbed that one up before).
    // The form just hid with focus in it: put focus on that tap's control, or
    // on Up next, rather than nowhere.
    const p = pending;
    pending = null;
    setTimeout(() => {
      const el = p?.key && document.querySelector(p.key);
      if (el) {
        el.focus({ preventScroll: true });
        if (el.disabled || el.getAttribute('aria-pressed') === 'true') return;
        el.click();
        if (p.done) toast(`Welcome, ${who.name}. ${p.done}`);
        return;
      }
      const a = document.activeElement;
      if (a && a !== document.body && a.offsetParent) return;
      const sec = $('#nextSec');
      sec.setAttribute('tabindex', '-1');
      sec.focus({ preventScroll: true });
    }, 0);
  } catch (e) {
    $('#passMsg').textContent = writeError(e);
    $('#passMsg').className = 'msg bad';
    $('#passMsg').hidden = false;
  }
}
function startTour() {
  openTour({ onDone: () => { S.toured = true; savePrefs({ toured: true }); if (!S.me && !$('#pass').hidden) focusPass(); render(); } });
}
// No name yet: show the walkthrough now. With a name, applyPrefs decides once
// your people doc arrives.
if (!S.me && !S.toured) startTour();

// A name that looks like someone already on the list ("Grandma" when there's a
// "Gma") is probably them on a new phone: ask once before making a second person.
$('#passForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#passName').value;
  const known = S.people.some((p) => p.id === L.nameKey(name));
  const twin = !known && S.people.find((p) => L.looksLike(name, p.name));
  const go = $('#passGo');
  if (twin && !armed(go, `Join as ${L.cleanName(name)}`)) {
    $('#passMsg').textContent = `Is that you, ${twin.name}? Tap your name below. New here? Tap “Join as ${L.cleanName(name)}”.`;
    $('#passMsg').className = 'msg';
    $('#passMsg').hidden = false;
    document.querySelector(`#passChips [data-name="${CSS.escape(twin.name)}"]`)?.classList.add('twin');
    return;
  }
  join(name);
});
$('#addBox').addEventListener('toggle', () => {
  $('#addBox > summary').textContent = $('#addBox').open ? 'Done adding' : 'Add a movie';
});
// Offline, taps still show on this phone and send when the connection is back.
window.addEventListener('offline', () => toast('You’re offline. What you tap now sends when you’re back online, if this page stays open.', true));
window.addEventListener('online', () => toast('Back online.'));
// Arrow keys move between days (Home and End to the ends); the panel follows.
$('#calendar').addEventListener('keydown', (e) => {
  const cell = e.target.closest('.day');
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -99, End: 99 }[e.key];
  if (!cell || !step) return;
  e.preventDefault();
  const cells = [...$('#calendar').querySelectorAll('.day')];
  const next = cells[Math.max(0, Math.min(cells.length - 1, cells.indexOf(cell) + step))];
  next.focus();
  S.day = next.dataset.day;
  render();
});
// The theme the host's menu shows right now, per night: arrowing through the
// menu changes it faster than writes land, so a save in flight picks up the
// latest value when it finishes instead of dropping it.
const wantTheme = new Map();
document.addEventListener('change', (e) => {
  // The hosting block's menus: the slip, if open, reprints with them.
  if (e.target.id === 'hostTime') { S.hostTime = e.target.value; savePrefs({ hostTime: S.hostTime }); render(); }
  if (e.target.id === 'hostTheme') { S.hostTheme = e.target.value; render(); }
  const day = e.target.dataset.themeDay; // the host's theme menu on a planned night
  if (!day) return;
  wantTheme.set(day, e.target.value);
  once(`theme:${day}`, async () => {
    let theme;
    try {
      while (wantTheme.has(day)) {
        theme = wantTheme.get(day);
        wantTheme.delete(day);
        await A.setTheme(day, theme);
      }
    } catch (err) {
      wantTheme.delete(day);
      const saved = S.nights.find((x) => x.day === day)?.theme || '';
      document.querySelectorAll(`select[data-theme-day="${day}"]`).forEach((s) => { s.value = saved; });
      throw err;
    }
    toast(theme ? `Theme: ${theme}. The pick sticks to it when it can.` : 'Theme cleared.');
  });
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('.snack-form');
  if (!form) return;
  e.preventDefault();
  const v = form.querySelector('input').value;
  if (v.trim()) addSnack(form.dataset.day, v);
});

// Calendar subscription (the Subscribe panel in the calendar section). Everyone
// is on Android, where webcal:// links do nothing and the Google Calendar app
// can't add a calendar by URL, so the button is Google's web subscribe link
// (render?cid=): Google asks to add the feed and the app picks it up. The
// links come from SITE_URL, so a local copy of the site still points at the
// real feed.
const feed = new URL('/calendar.ics', SITE_URL);
$('#subGoogle').href = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(`webcal://${feed.host}${feed.pathname}`)}`;
$('#subUrl').value = feed.href;
async function copyFeed() {
  const field = $('#subUrl');
  try { await navigator.clipboard.writeText(field.value); }
  catch {
    field.select();
    if (!document.execCommand('copy')) { toast('Press and hold the link to copy it.', true); return; }
  }
  toast('Link copied. Paste it in Google Calendar under Other calendars → From URL.');
}

document.addEventListener('click', (e) => {
  const tab = e.target.closest('#browseTabs [data-tab]');
  if (tab) { openTab(tab.dataset.tab); return; }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const id = el.dataset.id;
  const day = el.dataset.day;
  const movie = () => shelfNow().movies.find((x) => x.imdbId === id);
  switch (el.dataset.action) {
    case 'join': join(el.dataset.name); break;
    case 'switch':
      if (!armed(el, 'Tap again to switch')) return;
      S.me = null; saveLocal('ps.me', null); prefsFor = null; S.since = null; S.walked = false; S.hostTime = '20:00'; S.hostSlip = null; render();
      setTimeout(focusPass, 0);
      break;
    case 'day': S.day = day; render(); break;
    // Turning a card hides the side you tapped on: focus goes to the other side.
    case 'flip': case 'unflip': {
      const over = el.dataset.action === 'flip';
      if (over) S.flipped.add(id); else S.flipped.delete(id);
      render();
      setTimeout(() => document.querySelector(`[data-action="${over ? 'unflip' : 'flip'}"][data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }), 0);
      break;
    }
    case 'tour': startTour(); break;
    case 'news-seen': markSeen(); break;
    case 'news-walk': walkNews(); break;
    case 'goto': scrollToSection(el.dataset.target); break;
    case 'subscribe': {
      const panel = $('#subPanel');
      panel.hidden = !panel.hidden;
      el.setAttribute('aria-expanded', String(!panel.hidden));
      break;
    }
    case 'copy-feed': copyFeed(); break;
    case 'free': {
      const when = L.dayFromKey(day).toLocaleDateString(undefined, { weekday: 'long' });
      const me = requireMe(el, el.dataset.night ? `You’re in for ${when}.` : `You’re free ${when}.`); if (!me) return;
      const was = imFree(day);
      // Dropping out of a night (and its ticket) takes a second tap.
      if (was && el.dataset.night && !armed(el, 'Tap again: can’t make it')) return;
      once(`free:${day}`, () => A.setFree(day, me, !was));
      render();
      break;
    }
    case 'host-slip': {
      const me = requireMe(el); if (!me) return;
      S.hostSlip = day; render();
      setTimeout(() => document.querySelector(`#dayDetail [data-action="host"][data-day="${day}"]`)?.focus(), 0);
      break;
    }
    case 'host-cancel':
      S.hostSlip = null; render();
      setTimeout(() => document.querySelector(`#dayDetail [data-action="host-slip"][data-day="${day}"]`)?.focus(), 0);
      break;
    case 'host': {
      const me = requireMe(el); if (!me) return;
      const startsAt = startsAtFor(day, S.hostTime);
      if (startsAt <= new Date()) { toast('That time has already passed. Pick a later start.', true); return; }
      const theme = S.hostTheme;
      once(`host:${day}`, async () => {
        await A.hostNight(me, day, startsAt, theme);
        S.hostSlip = null; S.hostTheme = '';
        render();
        const soon = L.lockAt({ startsAt }) <= new Date();
        toast(`You're hosting ${L.showtimeLong(startsAt)}. It's on the marquee. ${soon ? 'It is less than a day away, so the movie locks now.' : 'The movie locks a day before.'}`);
      });
      break;
    }
    case 'rate-night': S.rateDay = day; render(); break;
    case 'night-time': once(`time:${day}`, async () => {
      // The time menu beside the button you tapped (Up next and the day panel each have one).
      const t = startsAtFor(day, el.closest('.host-tools').querySelector(`select[id$="-time-${day}"]`).value);
      if (t <= new Date()) { toast('That time has already passed.', true); return; }
      await A.setNightTime(day, t);
      toast(`Moved to ${L.showtimeLong(t)}.`);
    }); break;
    case 'lock-now': {
      if (!armed(el, 'Tap again to lock')) return;
      const n = S.nights.find((x) => x.day === day);
      const pick = L.pickMovie({ movies: S.movies, votes: S.votes, watched: L.excludedFor(S.nights, day), attendees: comingTo(day).map((f) => f.nameKey), vetoed: L.vetoedFor(n), theme: n.theme || '' });
      if (!pick) { toast('The shelf is empty. Add a movie first.', true); return; }
      // Not the title: the host gets their reveal too.
      once(`lock:${day}`, async () => { await A.lockNight(n.day, pick); toast(pick.tie.length > 1 ? 'Locked. The reel decides, next.' : 'Locked. Your reveal is next.'); });
      break;
    }
    case 'veto': case 'unveto': {
      const me = requireMe(el); if (!me) return;
      const on = el.dataset.action === 'veto';
      const title = shelfNow().movies.find((x) => x.imdbId === id)?.title || 'that movie';
      once(`veto:${day}`, async () => {
        if (!(await A.setVeto(day, me, on ? id : null))) { toast('That night has already locked.', true); return; }
        toast(on ? `Vetoed ${title}. It can’t be picked this night.` : 'Veto taken back.');
      });
      break;
    }
    case 'unlock-night': if (armed(el)) once(`unlock:${day}`, () => A.unlockNight(day)); break;
    case 'finish-night': if (armed(el)) once(`finish:${day}`, async () => { await A.finishNight(day); toast('Filed under Watched. Rate it below.'); }); break;
    case 'cancel-night': if (armed(el)) once(`cancel:${day}`, async () => { await A.cancelNight(day); toast('Night cancelled. Someone else can host that day.'); }); break;
    case 'seen': {
      const m = movie(); const me = requireMe(el, m ? `${m.title} is marked seen.` : ''); if (!me || !m) return;
      once(`seen:${id}`, () => A.setSeen(m, me, !m.seenBy.some((x) => x.nameKey === me.nameKey)));
      break;
    }
    case 'vote': {
      const m = movie(); const me = requireMe(el, m ? `Your thumbs-up on ${m.title} counts.` : ''); if (!me || !m) return;
      once(`vote:${id}`, () => A.setVote(m, me, !m.voters.some((v) => v.nameKey === me.nameKey)));
      break;
    }
    case 'remove-movie': {
      const m = movie(); if (!m || !armed(el, 'Tap to confirm')) return;
      once(`rm:${id}`, async () => { await A.removeMovie(m, m.voters.map((v) => v.nameKey), m.seenBy.map((v) => v.nameKey)); toast(`Took ${m.title} off the shelf.`); });
      break;
    }
    case 'sort': S.sort = el.dataset.sort; render(); break;
    case 'filter': S.filter = el.dataset.tag; render(); break;
    case 'pick': pick(id, el); break;
    case 'surprise': surprise(); break;
    case 'close-surprise': $('#surprise').innerHTML = ''; break;
    case 'quick-snack': addSnack(day, el.dataset.item, el); break;
    case 'unsnack': once(`unsnack:${id}`, () => A.removeSnack(day, id)); break;
    case 'star': S.stars[day] = Number(el.dataset.star); render(); break;
    case 'review': {
      const me = requireMe(el); if (!me) return;
      const mineNow = (S.nightSub.get(day)?.reviews || []).find((r) => r.nameKey === me.nameKey);
      const stars = S.stars[day] || mineNow?.stars;
      if (!stars) { toast('Tap the stars first.'); return; }
      once(`review:${day}`, async () => { await A.review(day, me, stars, document.getElementById(`review-${day}`)?.value || ''); toast('Review posted to the lobby.'); });
      break;
    }
    case 'ics': downloadIcs(); break;
    default: break;
  }
});

// Movie search ---------------------------------------------------------------
let searchTimer = 0;
let searchAbort = null;
let lastResults = [];
$('#q').addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = $('#q').value.trim();
  if (q.length < 2) { $('#results').hidden = true; $('#results').innerHTML = ''; return; }
  searchTimer = setTimeout(() => runSearch(q), 250);
});
$('#q').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $('#q').value = ''; $('#results').hidden = true; $('#results').innerHTML = ''; }
  if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); const q = $('#q').value.trim(); if (q.length >= 2) runSearch(q); }
});
async function runSearch(q) {
  searchAbort?.abort();
  searchAbort = new AbortController();
  $('#results').hidden = false;
  $('#results').dataset.q = '';
  $('#results').innerHTML = '<p class="empty">Searching…</p>';
  try {
    lastResults = await searchMovies(q, searchAbort.signal);
    const pool = new Set(S.movies.map((m) => m.imdbId));
    const watched = L.watchedIds(S.nights);
    $('#results').dataset.q = q;
    $('#results').innerHTML = lastResults.length
      ? lastResults.map((m) => {
        const mid = m.imdb_id || m.id;
        const taken = pool.has(mid);
        return `<button class="result${taken ? ' taken' : ''}" type="button" data-action="pick" data-id="${esc(mid)}">
            ${posterImg(m.poster, '')}
            <span><span class="t">${esc(m.name)}</span><br><span class="y">${esc(m.releaseInfo || m.year || '')}</span></span>
            <span class="add">${watched.has(mid) ? 'Watched' : taken ? 'On the shelf' : 'Add'}</span></button>`;
      }).join('')
      : `<p class="empty">Nothing called “${esc(q)}”. Try fewer words.</p>`;
  } catch (e) {
    if (e.name === 'AbortError') return;
    $('#results').innerHTML = `<p class="empty">${esc(e.message)}</p>`;
  }
}
function setPickMsg(text, kind = '') { $('#pickMsg').textContent = text; $('#pickMsg').className = `msg${kind ? ` ${kind}` : ''}`; }

async function pick(imdbId, el = null) {
  const me = requireMe(el); if (!me) return;
  const existing = S.movies.find((m) => m.imdbId === imdbId);
  const watchedNight = L.pastNights(S.nights).find((n) => n.lockedMovieId === imdbId);
  if (watchedNight) { setPickMsg(`We already watched ${existing?.title || 'that one'} on ${watchedNight.startsAt.toDate().toLocaleDateString()}.`, 'bad'); return; }
  if (existing) { setPickMsg(new AlreadyOnShelfError(existing).message, 'bad'); return; }
  await once(`pick:${imdbId}`, async () => {
    setPickMsg('Adding…');
    const fromList = lastResults.find((m) => (m.imdb_id || m.id) === imdbId)
      || S.tabItems.map((x) => x.meta).find((m) => (m.imdb_id || m.id) === imdbId) || surpriseItem;
    const meta = (await movieMeta(imdbId).catch(() => null)) || fromList || { id: imdbId, name: imdbId };
    const movie = L.movieFromMeta({ ...meta, poster: meta.poster || fromList?.poster });
    try {
      await A.addMovie(me, movie, $('#pitch').value);
    } catch (e) {
      setPickMsg(e instanceof AlreadyOnShelfError ? e.message : writeError(e), 'bad');
      return;
    }
    setPickMsg(`Added ${movie.title} to the shelf, with your thumbs-up.`, 'good');
    $('#q').value = ''; $('#pitch').value = '';
    $('#results').hidden = true; $('#results').innerHTML = '';
    $('#surprise').innerHTML = '';
  });
}

let surpriseItem = null;
async function surprise() {
  setPickMsg('Rummaging through the catalog…');
  const pool = new Set(S.movies.map((m) => m.imdbId));
  const choices = (await topMovies()).filter((m) => !pool.has(m.imdb_id || m.id));
  surpriseItem = L.pickRandom(choices);
  setPickMsg('');
  if (!surpriseItem) { setPickMsg('Nothing new right now. Try a search instead.', 'bad'); return; }
  const m = surpriseItem;
  const mid = m.imdb_id || m.id;
  $('#surprise').innerHTML = `
    <div class="surprise">
      ${m.poster ? posterImg(m.poster, m.name) : ''}
      <div>
        <h3>${esc(m.name)} <span class="y">${esc(m.releaseInfo || '')}</span></h3>
        <p>${esc((m.description || '').slice(0, 180))}${(m.description || '').length > 180 ? '…' : ''}</p>
        <div class="row">
          <button class="btn btn-bulb btn-small" type="button" data-action="pick" data-id="${esc(mid)}">Add it</button>
          <button class="btn btn-ghost btn-small" type="button" data-action="surprise">Spin again</button>
          <button class="btn btn-ghost btn-small" type="button" data-action="close-surprise">Never mind</button>
        </div>
      </div>
    </div>`;
}

async function addSnack(day, item, el = null) {
  const me = requireMe(el); if (!me) return;
  await once('snack', async () => {
    await A.addSnack(day, me, item);
    const input = document.querySelector('#snackItem');
    if (input) input.value = '';
    toast(`Noted: ${me.name} is bringing ${item.trim()}.`);
  });
}

function downloadIcs() {
  const n = L.upcomingNights(S.nights)[0];
  const m = n?.lockedMovie;
  if (!n || !m) return;
  const runtime = L.parseRuntime(m.runtime);
  downloadFile('movie-night.ics', L.buildIcs({
    uid: `${n.day}-${S.me?.nameKey || 'guest'}`,
    title: `Movie night: ${m.title}`,
    start: n.startsAt.toDate(),
    minutes: runtime ? runtime + 30 : 150,
    description: `Weberplex: ${m.title}${m.year ? ` (${m.year})` : ''} at ${L.placeLabel(n.host)}.${n.theme ? ` Theme: ${n.theme}.` : ''} ${SITE_URL}`,
    location: L.placeLabel(n.host),
    url: SITE_URL,
  }), 'text/calendar');
}

// Keep countdowns honest and run the clock while the page is open.
setInterval(() => { render(); clock(); }, 30000);
