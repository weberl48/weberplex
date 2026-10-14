// Runs the site's real write batches (public/js/actions.js) against
// firestore.rules in the emulator. `npm test` starts the emulator.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, query, where, setDoc,
} from 'firebase/firestore';
import { makeActions, PicksFullError, AlreadyPickedError } from '../public/js/actions.js';

const F = { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, query, where };
const KEY = 'host-key-for-tests-0123456789';
let env, db, A;

const movie = (n, extra = {}) => ({
  imdbId: `tt00000${String(n).padStart(2, '0')}`, title: `Movie ${n}`, year: '1999', poster: '',
  runtime: '120 min', rating: '7.0', genres: ['Drama'], trailer: '', description: '', ...extra,
});
const hour = 3600 * 1000;

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

async function openNight(dates = [new Date(Date.now() + 48 * hour), new Date(Date.now() + 72 * hour)]) {
  const id = await A.createNight(KEY, { title: 'Spooky', dates });
  const ds = await getDocs(collection(db, 'nights', id, 'dates'));
  return { id, dates: ds.docs.map((d) => ({ id: d.id, startsAt: d.data().startsAt.toDate() })) };
}

test('host key is one-shot and unreadable', async () => {
  await assertFails(A.seedHostKey('another-key-that-is-long-enough'));
  await assertFails(getDoc(doc(db, 'config', 'host')));
});

test('only the key holder can create or change nights', async () => {
  await assertFails(A.createNight('wrong-key-wrong-key-wrong', { title: 'x', dates: [new Date()] }));
  const { id } = await openNight();
  await assertFails(A.renameNight('wrong-key-wrong-key-wrong', id, 'Hijacked'));
  await assertSucceeds(A.renameNight(KEY, id, 'Renamed'));
  assert.equal((await getDoc(doc(db, 'nights', id))).data().title, 'Renamed');
  assert.equal(await A.checkHostKey(KEY, id), true);
  assert.equal(await A.checkHostKey('wrong-key-wrong-key-wrong', id), false);
});

test('an old host op cannot be replayed', async () => {
  const { id } = await openNight();
  const oldOp = (await getDoc(doc(db, 'nights', id))).data().op;
  await A.renameNight(KEY, id, 'Second');
  await assertFails(setDoc(doc(db, 'nights', id), { title: 'Hijack', status: 'open', op: oldOp }, { merge: true }));
});

test('guests can RSVP to real dates only', async () => {
  const { id, dates } = await openNight();
  const sam = await A.join('Sam');
  await assertSucceeds(A.setRsvp(id, dates[0].id, sam, true));
  await assertSucceeds(A.setRsvp(id, dates[0].id, sam, false));
  await assertFails(A.setRsvp(id, 'nope', sam, true));
});

test('five picks per person, a sixth is refused even when forged', async () => {
  const { id } = await openNight();
  const sam = await A.join('Sam');
  for (let i = 1; i <= 5; i++) await A.suggest(id, sam, movie(i));
  await assert.rejects(A.suggest(id, sam, movie(6)), PicksFullError);
  // Forge a sixth slot directly.
  const b = writeBatch(db);
  b.set(doc(db, 'nights', id, 'movies', movie(6).imdbId), { ...movie(6), by: 'sam', byName: 'Sam', slot: 6, at: serverTimestamp() });
  b.set(doc(db, 'nights', id, 'slots', 'sam__6'), { movie: movie(6).imdbId, by: 'sam', slot: 6 });
  await assertFails(b.commit());
  // Forge reuse of a taken slot.
  const b2 = writeBatch(db);
  b2.set(doc(db, 'nights', id, 'movies', movie(7).imdbId), { ...movie(7), by: 'sam', byName: 'Sam', slot: 1, at: serverTimestamp() });
  await assertFails(b2.commit());
  // Someone else still has five of their own.
  const jo = await A.join('Jo');
  await assertSucceeds(A.suggest(id, jo, movie(6)));
});

test('removing a pick frees its slot and clears its votes', async () => {
  const { id } = await openNight();
  const sam = await A.join('Sam');
  const jo = await A.join('Jo');
  for (let i = 1; i <= 5; i++) await A.suggest(id, sam, movie(i));
  await A.setVote(id, movie(3).imdbId, jo, true);
  const m3 = (await getDoc(doc(db, 'nights', id, 'movies', movie(3).imdbId))).data();
  await assertSucceeds(A.unsuggest(id, m3, ['jo']));
  assert.equal((await getDocs(collection(db, 'nights', id, 'votes'))).size, 0);
  assert.equal(await A.suggest(id, sam, movie(9)), 3);
});

test('a movie can only be on the ballot once', async () => {
  const { id } = await openNight();
  const sam = await A.join('Sam');
  const jo = await A.join('Jo');
  await A.suggest(id, sam, movie(1));
  await assert.rejects(A.suggest(id, jo, movie(1)), AlreadyPickedError); // stale pool, caught by the batch
  await assert.rejects(A.suggest(id, jo, movie(1), [{ ...movie(1), byName: 'Sam' }]), AlreadyPickedError);
});

