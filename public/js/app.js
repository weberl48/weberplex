// The guest page. State comes from live Firestore subscriptions; render()
// repaints the dynamic containers. Inputs live in static markup so a live
// update never steals focus or wipes what someone is typing.
import { db, F } from './firebase.js';
import { SITE_URL } from './config.js';
import { makeActions, AlreadyPickedError, PicksFullError } from './actions.js';
import { watchNights, watchNight, watchPeople, loadReviews } from './store.js';
import { searchMovies, movieMeta, topMovies } from './cinemeta.js';
import * as L from './logic.js';
import { $, esc, THUMB, faces, posterImg, saveLocal, loadLocal, toast, downloadFile, writeError } from './ui.js';

const A = makeActions(db, F);
const S = {
  loaded: false,
  nights: [],
  current: null,
  sub: null,            // the current night's subcollections
  people: [],
  me: loadLocal('ps.me'), // { name, nameKey }
  pastReviews: new Map(),
  openPlots: new Set(),
  lastVotes: new Map(),
  stars: 0,
};
let unNight = null;
const busy = new Set();

// ---- subscriptions ----------------------------------------------------------
watchNights(db, F, (nights) => {
  S.loaded = true;
  S.nights = nights;
  const current = nights.find((n) => n.status === 'open' || n.status === 'locked') || null;
  if (current?.id !== S.current?.id) {
    unNight?.();
    unNight = null;
    S.sub = null;
    if (current) unNight = watchNight(db, F, current.id, (sub) => { S.sub = sub; render(); }, onSubError);
  }
  S.current = current;
  loadPastReviews();
  render();
}, onSubError);
watchPeople(db, F, (people) => { S.people = people; renderPass(); }, () => {});

function onSubError(e) {
  console.error(e);
  toast('Lost the connection to the box office. Reload to try again.', true);
}

async function loadPastReviews() {
  for (const n of pastNights()) {
    if (S.pastReviews.has(n.id)) continue;
    S.pastReviews.set(n.id, []);
    try { S.pastReviews.set(n.id, await loadReviews(db, F, n.id)); renderPast(); } catch { /* shown without stars */ }
  }
}

const pastNights = () => S.nights.filter((n) => n.status === 'done' && n.lockedMovie).slice(0, 6);
const t = () => L.tally(S.sub || {});
const phase = () => {
  if (!S.loaded) return 'loading';
  if (!S.current) return 'dark';
  if (S.current.status === 'open') return 'open';
  return S.current.lockedStartsAt && S.current.lockedStartsAt.toDate() <= new Date() ? 'showing' : 'booked';
};

// ---- render --------------------------------------------------------------
// Coalesce a burst of updates into one paint. A microtask, not rAF or a
// timer: both stall in hidden tabs, and a phone coming back should be current.
let queued = false;
function render() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const p = phase();
    const tal = t();
    renderBoard(p, tal);
    renderWho();
    renderPass();
    show('#showSec', p === 'open');
    show('#picksSec', p === 'open');
    show('#ballotSec', p === 'open');
    show('#ticketSec', p === 'booked' || p === 'showing');
    show('#lineupSec', p === 'booked' || p === 'showing');
    show('#finalSec', p === 'booked' || p === 'showing');
    show('#reviewSec', p === 'showing');
    show('#snackSec', p === 'open' || p === 'booked' || p === 'showing');
    if (p === 'open') { renderShowtimes(tal); renderPicks(); renderBallot(tal); }
    if (p === 'booked' || p === 'showing') { renderTicket(tal); renderLineup(tal); renderFinal(tal); }
    if (p === 'showing') renderReviews();
    if (p !== 'dark' && p !== 'loading') renderSnacks();
    renderPast();
  });
}
const show = (sel, on) => { $(sel).hidden = !on; };

