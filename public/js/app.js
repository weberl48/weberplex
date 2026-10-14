// The guest page: up next, the calendar, the shelf, and what we've watched.
// State comes from live Firestore subscriptions; render() repaints the
// dynamic containers. Inputs live in static markup so a live update never
// steals focus or wipes what someone is typing.
import { db, F } from './firebase.js';
import { SITE_URL } from './config.js';
import { makeActions, AlreadyOnShelfError } from './actions.js';
import { watch, watchNights, watchFree, watchDoc, loadRows } from './store.js';
import { searchMovies, movieMeta, topMovies } from './cinemeta.js';
import { browseTabs, tabsHtml, loadTab, tilesHtml } from './browse.js';
import { spinReel } from './reel.js';
import { openTour } from './tour.js';
import * as L from './logic.js';
import { $, esc, THUMB, faces, posterImg, saveLocal, loadLocal, toast, downloadFile, writeError, armed } from './ui.js';

const A = makeActions(db, F);
const S = {
  loaded: new Set(),
  nights: [], movies: [], votes: [], seen: [], free: [], people: [], season: null,
  me: loadLocal('ps.me'),            // { name, nameKey }
  since: loadLocal('ps.lastSeen'),   // "since you last looked" (ms), per phone
  news: null,
  day: null,                         // calendar day shown in detail
  hostTime: loadLocal('ps.hostTime') || '20:00',
  sort: 'wanted', filter: 'All',
  tab: 'search', tabItems: [], tabNote: '', tabLoading: false,
  openPlots: new Set(), lastVotes: new Map(),
  nightSub: new Map(),               // day -> { snacks, reviews } for nights on screen
  pastReviews: new Map(),
  stars: 0,
};
const busy = new Set();
const ready = () => ['nights', 'movies', 'votes', 'free'].every((k) => S.loaded.has(k));
const got = (key) => (rows) => { S[key] = rows; S.loaded.add(key); render(); };

// ---- subscriptions ----------------------------------------------------------
const onErr = (e) => { console.error(e); toast('Lost the connection to the box office. Reload to try again.', true); };
watchNights(db, F, (rows) => { got('nights')(rows); clock(); syncNightSubs(); }, onErr);
watch(db, F, 'movies', got('movies'), onErr);
watch(db, F, 'votes', got('votes'), onErr);
watch(db, F, 'seen', got('seen'), onErr);
watch(db, F, 'people', got('people'), () => {});
watchFree(db, F, L.dayKey(new Date(Date.now() - 86400000)), got('free'), onErr);
watchDoc(db, F, 'config/season', (d) => { S.season = d?.title || null; render(); }, () => {});

// Snacks and reviews live under each night; follow the ones on screen.
const subs = new Map();
function syncNightSubs() {
  const want = new Set(L.upcomingNights(S.nights).slice(0, 1).map((n) => n.day));
  const recent = recentDone();
  if (recent) want.add(recent.day);
  for (const [day, un] of subs) if (!want.has(day)) { un.forEach((u) => u()); subs.delete(day); S.nightSub.delete(day); }
  for (const day of want) {
    if (subs.has(day)) continue;
    S.nightSub.set(day, { snacks: [], reviews: [] });
    subs.set(day, ['snacks', 'reviews'].map((c) => watch(db, F, `nights/${day}/${c}`, (rows) => {
      S.nightSub.get(day)[c] = rows;
      render();
    }, () => {})));
  }
}
const recentDone = () => L.pastNights(S.nights).find((n) => Date.now() - n.startsAt.toMillis() < 7 * 86400000) || null;

// ---- the site's clock ---------------------------------------------------------
// Any phone that notices a night is due does the work: lock the movie a day
// before, file the night the morning after. Transactions keep two phones from
// disagreeing; the server clock (HA's poll, a daily cron) covers quiet weeks.
let lastClock = 0;
async function clock() {
  if (!ready() || Date.now() - lastClock < 60000) return;
  lastClock = Date.now();
  const watched = L.watchedIds(S.nights);
  for (const n of S.nights) {
    try {
      if (L.lockDue(n)) {
        const pick = L.pickMovie({ movies: S.movies, votes: S.votes, watched, attendees: comingTo(n.day).map((f) => f.nameKey) });
        if (pick) { await A.lockNight(n.day, pick); watched.add(pick.movie.imdbId); }
      } else if (L.doneDue(n)) {
        await A.finishNight(n.day);
      }
    } catch (e) { console.warn('clock', n.day, e); }
  }
}

