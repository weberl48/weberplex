// Owner console. Everyday hosting needs no key; this page is for the owner
// tools only: the season title, house picks, removing movies, cancelling any
// night, and Show on the Shield. The rules reject these without the key.
import { db, F } from './firebase.js';
import { SITE_URL } from './config.js';
import { makeActions } from './actions.js';
import { watch, watchNights, watchDoc } from './store.js';
import * as L from './logic.js';
import { $, esc, posterImg, dropLegacyLocal, toast, writeError as baseError, armed, paint } from './ui.js';

const writeError = (e) => baseError(e, 'owner');
import { searchMovies, movieMeta } from './cinemeta.js';
import { browseTabs, tabsHtml, loadTab, tilesHtml } from './browse.js';

const A = makeActions(db, F);
const S = { key: null, verified: false, nights: [], movies: [], votes: [], seen: [], season: '' };

// One write per button at a time: a second tap while the first is in flight
// would read the same stale state (a house pick turned into an update, a
// password change sent with the old password) and be refused.
const busy = new Set();
async function once(key, fn) {
  if (busy.has(key)) return;
  busy.add(key);
  try { await fn(); } catch (e) { console.error(e); toast(writeError(e), true); } finally { busy.delete(key); }
}

// The password lives only in this page's memory: nothing in the browser.
// An owner link can carry it as #k=...; take it and scrub it from the URL.
dropLegacyLocal();
const fromHash = new URLSearchParams(location.hash.slice(1)).get('k');
if (fromHash) {
  S.key = fromHash;
  history.replaceState(null, '', location.pathname + location.search);
}

$('#shareUrl').value = SITE_URL;
$('#statusUrl').textContent = `${SITE_URL}/api/status`;

const got = (k) => (rows) => { S[k] = rows; render(); };
watchNights(db, F, got('nights'), () => toast('Lost the connection. Reload to try again.', true));
watch(db, F, 'movies', got('movies'));
watch(db, F, 'votes', got('votes'));
watch(db, F, 'seen', got('seen'));
watchDoc(db, F, 'config/season', (d) => { S.season = d?.title || ''; render(); });
verifyKey();

async function verifyKey() {
  if (!S.key || S.verified) return;
  const key = S.key;
  $('#keyMsg').textContent = 'Checking…';
  $('#keyMsg').className = 'msg';
  const ok = await A.checkHostKey(key);
  if (S.key !== key) return; // locked, or a newer password is being checked
  if (!ok) {
    S.key = null;
    $('#keyMsg').textContent = 'That password didn’t open the booth. Check it and try again.';
    $('#keyMsg').className = 'msg bad';
  } else {
    S.verified = true;
    $('#keyMsg').textContent = '';
  }
  render();
}

const shelf = () => L.tallyShelf({ movies: S.movies, votes: S.votes, seen: S.seen, watched: L.watchedIds(S.nights) });

function render() {
  const on = !!S.key && S.verified; // the sections stay hidden until the password has been checked
  for (const id of ['#shareSec', '#seasonSec', '#nightsSec', '#houseSec', '#shelfSec', '#pwSec', '#ha']) $(id).hidden = !on;
  $('#keySec').hidden = on;
  $('#forget').hidden = !on;
  if (!on) return;
  if (document.activeElement !== $('#seasonInput')) $('#seasonInput').value = S.season;
  const t = shelf();
  const upcoming = L.upcomingNights(S.nights);
  $('#boothSub').textContent = `${t.movies.length} movies on the shelf · ${upcoming.length} night${upcoming.length === 1 ? '' : 's'} planned`;
  paint($('#nightsList'), upcoming.length ? upcoming.map((n) => `
    <li class="date-item"><span>${esc(L.showtimeLong(n.startsAt))} · at ${esc(L.placeLabel(n.host))}${n.status === 'locked' ? ` · ${esc(n.lockedMovie?.title || '')}` : ''}</span>
      <span class="row">${n.lockedMovie ? `<button class="mini" type="button" data-shield="${esc(n.lockedMovieId)}">Shield</button>` : ''}
      ${n.startsAt.toDate() > new Date() ? `<button class="mini" type="button" data-cancel="${esc(n.day)}">Cancel</button>` : ''}</span></li>`).join('')
    : '<li class="empty">No nights planned. Guests plan them from the calendar.</li>');
  $('#shelfCount').textContent = `${t.movies.length} movies`;
  paint($('#shelfList'), t.movies.map((m) => `
    <div class="pick-opt" style="grid-template-columns:36px 1fr auto; cursor:default">
      ${posterImg(m.poster, m.title)}
      <span>${esc(m.title)} <span class="by">· ${esc(m.byName)}</span></span>
      <span class="row"><span class="v">${m.votes}</span>
        <button class="mini" type="button" data-shield="${esc(m.imdbId)}" aria-label="Show ${esc(m.title)} on the Shield">Shield</button>
        <button class="mini" type="button" data-remove="${esc(m.imdbId)}">Remove</button></span>
    </div>`).join('') || '<p class="empty">The shelf is empty.</p>');
  renderHouseBrowse();
}