function renderBoard(p, tal) {
  const n = S.current;
  let kicker, title, sub, count = '';
  if (p === 'loading') {
    kicker = 'Tonight'; title = 'Speakeasy Picture Show'; sub = 'Warming up the projector…';
  } else if (p === 'dark') {
    const last = pastNights()[0];
    kicker = 'The house is dark'; title = 'No show booked';
    sub = last ? `Last up: ${last.lockedMovie.title}` : 'Check back soon';
  } else if (p === 'open') {
    kicker = 'Coming soon'; title = n.title || 'Movie night';
    sub = 'Pick your nights · Pick your pictures';
    const leader = tal.leaders[0];
    count = leader
      ? (tal.tie ? `${tal.leaders.length}-way tie at ${leader.votes}` : `Leading: ${leader.title} (${leader.votes})`)
      : `${tal.movies.length} picture${tal.movies.length === 1 ? '' : 's'} on the ballot`;
  } else {
    kicker = p === 'showing' ? 'Now showing' : (n.title ? `${n.title} · now booking` : 'Now booking');
    title = n.lockedMovie?.title || 'Movie night';
    sub = n.lockedStartsAt ? L.showtimeLong(n.lockedStartsAt) : '';
    count = p === 'showing' ? 'Rolling now' : `Starts in ${L.countdownText(n.lockedStartsAt)}`;
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
  const p = phase();
  const need = !S.me && (p === 'open' || p === 'booked' || p === 'showing');
  $('#pass').hidden = !need;
  if (!need) return;
  const people = [...S.people].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30);
  $('#passPeople').hidden = !people.length;
  $('#passChips').innerHTML = people
    .map((x) => `<button class="chip" type="button" data-action="join" data-name="${esc(x.name)}">${esc(x.name)}</button>`).join('');
}

function renderShowtimes(tal) {
  if (!tal.dates.length) {
    $('#showtimes').innerHTML = '<p class="empty">The host hasn’t added any nights yet.</p>';
    return;
  }
  $('#showtimes').innerHTML = tal.dates.map((d) => {
    const on = !!S.me && d.going.some((g) => g.nameKey === S.me.nameKey);
    const best = tal.dates.length > 1 && tal.bestDates.includes(d.id);
    const st = L.showtimeParts(d.startsAt);
    return `
      <button class="showtime${on ? ' on' : ''}" type="button" data-action="rsvp" data-id="${esc(d.id)}" aria-pressed="${on}"
        aria-label="${esc(L.showtimeLong(d.startsAt))}: ${d.count} going${best ? ', most people' : ''}">
        <span class="st-cal" aria-hidden="true"><span class="dow">${esc(st.dow)}</span><span class="day">${esc(st.day)}</span><span class="mon">${esc(st.mon)}</span></span>
        <span class="st-main">
          <span class="st-time">${esc(st.time)} ${best ? '<span class="st-flag">Most people</span>' : ''}</span>
          <span class="st-going">${faces(d.going, S.me?.nameKey)} ${d.count ? `${d.count} in` : 'Nobody yet'}</span>
        </span>
        <span class="st-check">${on ? 'I’m in' : 'Count me in'}</span>
      </button>`;
  }).join('');
}

const myMovies = () => (S.me ? (S.sub?.movies || []).filter((m) => m.by === S.me.nameKey).sort((a, b) => a.slot - b.slot) : []);

function renderPicks() {
  const mine = myMovies();
  const bySlot = new Map(mine.map((m) => [m.slot, m]));
  $('#picksLeft').textContent = S.me ? `${L.MAX_PICKS - mine.length} of ${L.MAX_PICKS} left` : `${L.MAX_PICKS} picks each`;
  $('#strip').innerHTML = Array.from({ length: L.MAX_PICKS }, (_, i) => {
    const m = bySlot.get(i + 1);
    return m
      ? `<div class="frame">${posterImg(m.poster, m.title)}<button class="x" type="button" data-action="unpick" data-id="${esc(m.imdbId)}" aria-label="Remove ${esc(m.title)}">×</button></div>`
      : `<div class="frame" aria-hidden="true">${i + 1}</div>`;
  }).join('');
}