// ---- derived ------------------------------------------------------------------
const comingTo = (day) => S.free.filter((f) => f.day === day).sort((a, b) => a.name.localeCompare(b.name));
const shelfNow = () => L.tallyShelf({ movies: S.movies, votes: S.votes, seen: S.seen, watched: L.watchedIds(S.nights) });
const isMine = (n) => S.me && n?.hostKey === S.me.nameKey;
const imFree = (day) => !!S.me && S.free.some((f) => f.day === day && f.nameKey === S.me.nameKey);
const showing = (n) => n.status === 'locked' && n.startsAt.toDate() <= new Date();

// What the people coming would watch, best first (thumbs from them).
function leadersFor(n, shelf) {
  const coming = new Set(comingTo(n.day).map((f) => f.nameKey));
  return shelf.movies
    .map((m) => ({ m, n: m.voters.filter((v) => coming.has(v.nameKey)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || b.m.votes - a.m.votes)
    .slice(0, 3);
}

// ---- render --------------------------------------------------------------
// Coalesce a burst of updates into one paint (a microtask, not rAF or a
// timer: both stall in hidden tabs).
let queued = false;
function render() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const shelf = shelfNow();
    const upcoming = L.upcomingNights(S.nights);
    S.news = L.sinceLastLook({ nights: S.nights, movies: S.movies, votes: S.votes, free: S.free, since: S.since, meKey: S.me?.nameKey });
    renderBoard(upcoming[0], shelf);
    renderWho();
    renderPass();
    renderNews();
    renderNext(upcoming, shelf);
    renderCalendar();
    renderShelf(shelf);
    renderWatched();
    maybeRevealTie(upcoming[0]);
  });
}

function renderBoard(n, shelf) {
  let kicker, title, sub, count = '';
  if (!ready()) {
    kicker = 'Tonight'; title = 'Weberplex'; sub = 'Warming up the projector…';
  } else if (!n) {
    kicker = S.season || 'The house is dark'; title = 'No night planned';
    sub = 'Pick an evening on the calendar and host one';
    count = `${shelf.movies.length} movies on the shelf`;
  } else if (n.status === 'planned') {
    const lead = leadersFor(n, shelf)[0];
    kicker = S.season || 'Coming up'; title = `Movie night at ${L.placeLabel(n.host)}`;
    sub = L.showtimeLong(n.startsAt);
    count = [`Movie locks in ${L.countdownText(L.lockAt(n))}`, lead && `Leading: ${lead.m.title}`].filter(Boolean).join(' · ');
  } else {
    kicker = showing(n) ? 'Now showing' : (S.season ? `${S.season} · now booking` : 'Now booking');
    title = n.lockedMovie?.title || 'Movie night';
    sub = `${L.showtimeLong(n.startsAt)} · at ${L.placeLabel(n.host)}`;
    count = showing(n) ? 'Rolling now' : `Starts in ${L.countdownText(n.startsAt)}`;
  }
  $('#board').innerHTML = `
    <p class="kicker">${esc(kicker)}</p>
    <h1>${esc(title)}</h1>
    ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    ${count ? `<span class="count">${esc(count)}</span>` : ''}`;
}

function renderWho() {
  $('#whoami').innerHTML = S.me
    ? `<span>Signed in as</span> <b>${esc(S.me.name)}</b> <button class="linkish" type="button" data-action="switch">Not you?</button>`
    : '';
}

function renderPass() {
  const need = !S.me && ready();
  $('#pass').hidden = !need;
  if (!need) return;
  const people = [...S.people].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30);
  $('#passPeople').hidden = !people.length;
  $('#passChips').innerHTML = people
    .map((x) => `<button class="chip" type="button" data-action="join" data-name="${esc(x.name)}">${esc(x.name)}</button>`).join('');
}

