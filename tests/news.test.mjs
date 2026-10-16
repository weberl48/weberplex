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
  addMovies: announced('movies'), // a pasted list: one card for them all ("12 new movies on the shelf: A, B, C…")
  removeMovie: quiet('a removal; nothing new to look at'),
  setVote: announced('votes'),
  setSeen: quiet('a personal "seen it" mark'),
  setFree: announced('free'),
  hostNight: announced('night'),
  setNightTime: announced('moved'),
  setTheme: announced('theme'),
  setVeto: announced('veto'),
  setBallotVote: announced('vote'),
  setWriteIn: announced('writein'),
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
  vote: {
    nights: [night({ ballotVotes: { sam: 'tt1' }, ballotVoteAt: { sam: at(2000) } })],
    movies: [{ imdbId: 'tt1', title: 'Jaws', by: 'jo', at: at(10) }], people: [{ id: 'sam', name: 'Sam' }],
  },
  writein: {
    nights: [night({ writeIns: { jo: 'tt3' }, writeInAt: { jo: at(2000) } })],
    movies: [{ imdbId: 'tt3', title: 'Hereditary', by: 'sam', at: at(10) }],
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
    nights: [night({
      hostKey: 'me', createdAt: at(2000), movedAt: at(2000), themeAt: at(2000), theme: 'Horror', vetoes: { me: 'tt1' }, vetoAt: { me: at(2000) },
      ballotVotes: { me: 'tt1' }, ballotVoteAt: { me: at(2000) }, writeIns: { me: 'tt1' }, writeInAt: { me: at(2000) },
    })],
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
  assert.match(sinceLastLook({ ...base, nights: [night({ theme: 'Action', themeAt: at(2000) })] }).items[0].text, /^\w+ is an Action night now$/);
  assert.match(text('veto').text, /^Sam vetoed Jaws for \w+$/);
  assert.equal(text('veto').struck, 'Jaws');
  assert.match(text('watched').text, /^Alien is filed under Watched$/);
  assert.equal(text('watched').target, '#watchedSec');
  assert.match(text('snack').text, /^Sam is bringing nachos on \w+$/);
  assert.match(text('review').text, /^Jo gave Alien 4 stars$/); // words, not ★ glyphs a screen reader spells out
  assert.match(text('votes').text, /^\w[\w ,]* thumbed up \S/); // names, not "1 new thumbs-up on 1 movie"
  const cleared = sinceLastLook({ ...base, nights: [night({ theme: '', themeAt: at(2000) })] }).items[0];
  assert.match(cleared.text, /^\w+'s theme was cleared$/);
  // A veto that was taken back (its stamp goes with it) is not news.
  assert.deepEqual(kindsOf({ nights: [night({ vetoes: {}, vetoAt: {} })] }), []);
  assert.match(text('vote').text, /^Sam voted for Jaws for \w+$/);
  assert.deepEqual(text('vote').names, ['Sam']);
  assert.match(text('writein').text, /^Jo put Hereditary on \w+'s ballot$/); // the host is named on the night
  assert.deepEqual(text('writein').names, ['Jo']);
  assert.equal(text('vote').target, '#nextSec');
  // A vote or write-in that was taken back (its stamp goes with it) is not news.
  assert.deepEqual(kindsOf({ nights: [night({ ballotVotes: {}, ballotVoteAt: {}, writeIns: {}, writeInAt: {} })] }), []);
});

test('votes and write-ins on a night are one card each, with who and what; and fold into a night you are not on', () => {
  const movies = [{ imdbId: 'tt1', title: 'Jaws', by: 'jo', at: at(10) }, { imdbId: 'tt2', title: 'Alien', by: 'jo', at: at(10) }, { imdbId: 'tt3', title: 'Hereditary', by: 'jo', at: at(10) }];
  const people = [{ id: 'sam', name: 'Sam' }, { id: 'al', name: 'Al' }, { id: 'bo', name: 'Bo' }];
  const busy = night({
    ballotVotes: { sam: 'tt1', al: 'tt2', bo: 'tt1' }, ballotVoteAt: { sam: at(2000), al: at(2000), bo: at(500) }, // Bo's was before your last look
    writeIns: { sam: 'tt3', al: 'tt2' }, writeInAt: { sam: at(2000), al: at(2000) },
  });
  const n = sinceLastLook({ ...base, nights: [busy], movies, people, free: [{ day: '2026-10-17', nameKey: 'me', name: 'Me', at: at(10) }] });
  assert.deepEqual(n.items.map((i) => i.kind), ['vote', 'writein']);
  assert.match(n.items[0].text, /^2 votes for \w+$/);
  assert.equal(n.items[0].detail, 'Sam: Jaws · Al: Alien');
  assert.deepEqual(n.items[0].names, ['Sam', 'Al']);
  assert.match(n.items[1].text, /^2 write-ins for \w+$/);
  assert.equal(n.items[1].detail, 'Sam: Hereditary · Al: Alien');
  assert.ok(n.days.has('2026-10-17'));
  assert.equal(n.cards.length, 2, 'on a night you are coming to, each keeps its card');
  // On a night you are not on the list for, everything that changed is one card.
  const other = sinceLastLook({ ...base, nights: [{ ...busy, host: 'Hal', hostKey: 'hal' }], movies, people });
  assert.equal(other.items.length, 2);
  assert.equal(other.cards.length, 1);
  assert.match(other.cards[0].text, /^Hal's \w+: 2 votes · 2 write-ins$/);
  const one = sinceLastLook({ ...base, nights: [{ ...night({ host: 'Hal', hostKey: 'hal', ballotVotes: { sam: 'tt1' }, ballotVoteAt: { sam: at(2000) }, writeIns: { al: 'tt3' }, writeInAt: { al: at(2000) } }) }], movies, people });
  assert.match(one.cards[0].text, /^Hal's \w+: Sam voted for Jaws · Al put Hereditary on the ballot$/);
  // A vote for a movie that left the shelf still reads, and a vote after the night locked is no news.
  assert.match(sinceLastLook({ ...base, nights: [busy], movies: [], people }).items[0].detail, /a movie that left the shelf/);
  assert.deepEqual(kindsOf({ nights: [{ ...busy, status: 'locked', lockedMovieId: 'tt1', lockedMovie: locked, lockedAt: at(10) }], movies, people }), []);
});

test('news comes most useful first: your night, other nights, the shelf, free evenings, then snacks and reviews', () => {
  const myNight = night({ day: '2026-10-18', host: 'Al', hostKey: 'al', movedAt: at(2000) });
  const other = night({ day: '2026-10-19', host: 'Bo', hostKey: 'bo', createdAt: at(2000) });
  const n = sinceLastLook({
    ...base,
    nights: [night(), other, myNight],
    subs: new Map([['2026-10-17', { snacks: [{ item: 'nachos', nameKey: 'sam', name: 'Sam', at: at(2000) }], reviews: [] }]]),
    movies: [{ imdbId: 'tt2', title: 'New', by: 'jo', at: at(2000) }],
    free: [{ day: '2026-10-18', nameKey: 'me', name: 'Me', at: at(10) }, { day: '2026-10-20', nameKey: 'al', name: 'Al', at: at(2000) }],
  });
  // your night, then what needs your tap (new movies), other nights, free evenings, the after-party
  assert.deepEqual(n.items.map((i) => i.kind), ['moved', 'movies', 'night', 'free', 'snack']);
  assert.deepEqual(n.items[1].ids, [{ id: 'tt2', title: 'New' }]); // the card's thumbs-up buttons
});

test('a night you are not coming to gets one card for all its changes', () => {
  const n = sinceLastLook({
    ...base,
    nights: [night({ host: 'Hal', hostKey: 'hal', movedAt: at(2000), theme: 'Drama', themeAt: at(2000), vetoes: { sam: 'tt1' }, vetoAt: { sam: at(2000) } })],
    movies: [{ imdbId: 'tt1', title: 'Jaws', by: 'jo', at: at(10) }], people: [{ id: 'sam', name: 'Sam' }],
  });
  assert.equal(n.items.length, 3); // still three things to count
  assert.equal(n.cards.length, 1);
  assert.match(n.cards[0].text, /^Hal's \w+: now \d+:00\s?PM · a Drama night · Jaws vetoed$/);
  assert.equal(n.cards[0].struck, 'Jaws');
  // On your own night each change keeps its own card.
  const mineToo = sinceLastLook({ ...base, nights: [night({ host: 'Hal', hostKey: 'hal', movedAt: at(2000), theme: 'Drama', themeAt: at(2000) })], free: [{ day: '2026-10-17', nameKey: 'me', name: 'Me', at: at(10) }] });
  assert.equal(mineToo.cards.length, 2);
});

test('a night hosted on an evening you said you were free puts you on its list, and says so', () => {
  const n = sinceLastLook({ ...base, nights: [night({ createdAt: at(2000) })], free: [{ day: '2026-10-17', nameKey: 'me', name: 'Me', at: at(10) }] });
  assert.match(n.items[0].detail, /you’re on the list/);
  assert.doesNotMatch(sinceLastLook({ ...base, ...FIXTURES.night }).items[0].detail, /on the list/);
});

test('at most eight cards, with the rest counted on the last one', () => {
  const free = Array.from({ length: 3 }, (_, i) => ({ day: `2026-10-2${i}`, nameKey: `p${i}`, name: `P${i}`, at: at(2000) }));
  const nights = Array.from({ length: 10 }, (_, i) => night({ day: `2026-11-0${i}`, host: `H${i}`, hostKey: `h${i}`, createdAt: at(2000) }));
  const n = sinceLastLook({ ...base, nights, free });
  assert.equal(n.items.length, 11);
  assert.equal(n.cards.length, MAX_NEWS_CARDS);
  assert.match(n.cards.at(-1).detail, /…and 3 more things\.$/);
  assert.equal(n.cards.at(-1).rest.length, 3); // and lists them, so none goes unseen
  assert.deepEqual(n.cards.at(-1).rest, n.items.slice(MAX_NEWS_CARDS).map((x) => x.text));
  assert.equal(n.count, 11); // the bar's count: the cards plus what the last one lists
  assert.equal(sinceLastLook({ ...base, ...FIXTURES.movies }).cards.length, 1);
});

test('a pasted list of movies is one card, with a thumbs-up for the first few', () => {
  const movies = Array.from({ length: 12 }, (_, i) => ({ imdbId: `tt${i + 1}`, title: `Movie ${i + 1}`, by: 'sam', at: at(2000) }));
  const n = sinceLastLook({ ...base, movies });
  assert.equal(n.items.length, 1);
  assert.equal(n.items[0].kind, 'movies');
  assert.equal(n.items[0].text, '12 new movies on the shelf: Movie 1, Movie 2, Movie 3…');
  assert.deepEqual(n.items[0].ids.map((x) => x.id), ['tt1', 'tt2', 'tt3']);
  assert.equal(n.movies.size, 12); // and all twelve wear the New chip
});