test('one vote per person per movie, only on real movies', async () => {
  const { id } = await openNight();
  const sam = await A.join('Sam');
  await A.suggest(id, sam, movie(1));
  await assertSucceeds(A.setVote(id, movie(1).imdbId, sam, true));
  await assertFails(A.setVote(id, movie(1).imdbId, sam, true)); // second create = update
  await assertSucceeds(A.setVote(id, movie(1).imdbId, sam, false));
  await assertFails(A.setVote(id, 'tt9999999', sam, true));
});

test('locking freezes picks and votes but keeps RSVPs and snacks open', async () => {
  const { id, dates } = await openNight();
  const sam = await A.join('Sam');
  await A.suggest(id, sam, movie(1));
  const m1 = (await getDoc(doc(db, 'nights', id, 'movies', movie(1).imdbId))).data();
  await assertFails(A.lock('wrong-key-wrong-key-wrong', id, dates[0], m1));
  await assertSucceeds(A.lock(KEY, id, dates[0], m1));
  const n = (await getDoc(doc(db, 'nights', id))).data();
  assert.equal(n.status, 'locked');
  assert.equal(n.lockedMovie.title, 'Movie 1');
  await assertFails(A.suggest(id, sam, movie(2)));
  await assertFails(A.setVote(id, movie(1).imdbId, sam, true));
  await assertSucceeds(A.setRsvp(id, dates[0].id, sam, true));
  await assertSucceeds(A.addSnack(id, sam, 'Popcorn'));
  await assertSucceeds(A.reopen(KEY, id));
  await assertSucceeds(A.setVote(id, movie(1).imdbId, sam, true));
});

test('reviews open only after the showtime has passed', async () => {
  const future = await openNight();
  const sam = await A.join('Sam');
  await A.suggest(future.id, sam, movie(1));
  const m1 = (await getDoc(doc(db, 'nights', future.id, 'movies', movie(1).imdbId))).data();
  await A.lock(KEY, future.id, future.dates[0], m1);
  await assertFails(A.review(future.id, sam, 5, 'too early'));

  const past = await openNight([new Date(Date.now() - 3 * hour)]);
  await A.suggest(past.id, sam, movie(2));
  const m2 = (await getDoc(doc(db, 'nights', past.id, 'movies', movie(2).imdbId))).data();
  await A.lock(KEY, past.id, past.dates[0], m2);
  await assertSucceeds(A.review(past.id, sam, 4, 'Great sound'));
  await assertSucceeds(A.review(past.id, sam, 5, 'Changed my mind'));
  await A.finish(KEY, past.id);
  await assertSucceeds(A.review(past.id, sam, 5, 'Still holds up'));
  const bad = writeBatch(db);
  bad.set(doc(db, 'nights', past.id, 'reviews', 'sam'), { stars: 9, line: '', nameKey: 'sam', name: 'Sam', at: serverTimestamp() });
  await assertFails(bad.commit());
});

test('host can remove a movie (with its votes) and a date (with its RSVPs)', async () => {
  const { id, dates } = await openNight();
  const sam = await A.join('Sam');
  const jo = await A.join('Jo');
  await A.suggest(id, sam, movie(1));
  await A.setVote(id, movie(1).imdbId, jo, true);
  await A.setRsvp(id, dates[1].id, jo, true);
  const m1 = (await getDoc(doc(db, 'nights', id, 'movies', movie(1).imdbId))).data();
  await assertSucceeds(A.removeMovie(KEY, id, m1, ['jo']));
  await assertSucceeds(A.removeDate(KEY, id, dates[1].id, ['jo']));
  assert.equal((await getDocs(collection(db, 'nights', id, 'rsvps'))).size, 0);
  // A guest cannot delete a date.
  const b = writeBatch(db);
  b.delete(doc(db, 'nights', id, 'dates', dates[0].id));
  await assertFails(b.commit());
});

test('names are validated', async () => {
  await assert.rejects(A.join('   '));
  await assert.rejects(A.join('!!!'));
  const b = writeBatch(db);
  b.set(doc(db, 'people', 'Bad Key'), { name: 'x', at: serverTimestamp() });
  await assertFails(b.commit());
  assert.deepEqual(await A.join('  Zoë   Q '), { name: 'Zoë Q', nameKey: 'zoe-q' });
});

test('house picks: host-only, tagged, outside everyone’s five', async () => {
  const { id } = await openNight();
  const house = Array.from({ length: 27 }, (_, i) => movie(i + 10, { shelf: i % 2 ? ['Rewatch'] : ['Foreign', 'Found footage'] }));
  await assert.rejects(A.addHousePicks('wrong-key-wrong-key-wrong', id, house));
  assert.equal((await A.addHousePicks(KEY, id, house)).length, 27);
  assert.deepEqual(await A.addHousePicks(KEY, id, house.slice(0, 3), house), []); // already on the ballot
  const m = (await getDoc(doc(db, 'nights', id, 'movies', house[0].imdbId))).data();
  assert.equal(m.by, '');
  assert.equal(m.slot, 0);
  assert.deepEqual(m.shelf, ['Foreign', 'Found footage']);

  // A guest still has all five picks, and can vote on house picks.
  const sam = await A.join('Sam');
  for (let i = 1; i <= 5; i++) await A.suggest(id, sam, movie(i));
  await assertSucceeds(A.setVote(id, house[0].imdbId, sam, true));

  // Guests can't forge a house pick or delete one.
  const forged = writeBatch(db);
  forged.set(doc(db, 'nights', id, 'movies', 'tt9999990'), { ...movie(99), imdbId: 'tt9999990', by: '', byName: 'The house', slot: 0, at: serverTimestamp() });
  await assertFails(forged.commit());
  const del = writeBatch(db);
  del.delete(doc(db, 'nights', id, 'movies', house[1].imdbId));
  await assertFails(del.commit());

  // The host can remove one (no slot doc to clean up).
  await assertSucceeds(A.removeMovie(KEY, id, m, ['sam']));
});

