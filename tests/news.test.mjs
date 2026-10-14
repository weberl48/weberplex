// The guard for "Since you last looked": every change the site can make to what
// other people see is either announced in the walkthrough or marked quiet here,
// with a reason. Add an action to public/js/actions.js (or a server write to
// lib/tick.js) and this fails until you decide which. Pure node: no emulator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActions } from '../public/js/actions.js';
import { sinceLastLook, NEWS_KINDS, MAX_NEWS_CARDS } from '../public/js/logic.js';

// makeActions only unpacks these; the stubs are never called, we just read the keys.
const stub = () => { throw new Error('not called'); };
const F = Object.fromEntries(['doc', 'collection', 'writeBatch', 'serverTimestamp', 'getDoc', 'getDocs', 'runTransaction', 'deleteField'].map((k) => [k, stub]));
const ACTIONS = Object.keys(makeActions({}, F));

// announced: the news kind (in NEWS_KINDS) that the action produces.
// quiet: why nobody needs telling.
const announced = (kind) => ({ kind });
const quiet = (why) => ({ why });
const CLASSIFIED = {
  me: quiet('helper that cleans a name, writes nothing'),
  join: quiet('signing the guest list; the person has nothing to show yet'),
  savePrefs: quiet('personal settings (lastSeen, toured, hostTime, reels)'),
  addMovie: announced('movies'),
  removeMovie: quiet('a removal; nothing new to look at'),
  setVote: announced('votes'),
  setSeen: quiet('a personal "seen it" mark'),
  setFree: announced('free'),
  hostNight: announced('night'),
  setNightTime: announced('moved'),
  setTheme: announced('theme'),
  setVeto: announced('veto'),
  lockNight: announced('locked'),
  unlockNight: quiet('it is re-locked (and announced) once the movie is picked again'),
  finishNight: announced('watched'),
  cancelNight: announced('cancelled'),
  addSnack: announced('snack'),
  removeSnack: quiet('a removal; nothing new to look at'),
  review: announced('review'),
  seedHostKey: quiet('owner setup'),
  changeOwnerPassword: quiet('owner console'),
  checkHostKey: quiet('owner check, no change'),
  setSeason: quiet('the marquee title is on screen already; owner console'),
  addHousePicks: announced('movies'),
  ownerRemoveMovie: quiet('a removal; owner console'),
  showOnShield: quiet('a command for Home Assistant, not something to look at'),
};

// Writes the server clock makes (lib/tick.js, via `stamp:`): the field it stamps and the kind that shows it.
const SERVER_STAMPS = { lockedAt: 'locked', finishedAt: 'watched' };

const at = (ms) => new Date(ms);
const SINCE = 1000;
const START = new Date(2026, 9, 17, 20);
const night = (extra = {}) => ({
  day: '2026-10-17', status: 'planned', host: 'Jo', hostKey: 'jo', createdAt: at(10), startsAt: START,
  theme: '', vetoes: {}, lockedMovieId: null, lockedMovie: null, ...extra,
});
const locked = { title: 'Alien', poster: 'p.jpg' };
const base = { since: SINCE, meKey: 'me' };

// One fixture per kind: input that must make sinceLastLook produce an item of it.
const FIXTURES = {
  night: { nights: [night({ createdAt: at(2000) })] },
  cancelled: { nights: [night({ status: 'cancelled', finishedAt: at(2000) })] },
  moved: { nights: [night({ movedAt: at(2000) })] },
  theme: { nights: [night({ theme: 'Foreign', themeAt: at(2000) })] },
  veto: {
    nights: [night({ vetoes: { sam: 'tt1' }, vetoAt: { sam: at(2000) } })],
    movies: [{ imdbId: 'tt1', title: 'Jaws', by: 'jo', at: at(10) }], people: [{ id: 'sam', name: 'Sam' }],
  },
  locked: { nights: [night({ status: 'locked', lockedAt: at(2000), lockedMovieId: 'tt1', lockedMovie: locked })] },
  watched: { nights: [night({ status: 'done', finishedAt: at(2000), lockedMovieId: 'tt1', lockedMovie: locked })] },
  movies: { movies: [{ imdbId: 'tt2', title: 'New', by: 'jo', at: at(2000) }] },
  votes: {
    movies: [{ imdbId: 'tt2', title: 'New', by: 'jo', at: at(10) }],
    votes: [{ movie: 'tt2', nameKey: 'jo', name: 'Jo', at: at(2000) }],
  },
  free: { free: [{ day: '2026-10-20', nameKey: 'al', name: 'Al', at: at(2000) }] },
  snack: { nights: [night()], subs: new Map([['2026-10-17', { snacks: [{ item: 'nachos', nameKey: 'sam', name: 'Sam', at: at(2000) }], reviews: [] }]]) },
  review: {
    nights: [night({ status: 'done', finishedAt: at(10), lockedMovieId: 'tt1', lockedMovie: locked })],
    subs: new Map([['2026-10-17', { snacks: [], reviews: [{ stars: 4, line: 'Great', nameKey: 'jo', name: 'Jo', at: at(2000) }] }]]),
  },
};
const kindsOf = (input) => sinceLastLook({ ...base, ...input }).items.map((i) => i.kind);

