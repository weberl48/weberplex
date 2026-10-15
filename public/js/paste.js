// "Paste a list" on the shelf: looking each pasted line up in Cinemeta, and the
// review list that shows what came back. The parsing, the choice of match and
// what each row is (ready, on the shelf, ...) are pure and live in logic.js;
// the page (app.js) owns the rows and the writes.
import { searchMovies } from './cinemeta.js';
import * as L from './logic.js';
import { esc, posterImg } from './ui.js';

const idOf = (m) => m.imdb_id || m.id;
const aborted = () => new DOMException('Aborted', 'AbortError');

// fn(item, index) over the items, `limit` at a time. Stops starting new ones
// once the signal aborts (and then rejects, like fetch does).
export async function mapLimit(items, limit, fn, signal) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      if (signal?.aborted) throw aborted();
      const i = next;
      next += 1;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// The catalog's pick for a { title, year } line, with the other results, or null.
// A year that matched nothing may belong to the title ("Blade Runner 2049"): it
// is asked again with the year in the search, and both sets of results are weighed.
export async function findMovie({ title, year }, signal) {
  let metas = await searchMovies(title, signal);
  let hit = L.matchMovie({ title, year }, metas);
  if (year && L.releaseYear(hit?.meta) !== year) {
    try {
      const more = await searchMovies(`${title} ${year}`, signal);
      const have = new Set(metas.map(idOf));
      metas = [...metas, ...more.filter((m) => !have.has(idOf(m)))];
      hit = L.matchMovie({ title, year }, metas);
    } catch (e) {
      if (e.name === 'AbortError') throw e; // a failed second try keeps the first answer
    }
  }
  return hit;
}

// Looks one row up and settles its status: 'found' (meta, alts), 'miss', or
// 'error' (the catalog didn't answer). Only an abort is thrown.
export async function lookupRow(row, signal) {
  row.status = 'loading';
  try {
    const hit = await findMovie(row, signal);
    if (signal?.aborted) throw aborted();
    Object.assign(row, hit ? { status: 'found', meta: hit.meta, alts: hit.alts } : { status: 'miss', meta: null, alts: [] });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    Object.assign(row, { status: 'error', meta: null, alts: [] });
  }
}

// About four lookups at a time; `onRow(row)` after each settles.
export const lookupRows = (rows, { signal, onRow = () => {}, limit = 4 } = {}) =>
  mapLimit(rows, limit, async (row) => { await lookupRow(row, signal); onRow(row); }, signal);

// ---- the review list ---------------------------------------------------------
export const WRONG_SHOWN = 4; // "Wrong movie?" offers up to this many other results

function stateText(s, meKey) {
  if (s.kind === 'ready') return 'Ready';
  if (s.kind === 'watched') return 'Already watched';
  if (s.kind === 'dup') return 'Listed twice, kept once';
  const m = s.movie;
  return `Already on the shelf (${L.isHouse(m) ? 'a house pick' : `added by ${m.by === meKey ? 'you' : m.byName}`})`;
}

// "3 ready · 1 skipped · 1 not found", or how far the lookups have got.
export function summaryText(rows, states) {
  if (!rows.length) return '';
  const count = (...kinds) => states.filter((s) => kinds.includes(s.kind)).length;
  const looking = count('loading');
  if (looking) return `Looking up ${rows.length - looking} of ${rows.length}…`;
  const parts = [`${count('ready')} ready`];
  if (count('shelf', 'watched', 'dup')) parts.push(`${count('shelf', 'watched', 'dup')} skipped`);
  if (count('miss')) parts.push(`${count('miss')} not found`);
  return parts.join(' · ');
}

const alternatives = (r) => (r.alts.length
  ? r.alts.slice(0, WRONG_SHOWN).map((a) => `
      <button class="result" type="button" data-action="paste-alt" data-id="${r.id}" data-item="${esc(idOf(a))}">
        ${posterImg(a.poster, '')}
        <span><span class="t">${esc(a.name)}</span><br><span class="y">${esc(a.releaseInfo || a.year || '')}</span></span>
        <span class="add">Use this</span></button>`).join('')
  : '<p class="hint">No other matches for that line. Untick it to leave it out.</p>');

function rowHtml(r, s, meKey) {
  if (s.kind === 'loading') {
    return `<li class="paste-row loading"><span class="paste-poster"><span class="noimg" aria-hidden="true">…</span></span>
      <div class="paste-main"><span class="paste-title"><b>${esc(r.title)}</b></span><span class="paste-state">Looking…</span></div></li>`;
  }
  // Not found: the line stays editable (the year and all), and Try again looks it up as it now reads.
  if (s.kind === 'miss') {
    return `<li class="paste-row miss"><span class="paste-poster"><span class="noimg" aria-hidden="true">?</span></span>
      <div class="paste-main">
        <span class="paste-state">${r.status === 'error' ? 'Couldn’t reach the catalog' : 'Not found'}</span>
        <div class="paste-miss">
          <label class="sr-only" for="paste-line-${r.id}">Fix the line “${esc(r.line)}”</label>
          <input class="field" id="paste-line-${r.id}" data-paste-line="${r.id}" value="${esc(r.line)}" maxlength="200" autocomplete="off" spellcheck="false" enterkeyhint="search">
          <button class="btn btn-ghost btn-small" type="button" data-action="paste-retry" data-id="${r.id}">Try again</button>
        </div>
      </div></li>`;
  }
  const m = r.meta;
  const year = m.releaseInfo || m.year || '';
  const state = s.kind === 'ready'
    ? `<label class="paste-pick"><input type="checkbox" id="paste-on-${r.id}" data-paste-on="${r.id}"${r.on ? ' checked' : ''} aria-label="Add ${esc(m.name)}"><span class="paste-state">Ready</span></label>`
    : `<span class="paste-state">${esc(stateText(s, meKey))}</span>`;
  return `<li class="paste-row ${s.kind}"><span class="paste-poster">${posterImg(m.poster, m.name)}</span>
    <div class="paste-main">
      <span class="paste-title"><b>${esc(m.name)}</b>${year ? ` <span class="y">${esc(year)}</span>` : ''}</span>
      ${state}
      <span class="paste-line">You wrote: ${esc(r.line)}</span>
      <div class="row"><button class="mini" type="button" data-action="paste-wrong" data-id="${r.id}" aria-expanded="${!!r.wrong}" aria-controls="paste-alts-${r.id}">Wrong movie?</button></div>
      ${r.wrong ? `<div class="paste-alts" id="paste-alts-${r.id}" role="group" aria-label="Other matches for ${esc(r.line)}">${alternatives(r)}</div>` : ''}
    </div></li>`;
}

// `states` is L.pasteStates(rows, ...). Everything people typed or the catalog
// sent goes through esc().
export function reviewHtml(rows, states, { cut = 0, meKey = '' } = {}) {
  if (!rows.length) return '';
  return `${cut ? `<p class="hint">Only the first ${L.PASTE_MAX} lines are used.</p>` : ''}
    <ul class="paste-rows">${rows.map((r, i) => rowHtml(r, states[i], meKey)).join('')}</ul>`;
}
