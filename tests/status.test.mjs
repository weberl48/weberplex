// buildStatus() against the emulator's REST API — the exact JSON HA reads.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, query, where } from 'firebase/firestore';
import { makeActions } from '../public/js/actions.js';
import { buildStatus } from '../lib/status.js';

const F = { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, query, where };
const KEY = 'host-key-for-tests-0123456789';
const P = 'demo-picture-show';
const status = () => buildStatus({ base: 'http://127.0.0.1:8181/v1', projectId: P, apiKey: '', siteUrl: 'https://x.test' });
let env, db, A;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: P,
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

const movie = (n, poster = '') => ({
  imdbId: `tt00000${n}0`, title: `Movie ${n}`, year: '2001', poster, runtime: '101 min', rating: '7.7',
  genres: ['Comedy'], trailer: 'abc123', description: '',
});

test('no night -> state none', async () => {
  const s = await status();
  assert.equal(s.state, 'none');
  assert.equal(s.site_url, 'https://x.test');
});

test('open night reports leader, best date and tie', async () => {
  const t1 = new Date('2030-01-03T01:00:00Z');
  const t2 = new Date('2030-01-04T01:00:00Z');
  const id = await A.createNight(KEY, { title: 'Jan', dates: [t1, t2] });
  const dates = (await getDocs(collection(db, 'nights', id, 'dates'))).docs.map((d) => ({ id: d.id, startsAt: d.data().startsAt.toDate() }));
  const d2 = dates.find((d) => d.startsAt.getTime() === t2.getTime());
  const sam = await A.join('Sam'); const jo = await A.join('Jo');
  await A.setRsvp(id, d2.id, sam, true); await A.setRsvp(id, d2.id, jo, true);
  await A.suggest(id, sam, movie(1, 'https://images.metahub.space/poster/small/tt0000010/img'));
  await A.suggest(id, jo, movie(2));
  await A.setVote(id, movie(1).imdbId, jo, true);
  await A.addSnack(id, jo, 'Nachos');
  const s = await status();
  assert.equal(s.state, 'open');
  assert.equal(s.title, 'Jan');
  assert.equal(s.best_date, t2.toISOString());
  assert.equal(s.best_date_count, 2);
  assert.equal(s.leader_title, 'Movie 1');
  assert.equal(s.leader_votes, 1);
  assert.equal(s.leader_poster, 'https://images.metahub.space/poster/medium/tt0000010/img');
  assert.equal(s.tie, false);
  assert.equal(s.suggestion_count, 2);
  assert.equal(s.voter_count, 1);
  assert.deepEqual(s.snacks, ['Jo: Nachos']);
  assert.equal(s.dates.length, 2);
});

test('locked night reports the show, warm-up time and attendees', async () => {
  const t1 = new Date('2030-02-01T01:00:00Z');
  const id = await A.createNight(KEY, { title: '', dates: [{ startsAt: t1, place: 'Ferger' }] });
  const [date] = (await getDocs(collection(db, 'nights', id, 'dates'))).docs.map((d) => ({ id: d.id, ...d.data(), startsAt: d.data().startsAt.toDate() }));
  const sam = await A.join('Sam'); const al = await A.join('Al');
  await A.setRsvp(id, date.id, sam, true); await A.setRsvp(id, date.id, al, true);
  await A.suggest(id, sam, movie(3));
  const m = (await getDoc(doc(db, 'nights', id, 'movies', movie(3).imdbId))).data();
  await A.lock(KEY, id, date, m);
  const s = await status();
  assert.equal(s.state, 'locked');
  assert.equal(s.starts_at, t1.toISOString());
  assert.equal(s.location, 'Ferger');
  assert.equal(s.warmup_at, new Date(t1.getTime() - 30 * 60000).toISOString());
  assert.equal(s.ends_at, new Date(t1.getTime() + 101 * 60000).toISOString());
  assert.equal(s.movie_title, 'Movie 3');
  assert.equal(s.movie_imdb, 'tt0000030');
  assert.equal(s.movie_runtime_min, 101);
  assert.equal(s.movie_trailer, 'https://www.youtube.com/watch?v=abc123');
  assert.deepEqual(s.attendees, ['Al', 'Sam']);
  assert.equal(s.attendee_count, 2);

  await A.finish(KEY, id);
  const after = await status();
  assert.equal(after.state, 'none');
  assert.equal(after.last_movie, 'Movie 3');
});
