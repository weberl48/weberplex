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

// ---- themes and vetoes ------------------------------------------------------------
const nightDoc = (d, host, extra = {}) => ({
  day: d, startsAt: new Date(Date.now() + 5 * 86400000), host, hostKey: host.toLowerCase(), status: 'planned', createdAt: new Date(),
  lockedMovieId: null, lockedMovie: null, lockedTie: [], lockedAt: null, finishedAt: null, ...extra,
});
const asAdmin = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
const vetoesOf = async (d) => (await getDoc(doc(db, 'nights', d))).data().vetoes;

test('hosting can carry a theme; a night starts with no vetoes', async () => {
  const jo = await A.join('Jo');
  const d = day(5);
  await assertSucceeds(A.hostNight(jo, d, new Date(Date.now() + 5 * 86400000), 'Foreign'));
  const n = (await getDoc(doc(db, 'nights', d))).data();
  assert.equal(n.theme, 'Foreign');
  assert.deepEqual(n.vetoes, {});
  const plain = day(6);
  await A.hostNight(jo, plain, new Date(Date.now() + 6 * 86400000));
  assert.equal((await getDoc(doc(db, 'nights', plain))).data().theme, '', 'no theme is an empty string');
  // The rules cap the theme and refuse a night created with vetoes already in it.
  const long = day(7);
  const later = new Date(Date.now() + 7 * 86400000);
  const forged = (extra) => setDoc(doc(db, 'nights', long), { ...nightDoc(long, 'Jo', { startsAt: later }), createdAt: serverTimestamp(), ...extra });
  await assertFails(forged({ theme: 'x'.repeat(41), vetoes: {} }));
  await assertFails(forged({ theme: 'ok', vetoes: { jo: 'tt0000001' } }));
  await assertFails(forged({ theme: 5, vetoes: {} }));
  await assertSucceeds(forged({ theme: 'x'.repeat(40), vetoes: {} }));
});

test('the theme can change while a night is planned, nothing else rides along', async () => {
  const jo = await A.join('Jo');
  const d = day(5);
  await A.hostNight(jo, d, new Date(Date.now() + 5 * 86400000));
  await assertSucceeds(A.setTheme(d, 'Horror'));
  assert.equal((await getDoc(doc(db, 'nights', d))).data().theme, 'Horror');
  await assertSucceeds(A.setTheme(d, ''));
  assert.equal((await getDoc(doc(db, 'nights', d))).data().theme, '');
  await assertSucceeds(A.setTheme(d, '  Drama   night '));
  assert.equal((await getDoc(doc(db, 'nights', d))).data().theme, 'Drama night');
  await assertFails(updateDoc(doc(db, 'nights', d), { theme: 'x'.repeat(41) }));
  await assertFails(updateDoc(doc(db, 'nights', d), { theme: 7 }));
  await assertFails(updateDoc(doc(db, 'nights', d), { theme: 'Sneaky', host: 'Somebody else' }));
  await assertFails(updateDoc(doc(db, 'nights', d), { theme: 'Sneaky', status: 'cancelled' }));
  // Locked nights keep the theme they were picked with.
  await A.addMovie(jo, movie(1));
  await A.lockNight(d, { movie: movie(1), tie: [] });
  await assertFails(A.setTheme(d, 'Too late'));
});

test('the host and people who are free can veto once, and undo it', async () => {
  const jo = await A.join('Jo');
  const sam = await A.join('Sam');
  const al = await A.join('Al');
  await A.addMovie(jo, movie(1));
  await A.addMovie(jo, movie(2));
  const d = day(4);
  await A.hostNight(jo, d, new Date(Date.now() + 4 * 86400000));
  assert.equal(await A.setVeto(d, jo, movie(1).imdbId), true);
  assert.deepEqual(await vetoesOf(d), { jo: movie(1).imdbId });
  // Sam is not free that evening and not hosting: refused.
  await assertFails(A.setVeto(d, sam, movie(2).imdbId));
  await A.setFree(d, sam, true);
  assert.equal(await A.setVeto(d, sam, movie(2).imdbId), true);
  assert.deepEqual(await vetoesOf(d), { jo: movie(1).imdbId, sam: movie(2).imdbId });
  // One veto each: a second movie goes through the undo.
  await assertFails(A.setVeto(d, sam, movie(1).imdbId));
  assert.equal(await A.setVeto(d, sam, null), true);
  assert.deepEqual(await vetoesOf(d), { jo: movie(1).imdbId });
  assert.equal(await A.setVeto(d, sam, movie(1).imdbId), true, 'and a new one after the undo');
  assert.equal(await A.setVeto(d, jo, null), true);
  assert.deepEqual(await vetoesOf(d), { sam: movie(1).imdbId });
  // Undoing when you never vetoed changes nothing (a no-op write, like any other).
  assert.equal(await A.setVeto(d, jo, null), true);
  assert.deepEqual(await vetoesOf(d), { sam: movie(1).imdbId });
  // Someone who was free and no longer is can't veto either.
  await A.setFree(d, al, true);
  await A.setFree(d, al, false);
  await assertFails(A.setVeto(d, al, movie(2).imdbId));
});

