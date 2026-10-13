// Host console. Every write goes through actions.js with the host key; the
// rules reject them if the key is wrong.
import { db, F } from './firebase.js';
import { SITE_URL } from './config.js';
import { makeActions } from './actions.js';
import { watchNights, watchNight } from './store.js';
import * as L from './logic.js';
import { $, esc, faces, posterImg, saveLocal, loadLocal, toast, writeError, armed } from './ui.js';
import { spinReel } from './reel.js';
import { searchMovies, movieMeta } from './cinemeta.js';

const A = makeActions(db, F);
const S = { key: null, nights: [], current: null, sub: null, chosenDate: null, chosenMovie: null, verified: false };
let unNight = null;

// A host link carries the key as #k=...; store it and scrub it from the URL.
const fromHash = new URLSearchParams(location.hash.slice(1)).get('k');
if (fromHash) {
  saveLocal('ps.hostKey', fromHash);
  history.replaceState(null, '', location.pathname + location.search);
}
S.key = loadLocal('ps.hostKey');

$('#shareUrl').value = SITE_URL;
$('#statusUrl').textContent = `${SITE_URL}/api/status`;

watchNights(db, F, (nights) => {
  S.nights = nights;
  const current = nights.find((n) => n.status === 'open' || n.status === 'locked') || null;
  if (current?.id !== S.current?.id) {
    unNight?.();
    S.sub = null;
    S.chosenDate = null;
    S.chosenMovie = null;
    unNight = current ? watchNight(db, F, current.id, (sub) => { S.sub = sub; render(); }) : null;
  }
  S.current = current;
  verifyKey();
  render();
}, (e) => { console.error(e); toast('Lost the connection. Reload to try again.', true); });

async function verifyKey() {
  if (!S.key || S.verified || !S.current) return;
  const ok = await A.checkHostKey(S.key, S.current.id);
  if (ok === false) {
    S.key = null;
    saveLocal('ps.hostKey', null);
    $('#keyMsg').textContent = 'That key didn’t open the booth. Check it and try again.';
    $('#keyMsg').className = 'msg bad';
  } else if (ok) S.verified = true;
  render();
}

function render() {
  const hasKey = !!S.key;
  $('#keySec').hidden = hasKey;
  $('#forget').hidden = !hasKey;
  $('#shareSec').hidden = !hasKey;
  $('#ha').hidden = !hasKey;
  $('#newSec').hidden = !hasKey || !!S.current;
  $('#nightSec').hidden = !hasKey || !S.current;
  if (!hasKey) return;
  if (!S.current) {
    $('#boothSub').textContent = 'No night booked. Set one up below.';
    if (!$('#newDates').children.length) addNewDateRow();
    return;
  }
  const n = S.current;
  const tal = L.tally(S.sub || {});
  $('#nightTitle').textContent = n.title || 'Movie night';
  $('#nightStatus').textContent = n.status === 'open' ? 'Voting open' : 'Locked';
  $('#nightStatus').className = `status-pill ${n.status}`;
  $('#boothSub').textContent = n.status === 'open'
    ? `${tal.movies.length} pictures · ${new Set((S.sub?.votes || []).map((v) => v.nameKey)).size} voters`
    : `${n.lockedMovie?.title} · ${L.showtimeLong(n.lockedStartsAt)}`;
  $('#openCard').hidden = n.status !== 'open';
  $('#houseCard').hidden = n.status !== 'open';
  $('#lockCard').hidden = n.status !== 'open';
  $('#lockedCard').hidden = n.status !== 'locked';
  if (n.status === 'open') renderOpen(tal);
  else renderLocked(tal);
}

