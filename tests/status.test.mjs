// The server side against the emulator's REST API: the clock (tick) and the
// JSON Home Assistant reads.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction, deleteField, updateDoc, setDoc } from 'firebase/firestore';
import { makeActions } from '../public/js/actions.js';
import { buildStatus } from '../lib/status.js';
import { tick } from '../lib/tick.js';

const F = { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction, deleteField };
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

test('the clock never gives back-to-back nights the same movie', async () => {
  const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  await A.addMovie(jo, movie(2));
  const a = new Date(Date.now() + 10 * H);
  const b = new Date(Date.now() + 20 * H);
  await A.hostNight(jo, dayOf(a) === dayOf(b) ? dayOf(a) : dayOf(a), a);
  if (dayOf(a) !== dayOf(b)) await A.hostNight(jo, dayOf(b), b);
  else return; // both offsets fall on one calendar day right now; nothing to compare
  const r = await tick(where);
  const movies = r.actions.filter((x) => x.action === 'locked').map((x) => x.movie);
  assert.equal(movies.length, 2);
  assert.notEqual(movies[0], movies[1]);
  assert.deepEqual((await tick(where)).actions, []);
});

test('the clock leaves far-off nights alone and files finished ones', async () => {
  const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  const far = new Date(Date.now() + 5 * 86400000);
  await A.hostNight(jo, dayOf(far), far);
  const past = new Date(Date.now() - 14 * H);
  await A.hostNight(jo, dayOf(past), new Date(Date.now() + H));
  await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), 'nights', dayOf(past)), { startsAt: past }); });
  await A.lockNight(dayOf(past), { movie: movie(1), tie: [] });
  const r = await tick(where);
  assert.deepEqual(r.actions, [{ day: dayOf(past), action: 'done' }]);
  const s = await buildStatus(where);
  assert.equal(s.state, 'planned');
  assert.equal(s.night_day, dayOf(far));
  assert.equal(s.last_movie, 'Movie 1');
});

// ---- vetoes and themes ------------------------------------------------------------
// Jo hosts a night 20 h out (inside the lock window); Sam is coming. Movie 1 is the
// favorite of the people coming (two thumbs), movie 2 the runner-up (one), movie 3 a
// Horror film nobody thumbed.
async function themedNight({ theme = '' } = {}) {
  const sam = await A.join('Sam'); const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  await A.addMovie(jo, movie(2));
  await A.addMovie(jo, { ...movie(3), genres: ['Horror', 'Thriller'] });
  await A.setVote(movie(3), jo, false);
  await A.setVote(movie(1), sam, true);
  const start = new Date(Date.now() + 20 * H);
  const d = dayOf(start);
  await A.hostNight(jo, d, start, theme);
  await A.setFree(d, sam, true);
  return { sam, jo, d };
}

test('the status leader and the clock both honour a veto', async () => {
  const { sam, d } = await themedNight();
  const before = await buildStatus(where);
  assert.equal(before.leader_title, 'Movie 1');
  assert.equal(before.vetoes, 0);
  assert.equal(before.theme, null);
  await A.setVeto(d, sam, movie(1).imdbId);
  const s = await buildStatus(where);
  assert.equal(s.vetoes, 1);
  assert.equal(s.leader_title, 'Movie 2', 'the vetoed favorite is not the leader');
  const r = await tick(where);
  assert.equal(r.actions[0].action, 'locked');
  assert.equal(r.actions[0].movie, 'Movie 2');
  assert.equal((await buildStatus(where)).movie_title, 'Movie 2');
  // Vetoes sit on the night doc, so the next clock run needs nothing else.
  assert.equal((await getDoc(doc(db, 'nights', d))).data().vetoes.sam, movie(1).imdbId);
});

test('the status leader and the clock both honour a theme', async () => {
  const { d } = await themedNight({ theme: 'Horror' });
  const s = await buildStatus(where);
  assert.equal(s.theme, 'Horror');
  assert.equal(s.leader_title, null, 'only the unthumbed Horror film fits, so nobody leads');
  const r = await tick(where);
  assert.equal(r.actions[0].action, 'locked');
  assert.equal(r.actions[0].movie, 'Movie 3');
  assert.equal(r.actions[0].basis, 'shelf');
  assert.equal(r.actions[0].themeFallback, undefined);
  const locked = await buildStatus(where);
  assert.equal(locked.state, 'locked');
  assert.equal(locked.theme, 'Horror');
  assert.equal(locked.night_day, d);
});

test('a theme and a veto together; a theme nothing fits is ignored', async () => {
  const { sam, d } = await themedNight({ theme: 'Comedy' });
  // Comedy fits movies 1 and 2 (the default genre). Veto the favorite: 2 leads.
  await A.setVeto(d, sam, movie(1).imdbId);
  assert.equal((await buildStatus(where)).leader_title, 'Movie 2');
  // A theme nothing fits (and nothing vetoed that would fit) leaves the pick as usual.
  await A.setVeto(d, sam, null);
  await A.setTheme(d, 'Western');
  const s = await buildStatus(where);
  assert.equal(s.leader_title, 'Movie 1');
  const r = await tick(where);
  assert.equal(r.actions[0].movie, 'Movie 1');
  assert.equal(r.actions[0].themeFallback, true);
});