function renderBallot(tal) {
  if (!tal.movies.length) {
    $('#ballot').innerHTML = '<p class="empty">No pictures yet. Search above and put the first one up.</p>';
    return;
  }
  const leadIds = new Set(tal.leaders.map((m) => m.imdbId));
  $('#ballot').innerHTML = tal.movies.map((m, i) => {
    const mine = S.me && m.by === S.me.nameKey;
    const voted = S.me && m.voters.some((v) => v.nameKey === S.me.nameKey);
    const lead = leadIds.has(m.imdbId);
    const prev = S.lastVotes.get(m.imdbId);
    const bump = prev != null && m.votes > prev;
    S.lastVotes.set(m.imdbId, m.votes);
    const meta = [m.year, m.runtime, m.rating && `★ ${m.rating}`].filter(Boolean).join(' · ');
    return `
      <article class="card${lead ? ' lead' : ''}">
        <div class="poster">${posterImg(m.poster, m.title)}<span class="rank">#${i + 1}</span>
          ${lead ? `<span class="ribbon">${tal.tie ? 'Tied for first' : 'Front-runner'}</span>` : ''}</div>
        <div class="card-body">
          <h3>${esc(m.title)}</h3>
          ${meta ? `<p class="meta">${esc(meta)}</p>` : ''}
          <p class="by">Picked by ${mine ? 'you' : esc(m.byName)}</p>
          <div class="card-actions">
            <button class="vote${voted ? ' on' : ''}${bump ? ' bump' : ''}" type="button" data-action="vote" data-id="${esc(m.imdbId)}"
              aria-pressed="${!!voted}" aria-label="I'd watch ${esc(m.title)} (${m.votes} vote${m.votes === 1 ? '' : 's'})">${THUMB}<span class="n">${m.votes}</span></button>
            ${m.trailer ? `<a class="mini" href="https://www.youtube.com/watch?v=${esc(m.trailer)}" target="_blank" rel="noopener">Trailer</a>` : ''}
            ${m.description ? `<button class="mini" type="button" data-action="plot" data-id="${esc(m.imdbId)}" aria-expanded="${S.openPlots.has(m.imdbId)}">Plot</button>` : ''}
            ${mine ? `<button class="mini" type="button" data-action="unpick" data-id="${esc(m.imdbId)}">Remove</button>` : ''}
          </div>
          <p class="plot"${S.openPlots.has(m.imdbId) ? '' : ' hidden'}>${esc(m.description)}</p>
          <div class="voters">${faces(m.voters, S.me?.nameKey, 6)}</div>
        </div>
      </article>`;
  }).join('');
}

function lockedDate(tal) { return tal.dates.find((d) => d.id === S.current.lockedDateId); }

