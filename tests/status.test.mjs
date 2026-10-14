// The server side against the emulator's REST API: the clock (tick) and the
// JSON Home Assistant reads.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction } from 'firebase/firestore';
import { makeActions } from '../public/js/actions.js';
import { buildStatus } from '../lib/status.js';
import { tick } from '../lib/tick.js';

const F = { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction };
const P = 'demo-picture-show';
const where = { base: 'http://127.0.0.1:8181/v1', projectId: P, apiKey: '' };
const H = 3600 * 1000;
const dayOf = (d) => d.toISOString().slice(0, 10);
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
});

const movie = (n) => ({ imdbId: `tt00000${n}0`, title: `Movie ${n}`, year: '2001', poster: 'https://images.metahub.space/poster/small/x/img', runtime: '101 min', rating: '7.7', genres: ['Comedy'], trailer: 'abc123', description: '' });

test('no night planned -> state none', async () => {
  const s = await buildStatus({ ...where, siteUrl: 'https://x.test' });
  assert.equal(s.state, 'none');
  assert.deepEqual(s.upcoming, []);
});

test('the clock locks a night a day out with the attendees\' favorite, and HA sees it', async () => {
  const sam = await A.join('Sam'); const jo = await A.join('Jo'); const al = await A.join('Al');
  await A.addMovie(al, movie(1)); // Al's favorite, but Al isn't coming
  await A.setVote(movie(1), sam, false);
  await A.addMovie(jo, movie(2));
  await A.setVote(movie(2), sam, true);
  const start = new Date(Date.now() + 20 * H); // inside the 24 h lock window
  const d = dayOf(start);
  await A.hostNight(jo, d, start);
  await A.setFree(d, sam, true);
  await A.addSnack(d, sam, 'Nachos');

  const planned = await buildStatus(where);
  assert.equal(planned.state, 'planned');
  assert.equal(planned.host, 'Jo');
  assert.deepEqual(planned.attendees, ['Jo', 'Sam']);
  assert.equal(planned.leader_title, 'Movie 2');
  assert.deepEqual(planned.snacks, ['Sam: Nachos']);

  const r = await tick(where);
  assert.equal(r.actions[0].action, 'locked');
  assert.equal(r.actions[0].movie, 'Movie 2');
  assert.equal(r.actions[0].basis, 'coming');
  assert.deepEqual((await tick(where)).actions, [], 'idempotent');

  const s = await buildStatus(where);
  assert.equal(s.state, 'locked');
  assert.equal(s.location, 'Jo');
  assert.equal(s.movie_title, 'Movie 2');
  assert.equal(s.movie_poster, 'https://images.metahub.space/poster/medium/x/img');
  assert.equal(s.movie_runtime_min, 101);
  assert.equal(s.starts_at, start.toISOString());
  assert.equal(s.warmup_at, new Date(start.getTime() - 30 * 60000).toISOString());
});

test('the clock leaves far-off nights alone and files finished ones', async () => {
  const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  const far = new Date(Date.now() + 5 * 86400000);
  await A.hostNight(jo, dayOf(far), far);
  const past = new Date(Date.now() - 14 * H);
  await A.hostNight(jo, dayOf(past), past);
  await A.lockNight(dayOf(past), { movie: movie(1), tie: [] });
  const r = await tick(where);
  assert.deepEqual(r.actions, [{ day: dayOf(past), action: 'done' }]);
  const s = await buildStatus(where);
  assert.equal(s.state, 'planned');
  assert.equal(s.night_day, dayOf(far));
  assert.equal(s.last_movie, 'Movie 1');
});
