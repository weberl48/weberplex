// Seed house picks onto the shelf.
//   HOST_KEY=... node tools/seed.mjs seed/spooky-season.json [--emu] [--seen-as "Lucas"]
// Each pick: { q, year, imdb, tags }. `imdb` is pinned so a re-run never drifts
// to a different film; anything already on the shelf is skipped. Tags that are
// shelf tags (Foreign, Found footage, Recent favorite) are kept. With
// --seen-as, picks tagged "Rewatch" get a "seen it" mark under that name
// (seen/unseen is per person now, not a tag).
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction,
} from 'firebase/firestore';
import { makeActions } from '../public/js/actions.js';
import { movieFromMeta, SHELF_ORDER } from '../public/js/logic.js';
import { firebaseConfig } from '../public/js/config.js';

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.json'));
const emu = args.includes('--emu');
const seenAs = args.includes('--seen-as') ? args[args.indexOf('--seen-as') + 1] : null;
const KEY = process.env.HOST_KEY;
if (!file || !KEY) { console.error('usage: HOST_KEY=... node tools/seed.mjs <seed.json> [--emu] [--seen-as Name]'); process.exit(2); }
const seed = JSON.parse(readFileSync(file, 'utf8'));

const db = getFirestore(initializeApp(firebaseConfig));
if (emu) connectFirestoreEmulator(db, '127.0.0.1', 8181);
const A = makeActions(db, { doc, collection, writeBatch, serverTimestamp, getDoc, runTransaction });

const shelf = (await getDocs(collection(db, 'movies'))).docs.map((d) => d.data());
const movies = [];
for (const p of seed.picks) {
  const res = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${p.imdb}.json`);
  const meta = res.ok ? (await res.json()).meta : null;
  if (!meta) { console.warn(`  ! no catalog entry for ${p.q} (${p.imdb}); skipped`); continue; }
  movies.push({ ...movieFromMeta({ ...meta, id: p.imdb }), shelf: (p.tags || []).filter((t) => SHELF_ORDER.includes(t)) });
}
const added = await A.addHousePicks(KEY, movies, shelf);
console.log(`added ${added.length} house picks, skipped ${movies.length - added.length} already on the shelf`);

if (seenAs) {
  const who = A.me(seenAs);
  const onShelf = new Set([...shelf.map((m) => m.imdbId), ...added]);
  const rewatch = seed.picks.filter((p) => (p.tags || []).includes('Rewatch') && onShelf.has(p.imdb));
  for (const p of rewatch) {
    if ((await getDoc(doc(db, 'seen', `${p.imdb}__${who.nameKey}`))).exists()) continue;
    try { await A.setSeen({ imdbId: p.imdb }, who, true); } catch (e) { console.warn(`  ! could not mark ${p.q}: ${e.message}`); }
  }
  console.log(`marked ${rewatch.length} as seen by ${who.name}`);
}
if (seed.title && args.includes('--season')) await A.setSeason(KEY, seed.title);
process.exit(0);