test('with every movie vetoed the leader is still reported, and the clock locks that same movie', async () => {
  const { sam, jo, d } = await themedNight();
  const al = await A.join('Al');
  await A.setFree(d, al, true);
  await A.setVeto(d, sam, movie(1).imdbId);
  await A.setVeto(d, jo, movie(2).imdbId);
  await A.setVeto(d, al, movie(3).imdbId);
  const s = await buildStatus(where);
  assert.equal(s.vetoes, 3);
  assert.equal(s.leader_title, 'Movie 1', 'vetoes that would empty the shelf are ignored');
  assert.equal(s.leader_basis, 'coming');
  assert.equal(s.leader_votes, 2);
  const r = await tick(where);
  assert.equal(r.actions[0].movie, 'Movie 1');
  assert.equal(r.actions[0].basis, 'coming');
});

test('a night from before themes and vetoes reads and locks as it always did', async () => {
  const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  const start = new Date(Date.now() + 20 * H);
  const d = dayOf(start);
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'nights', d), {
      day: d, startsAt: start, host: 'Jo', hostKey: 'jo', status: 'planned', createdAt: new Date(),
      lockedMovieId: null, lockedMovie: null, lockedTie: [], lockedAt: null, finishedAt: null,
    });
  });
  const s = await buildStatus(where);
  assert.equal(s.state, 'planned');
  assert.equal(s.theme, null);
  assert.equal(s.vetoes, 0);
  const r = await tick(where);
  assert.equal(r.actions[0].action, 'locked');
  assert.equal(r.actions[0].movie, 'Movie 1');
});

// ---- the ballot ---------------------------------------------------------------------
// Jo hosts a night 20 h out (inside the lock window); Sam is coming. Movie 1 has thumbs
// from both of them, movie 2 from Jo, movie 3 from Sam: the ballot reads 1, 2, 3.
async function ballotNight() {
  const sam = await A.join('Sam'); const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  await A.addMovie(jo, movie(2));
  await A.addMovie(sam, movie(3));
  await A.setVote(movie(1), sam, true);
  const start = new Date(Date.now() + 20 * H);
  const d = dayOf(start);
  await A.hostNight(jo, d, start);
  await A.setFree(d, sam, true);
  return { sam, jo, d };
}
const lockedDoc = async (d) => (await getDoc(doc(db, 'nights', d))).data();

test('the status JSON lists the ballot, and the leader follows the votes', async () => {
  const { sam, jo, d } = await ballotNight();
  const s = await buildStatus(where);
  assert.deepEqual(s.ballot, [
    { title: 'Movie 1', votes: 0, thumbs: 2 }, { title: 'Movie 2', votes: 0, thumbs: 1 }, { title: 'Movie 3', votes: 0, thumbs: 1 },
  ]);
  assert.equal(s.leader_title, 'Movie 1');
  assert.equal(s.leader_basis, 'coming', 'no votes: the top of the ballot');
  assert.equal(s.leader_votes, 2);
  assert.equal(s.leader_tie, 1);
  // Votes beat thumbs: Movie 3 has one thumb and two votes.
  await A.setBallotVote(d, sam, movie(3).imdbId);
  await A.setBallotVote(d, jo, movie(3).imdbId);
  const v = await buildStatus(where);
  assert.equal(v.leader_title, 'Movie 3');
  assert.equal(v.leader_basis, 'ballot');
  assert.equal(v.leader_votes, 2);
  assert.equal(v.leader_tie, 1);
  assert.deepEqual(v.ballot.map((r) => [r.title, r.votes]), [['Movie 1', 0], ['Movie 2', 0], ['Movie 3', 2]]);
  // A tie in votes is reported as one, with the leader held still.
  await A.setBallotVote(d, jo, movie(2).imdbId);
  const t = await buildStatus(where);
  assert.equal(t.leader_basis, 'ballot');
  assert.equal(t.leader_votes, 1);
  assert.equal(t.leader_tie, 2);
  // Keys that were there before keep their place; a locked night has no ballot.
  assert.equal(t.state, 'planned');
  await A.setBallotVote(d, jo, null);
  await tick(where);
  const locked = await buildStatus(where);
  assert.equal(locked.state, 'locked');
  assert.equal('ballot' in locked, false);
});

