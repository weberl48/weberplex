import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nameKey, cleanName, initials, tally, nextFreeSlot, countdownParts, countdownText, buildIcs,
  ticketNumber, reviewSummary, pickRandom, movieFromMeta, parseRuntime,
  tasteProfile, recommend, isForeign, ballotGenre, stremioUrl, nextPlace, placeLabel,
} from '../public/js/logic.js';

test('names normalize to rule-safe keys', () => {
  assert.equal(cleanName('  Sam   O\'Neil  '), "Sam O'Neil");
  assert.equal(nameKey("Sam O'Neil"), 'sam-o-neil');
  assert.equal(nameKey('Zoë'), 'zoe');
  assert.equal(nameKey('!!!'), '');
  assert.match(nameKey('a'.repeat(40) + ' b'), /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(nameKey('x'.repeat(31) + ' yy').length <= 32);
  assert.equal(initials('sam oneil'), 'SO');
  assert.equal(initials('Cher'), 'C');
});

test('tally ranks dates and movies, flags ties, ignores orphan votes', () => {
  const t = tally({
    dates: [{ id: 'd2', startsAt: new Date('2026-10-18T00:00:00Z') }, { id: 'd1', startsAt: new Date('2026-10-17T00:00:00Z') }],
    rsvps: [{ dateId: 'd2', nameKey: 'jo', name: 'Jo' }, { dateId: 'd2', nameKey: 'al', name: 'Al' }, { dateId: 'd1', nameKey: 'jo', name: 'Jo' }],
    movies: [
      { imdbId: 'tt1', title: 'A', at: new Date(1) },
      { imdbId: 'tt2', title: 'B', at: new Date(2) },
      { imdbId: 'tt3', title: 'C', at: new Date(3) },
    ],
    votes: [
      { movie: 'tt2', nameKey: 'jo', name: 'Jo' }, { movie: 'tt3', nameKey: 'jo', name: 'Jo' },
      { movie: 'tt9', nameKey: 'jo', name: 'Jo' },
    ],
  });
  assert.deepEqual(t.dates.map((d) => d.id), ['d1', 'd2']);
  assert.deepEqual(t.bestDates, ['d2']);
  assert.deepEqual(t.dates[1].going.map((g) => g.name), ['Al', 'Jo']);
  assert.deepEqual(t.dates[0].offers, []);
  assert.deepEqual(t.movies.map((m) => m.imdbId), ['tt2', 'tt3', 'tt1']);
  assert.equal(t.tie, true);
  assert.deepEqual(t.leaders.map((m) => m.imdbId), ['tt2', 'tt3']);
  const empty = tally({});
  assert.deepEqual(empty.leaders, []);
  assert.deepEqual(empty.bestDates, []);
});

test('host offers attach to their night, earliest first', () => {
  const t = tally({
    dates: [{ id: 'd1', startsAt: new Date('2026-10-17T00:00:00Z') }],
    offers: [
      { dateId: 'd1', nameKey: 'jo', name: 'Jo', at: new Date(5) },
      { dateId: 'd1', nameKey: 'al', name: 'Al', at: new Date(2) },
      { dateId: 'zz', nameKey: 'x', name: 'X', at: new Date(1) },
    ],
  });
  assert.deepEqual(t.dates[0].offers.map((o) => o.name), ['Al', 'Jo']);
});

test('slots fill lowest-first and stop at five', () => {
  assert.equal(nextFreeSlot([]), 1);
  assert.equal(nextFreeSlot([1, 2, 4]), 3);
  assert.equal(nextFreeSlot([1, 2, 3, 4, 5]), null);
});

test('countdown', () => {
  const now = new Date('2026-10-12T12:00:00Z');
  assert.deepEqual(countdownParts(new Date('2026-10-14T15:30:00Z'), now), { past: false, days: 2, hours: 3, minutes: 30 });
  assert.equal(countdownText(new Date('2026-10-12T12:45:00Z'), now), '45m');
  assert.equal(countdownText(new Date('2026-10-12T11:00:00Z'), now), 'Rolling now');
});

test('ics is valid-looking and escaped', () => {
  const ics = buildIcs({ uid: 'n1-sam', title: 'Movie night: Dune, Part Two', start: new Date('2026-10-17T00:00:00Z'), minutes: 167 });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261017T000000Z\r\n/);
  assert.match(ics, /DTEND:20261017T024700Z\r\n/);
  assert.ok(ics.includes('SUMMARY:Movie night: Dune\\, Part Two\r\n'));
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test('misc helpers', () => {
  assert.equal(ticketNumber('sam', 'n1'), ticketNumber('sam', 'n1'));
  assert.match(ticketNumber('sam', 'n1'), /^\d{6}$/);
  assert.notEqual(ticketNumber('sam', 'n1'), ticketNumber('jo', 'n1'));
  assert.deepEqual(reviewSummary([{ stars: 4 }, { stars: 5 }, { stars: 4 }]), { avg: 4.3, count: 3 });
  assert.deepEqual(reviewSummary([]), { avg: null, count: 0 });
  assert.equal(pickRandom(['a', 'b', 'c'], () => 0.99), 'c');
  assert.equal(pickRandom([], () => 0.5), null);
  assert.equal(parseRuntime('167 min'), 167);
  assert.equal(parseRuntime(''), null);
});

test('recommendations rank shared directors first and explain why', () => {
  const liked = [
    { name: 'Hereditary', genres: ['Drama', 'Horror', 'Mystery'], director: ['Ari Aster'], writer: ['Ari Aster'], cast: ['Toni Collette'], country: 'United States' },
    { name: 'REC', genres: ['Horror'], director: ['Jaume Balagueró', 'Paco Plaza'], cast: ['Manuela Velasco'], country: 'Spain' },
    { name: 'Incantation', genres: ['Horror', 'Mystery'], director: ['Kevin Ko'], country: 'Taiwan' },
  ];
  const p = tasteProfile(liked);
  assert.equal(p.topGenres[0], 'Horror');
  assert.ok(p.foreignShare > 0.6);
  const recs = recommend(p, [
    { id: 'tt1', name: 'Midsommar', genres: ['Drama', 'Horror'], director: ['Ari Aster'], imdbRating: '7.1', country: 'United States' },
    { id: 'tt2', name: 'A Rom-Com', genres: ['Comedy', 'Romance'], imdbRating: '6.0', country: 'United States' },
    { id: 'tt3', name: 'The Wailing', genres: ['Horror', 'Mystery'], imdbRating: '7.4', country: 'South Korea' },
    { id: 'tt4', name: 'Already On Ballot', genres: ['Horror'], director: ['Ari Aster'], imdbRating: '9' },
  ], new Set(['tt4']));
  assert.equal(recs[0].meta.name, 'Midsommar');
  assert.equal(recs[0].reason, 'Because you liked Hereditary (Ari Aster)');
  assert.equal(recs[1].meta.name, 'The Wailing');
  assert.match(recs[1].reason, /^More Horror · Mystery, like /);
  assert.ok(!recs.some((r) => r.meta.name === 'A Rom-Com'));
  assert.ok(!recs.some((r) => r.meta.id === 'tt4'));
  assert.equal(isForeign({ country: 'Spain, Mexico' }), true);
  assert.equal(isForeign({ country: 'United States, Canada' }), false);
  assert.equal(ballotGenre([{ genres: ['Horror', 'Drama'] }, { genres: ['Horror'] }, { genres: ['Comedy'] }]), 'Horror');
  assert.equal(stremioUrl('tt1'), 'https://web.stremio.com/#/detail/movie/tt1');
});

test('hosting rotates Weber -> Ferger -> Libby', () => {
  const P = ['Weber', 'Ferger', 'Libby'];
  assert.equal(nextPlace([], P), 'Weber');
  assert.equal(nextPlace([{ status: 'open' }, { status: 'done', lockedPlace: 'Weber' }], P), 'Ferger');
  assert.equal(nextPlace([{ status: 'locked', lockedPlace: 'Libby' }], P), 'Weber');
  assert.equal(nextPlace([{ status: 'cancelled', lockedPlace: 'Ferger' }, { status: 'done', lockedPlace: 'Ferger' }], P), 'Libby');
  assert.equal(nextPlace([{ status: 'done', lockedPlace: 'Sam' }, { status: 'done', lockedPlace: 'Libby' }], P), 'Weber');
  assert.equal(nextPlace([{ status: 'done', lockedPlace: 'Libby' }], [...P, 'Huey']), 'Huey');
  assert.equal(placeLabel('Ferger'), "Ferger's");
  assert.equal(placeLabel(''), '');
});

test('movieFromMeta maps Cinemeta fields within rule limits', () => {
  const m = movieFromMeta({
    id: 'tt15239678', name: 'Dune: Part Two', year: '2024', poster: 'https://images.metahub.space/poster/small/tt15239678/img',
    runtime: '167 min', imdbRating: '8.4', genres: ['Action', 'Adventure', 'Drama'],
    trailerStreams: [{ title: 'Dune', ytId: 'U2Qp5pL3ovA' }], description: 'x'.repeat(900),
  });
  assert.equal(m.imdbId, 'tt15239678');
  assert.equal(m.trailer, 'U2Qp5pL3ovA');
  assert.equal(m.description.length, 600);
  assert.deepEqual(m.genres, ['Action', 'Adventure', 'Drama']);
});
