// Stremio's public Cinemeta catalog: keyless, CORS-open, and its ids are the
// IMDb ids the Shield's Stremio deep link opens.
const BASE = 'https://v3-cinemeta.strem.io';
const isImdb = (m) => /^tt\d{5,10}$/.test(m.imdb_id || m.id || '');

export async function searchMovies(q, signal) {
  const res = await fetch(`${BASE}/catalog/movie/top/search=${encodeURIComponent(q)}.json`, { signal });
  if (!res.ok) throw new Error('The movie catalog is not answering right now.');
  const body = await res.json();
  return (body.metas || []).filter(isImdb).slice(0, 10);
}

export async function movieMeta(id) {
  const res = await fetch(`${BASE}/meta/movie/${encodeURIComponent(id)}.json`);
  if (!res.ok) return null;
  return (await res.json()).meta || null;
}

let top = null;
export async function topMovies() {
  if (!top) {
    top = fetch(`${BASE}/catalog/movie/top.json`)
      .then((r) => (r.ok ? r.json() : { metas: [] }))
      .then((b) => (b.metas || []).filter(isImdb))
      .catch(() => { top = null; return []; });
  }
  return top;
}