test('the ballot shows at most eight rows, and nothing planned has none', async () => {
  const jo = await A.join('Jo');
  for (let i = 1; i <= 9; i += 1) await A.addMovie(jo, movie(i));
  assert.equal((await buildStatus(where)).ballot, undefined, 'no night, no ballot');
  const start = new Date(Date.now() + 5 * 86400000);
  const d = dayOf(start);
  await A.hostNight(jo, d, start);
  await A.setBallotVote(d, jo, movie(9).imdbId);
  const s = await buildStatus(where);
  assert.equal(s.ballot.length, 6, 'the top five and the one that holds a vote');
  assert.equal(s.ballot.at(-1).title, 'Movie 9');
  assert.deepEqual(s.ballot.at(-1), { title: 'Movie 9', votes: 1, thumbs: 1 });
  // Nine people each vote for another movie: nine rows on the ballot, eight in the JSON.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore();
    const votes = {};
    for (let i = 1; i <= 9; i += 1) {
      await setDoc(doc(admin, 'free', `${d}__p${i}`), { day: d, nameKey: `p${i}`, name: `P${i}`, at: new Date() });
      votes[`p${i}`] = movie(i).imdbId;
    }
    await updateDoc(doc(admin, 'nights', d), { ballotVotes: votes });
  });
  const full = await buildStatus(where);
  assert.equal(full.ballot.length, 8);
  assert.deepEqual(full.ballot.map((r) => r.title).slice(0, 5), ['Movie 1', 'Movie 2', 'Movie 3', 'Movie 4', 'Movie 5']);
});

test('the clock locks the vote winner, records the count, and a tie goes to the reel', async () => {
  const { sam, jo, d } = await ballotNight();
  await A.setBallotVote(d, sam, movie(3).imdbId);
  await A.setBallotVote(d, jo, movie(3).imdbId);
  const r = await tick(where);
  assert.equal(r.actions[0].action, 'locked');
  assert.equal(r.actions[0].movie, 'Movie 3');
  assert.equal(r.actions[0].basis, 'ballot');
  const n = await lockedDoc(d);
  assert.equal(n.lockedMovieId, movie(3).imdbId);
  assert.deepEqual(n.lockedVotes, { [movie(1).imdbId]: 0, [movie(2).imdbId]: 0, [movie(3).imdbId]: 2 });
  assert.deepEqual(n.lockedTie, []);
  // The ballot rides along, untouched, once locked.
  assert.deepEqual(n.ballotVotes, { sam: movie(3).imdbId, jo: movie(3).imdbId });
  assert.equal((await buildStatus(where)).movie_title, 'Movie 3');

  // Unlock (back to planned, count cleared), split the votes: a tie, and the reel.
  await A.unlockNight(d);
  assert.equal((await lockedDoc(d)).lockedVotes, null);
  await A.setBallotVote(d, jo, movie(2).imdbId);
  const t = await tick(where, { rand: () => 0.99 });
  assert.equal(t.actions[0].basis, 'ballot');
  assert.equal(t.actions[0].tie, 2);
  assert.deepEqual([...(await lockedDoc(d)).lockedTie].sort(), [movie(2).imdbId, movie(3).imdbId]);
});

test('a vote from someone who is not coming, or who dropped out, does not count; with no votes the top of the ballot wins', async () => {
  const { sam, d } = await ballotNight();
  // Al votes but is not free that evening (seeded past the rules: the rules would refuse him).
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'nights', d), { 'ballotVotes.al': movie(3).imdbId }));
  assert.equal((await buildStatus(where)).leader_title, 'Movie 1');
  // Sam votes, then drops out: the vote goes with him.
  await A.setBallotVote(d, sam, movie(3).imdbId);
  assert.equal((await buildStatus(where)).leader_title, 'Movie 3');
  await A.setFree(d, sam, false);
  assert.deepEqual(Object.keys((await lockedDoc(d)).ballotVotes), ['al']);
  const s = await buildStatus(where);
  assert.equal(s.leader_basis, 'coming');
  assert.equal(s.leader_title, 'Movie 1', 'thumbs from Jo alone: Movie 1 and Movie 2 are level, Movie 1 has more thumbs overall');
  const r = await tick(where);
  assert.equal(r.actions[0].basis, 'coming');
  assert.equal(r.actions[0].movie, 'Movie 1');
  assert.deepEqual(Object.values((await lockedDoc(d)).lockedVotes), [0, 0, 0]);
});

test('a night from before the ballot locks with the votes it has (none) and no field of its own', async () => {
  const jo = await A.join('Jo');
  await A.addMovie(jo, movie(1));
  const start = new Date(Date.now() + 20 * H);
  const d = dayOf(start);
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'nights', d), {
      day: d, startsAt: start, host: 'Jo', hostKey: 'jo', status: 'planned', createdAt: new Date(),
      lockedMovieId: null, lockedMovie: null, lockedTie: [], lockedAt: null, finishedAt: null, theme: '', vetoes: {},
    });
  });
  const s = await buildStatus(where);
  assert.deepEqual(s.ballot, [{ title: 'Movie 1', votes: 0, thumbs: 0 }], 'nobody is marked free on it, so no thumbs count');
  const r = await tick(where);
  assert.equal(r.actions[0].movie, 'Movie 1');
  assert.equal(r.actions[0].basis, 'everyone');
  assert.deepEqual((await lockedDoc(d)).lockedVotes, { [movie(1).imdbId]: 0 });
});