function renderOpen(tal) {
  if (document.activeElement !== $('#renameInput')) $('#renameInput').value = S.current.title || '';
  $('#dateList').innerHTML = tal.dates.length
    ? tal.dates.map((d) => `
        <li class="date-item">
          <span>${esc(L.showtimeLong(d.startsAt))} · <b>${d.count}</b> in ${faces(d.going)}</span>
          <button class="mini" type="button" data-remove-date="${esc(d.id)}">Remove</button>
        </li>`).join('')
    : '<li class="empty">No nights yet. Add one below.</li>';

  if (!S.chosenDate || !tal.dates.some((d) => d.id === S.chosenDate)) S.chosenDate = tal.bestDates[0] || tal.dates[0]?.id || null;
  if (!S.chosenMovie || !tal.movies.some((m) => m.imdbId === S.chosenMovie)) S.chosenMovie = tal.leaders[0]?.imdbId || tal.movies[0]?.imdbId || null;

  $('#lockDates').innerHTML = tal.dates.map((d) => `
    <label class="pick-opt" style="grid-template-columns:auto 1fr auto">
      <input type="radio" name="lockDate" value="${esc(d.id)}"${d.id === S.chosenDate ? ' checked' : ''}>
      <span>${esc(L.showtimeLong(d.startsAt))}${tal.bestDates.includes(d.id) && tal.dates.length > 1 ? ' · most people' : ''}</span>
      <span class="v">${d.count}</span>
    </label>`).join('') || '<p class="empty">Add a night first.</p>';

  $('#lockMovies').innerHTML = tal.movies.map((m) => `
    <label class="pick-opt">
      <input type="radio" name="lockMovie" value="${esc(m.imdbId)}"${m.imdbId === S.chosenMovie ? ' checked' : ''}>
      ${posterImg(m.poster, m.title)}
      <span>${esc(m.title)} <span class="by">· ${esc(m.byName)}</span></span>
      <span class="row"><span class="v">${m.votes}</span><button class="mini" type="button" data-remove-movie="${esc(m.imdbId)}">Remove</button></span>
    </label>`).join('') || '<p class="empty">No pictures suggested yet.</p>';

  const pool = spinPool(tal);
  $('#spinBtn').disabled = pool.length < 2;
  $('#spinHint').textContent = tal.tie
    ? `${tal.leaders.length} pictures are tied at ${tal.leaders[0].votes}. Let the reel settle it.`
    : pool.length >= 2 ? 'No tie, but the reel will pick at random from everything on the ballot.' : '';
  $('#lockBtn').disabled = !S.chosenDate || !S.chosenMovie;
}

const spinPool = (tal) => (tal.tie ? tal.leaders : tal.movies);

function renderLocked(tal) {
  const n = S.current;
  const date = tal.dates.find((d) => d.id === n.lockedDateId);
  $('#lockedWhat').textContent = n.lockedMovie?.title || 'Locked';
  $('#lockedWhen').textContent = `${L.showtimeLong(n.lockedStartsAt)} · ${date?.count || 0} coming`;
  $('#lockedWho').innerHTML = (date?.going || []).map((g) => `<span class="guest">${faces([g])}${esc(g.name)}</span>`).join('');
}

// ---- new night form -------------------------------------------------------
function nextFriday8pm(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7) + offsetDays);
  d.setHours(20, 0, 0, 0);
  return d;
}
const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function addNewDateRow() {
  const rows = $('#newDates').children.length;
  const li = document.createElement('div');
  li.className = 'date-item';
  const id = `newDate${Date.now()}${rows}`;
  li.innerHTML = `<label class="sr-only" for="${id}">Night ${rows + 1}</label>
    <input class="field" id="${id}" type="datetime-local" value="${toLocalInput(nextFriday8pm(rows))}" required>
    <button class="mini" type="button" data-drop-row>Remove</button>`;
  $('#newDates').append(li);
}
$('#addNewDate').addEventListener('click', addNewDateRow);
$('#newDates').addEventListener('click', (e) => {
  if (e.target.closest('[data-drop-row]') && $('#newDates').children.length > 1) e.target.closest('.date-item').remove();
});
$('#newForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dates = [...$('#newDates').querySelectorAll('input')].map((i) => new Date(i.value)).filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return;
  $('#newMsg').textContent = 'Booking…';
  try {
    await A.createNight(S.key, { title: $('#newTitle').value, dates });
    S.verified = true;
    $('#newMsg').textContent = '';
    $('#newTitle').value = '';
    $('#newDates').innerHTML = '';
    toast('Voting is open. Send the guest link.');
  } catch (err) {
    $('#newMsg').textContent = err?.code === 'permission-denied' ? 'The host key was rejected. Forget it and enter it again.' : writeError(err);
    $('#newMsg').className = 'msg bad';
  }
});

// ---- open night controls --------------------------------------------------
$('#addDateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = new Date($('#addDateInput').value);
  if (Number.isNaN(d.getTime())) return;
  try { await A.addDate(S.key, S.current.id, d); $('#addDateInput').value = ''; toast('Night added.'); } catch (err) { toast(writeError(err), true); }
});
$('#renameForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await A.renameNight(S.key, S.current.id, $('#renameInput').value); toast('Renamed.'); } catch (err) { toast(writeError(err), true); }
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'lockDate') S.chosenDate = e.target.value;
  if (e.target.name === 'lockMovie') S.chosenMovie = e.target.value;
});