$('#seasonForm').addEventListener('submit', (e) => {
  e.preventDefault();
  once('season', async () => {
    try { await A.setSeason(S.key, $('#seasonInput').value); toast('Season title saved.'); } catch (err) { toast(writeError(err), true); }
  });
});

async function sendToShield(movie) {
  try {
    await A.showOnShield(S.key, movie);
    toast(`Sent ${movie.title} to the Shield. Stremio opens it in a few seconds.`);
  } catch (err) { toast(writeError(err), true); }
}

document.addEventListener('click', async (e) => {
  const sh = e.target.closest('[data-shield]');
  if (sh) {
    const m = S.movies.find((x) => x.imdbId === sh.dataset.shield)
      || S.nights.find((n) => n.lockedMovieId === sh.dataset.shield)?.lockedMovie;
    if (m) once(`shield:${sh.dataset.shield}`, () => sendToShield(m));
    return;
  }
  const rm = e.target.closest('[data-remove]');
  if (rm) {
    if (!armed(rm, 'Tap to confirm')) return;
    const m = shelf().movies.find((x) => x.imdbId === rm.dataset.remove);
    try { await A.ownerRemoveMovie(S.key, m, m.voters.map((v) => v.nameKey), m.seenBy.map((v) => v.nameKey)); toast(`Removed ${m.title}.`); } catch (err) { toast(writeError(err), true); }
    return;
  }
  const cancel = e.target.closest('[data-cancel]');
  if (cancel) {
    if (!armed(cancel, 'Tap to confirm')) return;
    try { await A.cancelNight(cancel.dataset.cancel); toast('Night cancelled.'); } catch (err) { toast(writeError(err), true); }
  }
});