test('only the host can point the Shield at a movie', async () => {
  await assertSucceeds(A.showOnShield(KEY, movie(1)));
  const c = (await getDoc(doc(db, 'control', 'shield'))).data();
  assert.equal(c.imdb, movie(1).imdbId);
  assert.equal(typeof c.seq, 'number');
  await assertFails(A.showOnShield('wrong-key-wrong-key-wrong', movie(2)));
  const forged = writeBatch(db);
  forged.set(doc(db, 'control', 'shield'), { imdb: 'tt0000099', title: 'x', seq: 1, op: c.op, at: serverTimestamp() });
  await assertFails(forged.commit()); // replaying the last op id
  await assertFails(A.showOnShield(KEY, { ...movie(3), imdbId: 'not-an-id' }));
});

test('nights carry whose house they are at, through lock and reopen', async () => {
  const id = await A.createNight(KEY, { title: 'At Libby', dates: [{ startsAt: new Date(Date.now() + 86400000), place: 'Libby' }] });
  const [d] = (await getDocs(collection(db, 'nights', id, 'dates'))).docs.map((x) => ({ id: x.id, ...x.data(), startsAt: x.data().startsAt.toDate() }));
  assert.equal(d.place, 'Libby');
  const sam = await A.join('Sam');
  await A.suggest(id, sam, movie(1));
  const m = (await getDoc(doc(db, 'nights', id, 'movies', movie(1).imdbId))).data();
  await A.lock(KEY, id, d, m);
  assert.equal((await getDoc(doc(db, 'nights', id))).data().lockedPlace, 'Libby');
  await A.reopen(KEY, id);
  assert.equal((await getDoc(doc(db, 'nights', id))).data().lockedPlace, null);
  await assertSucceeds(A.addDate(KEY, id, new Date(), 'x'.repeat(40)));
  const places = (await getDocs(collection(db, 'nights', id, 'dates'))).docs.map((x) => x.data().place);
  assert.ok(places.includes('x'.repeat(30)), 'long house names are trimmed to the rule limit');
});

test('anyone can offer to host an open night; the host picks at lock', async () => {
  const id = await A.createNight(KEY, { title: 'Host needed', dates: [{ startsAt: new Date(Date.now() + 86400000), place: '' }] });
  const [d] = (await getDocs(collection(db, 'nights', id, 'dates'))).docs.map((x) => ({ id: x.id, ...x.data(), startsAt: x.data().startsAt.toDate() }));
  assert.equal(d.place, undefined);
  const jo = await A.join('Jo');
  await assertSucceeds(A.setOffer(id, d.id, jo, true));
  assert.ok((await getDoc(doc(db, 'nights', id, 'rsvps', `${d.id}__jo`))).exists(), 'offering counts you in');
  await assertSucceeds(A.setOffer(id, d.id, jo, false));
  await assertSucceeds(A.setOffer(id, d.id, jo, true)); // already counted in: no duplicate RSVP write
  await assertFails(A.setOffer(id, 'nope', jo, true));
  const sam = await A.join('Sam');
  await A.suggest(id, sam, movie(1));
  const m = (await getDoc(doc(db, 'nights', id, 'movies', movie(1).imdbId))).data();
  await A.lock(KEY, id, d, m, 'Jo');
  assert.equal((await getDoc(doc(db, 'nights', id))).data().lockedPlace, 'Jo');
  await assertFails(A.setOffer(id, d.id, sam, true)); // locked: offers closed
  await assertFails(A.setPlace('wrong-key-wrong-key-wrong', id, 'Huey'));
  await assertSucceeds(A.setPlace(KEY, id, 'Huey'));
  assert.equal((await getDoc(doc(db, 'nights', id))).data().lockedPlace, 'Huey');
  await assertSucceeds(A.setPlace(KEY, id, ''));
  assert.equal((await getDoc(doc(db, 'nights', id))).data().lockedPlace, null);
});

test('cancelled and done nights accept nothing from guests', async () => {
  const { id, dates } = await openNight();
  const sam = await A.join('Sam');
  await A.cancel(KEY, id);
  await assertFails(A.setRsvp(id, dates[0].id, sam, true));
  await assertFails(A.addSnack(id, sam, 'Chips'));
  await assertFails(A.suggest(id, sam, movie(1)));
});

