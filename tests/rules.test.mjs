// Runs the site's real writes (public/js/actions.js) against firestore.rules
// in the emulator. `npm test` starts the emulator.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction, setDoc, updateDoc,
} from 'firebase/firestore';
import { makeActions, AlreadyOnShelfError } from '../public/js/actions.js';
import { pickMovie } from '../public/js/logic.js';

const F = { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction };
const KEY = 'host-key-for-tests-0123456789';
const BAD = 'wrong-key-wrong-key-wrong';
let env, db, A;

const movie = (n, extra = {}) => ({
  imdbId: `tt00000${String(n).padStart(2, '0')}`, title: `Movie ${n}`, year: '1999', poster: '',
  runtime: '120 min', rating: '7.0', genres: ['Drama'], trailer: '', description: '', ...extra,
});
const H = 3600 * 1000;

// Nights can only be created in the future; tests move one into the past
// with the rules switched off (as time passing would).
async function pastNight(who, dayKey, startsAt) {
  await A.hostNight(who, dayKey, new Date(Date.now() + 86400000));
  await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), 'nights', dayKey), { startsAt }); });
}
const day = (offsetDays) => { const d = new Date(Date.now() + offsetDays * 86400000); return d.toISOString().slice(0, 10); };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-picture-show',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8181 },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  db = env.unauthenticatedContext().firestore();
  A = makeActions(db, F);
  await A.seedHostKey(KEY);
});

test('owner key: one-shot, unreadable, needed for owner tools', async () => {
  await assertFails(A.seedHostKey('another-key-that-is-long-enough'));
  await assertFails(getDoc(doc(db, 'config', 'host')));
  assert.equal(await A.checkHostKey(KEY), true);
  assert.equal(await A.checkHostKey(BAD), false);
  await assertFails(A.setSeason(BAD, 'Hijacked'));
  await assertSucceeds(A.setSeason(KEY, 'Spooky Season'));
  assert.equal((await getDoc(doc(db, 'config', 'season'))).data().title, 'Spooky Season');
  // Replaying the last op id without the key fails.
  const op = (await getDoc(doc(db, 'config', 'season'))).data().op;
  await assertFails(setDoc(doc(db, 'config', 'season'), { op, title: 'Again' }));
});

test('anyone adds movies, no cap; duplicates are refused; tags are house-only', async () => {
  const sam = await A.join('Sam');
  for (let i = 1; i <= 8; i++) await A.addMovie(sam, movie(i), i === 1 ? 'A classic' : '');
  assert.equal((await getDocs(collection(db, 'movies'))).size, 8);
  assert.equal((await getDoc(doc(db, 'votes', `${movie(1).imdbId}__sam`))).data().title, 'Movie 1', 'adding gives your thumb');
  const jo = await A.join('Jo');
  await assert.rejects(A.addMovie(jo, movie(1)), AlreadyOnShelfError);
  const b = writeBatch(db);
  b.set(doc(db, 'movies', 'tt0000099'), { ...movie(99), imdbId: 'tt0000099', shelf: ['Foreign'], by: 'jo', byName: 'Jo', at: serverTimestamp() });
  await assertFails(b.commit());
});

test('house picks need the key and only come off with it', async () => {
  await assertFails(A.addHousePicks(BAD, [movie(1, { shelf: ['Foreign'] })]));
  assert.equal((await A.addHousePicks(KEY, Array.from({ length: 27 }, (_, i) => movie(i + 10, { shelf: ['Foreign'] })))).length, 27);
  const m = (await getDoc(doc(db, 'movies', movie(10).imdbId))).data();
  assert.equal(m.by, '');
  const forged = writeBatch(db);
  forged.set(doc(db, 'movies', 'tt0000098'), { ...movie(98), imdbId: 'tt0000098', by: '', byName: 'The house', at: serverTimestamp() });
  await assertFails(forged.commit());
  await assertFails(A.removeMovie(m));
  await assertSucceeds(A.ownerRemoveMovie(KEY, m));
  const sam = await A.join('Sam');
  await A.addMovie(sam, movie(2));
  await assertSucceeds(A.removeMovie(movie(2), ['sam']));
});