test('every action is announced in the walkthrough or marked quiet', () => {
  const missing = ACTIONS.filter((a) => !(a in CLASSIFIED));
  assert.deepEqual(missing, [], `makeActions has action(s) tests/news.test.mjs does not know: ${missing.join(', ')}. `
    + 'Add a news kind to sinceLastLook (logic.js) and NEWS_KINDS, then announced(kind) here, or mark it quiet(why) here.');
  const gone = Object.keys(CLASSIFIED).filter((a) => !ACTIONS.includes(a));
  assert.deepEqual(gone, [], `classified here but no longer in makeActions: ${gone.join(', ')}. Remove them.`);
  for (const [a, c] of Object.entries(CLASSIFIED)) {
    if (c.kind) assert.ok(NEWS_KINDS.includes(c.kind), `${a} announces "${c.kind}", which is not in NEWS_KINDS`);
    else assert.ok(c.why && c.why.length > 3, `${a} is quiet without a reason`);
  }
});

test('every announced kind has a fixture proving sinceLastLook produces it, and every kind is announced', () => {
  const used = new Set(Object.values(CLASSIFIED).filter((c) => c.kind).map((c) => c.kind));
  for (const kind of used) {
    assert.ok(FIXTURES[kind], `no fixture for announced kind "${kind}": add one to FIXTURES in tests/news.test.mjs`);
    assert.ok(kindsOf(FIXTURES[kind]).includes(kind), `the "${kind}" fixture does not produce a "${kind}" item`);
  }
  for (const kind of NEWS_KINDS) {
    assert.ok(FIXTURES[kind], `NEWS_KINDS has "${kind}" but no fixture produces it`);
    assert.ok(used.has(kind) || Object.values(SERVER_STAMPS).includes(kind), `NEWS_KINDS has "${kind}" but no action or server write announces it`);
  }
  for (const kind of Object.keys(FIXTURES)) assert.ok(NEWS_KINDS.includes(kind), `fixture "${kind}" is not in NEWS_KINDS`);
  // And nothing produces a kind the list does not name.
  for (const kind of Object.keys(FIXTURES)) for (const k of kindsOf(FIXTURES[kind])) assert.ok(NEWS_KINDS.includes(k), `"${k}" is produced but not in NEWS_KINDS`);
});

test('the server clock writes (lib/tick.js) are all announced', () => {
  const src = readFileSync(new URL('../lib/tick.js', import.meta.url), 'utf8');
  const stamped = [...src.matchAll(/stamp:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  assert.ok(stamped.length >= 2, 'expected lib/tick.js to stamp lockedAt and finishedAt');
  for (const field of stamped) {
    assert.ok(SERVER_STAMPS[field], `lib/tick.js stamps "${field}": map it to a news kind in SERVER_STAMPS (tests/news.test.mjs) so people hear about it`);
    assert.ok(kindsOf(FIXTURES[SERVER_STAMPS[field]]).includes(SERVER_STAMPS[field]));
  }
});

test('your own doing is not news, and nothing is before your last look', () => {
  const mine = {
    nights: [night({ hostKey: 'me', createdAt: at(2000), movedAt: at(2000), themeAt: at(2000), theme: 'Horror', vetoes: { me: 'tt1' }, vetoAt: { me: at(2000) } })],
    movies: [{ imdbId: 'tt1', title: 'Jaws', by: 'me', at: at(2000) }],
    votes: [{ movie: 'tt1', nameKey: 'me', at: at(2000) }],
    free: [{ day: '2026-10-20', nameKey: 'me', name: 'Me', at: at(2000) }],
    subs: new Map([['2026-10-17', { snacks: [{ item: 'chips', nameKey: 'me', name: 'Me', at: at(2000) }], reviews: [{ stars: 5, nameKey: 'me', name: 'Me', at: at(2000) }] }]]),
  };
  assert.deepEqual(kindsOf(mine), []);
  for (const kind of NEWS_KINDS) assert.deepEqual(sinceLastLook({ ...base, since: 5000, ...FIXTURES[kind] }).items, [], `${kind} is older than the last look`);
});

test('what each new kind says', () => {
  const text = (kind) => sinceLastLook({ ...base, ...FIXTURES[kind] }).items.find((i) => i.kind === kind);
  assert.match(text('cancelled').text, /^Jo's \w+ movie night is off$/);
  assert.match(text('moved').text, /^\w+'s night now starts at 8:00\sPM$/);
  assert.match(text('theme').text, /^\w+ is a Foreign night now$/);
  assert.match(text('veto').text, /^Sam vetoed Jaws for \w+$/);
  assert.equal(text('veto').struck, 'Jaws');
  assert.match(text('watched').text, /^Alien is filed under Watched$/);
  assert.equal(text('watched').target, '#watchedSec');
  assert.match(text('snack').text, /^Sam is bringing nachos on \w+$/);
  assert.match(text('review').text, /^Jo rated Alien ★★★★$/);
  const cleared = sinceLastLook({ ...base, nights: [night({ theme: '', themeAt: at(2000) })] }).items[0];
  assert.match(cleared.text, /^\w+'s theme was cleared$/);
  // A veto that was taken back (its stamp goes with it) is not news.
  assert.deepEqual(kindsOf({ nights: [night({ vetoes: {}, vetoAt: {} })] }), []);
});

test('at most eight cards, with the rest counted on the last one', () => {
  const free = Array.from({ length: 3 }, (_, i) => ({ day: `2026-10-2${i}`, nameKey: `p${i}`, name: `P${i}`, at: at(2000) }));
  const nights = Array.from({ length: 10 }, (_, i) => night({ day: `2026-11-0${i}`, host: `H${i}`, hostKey: `h${i}`, createdAt: at(2000) }));
  const n = sinceLastLook({ ...base, nights, free });
  assert.equal(n.items.length, 11);
  assert.equal(n.cards.length, MAX_NEWS_CARDS);
  assert.match(n.cards.at(-1).detail, /…and 3 more things\.$/);
  assert.equal(sinceLastLook({ ...base, ...FIXTURES.movies }).cards.length, 1);
});