function renderTicket(tal) {
  const n = S.current;
  const m = n.lockedMovie || {};
  const date = lockedDate(tal);
  const going = !!S.me && !!date?.going.some((g) => g.nameKey === S.me.nameKey);
  const rolling = phase() === 'showing';
  $('#countdown').textContent = rolling ? 'Rolling now' : `T-minus ${L.countdownText(n.lockedStartsAt)}`;
  if (!S.me) {
    $('#ticket').innerHTML = '<p class="empty">Put your name on the guest list above to get your ticket.</p>';
    return;
  }
  if (!going) {
    $('#ticket').innerHTML = `
      <div class="host-card">
        <h3>You're not on the list for this one yet</h3>
        <p class="hint">${esc(m.title || 'The movie')} · ${esc(L.showtimeLong(n.lockedStartsAt))}</p>
        <div class="row"><button class="btn btn-bulb" type="button" data-action="rsvp" data-id="${esc(n.lockedDateId)}">Count me in</button></div>
      </div>`;
    return;
  }
  const meta = [m.year, m.runtime].filter(Boolean).join(' · ');
  $('#ticket').innerHTML = `
    <div class="ticket">
      <div class="ticket-main">
        <p class="admit">ADMIT ONE</p>
        <h3>${esc(m.title)}</h3>
        <dl>
          <dt>When</dt><dd>${esc(L.showtimeLong(n.lockedStartsAt))}</dd>
          <dt>Guest</dt><dd>${esc(S.me.name)}</dd>
          ${meta ? `<dt>Running</dt><dd>${esc(meta)}</dd>` : ''}
          <dt>Seat</dt><dd>First come, first served</dd>
        </dl>
      </div>
      <div class="ticket-stub"><span>No. ${L.ticketNumber(S.me.nameKey, n.id)}</span></div>
    </div>
    <div class="row" style="margin-top:12px">
      ${rolling ? '' : '<button class="btn btn-bulb" type="button" data-action="ics">Add to calendar</button>'}
      ${m.trailer ? `<a class="btn btn-ghost" href="https://www.youtube.com/watch?v=${esc(m.trailer)}" target="_blank" rel="noopener">Watch the trailer</a>` : ''}
      ${rolling ? '' : `<button class="btn btn-ghost" type="button" data-action="rsvp" data-id="${esc(n.lockedDateId)}">Can't make it</button>`}
    </div>`;
}

function renderLineup(tal) {
  const going = lockedDate(tal)?.going || [];
  $('#lineupCount').textContent = going.length ? `${going.length} in` : '';
  $('#lineup').innerHTML = going.length
    ? going.map((g) => `<span class="guest">${faces([g], S.me?.nameKey)}${esc(g.name)}</span>`).join('')
    : '<p class="empty">Nobody has claimed a seat yet.</p>';
}

function renderFinal(tal) {
  $('#finalList').innerHTML = tal.movies.length
    ? tal.movies.map((m, i) => `
        <div class="result-line${m.imdbId === S.current.lockedMovieId ? ' win' : ''}">
          <span class="n">#${i + 1}</span><span>${esc(m.title)}${m.imdbId === S.current.lockedMovieId ? ' · <b>showing</b>' : ''}</span>
          <span class="v">${m.votes}</span>
        </div>`).join('')
    : '<p class="empty">The host picked this one straight off the shelf.</p>';
}

function renderReviews() {
  const reviews = [...(S.sub?.reviews || [])].sort((a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0));
  const sum = L.reviewSummary(reviews);
  $('#reviewAvg').textContent = sum.count ? `★ ${sum.avg} from ${sum.count}` : '';
  $('#reviewForm').hidden = !S.me;
  const mine = S.me && reviews.find((r) => r.nameKey === S.me.nameKey);
  if (mine && !S.stars) { S.stars = mine.stars; if (!$('#reviewLine').value) $('#reviewLine').value = mine.line || ''; }
  paintStars();
  $('#reviews').innerHTML = reviews.length
    ? reviews.map((r) => `
        <div class="review">
          <div class="who"><span>${esc(r.name)}</span><span class="s" aria-label="${r.stars} stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></div>
          ${r.line ? `<p>${esc(r.line)}</p>` : ''}
        </div>`).join('')
    : '<p class="empty">No reviews yet. How was it?</p>';
}
function paintStars() {
  document.querySelectorAll('#stars .star').forEach((b) => {
    const n = Number(b.dataset.star);
    b.classList.toggle('on', n <= S.stars);
    b.setAttribute('aria-checked', String(n === S.stars));
  });
}

function renderSnacks() {
  const snacks = [...(S.sub?.snacks || [])].sort((a, b) => (a.at?.toMillis?.() ?? 0) - (b.at?.toMillis?.() ?? 0));
  $('#snacks').innerHTML = snacks.length
    ? snacks.map((s) => `
        <li class="snack">
          <div><b>${esc(s.item)}</b> <span>· ${esc(s.name)}</span></div>
          ${S.me && s.nameKey === S.me.nameKey ? `<button class="mini" type="button" data-action="unsnack" data-id="${esc(s.id)}" aria-label="Remove ${esc(s.item)}">Remove</button>` : ''}
        </li>`).join('')
    : '<li class="empty">Nobody has called snacks yet.</li>';
}

function renderPast() {
  const past = pastNights();
  $('#pastSec').hidden = !past.length;
  $('#past').innerHTML = past.map((n) => {
    const r = L.reviewSummary(S.pastReviews.get(n.id) || []);
    const when = n.lockedStartsAt ? n.lockedStartsAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return `
      <div class="past-row">
        ${posterImg(n.lockedMovie.poster, n.lockedMovie.title)}
        <div><div class="t">${esc(n.lockedMovie.title)}</div><div class="d">${esc([when, n.title].filter(Boolean).join(' · '))}</div></div>
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
  toast('Add your name first so your picks count.');
  return null;
}

async function once(key, fn) {
  if (busy.has(key)) return;
  busy.add(key);
  try { await fn(); } catch (e) { console.error(e); toast(writeError(e), true); } finally { busy.delete(key); }
}