test('thumbs and seen marks: one per person, only on real movies', async () => {
  const sam = await A.join('Sam');
  const jo = await A.join('Jo');
  await A.addMovie(sam, movie(1));
  await assertSucceeds(A.setVote(movie(1), jo, true));
  await assertFails(A.setVote(movie(1), jo, true)); // second create = update
  await assertSucceeds(A.setVote(movie(1), jo, false));
  await assertFails(A.setVote(movie(5), jo, true));
  await assertSucceeds(A.setSeen(movie(1), jo, true));
  await assertFails(A.setSeen(movie(5), jo, true));
  await assertSucceeds(A.setSeen(movie(1), jo, false));
});

test('free evenings and volunteering to host', async () => {
  const sam = await A.join('Sam');
  const jo = await A.join('Jo');
  const d = day(5);
  await assertSucceeds(A.setFree(d, sam, true));
  await assertSucceeds(A.setFree(d, sam, false));
  await assertFails(A.setFree('not-a-day', sam, true));
  const start = new Date(Date.now() + 5 * 86400000);
  await assertSucceeds(A.hostNight(jo, d, start));
  const n = (await getDoc(doc(db, 'nights', d))).data();
  assert.equal(n.host, 'Jo');
  assert.equal(n.status, 'planned');
  assert.ok((await getDoc(doc(db, 'free', `${d}__jo`))).exists(), 'hosting marks you free');
  await assert.rejects(A.hostNight(sam, d, start), /already hosting/);
  // A forged night with a lock already in it is refused.
  await assertFails(setDoc(doc(db, 'nights', day(6)), { day: day(6), startsAt: start, host: 'X', hostKey: 'x', status: 'locked', createdAt: serverTimestamp(), lockedMovieId: 'tt1', lockedAt: null }));
  await assertSucceeds(A.setNightTime(d, new Date(start.getTime() + H)));
  await assertSucceeds(A.cancelNight(d));
  await assertSucceeds(A.hostNight(sam, d, start)); // someone else takes the day
  assert.equal((await getDoc(doc(db, 'nights', d))).data().host, 'Sam');
});

test('locking: real movie only, once; unlock before showtime; done after', async () => {
  const sam = await A.join('Sam');
  await A.addMovie(sam, movie(1));
  await A.addMovie(sam, movie(2));
  const d = day(3);
  await A.hostNight(sam, d, new Date(Date.now() + 3 * 86400000));
  const pick = pickMovie({ movies: [movie(1), movie(2)], votes: [{ movie: movie(2).imdbId, nameKey: 'sam', name: 'Sam' }], attendees: ['sam'] });
  assert.equal(await A.lockNight(d, pick), true);
  assert.equal(await A.lockNight(d, pick), false, 'already locked');
  const n = (await getDoc(doc(db, 'nights', d))).data();
  assert.equal(n.lockedMovieId, movie(2).imdbId);
  await assertFails(A.finishNight(d)); // not after showtime yet
  await assertSucceeds(A.unlockNight(d));
  // Locking to a movie that isn't on the shelf is refused.
  await assertFails(updateDoc(doc(db, 'nights', d), { status: 'locked', lockedMovieId: 'tt9999999', lockedMovie: {}, lockedTie: [], lockedAt: serverTimestamp() }));
  // A night that already started can be filed.
  const past = day(-1);
  await pastNight(sam, past, new Date(Date.now() - 3 * H));
  await A.lockNight(past, pick);
  await assertFails(A.unlockNight(past));
  assert.equal(await A.finishNight(past), true);
  assert.equal((await getDoc(doc(db, 'nights', past))).data().status, 'done');
});

test('snacks while planned or locked; reviews after showtime', async () => {
  const sam = await A.join('Sam');
  await A.addMovie(sam, movie(1));
  const future = day(4);
  await A.hostNight(sam, future, new Date(Date.now() + 4 * 86400000));
  await assertSucceeds(A.addSnack(future, sam, 'Popcorn'));
  await assertFails(A.review(future, sam, 5));
  const past = day(-1);
  await pastNight(sam, past, new Date(Date.now() - 3 * H));
  await A.lockNight(past, { movie: movie(1), tie: [] });
  await assertSucceeds(A.review(past, sam, 4, 'Great'));
  await A.finishNight(past);
  await assertSucceeds(A.review(past, sam, 5, 'Better on reflection'));
  await assertFails(A.addSnack(past, sam, 'Late chips'));
});