// ---- since you last looked ----------------------------------------------------
function renderNews() {
  const items = S.news?.items || [];
  $('#news').hidden = !items.length;
  if (!items.length) return;
  $('#newsWhen').textContent = `since ${new Date(S.since).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;
  $('#newsList').innerHTML = items.map((i) =>
    `<li><button class="linkish" type="button" data-action="goto" data-target="${esc(i.target)}">${esc(i.text)}</button></li>`).join('');
}
function markSeen() { S.since = Date.now(); saveLocal('ps.lastSeen', S.since); render(); }
// Leaving after a real look (4 s+) counts as seen; the next banner starts here.
let visibleAt = Date.now();
const leaving = () => { if (Date.now() - visibleAt >= 4000) saveLocal('ps.lastSeen', Date.now()); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving(); else visibleAt = Date.now(); });
window.addEventListener('pagehide', leaving);

// ---- up next ----------------------------------------------------------------------
const TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
const timeLabel = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
const timeOf = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const startsAtFor = (day, hhmm) => { const d = L.dayFromKey(day); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
const timeSelect = (id, value) => `<label class="sr-only" for="${id}">Start time</label><select class="field place" id="${id}">${TIMES.map((x) => `<option value="${x}"${x === value ? ' selected' : ''}>${timeLabel(x)}</option>`).join('')}</select>`;

function renderNext(upcoming, shelf) {
  const n = upcoming[0];
  $('#countdown').textContent = n ? (n.status === 'locked' ? (showing(n) ? 'Rolling now' : `T-minus ${L.countdownText(n.startsAt)}`) : `Locks in ${L.countdownText(L.lockAt(n))}`) : '';
  if (!ready()) { $('#next').innerHTML = ''; return; }
  if (!n) {
    $('#next').innerHTML = '<p class="empty">Nobody is hosting yet. Pick an evening on the calendar below and tap <b>I can host</b>.</p>';
    $('#moreNights').innerHTML = '';
    return;
  }
  const coming = comingTo(n.day);
  const going = imFree(n.day);
  const sub = S.nightSub.get(n.day) || { snacks: [], reviews: [] };
  let body;
  if (n.status === 'planned') {
    const leads = leadersFor(n, shelf);
    body = `
      <div class="host-card night-card">
        <div class="nc-head">
          <div><h3>${esc(L.showtimeLong(n.startsAt))}</h3><p class="hint">At ${esc(L.placeLabel(n.host))} · the movie locks ${esc(L.showtimeLong(L.lockAt(n)))}</p></div>
          <button class="btn ${going ? 'btn-ghost' : 'btn-bulb'} btn-small" type="button" data-action="free" data-day="${n.day}" data-keep="1">${going ? 'Can’t make it' : 'Count me in'}</button>
        </div>
        <p class="dd-line">${coming.length ? `${faces(coming, S.me?.nameKey, 8)} ${esc(coming.map((c) => c.name).join(', '))}` : 'Nobody else has said they’re in yet.'}</p>
        <div><span class="label">What the people coming want</span>
          <ol class="leaders">${leads.length ? leads.map((x) => `<li>${esc(x.m.title)} <span class="v">${x.n} 👍</span></li>`).join('') : '<li class="hint">No thumbs from them yet. The shelf’s favorite wins if it stays that way.</li>'}</ol>
        </div>
        ${isMine(n) ? `
          <div class="row host-tools"><span class="label">You’re hosting</span>
            ${timeSelect('nightTime', timeOf(n.startsAt.toDate()))}
            <button class="btn btn-ghost btn-small" type="button" data-action="night-time" data-day="${n.day}">Change time</button>
            <button class="btn btn-ghost btn-small" type="button" data-action="lock-now" data-day="${n.day}">Lock the movie now</button>
            <button class="btn btn-ghost btn-small" type="button" data-action="cancel-night" data-day="${n.day}">Cancel night</button>
          </div>` : ''}
      </div>`;
  } else {
    const m = n.lockedMovie || {};
    const meta = [m.year, m.runtime].filter(Boolean).join(' · ');
    const ticket = going && S.me ? `
      <div class="ticket">
        <div class="ticket-main">
          <p class="admit">ADMIT ONE</p>
          <h3>${esc(m.title)}</h3>
          <dl>
            <dt>When</dt><dd>${esc(L.showtimeLong(n.startsAt))}</dd>
            <dt>Where</dt><dd>${esc(L.placeLabel(n.host))}</dd>
            <dt>Guest</dt><dd>${esc(S.me.name)}</dd>
            ${meta ? `<dt>Running</dt><dd>${esc(meta)}</dd>` : ''}
          </dl>
        </div>
        <div class="ticket-stub"><span>No. ${L.ticketNumber(S.me.nameKey, n.day)}</span></div>
      </div>` : `
      <div class="host-card"><h3>${esc(m.title || 'The movie')}</h3>
        <p class="hint">${esc(L.showtimeLong(n.startsAt))} · at ${esc(L.placeLabel(n.host))}</p>
        ${showing(n) ? '' : `<div class="row"><button class="btn btn-bulb" type="button" data-action="free" data-day="${n.day}" data-keep="1">Count me in</button></div>`}
      </div>`;
    body = `
      ${ticket}
      <div class="row" style="margin-top:12px">
        ${going && !showing(n) ? '<button class="btn btn-bulb" type="button" data-action="ics">Add to calendar</button>' : ''}
        ${m.trailer ? `<a class="btn btn-ghost" href="https://www.youtube.com/watch?v=${esc(m.trailer)}" target="_blank" rel="noopener">Watch the trailer</a>` : ''}
        ${m.imdbId ? `<a class="btn btn-ghost" href="${esc(L.stremioUrl(m.imdbId))}" target="_blank" rel="noopener">Open in Stremio</a>` : ''}
        ${going && !showing(n) ? `<button class="btn btn-ghost" type="button" data-action="free" data-day="${n.day}" data-keep="1">Can't make it</button>` : ''}
      </div>
      <p class="dd-line" style="margin-top:10px">${coming.length} coming: ${faces(coming, S.me?.nameKey, 8)} ${esc(coming.map((c) => c.name).join(', '))}</p>
      ${isMine(n) ? `<div class="row host-tools"><span class="label">You’re hosting</span>
        ${showing(n) ? `<button class="btn btn-primary btn-small" type="button" data-action="finish-night" data-day="${n.day}">We watched it</button>`
          : `<button class="btn btn-ghost btn-small" type="button" data-action="unlock-night" data-day="${n.day}">Unlock and re-pick</button>`}
        <button class="btn btn-ghost btn-small" type="button" data-action="cancel-night" data-day="${n.day}">Cancel night</button></div>` : ''}
      ${showing(n) ? reviewBox(n, sub.reviews) : ''}`;
  }
  $('#next').innerHTML = body + snackBox(n, sub.snacks);
  const more = upcoming.slice(1, 5);
  $('#moreNights').innerHTML = more.length ? `
    <span class="label" style="display:block;margin-top:16px">Also planned</span>
    <ul class="date-list">${more.map((x) => `
      <li class="date-item"><span>${esc(L.showtimeLong(x.startsAt))} · at ${esc(L.placeLabel(x.host))} · ${comingTo(x.day).length} in</span>
        <button class="mini${imFree(x.day) ? ' on' : ''}" type="button" data-action="free" data-day="${x.day}" data-keep="1">${imFree(x.day) ? 'You’re in ✓' : 'Count me in'}</button></li>`).join('')}</ul>` : '';
}

function snackBox(n, snacks) {
  const sorted = [...snacks].sort((a, b) => (a.at?.toMillis?.() ?? 0) - (b.at?.toMillis?.() ?? 0));
  return `
    <div class="snack-box">
      <span class="label">Concessions</span>
      <ul class="snacks">${sorted.length ? sorted.map((s) => `
        <li class="snack"><div><b>${esc(s.item)}</b> <span>· ${esc(s.name)}</span></div>
          ${S.me && s.nameKey === S.me.nameKey ? `<button class="mini" type="button" data-action="unsnack" data-day="${n.day}" data-id="${esc(s.id)}">Remove</button>` : ''}</li>`).join('')
        : '<li class="empty">Nobody has called snacks yet.</li>'}</ul>
      <div class="chips">${['Popcorn', 'Candy', 'Drinks', 'Pizza'].map((x) => `<button class="chip" type="button" data-action="quick-snack" data-day="${n.day}" data-item="${x}">${x}</button>`).join('')}</div>
      <form class="snack-form" data-day="${n.day}">
        <label class="sr-only" for="snackItem">What you're bringing</label>
        <input class="field" id="snackItem" maxlength="40" placeholder="I'll bring…">
        <button class="btn btn-ghost" type="submit">Add</button>
      </form>
    </div>`;
}

function reviewBox(n, reviews) {
  const sorted = [...reviews].sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0));
  const sum = L.reviewSummary(sorted);
  const mine = S.me && sorted.find((r) => r.nameKey === S.me.nameKey);
  const stars = S.stars || mine?.stars || 0;
  return `
    <div class="review-form" style="margin-top:14px">
      <span class="label">How was ${esc(n.lockedMovie?.title || 'it')}? ${sum.count ? `· ★ ${sum.avg} from ${sum.count}` : ''}</span>
      ${S.me ? `<div class="stars" role="radiogroup" aria-label="Stars">${[1, 2, 3, 4, 5].map((k) => `<button class="star${k <= stars ? ' on' : ''}" type="button" data-action="star" data-star="${k}" role="radio" aria-checked="${k === stars}" aria-label="${k} star${k > 1 ? 's' : ''}">★</button>`).join('')}</div>
        <div class="row"><label class="sr-only" for="reviewLine">One-line review</label>
          <input class="field" id="reviewLine" maxlength="140" placeholder="One line for the lobby card (optional)" value="${esc(mine?.line || '')}" style="flex:1 1 14rem">
          <button class="btn btn-primary btn-small" type="button" data-action="review" data-day="${n.day}">Post</button></div>` : ''}
      <div class="reviews">${sorted.map((r) => `<div class="review"><div class="who"><span>${esc(r.name)}</span><span class="s">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></div>${r.line ? `<p>${esc(r.line)}</p>` : ''}</div>`).join('')}</div>
    </div>`;
}

// The reel settled a tie: play it once per phone so everyone sees how.
function maybeRevealTie(n) {
  if (n?.status !== 'locked' || !(n.lockedTie?.length > 1)) return;
  const key = `ps.reel.${n.day}.${n.lockedMovieId}`;
  if (loadLocal(key) || document.querySelector('.tour-overlay')) return;
  const pool = n.lockedTie.map((id) => S.movies.find((m) => m.imdbId === id)).filter(Boolean);
  const winner = pool.find((m) => m.imdbId === n.lockedMovieId);
  if (pool.length < 2 || !winner) return;
  saveLocal(key, true);
  spinReel(pool, winner, { title: `${pool.length}-way tie. The reel decides…`, done: 'Nice' });
}

// ---- the calendar --------------------------------------------------------------
function renderCalendar() {
  const days = L.tallyDays(L.calendarDays(), { free: S.free, nights: S.nights });
  if (!S.day || !days.some((d) => d.day === S.day)) S.day = days.find((d) => d.night)?.day || days[0].day;
  const lead = L.dayFromKey(days[0].day).getDay();
  $('#calendar').innerHTML = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span class="cal-head" aria-hidden="true">${x}</span>`).join('')
    + '<span class="cal-blank"></span>'.repeat(lead)
    + days.map((d, i) => {
      const date = L.dayFromKey(d.day);
      const mine = imFree(d.day);
      const first = i === 0 || date.getDate() === 1;
      const label = `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${d.count} free${d.night ? `, ${d.night.host} hosting` : ''}`;
      return `
        <button class="day${mine ? ' on' : ''}${d.day === S.day ? ' sel' : ''}${d.night ? ' lead' : ''}${S.news?.days.has(d.day) ? ' fresh' : ''}"
          type="button" data-action="free" data-day="${d.day}" aria-pressed="${mine}" aria-label="${esc(label)}">
          <span class="d-dow">${first ? esc(date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()) : '&nbsp;'}</span>
          <span class="d-num">${date.getDate()}</span>
          <span class="d-meta">${d.count || ''}${d.night ? '<span class="d-host" title="Movie night">⌂</span>' : ''}</span>
        </button>`;
    }).join('');
  const d = days.find((x) => x.day === S.day);
  const date = L.dayFromKey(d.day);
  const mine = imFree(d.day);
  $('#dayDetail').innerHTML = `
    <div class="dd-head">
      <h3>${esc(date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}</h3>
      <button class="mini${mine ? ' on' : ''}" type="button" data-action="free" data-day="${d.day}" data-keep="1" aria-pressed="${mine}">${mine ? 'You’re free ✓' : 'I’m free'}</button>
    </div>
    <p class="dd-line">${d.count ? `${faces(d.free, S.me?.nameKey, 8)} ${esc(d.free.map((f) => f.name).join(', '))}` : 'Nobody has marked this evening yet.'}</p>
    ${d.night
      ? `<p class="dd-line"><b>${esc(d.night.host)}</b> is hosting at ${esc(L.showtimeParts(d.night.startsAt).time)}${d.night.status === 'locked' ? ` · showing ${esc(d.night.lockedMovie?.title || '')}` : ''}</p>`
      : `<div class="row dd-host">${timeSelect('hostTime', S.hostTime)}
          <button class="btn btn-bulb btn-small" type="button" data-action="host" data-day="${d.day}">I can host</button>
          <span class="hint">Hosting puts a movie night on this day; you're marked free.</span></div>`}`;
}

