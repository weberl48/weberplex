// Browse tabs shared by the guest picks section and the host's house picks:
// Search · Trending · Trending <genre> · New this year · For you.
import { trending, newThisYear, candidatePool, movieMeta } from './cinemeta.js';
import * as L from './logic.js';
import { esc, posterImg } from './ui.js';

export function browseTabs(genre, forYouLabel = 'For you') {
  return [
    { id: 'search', label: 'Search' },
    { id: 'trending', label: 'Trending' },
    ...(genre ? [{ id: 'genre', label: `Trending ${genre}` }] : []),
    { id: 'new', label: 'New this year' },
    { id: 'foryou', label: forYouLabel },
  ];
}

export function tabsHtml(tabs, active) {
  return tabs.map((t) => `<button class="chip${t.id === active ? ' on' : ''}" type="button"
    aria-pressed="${t.id === active}" data-tab="${t.id}">${esc(t.label)}</button>`).join('');
}

// Returns { items: [{ meta, reason? }], note } for a tab.
export async function loadTab(id, { genre, likedIds = [], exclude = new Set(), basis = '' } = {}) {
  // Phone-length lists: 18 from a catalog, 12 recommendations.
  const wrap = (metas) => ({ items: metas.slice(0, 18).map((meta) => ({ meta })), note: '' });
  if (id === 'trending') return wrap(await trending());
  if (id === 'genre') return wrap(await trending(genre));
  if (id === 'new') return wrap(await newThisYear());
  if (id !== 'foryou') return { items: [], note: '' };
  const liked = (await Promise.all(likedIds.slice(0, 20).map((x) => movieMeta(x)))).filter(Boolean);
  if (!liked.length) return { items: [], note: 'Thumbs-up a few movies on the shelf and come back for suggestions.' };
  const profile = L.tasteProfile(liked);
  const pool = await candidatePool(profile.topGenres.slice(0, 2));
  const items = L.recommend(profile, pool, exclude, 12).map((r) => ({ meta: r.meta, reason: r.reason }));
  return { items, note: basis };
}

// Poster tiles. `addAttr` names the attribute the page listens for.
export function tilesHtml(items, { taken = new Set(), watched = new Set(), addAttr = 'data-action="pick" data-id' } = {}) {
  if (!items.length) return '';
  return items.map(({ meta: m, reason }) => {
    const id = m.imdb_id || m.id;
    const on = taken.has(id);
    const sub = [m.releaseInfo || m.year, m.imdbRating && `★ ${m.imdbRating}`].filter(Boolean).join(' · ');
    return `
      <div class="tile${on ? ' taken' : ''}">
        <div class="tile-poster">${posterImg(m.poster, m.name)}</div>
        <div class="tile-body">
          <b>${esc(m.name)}</b>
          ${sub ? `<span class="tile-sub">${esc(sub)}</span>` : ''}
          ${reason ? `<span class="tile-why">${esc(reason)}</span>` : ''}
          <div class="tile-actions">
            <button class="mini add" type="button" ${addAttr}="${esc(id)}"${on ? ' disabled' : ''}>${watched.has(id) ? 'Watched' : on ? 'On the shelf' : 'Add'}</button>
            <a class="mini" href="${esc(L.stremioUrl(id))}" target="_blank" rel="noopener">Stremio</a>
          </div>
        </div>
      </div>`;
  }).join('');
}