test('a veto is one key per write, for a movie on the shelf, on a planned night', async () => {
  const jo = await A.join('Jo');
  const sam = await A.join('Sam');
  await A.addMovie(jo, movie(1));
  const d = day(4);
  await A.hostNight(jo, d, new Date(Date.now() + 4 * 86400000));
  await A.setFree(d, sam, true);
  const night = () => doc(db, 'nights', d);
  const id = movie(1).imdbId;
  // Two keys at once, a key that isn't a valid name key, a movie that isn't there, odd shapes.
  await assertFails(updateDoc(night(), { vetoes: { jo: id, sam: id } }));
  await assertFails(updateDoc(night(), { vetoes: { 'Bad Key': id } }));
  await assertFails(updateDoc(night(), { vetoes: { jo: 'tt9999999' } }));
  await assertFails(updateDoc(night(), { vetoes: { jo: 42 } }));
  await assertFails(updateDoc(night(), { vetoes: 'everything' }));
  await assertFails(updateDoc(night(), { vetoes: { jo: id }, theme: 'Mixed in' }));
  // Vetoing in somebody else's name works only if they are free (name-only trust,
  // as with thumbs), and still one key per write.
  await assertSucceeds(updateDoc(night(), { vetoes: { sam: id } }));
  await assertSucceeds(updateDoc(night(), { vetoes: { sam: id, jo: id } })); // the host's key is the one added
  await assertFails(updateDoc(night(), { vetoes: {} })); // two removed at once
  await assertFails(updateDoc(night(), { vetoes: { jo: id, al: id } })); // one swapped for another
  await assertSucceeds(updateDoc(night(), { vetoes: { jo: id } })); // Sam's taken back
  await assertSucceeds(updateDoc(night(), { vetoes: {} }));
  // A locked night takes no more vetoes.
  await A.lockNight(d, { movie: movie(1), tie: [] });
  assert.equal(await A.setVeto(d, sam, id), false);
  await assertFails(updateDoc(night(), { vetoes: { sam: id } }));
});

test('at most 30 vetoes on a night', async () => {
  const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  const d = day(4);
  const thirty = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`guest-${i}`, movie(1).imdbId]));
  await asAdmin((admin) => setDoc(doc(admin, 'nights', d), nightDoc(d, 'Jo', { theme: '', vetoes: thirty })));
  await assertFails(A.setVeto(d, jo, movie(1).imdbId));
  await asAdmin((admin) => updateDoc(doc(admin, 'nights', d), { vetoes: Object.fromEntries(Object.entries(thirty).slice(1)) }));
  await assertSucceeds(A.setVeto(d, jo, movie(1).imdbId));
});

test('nights from before themes and vetoes still lock, unlock and finish', async () => {
  const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  const d = day(3);
  await asAdmin((admin) => setDoc(doc(admin, 'nights', d), nightDoc(d, 'Jo', { startsAt: new Date(Date.now() + 3 * 86400000) })));
  assert.equal('vetoes' in (await getDoc(doc(db, 'nights', d))).data(), false, 'an old doc has neither field');
  await assertSucceeds(A.setNightTime(d, new Date(Date.now() + 3 * 86400000 + H)));
  assert.equal(await A.lockNight(d, { movie: movie(1), tie: [] }), true);
  await assertSucceeds(A.unlockNight(d));
  assert.equal(await A.lockNight(d, { movie: movie(1), tie: [] }), true);
  // A past old-style night is filed as watched.
  const past = day(-2);
  await asAdmin((admin) => setDoc(doc(admin, 'nights', past), nightDoc(past, 'Jo', {
    startsAt: new Date(Date.now() - 3 * H), status: 'locked', lockedMovieId: movie(1).imdbId, lockedMovie: movie(1), lockedAt: new Date(Date.now() - 30 * H),
  })));
  assert.equal(await A.finishNight(past), true);
  assert.equal((await getDoc(doc(db, 'nights', past))).data().status, 'done');
  // The first veto or theme on an old doc adds the field.
  const old2 = day(8);
  await asAdmin((admin) => setDoc(doc(admin, 'nights', old2), nightDoc(old2, 'Jo', { startsAt: new Date(Date.now() + 8 * 86400000) })));
  assert.equal(await A.setVeto(old2, jo, movie(1).imdbId), true);
  assert.deepEqual(await vetoesOf(old2), { jo: movie(1).imdbId });
  const old3 = day(9);
  await asAdmin((admin) => setDoc(doc(admin, 'nights', old3), nightDoc(old3, 'Jo', { startsAt: new Date(Date.now() + 9 * 86400000) })));
  await assertSucceeds(A.setTheme(old3, 'Horror'));
});

test('cancelling and re-hosting starts a night clean: no old vetoes or theme', async () => {
  const jo = await A.join('Jo');
  const sam = await A.join('Sam');
  await A.addMovie(jo, movie(1));
  const d = day(4);
  const start = new Date(Date.now() + 4 * 86400000);
  await A.hostNight(jo, d, start, 'Horror');
  await A.setVeto(d, jo, movie(1).imdbId);
  await A.cancelNight(d);
  await assertSucceeds(A.hostNight(sam, d, start));
  const n = (await getDoc(doc(db, 'nights', d))).data();
  assert.deepEqual(n.vetoes, {});
  assert.equal(n.theme, '');
  assert.equal(n.host, 'Sam');
});

test('a reveal is remembered on your people doc next to the tie reels', async () => {
  const sam = await A.join('Sam');
  await assertSucceeds(A.savePrefs(sam, { reels: ['2026-10-31.tt0000001', 'r:2026-11-07.tt0000002'] }));
  assert.deepEqual((await getDoc(doc(db, 'people', 'sam'))).data().reels, ['2026-10-31.tt0000001', 'r:2026-11-07.tt0000002']);
});