// ---- the shelf ------------------------------------------------------------------
const SORTS = [['wanted', 'Most wanted'], ['new', 'Newest'], ['unseen', 'Fewest have seen'], ['short', 'Shortest']];
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
  $('#browseTabs').innerHTML = tabsHtml(browseTabs(genre), S.tab);
  const searching = S.tab === 'search';
  $('#searchRow').hidden = !searching;
  $('#results').hidden = !searching || !$('#results').innerHTML;
  $('#browseNote').hidden = searching || !(S.tabLoading || S.tabNote);
  $('#browseNote').textContent = S.tabLoading ? 'Loading…' : S.tabNote;
  const taken = new Set(S.movies.map((m) => m.imdbId));
  $('#browseGrid').hidden = searching || S.tabLoading || !S.tabItems.length;
  if (!searching) $('#browseGrid').innerHTML = tilesHtml(S.tabItems, { taken });

  $('#sortChips').innerHTML = SORTS.map(([k, label]) => `<button class="chip${S.sort === k ? ' on' : ''}" type="button" data-action="sort" data-sort="${k}" aria-pressed="${S.sort === k}">${label}</button>`).join('');
  const filters = ['All', ...(S.me ? ['Unseen by me', 'Added by me'] : []), ...L.shelfTags(shelf.movies)];
  if (!filters.includes(S.filter)) S.filter = 'All';
  $('#shelfChips').innerHTML = filters.map((f) => `<button class="chip${S.filter === f ? ' on' : ''}" type="button" data-action="filter" data-tag="${esc(f)}" aria-pressed="${S.filter === f}">${esc(f)}</button>`).join('');

  const list = sorted(shelf.movies).filter(matches);
  if (!ready()) { $('#shelf').innerHTML = ''; return; }
  if (!list.length) {
    $('#shelf').innerHTML = `<p class="empty">${shelf.movies.length ? 'Nothing matches that filter.' : 'The shelf is empty. Add the first movie.'}</p>`;
    return;
  }
  const leadIds = new Set(shelf.leaders.map((m) => m.imdbId));
  $('#shelf').innerHTML = list.map((m) => {
    const mine = S.me && m.by === S.me.nameKey;
    const voted = S.me && m.voters.some((v) => v.nameKey === S.me.nameKey);
    const iSaw = S.me && m.seenBy.some((v) => v.nameKey === S.me.nameKey);
    const prev = S.lastVotes.get(m.imdbId);
    const bump = prev != null && m.votes > prev;
    S.lastVotes.set(m.imdbId, m.votes);
    const fresh = S.news?.movies.has(m.imdbId);
    const newVotes = S.news?.votes.get(m.imdbId) || 0;
    const meta = [m.year, m.runtime, m.rating && `★ ${m.rating}`].filter(Boolean).join(' · ');
    return `
      <article class="card${leadIds.has(m.imdbId) ? ' lead' : ''}">
        <div class="poster">${posterImg(m.poster, m.title)}
          ${fresh ? '<span class="new-chip">New</span>' : ''}
          ${leadIds.has(m.imdbId) ? '<span class="ribbon">Most wanted</span>' : ''}</div>
        <div class="card-body">
          <h3>${esc(m.title)}</h3>
          ${meta ? `<p class="meta">${esc(meta)}</p>` : ''}
          ${m.shelf?.length ? `<div class="tags">${m.shelf.map((x) => `<span class="tag-chip" data-tag="${esc(x)}">${esc(x)}</span>`).join('')}</div>` : ''}
          ${m.pitch ? `<p class="pitch">“${esc(m.pitch)}”</p>` : ''}
          <p class="by">${L.isHouse(m) ? 'House pick' : `Added by ${mine ? 'you' : esc(m.byName)}`}</p>
          <div class="card-actions">
            <button class="vote${voted ? ' on' : ''}${bump ? ' bump' : ''}" type="button" data-action="vote" data-id="${esc(m.imdbId)}"
              aria-pressed="${!!voted}" aria-label="I'd watch ${esc(m.title)} (${m.votes})">${THUMB}<span class="n">${m.votes}</span>${newVotes ? `<span class="vote-new">+${newVotes}</span>` : ''}</button>
            <button class="mini${iSaw ? ' on' : ''}" type="button" data-action="seen" data-id="${esc(m.imdbId)}" aria-pressed="${!!iSaw}">${iSaw ? 'Seen ✓' : 'Seen it'}</button>
            ${m.trailer ? `<a class="mini" href="https://www.youtube.com/watch?v=${esc(m.trailer)}" target="_blank" rel="noopener">Trailer</a>` : ''}
            <a class="mini" href="${esc(L.stremioUrl(m.imdbId))}" target="_blank" rel="noopener" aria-label="Open ${esc(m.title)} in Stremio">Stremio</a>
            ${m.description ? `<button class="mini" type="button" data-action="plot" data-id="${esc(m.imdbId)}" aria-expanded="${S.openPlots.has(m.imdbId)}">Plot</button>` : ''}
            ${mine ? `<button class="mini" type="button" data-action="remove-movie" data-id="${esc(m.imdbId)}">Remove</button>` : ''}
          </div>
          <p class="plot"${S.openPlots.has(m.imdbId) ? '' : ' hidden'}>${esc(m.description)}</p>
          <p class="seen-line">${m.seenBy.length ? `Seen by ${esc(m.seenBy.map((x) => x.name).join(', '))}` : 'Nobody has marked it seen'}</p>
          <div class="voters">${faces(m.voters, S.me?.nameKey, 6)}</div>
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
  if (!past.length) return;
  for (const n of past.slice(0, 12)) {
    if (S.pastReviews.has(n.day)) continue;
    S.pastReviews.set(n.day, []);
    loadRows(db, F, `nights/${n.day}/reviews`).then((r) => { S.pastReviews.set(n.day, r); render(); }).catch(() => {});
  }
  const minutes = past.reduce((s, n) => s + (L.parseRuntime(n.lockedMovie?.runtime) || 0), 0);
  $('#statsLine').textContent = `${past.length} night${past.length === 1 ? '' : 's'} · ${Math.round(minutes / 60)} hours of movies`;
  const hosts = L.hostCounts(S.nights);
  $('#hostsLine').textContent = hosts.length ? `Hosted so far: ${hosts.map(([h, c]) => `${h} ${c}`).join(' · ')}` : '';
  const recent = recentDone();
  $('#rateBox').innerHTML = recent ? reviewBox(recent, S.nightSub.get(recent.day)?.reviews || []) : '';
  $('#past').innerHTML = past.slice(0, 12).map((n) => {
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

// ---- actions -------------------------------------------------------------
function requireMe() {
  if (S.me) return S.me;
  const pass = $('#pass');
  pass.hidden = false;
  pass.classList.remove('flash');
  void pass.offsetWidth;
  pass.classList.add('flash');
  pass.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#passName').focus({ preventScroll: true });
  toast('Add your name first so it counts.');
  return null;
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
    $('#passName').value = '';
    toast(`Welcome, ${who.name}.`);
    render();
  } catch (e) {
    $('#passMsg').textContent = writeError(e);
    $('#passMsg').className = 'msg bad';
    $('#passMsg').hidden = false;
  }
}
function startTour() {
  openTour({ onDone: () => { saveLocal('ps.toured', true); if (!S.me && !$('#pass').hidden) $('#passName').focus(); } });
}
if (!loadLocal('ps.toured')) startTour();

$('#passForm').addEventListener('submit', (e) => { e.preventDefault(); join($('#passName').value); });
document.addEventListener('change', (e) => {
  if (e.target.id === 'hostTime') { S.hostTime = e.target.value; saveLocal('ps.hostTime', S.hostTime); }
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('.snack-form');
  if (!form) return;
  e.preventDefault();
  const v = form.querySelector('input').value;
  if (v.trim()) addSnack(form.dataset.day, v);
});

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
    case 'switch': S.me = null; saveLocal('ps.me', null); render(); $('#passName').focus(); break;
    case 'tour': startTour(); break;
    case 'news-seen': markSeen(); break;
    case 'goto': $(el.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'free': {
      if (!el.dataset.keep) S.day = day;
      const me = requireMe(); if (!me) { render(); return; }
      const was = imFree(day);
      once(`free:${day}`, () => A.setFree(day, me, !was));
      render();
      break;
    }
    case 'host': {
      const me = requireMe(); if (!me) return;
      const startsAt = startsAtFor(day, S.hostTime);
      once(`host:${day}`, async () => {
        await A.hostNight(me, day, startsAt);
        toast(`You're hosting ${L.showtimeLong(startsAt)}. The movie locks a day before.`);
      });
      break;
    }
    case 'night-time': once(`time:${day}`, async () => { const t = startsAtFor(day, $('#nightTime').value); await A.setNightTime(day, t); toast(`Moved to ${L.showtimeLong(t)}.`); }); break;
    case 'lock-now': {
      if (!armed(el, 'Tap again to lock')) return;
      const n = S.nights.find((x) => x.day === day);
      const pick = L.pickMovie({ movies: S.movies, votes: S.votes, watched: L.watchedIds(S.nights), attendees: comingTo(day).map((f) => f.nameKey) });
      if (!pick) { toast('The shelf is empty. Add a movie first.', true); return; }
      once(`lock:${day}`, async () => { await A.lockNight(n.day, pick); toast(`Locked: ${pick.movie.title}.`); });
      break;
    }
    case 'unlock-night': if (armed(el)) once(`unlock:${day}`, () => A.unlockNight(day)); break;
    case 'finish-night': if (armed(el)) once(`finish:${day}`, async () => { await A.finishNight(day); toast('Filed under Watched. Rate it below.'); }); break;
    case 'cancel-night': if (armed(el)) once(`cancel:${day}`, async () => { await A.cancelNight(day); toast('Night cancelled. Someone else can host that day.'); }); break;
    case 'seen': {
      const me = requireMe(); const m = movie(); if (!me || !m) return;
      once(`seen:${id}`, () => A.setSeen(m, me, !m.seenBy.some((x) => x.nameKey === me.nameKey)));
      break;
    }
    case 'vote': {
      const me = requireMe(); const m = movie(); if (!me || !m) return;
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
    case 'plot': if (S.openPlots.has(id)) S.openPlots.delete(id); else S.openPlots.add(id); render(); break;
    case 'pick': pick(id); break;
    case 'surprise': surprise(); break;
    case 'close-surprise': $('#surprise').innerHTML = ''; break;
    case 'quick-snack': addSnack(day, el.dataset.item); break;
    case 'unsnack': once(`unsnack:${id}`, () => A.removeSnack(day, id)); break;
    case 'star': S.stars = Number(el.dataset.star); render(); break;
    case 'review': {
      const me = requireMe(); if (!me) return;
      if (!S.stars) { toast('Tap the stars first.'); return; }
      once('review', async () => { await A.review(day, me, S.stars, $('#reviewLine')?.value || ''); toast('Review posted to the lobby.'); });
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
  if (e.key === 'Escape') { $('#q').value = ''; $('#results').hidden = true; }
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
    $('#results').dataset.q = q;
    $('#results').innerHTML = lastResults.length
      ? lastResults.map((m) => {
        const mid = m.imdb_id || m.id;
        const taken = pool.has(mid);
        return `<button class="result${taken ? ' taken' : ''}" type="button" data-action="pick" data-id="${esc(mid)}">
            ${posterImg(m.poster, '')}
            <span><span class="t">${esc(m.name)}</span><br><span class="y">${esc(m.releaseInfo || m.year || '')}</span></span>
            <span class="add">${taken ? 'On the shelf' : 'Add'}</span></button>`;
      }).join('')
      : `<p class="empty">Nothing called “${esc(q)}”. Try fewer words.</p>`;
  } catch (e) {
    if (e.name === 'AbortError') return;
    $('#results').innerHTML = `<p class="empty">${esc(e.message)}</p>`;
  }
}
function setPickMsg(text, kind = '') { $('#pickMsg').textContent = text; $('#pickMsg').className = `msg${kind ? ` ${kind}` : ''}`; }

async function pick(imdbId) {
  const me = requireMe(); if (!me) return;
  const existing = S.movies.find((m) => m.imdbId === imdbId);
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

async function addSnack(day, item) {
  const me = requireMe(); if (!me) return;
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
    description: `Weberplex: ${m.title}${m.year ? ` (${m.year})` : ''} at ${L.placeLabel(n.host)}. ${SITE_URL}`,
    location: L.placeLabel(n.host),
    url: SITE_URL,
  }), 'text/calendar');
}

// Keep countdowns honest and run the clock while the page is open.
setInterval(() => { render(); clock(); }, 30000);