async function join(name) {
  $('#passMsg').textContent = '';
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

$('#passForm').addEventListener('submit', (e) => { e.preventDefault(); join($('#passName').value); });

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const id = el.dataset.id;
  const night = S.current;
  switch (el.dataset.action) {
    case 'join': join(el.dataset.name); break;
    case 'switch':
      S.me = null; saveLocal('ps.me', null); S.stars = 0; render();
      $('#passName').focus();
      break;
    case 'rsvp': {
      const me = requireMe(); if (!me || !night) return;
      const date = t().dates.find((d) => d.id === id);
      const going = !!date?.going.some((g) => g.nameKey === me.nameKey);
      once(`rsvp:${id}`, async () => {
        await A.setRsvp(night.id, id, me, !going);
        if (night.status === 'locked') toast(going ? 'Seat released. Maybe next time.' : 'You’re on the list. Ticket’s below.');
      });
      break;
    }
    case 'vote': {
      const me = requireMe(); if (!me || !night) return;
      const m = t().movies.find((x) => x.imdbId === id);
      const on = !m?.voters.some((v) => v.nameKey === me.nameKey);
      once(`vote:${id}`, () => A.setVote(night.id, id, me, on));
      break;
    }
    case 'plot':
      if (S.openPlots.has(id)) S.openPlots.delete(id); else S.openPlots.add(id);
      render();
      break;
    case 'unpick': {
      const me = requireMe(); if (!me || !night) return;
      const m = t().movies.find((x) => x.imdbId === id);
      if (!m) return;
      once(`unpick:${id}`, async () => {
        await A.unsuggest(night.id, m, m.voters.map((v) => v.nameKey));
        setPickMsg('');
        toast(`Pulled ${m.title}. That pick is free again.`);
      });
      break;
    }
    case 'pick': pick(id); break;
    case 'surprise': surprise(); break;
    case 'close-surprise': $('#surprise').innerHTML = ''; break;
    case 'quick-snack': addSnack(el.dataset.item); break;
    case 'unsnack': if (night) once(`unsnack:${id}`, () => A.removeSnack(night.id, id)); break;
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
  if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(searchTimer);
    const q = $('#q').value.trim();
    if (q.length >= 2) runSearch(q);
  }
});

async function runSearch(q) {
  searchAbort?.abort();
  searchAbort = new AbortController();
  $('#results').hidden = false;
  $('#results').dataset.q = '';
  $('#results').innerHTML = '<p class="empty">Searching…</p>';
  try {
    lastResults = await searchMovies(q, searchAbort.signal);
    const pool = new Set((S.sub?.movies || []).map((m) => m.imdbId));
    $('#results').dataset.q = q;
    $('#results').innerHTML = lastResults.length
      ? lastResults.map((m) => {
        const id = m.imdb_id || m.id;
        const taken = pool.has(id);
        return `
          <button class="result${taken ? ' taken' : ''}" type="button" data-action="pick" data-id="${esc(id)}">
            ${posterImg(m.poster, '')}
            <span><span class="t">${esc(m.name)}</span><br><span class="y">${esc(m.releaseInfo || m.year || '')}</span></span>
            <span class="add">${taken ? 'On the ballot' : 'Add'}</span>
          </button>`;
      }).join('')
      : `<p class="empty">Nothing called “${esc(q)}”. Try fewer words.</p>`;
  } catch (e) {
    if (e.name === 'AbortError') return;
    $('#results').hidden = false;
    $('#results').innerHTML = `<p class="empty">${esc(e.message)}</p>`;
  }
}

function setPickMsg(text, kind = '') {
  $('#pickMsg').textContent = text;
  $('#pickMsg').className = `msg${kind ? ` ${kind}` : ''}`;
}