document.addEventListener('click', async (e) => {
  const rmDate = e.target.closest('[data-remove-date]');
  const rmMovie = e.target.closest('[data-remove-movie]');
  if (rmDate) {
    if (!armed(rmDate, 'Tap to confirm')) return;
    const d = L.tally(S.sub || {}).dates.find((x) => x.id === rmDate.dataset.removeDate);
    try { await A.removeDate(S.key, S.current.id, d.id, d.going.map((g) => g.nameKey)); toast('Night removed.'); } catch (err) { toast(writeError(err), true); }
  }
  if (rmMovie) {
    e.preventDefault();
    if (!armed(rmMovie, 'Tap to confirm')) return;
    const m = L.tally(S.sub || {}).movies.find((x) => x.imdbId === rmMovie.dataset.removeMovie);
    try { await A.removeMovie(S.key, S.current.id, m, m.voters.map((v) => v.nameKey)); toast(`Removed ${m.title}.`); } catch (err) { toast(writeError(err), true); }
  }
});

$('#spinBtn').addEventListener('click', async () => {
  const tal = L.tally(S.sub || {});
  const pool = spinPool(tal);
  if (pool.length < 2) return;
  const winner = L.pickRandom(pool, () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
  await spinReel(pool, winner, { title: tal.tie ? 'Breaking the tie…' : 'Spinning the reel…' });
  S.chosenMovie = winner.imdbId;
  render();
  $('#lockBtn').focus();
});

$('#lockBtn').addEventListener('click', async () => {
  const tal = L.tally(S.sub || {});
  const date = tal.dates.find((d) => d.id === S.chosenDate);
  const movie = tal.movies.find((m) => m.imdbId === S.chosenMovie);
  if (!date || !movie) return;
  $('#lockMsg').textContent = 'Locking…';
  try {
    await A.lock(S.key, S.current.id, date, movie);
    $('#lockMsg').textContent = '';
    toast(`Locked: ${movie.title}, ${L.showtimeLong(date.startsAt)}.`);
  } catch (err) {
    $('#lockMsg').textContent = writeError(err);
    $('#lockMsg').className = 'msg bad';
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

let houseResults = [];
$('#houseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#houseQ').value.trim();
  if (q.length < 2) return;
  $('#houseResults').hidden = false;
  $('#houseResults').innerHTML = '<p class="empty">Searching…</p>';
  try {
    houseResults = await searchMovies(q);
    const pool = new Set((S.sub?.movies || []).map((m) => m.imdbId));
    $('#houseResults').innerHTML = houseResults.length
      ? houseResults.map((m) => {
        const id = m.imdb_id || m.id;
        const taken = pool.has(id);
        return `<button class="result${taken ? ' taken' : ''}" type="button" data-house-add="${esc(id)}">
            ${posterImg(m.poster, '')}
            <span><span class="t">${esc(m.name)}</span><br><span class="y">${esc(m.releaseInfo || '')}</span></span>
            <span class="add">${taken ? 'On the ballot' : 'Add'}</span></button>`;
      }).join('')
      : `<p class="empty">Nothing called “${esc(q)}”.</p>`;
  } catch (err) {
    $('#houseResults').innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
});
$('#houseResults').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-house-add]');
  if (!b || b.classList.contains('taken')) return;
  const id = b.dataset.houseAdd;
  const fromList = houseResults.find((m) => (m.imdb_id || m.id) === id);
  $('#houseMsg').textContent = 'Adding…';
  $('#houseMsg').className = 'msg';
  try {
    const meta = (await movieMeta(id).catch(() => null)) || fromList;
    const movie = { ...L.movieFromMeta({ ...meta, poster: meta.poster || fromList?.poster }), shelf: [...houseTags] };
    await A.addHousePicks(S.key, S.current.id, [movie], S.sub?.movies || []);
    $('#houseMsg').textContent = `Added ${movie.title} as a house pick.`;
    $('#houseMsg').className = 'msg good';
    $('#houseQ').value = '';
    $('#houseResults').hidden = true;
  } catch (err) {
    $('#houseMsg').textContent = writeError(err);
    $('#houseMsg').className = 'msg bad';
  }
});

// ---- locked night controls -----------------------------------------------
for (const [id, fn, done] of [
  ['#reopenBtn', (k, n) => A.reopen(k, n), 'Voting is open again.'],
  ['#finishBtn', (k, n) => A.finish(k, n), 'Filed under Past screenings. Reviews stay open.'],
  ['#cancelBtn', (k, n) => A.cancel(k, n), 'Night cancelled.'],
]) {
  $(id).addEventListener('click', async (e) => {
    if (!armed(e.currentTarget)) return;
    try { await fn(S.key, S.current.id); toast(done); } catch (err) { toast(writeError(err), true); }
  });
}

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
