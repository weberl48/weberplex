// Owner console. Everyday hosting needs no key; this page is for the owner
// tools only: the season title, house picks, removing movies, cancelling any
// night, and Show on the Shield. The rules reject these without the key.
import { db, F } from './firebase.js';
import { SITE_URL } from './config.js';
import { makeActions } from './actions.js';
import { watch, watchNights, watchDoc } from './store.js';
import * as L from './logic.js';
import { $, esc, posterImg, saveLocal, loadLocal, toast, writeError, armed } from './ui.js';
import { searchMovies, movieMeta } from './cinemeta.js';
import { browseTabs, tabsHtml, loadTab, tilesHtml } from './browse.js';

const A = makeActions(db, F);
const S = { key: null, verified: false, nights: [], movies: [], votes: [], seen: [], season: '' };

// An owner link carries the key as #k=...; store it and scrub it from the URL.
const fromHash = new URLSearchParams(location.hash.slice(1)).get('k');
if (fromHash) {
  saveLocal('ps.hostKey', fromHash);
  history.replaceState(null, '', location.pathname + location.search);
}
S.key = loadLocal('ps.hostKey');

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
  const ok = await A.checkHostKey(S.key);
  if (!ok) {
    S.key = null;
    saveLocal('ps.hostKey', null);
    $('#keyMsg').textContent = 'That key didn’t open the booth. Check it and try again.';
    $('#keyMsg').className = 'msg bad';
  } else S.verified = true;
  render();
}

const shelf = () => L.tallyShelf({ movies: S.movies, votes: S.votes, seen: S.seen, watched: L.watchedIds(S.nights) });

function render() {
  const on = !!S.key;
  for (const id of ['#shareSec', '#seasonSec', '#nightsSec', '#houseSec', '#shelfSec', '#ha']) $(id).hidden = !on;
  $('#keySec').hidden = on;
  $('#forget').hidden = !on;
  if (!on) return;
  if (document.activeElement !== $('#seasonInput')) $('#seasonInput').value = S.season;
  const t = shelf();
  const upcoming = L.upcomingNights(S.nights);
  $('#boothSub').textContent = `${t.movies.length} movies on the shelf · ${upcoming.length} night${upcoming.length === 1 ? '' : 's'} planned`;
  $('#nightsList').innerHTML = upcoming.length ? upcoming.map((n) => `
    <li class="date-item"><span>${esc(L.showtimeLong(n.startsAt))} · at ${esc(L.placeLabel(n.host))}${n.status === 'locked' ? ` · ${esc(n.lockedMovie?.title || '')}` : ''}</span>
      <span class="row">${n.lockedMovie ? `<button class="mini" type="button" data-shield="${esc(n.lockedMovieId)}">Shield</button>` : ''}
      <button class="mini" type="button" data-cancel="${esc(n.day)}">Cancel</button></span></li>`).join('')
    : '<li class="empty">No nights planned. Guests plan them from the calendar.</li>';
  $('#shelfCount').textContent = `${t.movies.length} movies`;
  $('#shelfList').innerHTML = t.movies.map((m) => `
    <div class="pick-opt" style="grid-template-columns:36px 1fr auto; cursor:default">
      ${posterImg(m.poster, m.title)}
      <span>${esc(m.title)} <span class="by">· ${esc(m.byName)}</span></span>
      <span class="row"><span class="v">${m.votes}</span>
        <button class="mini" type="button" data-shield="${esc(m.imdbId)}" aria-label="Show ${esc(m.title)} on the Shield">Shield</button>
        <button class="mini" type="button" data-remove="${esc(m.imdbId)}">Remove</button></span>
    </div>`).join('') || '<p class="empty">The shelf is empty.</p>';
  renderHouseBrowse();
}

$('#seasonForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await A.setSeason(S.key, $('#seasonInput').value); toast('Season title saved.'); } catch (err) { toast(writeError(err), true); }
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
    if (m) sendToShield(m);
    return;
  }
  const rm = e.target.closest('[data-remove]');
  if (rm) {
    if (!armed(rm, 'Tap to confirm')) return;
    const m = shelf().movies.find((x) => x.imdbId === rm.dataset.remove);
    try { await A.ownerRemoveMovie(S.key, m, m.voters.map((v) => v.nameKey)); toast(`Removed ${m.title}.`); } catch (err) { toast(writeError(err), true); }
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
async function addHouse(e) {
  const b = e.target.closest('[data-house-add]');
  if (!b || b.classList.contains('taken') || b.disabled) return;
  const id = b.dataset.houseAdd;
  const fromList = houseResults.find((m) => (m.imdb_id || m.id) === id) || H.items.map((x) => x.meta).find((m) => (m.imdb_id || m.id) === id);
  $('#houseMsg').textContent = 'Adding…';
  $('#houseMsg').className = 'msg';
  try {
    const meta = (await movieMeta(id).catch(() => null)) || fromList;
    const movie = { ...L.movieFromMeta({ ...meta, poster: meta.poster || fromList?.poster }), shelf: [...houseTags] };
    await A.addHousePicks(S.key, [movie], S.movies);
    $('#houseMsg').textContent = `Added ${movie.title} as a house pick.`;
    $('#houseMsg').className = 'msg good';
    $('#houseQ').value = '';
    $('#houseResults').hidden = true;
  } catch (err) {
    $('#houseMsg').textContent = writeError(err);
    $('#houseMsg').className = 'msg bad';
  }
}
$('#houseResults').addEventListener('click', addHouse);
$('#houseGrid').addEventListener('click', addHouse);

// ---- key handling ------------------------------------------------------------
$('#keyForm').addEventListener('submit', (e) => {
  e.preventDefault();
  S.key = $('#keyInput').value.trim();
  S.verified = false;
  saveLocal('ps.hostKey', S.key);
  $('#keyInput').value = '';
  $('#keyMsg').textContent = '';
  verifyKey();
  render();
});
$('#forget').addEventListener('click', () => { S.key = null; S.verified = false; saveLocal('ps.hostKey', null); render(); });
$('#copyShare').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(SITE_URL); toast('Guest link copied.'); } catch { $('#shareUrl').select(); }
});