async function pick(imdbId) {
  const me = requireMe();
  const night = S.current;
  if (!me || !night) return;
  const existing = (S.sub?.movies || []).find((m) => m.imdbId === imdbId);
  if (existing) { setPickMsg(new AlreadyPickedError(existing).message, 'bad'); return; }
  if (myMovies().length >= L.MAX_PICKS) { setPickMsg(new PicksFullError().message, 'bad'); return; }
  await once(`pick:${imdbId}`, async () => {
    setPickMsg('Adding…');
    const fromList = lastResults.find((m) => (m.imdb_id || m.id) === imdbId) || surpriseItem;
    const meta = (await movieMeta(imdbId).catch(() => null)) || fromList || { id: imdbId, name: imdbId };
    const movie = L.movieFromMeta({ ...meta, poster: meta.poster || fromList?.poster });
    // Count before the write: the local snapshot updates as soon as it lands.
    const left = L.MAX_PICKS - myMovies().length - 1;
    try {
      await A.suggest(night.id, me, movie, S.sub?.movies || []);
    } catch (e) {
      setPickMsg(e instanceof AlreadyPickedError || e instanceof PicksFullError ? e.message : writeError(e), 'bad');
      return;
    }
    setPickMsg(`Added ${movie.title}. ${left <= 0 ? 'That’s all five.' : `${left} pick${left === 1 ? '' : 's'} left.`}`, 'good');
    $('#q').value = '';
    $('#results').hidden = true;
    $('#surprise').innerHTML = '';
  });
}

let surpriseItem = null;
async function surprise() {
  setPickMsg('Rummaging through the shelf…');
  const pool = new Set((S.sub?.movies || []).map((m) => m.imdbId));
  const choices = (await topMovies()).filter((m) => !pool.has(m.imdb_id || m.id));
  surpriseItem = L.pickRandom(choices);
  setPickMsg('');
  if (!surpriseItem) { setPickMsg('The shelf is empty right now. Try a search instead.', 'bad'); return; }
  const m = surpriseItem;
  const id = m.imdb_id || m.id;
  $('#surprise').innerHTML = `
    <div class="surprise">
      ${m.poster ? posterImg(m.poster, m.name) : ''}
      <div>
        <h3>${esc(m.name)} <span class="y">${esc(m.releaseInfo || '')}</span></h3>
        <p>${esc((m.description || '').slice(0, 180))}${(m.description || '').length > 180 ? '…' : ''}</p>
        <div class="row">
          <button class="btn btn-bulb btn-small" type="button" data-action="pick" data-id="${esc(id)}">Add it</button>
          <button class="btn btn-ghost btn-small" type="button" data-action="surprise">Spin again</button>
          <button class="btn btn-ghost btn-small" type="button" data-action="close-surprise">Never mind</button>
        </div>
      </div>
    </div>`;
}

// Snacks & reviews -------------------------------------------------------
async function addSnack(item) {
  const me = requireMe();
  if (!me || !S.current) return;
  await once('snack', async () => {
    await A.addSnack(S.current.id, me, item);
    $('#snackItem').value = '';
    toast(`Noted: ${me.name} is bringing ${item.trim()}.`);
  });
}
$('#snackForm').addEventListener('submit', (e) => { e.preventDefault(); if ($('#snackItem').value.trim()) addSnack($('#snackItem').value); });

$('#stars').addEventListener('click', (e) => {
  const b = e.target.closest('[data-star]');
  if (!b) return;
  S.stars = Number(b.dataset.star);
  paintStars();
});
$('#reviewForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const me = requireMe();
  if (!me || !S.current) return;
  if (!S.stars) { toast('Tap the stars first.'); return; }
  once('review', async () => {
    await A.review(S.current.id, me, S.stars, $('#reviewLine').value);
    toast('Review posted to the lobby.');
  });
});

function downloadIcs() {
  const n = S.current;
  const m = n?.lockedMovie;
  if (!n || !m || !n.lockedStartsAt) return;
  const runtime = L.parseRuntime(m.runtime);
  const ics = L.buildIcs({
    uid: `${n.id}-${S.me?.nameKey || 'guest'}`,
    title: `Movie night: ${m.title}`,
    start: n.lockedStartsAt.toDate(),
    minutes: runtime ? runtime + 30 : 150,
    description: `Speakeasy Picture Show: ${m.title}${m.year ? ` (${m.year})` : ''}. ${SITE_URL}`,
    location: 'The Speakeasy',
    url: SITE_URL,
  });
  downloadFile('movie-night.ics', ics, 'text/calendar');
}

// Keep the marquee countdown honest.
setInterval(() => { if (S.current?.status === 'locked') render(); }, 30000);