// ---- house picks -----------------------------------------------------------
const houseTags = new Set();
$('#houseTags').innerHTML = L.SHELF_ORDER.map((t) =>
  `<button class="chip" type="button" data-house-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('');
$('#houseTags').addEventListener('click', (e) => {
  const b = e.target.closest('[data-house-tag]');
  if (!b) return;
  const t = b.dataset.houseTag;
  if (houseTags.has(t)) houseTags.delete(t); else houseTags.add(t);
  b.classList.toggle('on', houseTags.has(t));
  b.setAttribute('aria-pressed', String(houseTags.has(t)));
});

// Browse tabs; "For the crowd" learns from what has thumbs.
const H = { tab: 'search', items: [], note: '', loading: false };
let houseToken = 0;
function renderHouseBrowse() {
  const movies = shelf().movies;
  $('#houseTabs').innerHTML = tabsHtml(browseTabs(L.ballotGenre(movies), 'For the crowd'), H.tab);
  const searching = H.tab === 'search';
  $('#houseForm').hidden = !searching;
  if (searching) { $('#houseGrid').hidden = true; $('#houseNote').hidden = true; return; }
  $('#houseResults').hidden = true;
  $('#houseNote').hidden = !(H.loading || H.note);
  $('#houseNote').textContent = H.loading ? 'Loading…' : H.note;
  $('#houseGrid').hidden = H.loading || !H.items.length;
  $('#houseGrid').innerHTML = tilesHtml(H.items, { taken: new Set(S.movies.map((m) => m.imdbId)), addAttr: 'data-house-add' });
}
$('#houseTabs').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  H.tab = b.dataset.tab; H.items = []; H.note = '';
  if (H.tab === 'search') { renderHouseBrowse(); return; }
  const token = ++houseToken;
  H.loading = true;
  renderHouseBrowse();
  const movies = shelf().movies;
  const voted = movies.filter((m) => m.votes > 0);
  const res = await loadTab(H.tab, {
    genre: L.ballotGenre(movies), likedIds: (voted.length ? voted : movies).map((m) => m.imdbId),
    exclude: new Set(S.movies.map((m) => m.imdbId)),
    basis: voted.length ? 'Based on the movies people have thumbed up.' : 'Based on everything on the shelf.',
  }).catch(() => ({ items: [], note: 'The movie catalog is not answering right now.' }));
  if (token !== houseToken) return;
  H.loading = false; H.items = res.items;
  H.note = res.note || (res.items.length ? '' : 'Nothing here right now.');
  renderHouseBrowse();
});

let houseResults = [];
$('#houseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#houseQ').value.trim();
  if (q.length < 2) return;
  $('#houseResults').hidden = false;
  $('#houseResults').innerHTML = '<p class="empty">Searching…</p>';
  try {
    houseResults = await searchMovies(q);
    const pool = new Set(S.movies.map((m) => m.imdbId));
    $('#houseResults').innerHTML = houseResults.length
      ? houseResults.map((m) => {
        const id = m.imdb_id || m.id;
        const taken = pool.has(id);
        return `<button class="result${taken ? ' taken' : ''}" type="button" data-house-add="${esc(id)}">
            ${posterImg(m.poster, '')}
            <span><span class="t">${esc(m.name)}</span><br><span class="y">${esc(m.releaseInfo || '')}</span></span>
            <span class="add">${taken ? 'On the shelf' : 'Add'}</span></button>`;
      }).join('')
      : `<p class="empty">Nothing called “${esc(q)}”.</p>`;
  } catch (err) {
    $('#houseResults').innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
});
function addHouse(e) {
  const b = e.target.closest('[data-house-add]');
  if (!b || b.classList.contains('taken') || b.disabled) return;
  const id = b.dataset.houseAdd;
  const fromList = houseResults.find((m) => (m.imdb_id || m.id) === id) || H.items.map((x) => x.meta).find((m) => (m.imdb_id || m.id) === id);
  return once(`house:${id}`, async () => {
    $('#houseMsg').textContent = 'Adding…';
    $('#houseMsg').className = 'msg';
    try {
      const meta = (await movieMeta(id).catch(() => null)) || fromList;
      const movie = { ...L.movieFromMeta({ ...meta, poster: meta.poster || fromList?.poster }), shelf: [...houseTags] };
      const added = await A.addHousePicks(S.key, [movie], S.movies);
      if (!added.length) {
        const on = S.movies.find((m) => m.imdbId === movie.imdbId);
        $('#houseMsg').textContent = `${movie.title} is already on the shelf${on?.byName ? ` (added by ${on.byName})` : ''}.`;
        $('#houseMsg').className = 'msg bad';
        return;
      }
      $('#houseMsg').textContent = `Added ${movie.title} as a house pick.`;
      $('#houseMsg').className = 'msg good';
      houseTags.clear();
      document.querySelectorAll('#houseTags [data-house-tag]').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
      renderHouseBrowse();
      $('#houseQ').value = '';
      $('#houseResults').hidden = true;
    } catch (err) {
      $('#houseMsg').textContent = writeError(err);
      $('#houseMsg').className = 'msg bad';
    }
  });
}
$('#houseResults').addEventListener('click', addHouse);
$('#houseGrid').addEventListener('click', addHouse);

// ---- key handling ------------------------------------------------------------
$('#keyForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('#keyInput').value.trim()) {
    $('#keyMsg').textContent = 'Type the password first.';
    $('#keyMsg').className = 'msg bad';
    return;
  }
  S.key = $('#keyInput').value.trim();
  S.verified = false;
  $('#keyInput').value = '';
  $('#keyMsg').textContent = '';
  verifyKey();
  render();
});
$('#forget').addEventListener('click', () => { S.key = null; S.verified = false; render(); });
$('#pwForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const next = $('#pwInput').value;
  const msg = $('#pwMsg');
  msg.hidden = false;
  once('pw', async () => {
    try {
      await A.changeOwnerPassword(S.key, next);
      S.key = next;
      $('#pwInput').value = '';
      msg.textContent = 'Password changed. Old owner links no longer work.';
      msg.className = 'msg good';
    } catch (err) {
      msg.textContent = err.message === 'Use at least 8 characters.' ? err.message : writeError(err);
      msg.className = 'msg bad';
    }
  });
});
$('#copyShare').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(SITE_URL); toast('Guest link copied.'); } catch { $('#shareUrl').select(); }
});
