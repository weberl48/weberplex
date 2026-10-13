// Seed house picks onto the current night (books one if none is open).
//   HOST_KEY=... node tools/seed.mjs seed/spooky-season.json [--emu]
// Each pick: { q, year, imdb, tags }. `imdb` is pinned so a re-run never
// drifts to a different film; titles already on the ballot are skipped.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, doc, collection, writeBatch, serverTimestamp,
  getDoc, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { makeActions } from '../public/js/actions.js';
import { movieFromMeta } from '../public/js/logic.js';
import { firebaseConfig } from '../public/js/config.js';

const [file, flag] = process.argv.slice(2);
const KEY = process.env.HOST_KEY;
if (!file || !KEY) { console.error('usage: HOST_KEY=... node tools/seed.mjs <seed.json> [--emu]'); process.exit(2); }
const seed = JSON.parse(readFileSync(file, 'utf8'));

const db = getFirestore(initializeApp(firebaseConfig));
if (flag === '--emu') connectFirestoreEmulator(db, '127.0.0.1', 8181);
const A = makeActions(db, { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, query, where });

const nights = (await getDocs(query(collection(db, 'nights'), orderBy('createdAt', 'desc'), limit(10))))
  .docs.map((d) => ({ id: d.id, ...d.data() }));
let night = nights.find((n) => n.status === 'open' || n.status === 'locked');
if (!night) {
  const id = await A.createNight(KEY, { title: seed.title || '', dates: [] });
  night = { id, title: seed.title, status: 'open' };
  console.log(`booked a new night "${seed.title}" (${id}); add dates in the host console`);
} else {
  console.log(`using the current night "${night.title || 'Movie night'}" (${night.id}, ${night.status})`);
}

const pool = (await getDocs(collection(db, 'nights', night.id, 'movies'))).docs.map((d) => d.data());
const movies = [];
for (const p of seed.picks) {
  const res = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${p.imdb}.json`);
  const meta = res.ok ? (await res.json()).meta : null;
  if (!meta) { console.warn(`  ! no catalog entry for ${p.q} (${p.imdb}); skipped`); continue; }
  movies.push({ ...movieFromMeta({ ...meta, id: p.imdb }), shelf: p.tags || [] });
}

// One batch if the rules allow it; otherwise smaller batches.
let added = [];
try {
  added = await A.addHousePicks(KEY, night.id, movies, pool);
} catch (e) {
  if (e?.code !== 'permission-denied') throw e;
  console.log('  one big batch was refused; adding in groups of 5');
  for (let i = 0; i < movies.length; i += 5) {
    added.push(...await A.addHousePicks(KEY, night.id, movies.slice(i, i + 5), pool));
  }
}
const skipped = movies.length - added.length;
console.log(`added ${added.length} house picks${skipped ? `, skipped ${skipped} already on the ballot` : ''}`);
process.exit(0);
