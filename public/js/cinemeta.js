// Stremio's public Cinemeta catalog: keyless, CORS-open, and its ids are the
// IMDb ids the Shield's Stremio deep link opens. Catalog items carry genres,
// director, writer, cast, country, rating and live popularity.
const BASE = 'https://v3-cinemeta.strem.io';
const isImdb = (m) => /^tt\d{5,10}$/.test(m.imdb_id || m.id || '');

export async function searchMovies(q, signal) {
  const res = await fetch(`${BASE}/catalog/movie/top/search=${encodeURIComponent(q)}.json`, { signal });
  if (!res.ok) throw new Error('The movie catalog is not answering right now.');
  const body = await res.json();
  return (body.metas || []).filter(isImdb).slice(0, 10);
}

const metas = new Map();
export async function movieMeta(id) {
  if (!metas.has(id)) {
    metas.set(id, fetch(`${BASE}/meta/movie/${encodeURIComponent(id)}.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((b) => b.meta || null)
      .catch(() => { metas.delete(id); return null; }));
  }
  return metas.get(id);
}

// catalog('top' | 'year' | 'imdbRating', { genre, skip }) — cached per URL.
const lists = new Map();
export function catalog(id, { genre = '', skip = 0 } = {}) {
  const extra = [genre && `genre=${encodeURIComponent(genre)}`, skip && `skip=${skip}`].filter(Boolean).join('&');
  const url = `${BASE}/catalog/movie/${id}${extra ? `/${extra}` : ''}.json`;
  if (!lists.has(url)) {
    lists.set(url, fetch(url)
      .then((r) => (r.ok ? r.json() : { metas: [] }))
      .then((b) => (b.metas || []).filter(isImdb))
      .catch(() => { lists.delete(url); return []; }));
  }
  return lists.get(url);
}

export const trending = (genre = '') => catalog('top', { genre });
export const newThisYear = () => catalog('year', { genre: String(new Date().getFullYear()) });
export const topMovies = () => catalog('top');

// A wide candidate pool for recommendations: two pages of what's popular in
// each genre, plus the featured list.
export async function candidatePool(genres) {
  const pages = await Promise.all(genres.flatMap((g) => [
    catalog('top', { genre: g }), catalog('top', { genre: g, skip: 50 }), catalog('imdbRating', { genre: g }),
  ]));
  const seen = new Map();
  for (const m of pages.flat()) seen.set(m.imdb_id || m.id, m);
  return [...seen.values()];
}