test('only the owner can point the Shield at a movie', async () => {
  await assertSucceeds(A.showOnShield(KEY, movie(1)));
  await assertFails(A.showOnShield(BAD, movie(2)));
  await assertFails(A.showOnShield(KEY, { ...movie(3), imdbId: 'not-an-id' }));
});

test('bug-hunt fixes: caps, cancel rules, snacks cleared, past starts refused', async () => {
  const sam = await A.join('Sam');
  const big = writeBatch(db);
  big.set(doc(db, 'movies', 'tt0000077'), { ...movie(77), imdbId: 'tt0000077', year: 'x'.repeat(500), by: 'sam', byName: 'Sam', at: serverTimestamp() });
  await assertFails(big.commit());
  const badTrailer = writeBatch(db);
  badTrailer.set(doc(db, 'movies', 'tt0000078'), { ...movie(78), imdbId: 'tt0000078', trailer: '"><script>', by: 'sam', byName: 'Sam', at: serverTimestamp() });
  await assertFails(badTrailer.commit());
  await assert.rejects(A.hostNight(sam, day(-1), new Date(Date.now() - H)));
  const d = day(6);
  await A.hostNight(sam, d, new Date(Date.now() + 6 * 86400000));
  await A.addSnack(d, sam, 'Chips');
  await assertFails(A.setNightTime(d, new Date(Date.now() - H)));
  await A.cancelNight(d);
  assert.equal((await getDocs(collection(db, 'nights', d, 'snacks'))).size, 0, 'cancel clears snacks');
  await A.hostNight(sam, d, new Date(Date.now() + 6 * 86400000));
  const started = day(-2);
  await A.addMovie(sam, movie(1));
  await pastNight(sam, started, new Date(Date.now() - 2 * H));
  await assertFails(A.cancelNight(started));
});

test('names are validated', async () => {
  await assert.rejects(A.join('   '));
  const b = writeBatch(db);
  b.set(doc(db, 'people', 'Bad Key'), { name: 'x', at: serverTimestamp() });
  await assertFails(b.commit());
  assert.deepEqual(await A.join('  Zoë   Q '), { name: 'Zoë Q', nameKey: 'zoe-q' });
});

test('owner password: changing it needs the current one, then only the new one works', async () => {
  await assertFails(A.changeOwnerPassword(BAD, 'my-new-password'));
  await assert.rejects(A.changeOwnerPassword(KEY, 'short'), /8 characters/);
  await assertSucceeds(A.changeOwnerPassword(KEY, 'my-new-password'));
  assert.equal(await A.checkHostKey('my-new-password'), true);
  assert.equal(await A.checkHostKey(KEY), false);
  await assertFails(getDoc(doc(db, 'config', 'host')));
  // Straight to the doc, skipping the client's length check: still refused.
  const b = writeBatch(db);
  b.set(doc(db, 'hostops', 'abcdefghijklmnopqrstuvwx'), { key: 'my-new-password', at: serverTimestamp() });
  b.set(doc(db, 'config', 'host'), { key: 'tiny', op: 'abcdefghijklmnopqrstuvwx' });
  await assertFails(b.commit());
});

test('your settings live on your people doc', async () => {
  const sam = await A.join('Sam');
  await assertSucceeds(A.savePrefs(sam, { lastSeen: true, toured: true, hostTime: '19:30', reels: ['2026-10-31.tt0000001'] }));
  const d = (await getDoc(doc(db, 'people', 'sam'))).data();
  assert.equal(d.name, 'Sam');
  assert.equal(d.toured, true);
  assert.equal(d.hostTime, '19:30');
  assert.ok(d.lastSeen);
  await assertFails(A.savePrefs(sam, { hostTime: 'late' }));
  await assertFails(A.savePrefs(sam, { name: 'Somebody else' }));
  await assertFails(A.savePrefs(sam, { secret: 1 }));
  await assertFails(A.savePrefs({ name: 'Nobody', nameKey: 'nobody' }, { toured: true })); // join first
});
