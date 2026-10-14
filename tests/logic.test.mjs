import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nameKey, cleanName, initials, countdownParts, countdownText, buildIcs, ticketNumber, reviewSummary, pickRandom,
  movieFromMeta, parseRuntime, tasteProfile, recommend, isForeign, ballotGenre, stremioUrl, placeLabel,
  watchedIds, tallyShelf, pickMovie, lockFields, lockDue, doneDue, lockAt, upcomingNights, pastNights, hostCounts,
  dayKey, dayFromKey, calendarDays, tallyDays, sinceLastLook, shelfTags, excludedFor,
  icsEvent, icsCalendar, icsFold, icsEscape,
  tasteMatch, pickLeaders, mostWanted, recap,
} from '../public/js/logic.js';

const at = (ms) => new Date(ms);
const H = 3600 * 1000;

test('names normalize to rule-safe keys', () => {
  assert.equal(cleanName('  Sam   O\'Neil  '), "Sam O'Neil");
  assert.equal(nameKey("Sam O'Neil"), 'sam-o-neil');
  assert.equal(nameKey('Zoë'), 'zoe');
  assert.equal(nameKey('!!!'), '');
  assert.ok(nameKey('x'.repeat(31) + ' yy').length <= 32);
  assert.equal(initials('sam oneil'), 'SO');
  assert.match(nameKey('Ольга'), /^u[a-z0-9]+$/);
  assert.equal(nameKey('Ольга'), nameKey(' ольга '));
});

const movies = [
  { imdbId: 'tt1', title: 'Alpha', at: at(1) },
  { imdbId: 'tt2', title: 'Bravo', at: at(2), shelf: ['Foreign'] },
  { imdbId: 'tt3', title: 'Charlie', at: at(3) },
  { imdbId: 'tt4', title: 'Watched One', at: at(4) },
];
const votes = [
  { movie: 'tt1', nameKey: 'al', name: 'Al' }, { movie: 'tt1', nameKey: 'bo', name: 'Bo' }, { movie: 'tt1', nameKey: 'cy', name: 'Cy' },
  { movie: 'tt2', nameKey: 'jo', name: 'Jo' }, { movie: 'tt2', nameKey: 'sam', name: 'Sam' },
  { movie: 'tt4', nameKey: 'jo', name: 'Jo' }, { movie: 'tt4', nameKey: 'sam', name: 'Sam' }, { movie: 'tt4', nameKey: 'al', name: 'Al' }, { movie: 'tt4', nameKey: 'bo', name: 'Bo' },
];
const nights = [
  { day: '2026-10-01', status: 'done', host: 'Jo', lockedMovieId: 'tt4', startsAt: at(10) },
  { day: '2026-10-08', status: 'done', host: 'Jo', lockedMovieId: 'tt9', startsAt: at(20) },
  { day: '2026-10-09', status: 'cancelled', host: 'Al', startsAt: at(30) },
];

test('the shelf leaves out watched movies and ranks by thumbs', () => {
  const watched = watchedIds(nights);
  assert.deepEqual([...watched].sort(), ['tt4', 'tt9']);
  const t = tallyShelf({ movies, votes, seen: [{ movie: 'tt2', nameKey: 'jo', name: 'Jo' }], watched });
  assert.deepEqual(t.movies.map((m) => m.imdbId), ['tt1', 'tt2', 'tt3']);
  assert.equal(t.movies[0].votes, 3);
  assert.deepEqual(t.movies[1].seenBy.map((x) => x.name), ['Jo']);
  assert.deepEqual(t.leaders.map((m) => m.imdbId), ['tt1']);
  assert.deepEqual(shelfTags(movies), ['Foreign']);
});

test('the pick: thumbs from the people coming, then everyone, then anything', () => {
  const watched = watchedIds(nights);
  const coming = pickMovie({ movies, votes, watched, attendees: ['jo', 'sam'], rand: () => 0 });
  assert.equal(coming.movie.imdbId, 'tt2'); // tt1 has more thumbs overall, but not from them
  assert.equal(coming.basis, 'coming');
  assert.deepEqual(coming.tie, []);
  const everyone = pickMovie({ movies, votes, watched, attendees: ['zed'], rand: () => 0 });
  assert.equal(everyone.movie.imdbId, 'tt1');
  assert.equal(everyone.basis, 'everyone');
  const nobody = pickMovie({ movies, votes: [], watched, attendees: [], rand: () => 0.99 });
  assert.equal(nobody.basis, 'shelf');
  assert.equal(nobody.tie.length, 3);
  const tie = pickMovie({ movies, votes, watched, attendees: ['al', 'jo'], rand: () => 0.99 });
  assert.deepEqual(tie.tie.sort(), ['tt1', 'tt2']);
  assert.equal(pickMovie({ movies: [], votes }), null);
  const f = lockFields(coming);
  assert.equal(f.status, 'locked');
  assert.equal(f.lockedMovieId, 'tt2');
  assert.equal(f.lockedMovie.title, 'Bravo');
});

test('nights lock a day ahead and file the morning after', () => {
  const start = new Date('2026-10-17T00:00:00Z');
  const n = { status: 'planned', startsAt: start };
  assert.equal(lockAt(n).toISOString(), '2026-10-16T00:00:00.000Z');
  assert.equal(lockDue(n, new Date(start - 25 * H)), false);
  assert.equal(lockDue(n, new Date(start - 23 * H)), true);
  assert.equal(doneDue({ ...n, status: 'locked' }, new Date(start.getTime() + 11 * H)), false);
  assert.equal(doneDue({ ...n, status: 'locked' }, new Date(start.getTime() + 13 * H)), true);
  const now = at(100 * H);
  const list = [
    { day: 'b', status: 'locked', startsAt: at(120 * H) }, { day: 'a', status: 'planned', startsAt: at(110 * H) },
    { day: 'old', status: 'planned', startsAt: at(80 * H) }, { day: 'x', status: 'cancelled', startsAt: at(130 * H) },
    { day: 'rolling', status: 'locked', startsAt: at(95 * H) },
  ];
  assert.deepEqual(upcomingNights(list, now).map((x) => x.day), ['rolling', 'a', 'b']);
  assert.deepEqual(pastNights(nights).map((x) => x.day), ['2026-10-08', '2026-10-01']);
  assert.deepEqual(hostCounts(nights), [['Jo', 2]]);
});

test('a pick leaves out watched movies and movies other nights locked', () => {
  const ex = excludedFor([...nights, { day: 'a', status: 'locked', lockedMovieId: 'tt1' }, { day: 'b', status: 'locked', lockedMovieId: 'tt2' }], 'b');
  assert.deepEqual([...ex].sort(), ['tt1', 'tt4', 'tt9']);
});

test('calendar days and who is free', () => {
  const days = calendarDays(new Date(2026, 9, 30), 4);
  assert.deepEqual(days, ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.equal(dayKey(dayFromKey('2026-11-01')), '2026-11-01');
  const t = tallyDays(days, {
    free: [{ day: '2026-10-31', nameKey: 'jo', name: 'Jo' }, { day: '2026-10-31', nameKey: 'al', name: 'Al' }],
    nights: [{ day: '2026-10-31', status: 'planned', host: 'Jo' }, { day: '2026-11-01', status: 'cancelled', host: 'Al' }],
  });
  assert.deepEqual(t[1].free.map((f) => f.name), ['Al', 'Jo']);
  assert.equal(t[1].night.host, 'Jo');
  assert.equal(t[2].night, null);
});

test('since you last looked: what changed, minus your own doing', () => {
  const since = 1000;
  const n = sinceLastLook({
    since, meKey: 'me',
    nights: [
      { day: '2026-10-17', status: 'planned', host: 'Jo', hostKey: 'jo', createdAt: at(2000), startsAt: new Date(2026, 9, 17, 20) },
      { day: '2026-10-18', status: 'locked', host: 'Me', hostKey: 'me', createdAt: at(2000), lockedAt: at(3000), startsAt: new Date(2026, 9, 18, 20), lockedMovie: { title: 'Smile' } },
    ],
    movies: [{ imdbId: 'tt1', title: 'Old', by: 'jo', at: at(10) }, { imdbId: 'tt2', title: 'New', by: '', at: at(1500) }, { imdbId: 'tt3', title: 'Mine', by: 'me', at: at(1500) }],
    votes: [{ movie: 'tt1', nameKey: 'jo', at: at(1800) }, { movie: 'tt1', nameKey: 'me', at: at(1800) }, { movie: 'gone', nameKey: 'jo', at: at(1800) }],
    free: [{ day: '2026-10-20', nameKey: 'al', name: 'Al', at: at(1900) }],
  });
  const text = n.items.map((i) => i.text);
  assert.match(text[0], /^Jo is hosting /);
  assert.match(text[1], /^Locked for .*: Smile$/);
  assert.deepEqual(text.slice(2), ['1 new movie on the shelf: New', '1 new thumbs-up on 1 movie', 'Al marked free evenings']);
  assert.deepEqual([...n.movies], ['tt2']);
  assert.equal(n.votes.get('tt1'), 1);
  assert.ok(n.days.has('2026-10-17') && n.days.has('2026-10-20'));
  assert.deepEqual(sinceLastLook({ since: null, movies }).items, []);
});

const thumbs = (key, name, ...ids) => ids.map((movie) => ({ movie, nameKey: key, name }));

test('taste match: how alike two people\'s thumbs are, most alike first', () => {
  const v = [
    ...thumbs('me', 'Me', 'a', 'b', 'c', 'd'), // d is a watched movie: still counts
    ...thumbs('jo', 'Jo', 'a', 'b', 'c', 'd'),
    ...thumbs('sam', 'Sam', 'a', 'b', 'e'),
    ...thumbs('al', 'Al', 'a', 'b', 'x'),
    ...thumbs('bo', 'Bo', 'a', 'b'), // too few thumbs to say anything
    ...thumbs('cy', 'Cy', 'x', 'y', 'z'),
  ];
  assert.deepEqual(tasteMatch(v, 'me'), [
    { nameKey: 'jo', name: 'Jo', pct: 100, shared: 4 },
    { nameKey: 'al', name: 'Al', pct: 40, shared: 2 }, // 2 of 5 movies; ties by name
    { nameKey: 'sam', name: 'Sam', pct: 40, shared: 2 },
    { nameKey: 'cy', name: 'Cy', pct: 0, shared: 0 },
  ]);
  // The threshold is adjustable, and it applies to me as well.
  assert.deepEqual(tasteMatch(v, 'me', { minThumbs: 2 }).find((x) => x.nameKey === 'bo'), { nameKey: 'bo', name: 'Bo', pct: 50, shared: 2 });
  assert.deepEqual(tasteMatch(v, 'bo'), []);
  assert.deepEqual(tasteMatch(v, 'nobody'), []);
  assert.deepEqual(tasteMatch([], 'me'), []);
  assert.equal(tasteMatch(v, 'jo').find((x) => x.nameKey === 'me').pct, 100);
  // Two of three thumbs in common is 2 of 4 movies between them.
  const close = tasteMatch([...thumbs('me', 'Me', 'a', 'b', 'c'), ...thumbs('di', 'Di', 'a', 'b', 'q')], 'me');
  assert.deepEqual(close, [{ nameKey: 'di', name: 'Di', pct: 50, shared: 2 }]);
  const third = tasteMatch([...thumbs('me', 'Me', 'a', 'b', 'c', 'd'), ...thumbs('ed', 'Ed', 'a', 'b', 'c', 'x', 'y', 'z', 'w')], 'me');
  assert.equal(third[0].pct, 38); // 3 of 8 movies, rounded
});

test('pick leaders: whose shelf additions became a night', () => {
  const shelf = [
    { imdbId: 'tt1', by: 'sam', byName: 'Sam' }, { imdbId: 'tt2', by: 'sam', byName: 'Sam' },
    { imdbId: 'tt3', by: 'jo', byName: 'Jo' }, { imdbId: 'tt4', by: '', byName: 'The house' },
    { imdbId: 'tt5', by: 'sam', byName: 'Sam' }, { imdbId: 'tt6', by: 'jo', byName: 'Jo' }, { imdbId: 'tt7', by: '', byName: 'The house' },
  ];
  const list = [
    { day: '1', status: 'done', lockedMovieId: 'tt1' }, { day: '2', status: 'done', lockedMovieId: 'tt2' },
    { day: '3', status: 'locked', lockedMovieId: 'tt3' }, { day: '4', status: 'done', lockedMovieId: 'tt4' },
    { day: '5', status: 'cancelled', lockedMovieId: 'tt5' }, { day: '6', status: 'planned' },
    { day: '7', status: 'done', lockedMovieId: 'gone' }, { day: '8', status: 'done', lockedMovieId: 'tt7' },
  ];
  assert.deepEqual(pickLeaders(list, shelf), [
    { nameKey: '', name: 'House', picks: 2 }, // tied with Sam: ties by name
    { nameKey: 'sam', name: 'Sam', picks: 2 },
    { nameKey: 'jo', name: 'Jo', picks: 1 },
  ]);
  assert.deepEqual(pickLeaders([], shelf), []);
  assert.deepEqual(pickLeaders(list), []);
});

test('most wanted: unwatched movies with a thumb, most first', () => {
  const t = tallyShelf({ movies, votes, watched: watchedIds(nights) });
  assert.deepEqual(mostWanted(t.movies).map((m) => m.imdbId), ['tt1', 'tt2']); // tt3 has none; tt4 is watched
  assert.deepEqual(mostWanted(t.movies, 1).map((m) => m.imdbId), ['tt1']);
  assert.deepEqual(mostWanted([]), []);
  const many = Array.from({ length: 8 }, (_, i) => ({ imdbId: `m${i}`, title: `M${i}`, votes: 8 - i }));
  assert.deepEqual(mostWanted(many).map((m) => m.imdbId), ['m0', 'm1', 'm2', 'm3', 'm4']);
});

test('recap: nights, hours, shelf, thumbs and the top voter', () => {
  const list = [
    { day: '1', status: 'done', lockedMovie: { runtime: '148 min' } }, { day: '2', status: 'done', lockedMovie: { runtime: '95 min' } },
    { day: '3', status: 'done', lockedMovie: {} }, { day: '4', status: 'locked', lockedMovie: { runtime: '300 min' } },
    { day: '5', status: 'cancelled' },
  ];
  const v = [...thumbs('sam', 'Sam', 'a', 'b', 'c'), ...thumbs('jo', 'Jo', 'a', 'b')];
  assert.deepEqual(recap(list, v, movies), { nights: 3, hours: 4, shelf: 4, thumbs: 5, topVoter: { nameKey: 'sam', name: 'Sam', thumbs: 3 } });
  assert.equal(recap(list, thumbs('sam', 'Sam', 'a', 'b').concat(thumbs('al', 'Al', 'a', 'b')), []).topVoter.name, 'Al'); // ties by name
  assert.deepEqual(recap(), { nights: 0, hours: 0, shelf: 0, thumbs: 0, topVoter: null });
});

test('countdown, calendar file, helpers', () => {
  const now = new Date('2026-10-12T12:00:00Z');
  assert.deepEqual(countdownParts(new Date('2026-10-14T15:30:00Z'), now), { past: false, days: 2, hours: 3, minutes: 30 });
  assert.equal(countdownText(new Date('2026-10-12T12:45:00Z'), now), '45m');
  const ics = buildIcs({ uid: 'n1-sam', title: 'Movie night: Dune, Part Two', start: new Date('2026-10-17T00:00:00Z'), minutes: 167 });
  assert.match(ics, /DTSTART:20261017T000000Z\r\n/);
  assert.ok(ics.includes('SUMMARY:Movie night: Dune\\, Part Two\r\n'));
  assert.match(ticketNumber('sam', 'n1'), /^\d{6}$/);
  assert.deepEqual(reviewSummary([{ stars: 4 }, { stars: 5 }, { stars: 4 }]), { avg: 4.3, count: 3 });
  assert.equal(pickRandom(['a', 'b', 'c'], () => 0.99), 'c');
  assert.equal(parseRuntime('167 min'), 167);
  assert.equal(placeLabel('Jo'), "Jo's");
  assert.equal(stremioUrl('tt1'), 'https://web.stremio.com/#/detail/movie/tt1');
});

test('the shared VEVENT formatter: escaping, folding, UID and alarm', () => {
  const start = new Date('2026-10-17T00:00:00Z');
  const stamp = new Date('2026-10-12T12:00:00Z');
  const lines = icsEvent({
    uid: '2026-10-16', title: 'Dune, Part Two; at Jo\'s', start, minutes: 155, stamp,
    description: 'Coming: Al, Sam\nTheme: Back\\slash', url: 'https://weberplex.vercel.app',
  });
  assert.deepEqual(lines.slice(0, 7), [
    'BEGIN:VEVENT', 'UID:2026-10-16@weberplex', 'DTSTAMP:20261012T120000Z',
    'DTSTART:20261017T000000Z', 'DTEND:20261017T023500Z',
    "SUMMARY:Dune\\, Part Two\\; at Jo's", 'DESCRIPTION:Coming: Al\\, Sam\\nTheme: Back\\\\slash',
  ]);
  assert.ok(lines.includes('URL:https://weberplex.vercel.app'));
  assert.ok(!lines.some((l) => l.startsWith('LOCATION')), 'no location unless given');
  // One alarm, two hours before, shown on screen.
  const alarm = lines.slice(lines.indexOf('BEGIN:VALARM'), lines.indexOf('END:VALARM') + 1);
  assert.deepEqual(alarm.slice(0, 3), ['BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY']);
  assert.equal(lines.filter((l) => l === 'BEGIN:VALARM').length, 1);
  assert.equal(lines.at(-1), 'END:VEVENT');
  assert.equal(icsEscape('a\r\nb'), 'a\\nb');

  // Folding: 75 octets a line, continuation lines start with a space, nothing
  // is lost, and a multi-byte character is never split.
  const long = `SUMMARY:${'Ünïcödé ✓ movie '.repeat(12)}`;
  const folded = icsFold(long);
  const physical = folded.split('\r\n');
  assert.ok(physical.length > 2);
  for (const l of physical) assert.ok(new TextEncoder().encode(l).length <= 75, l);
  assert.ok(physical.slice(1).every((l) => l.startsWith(' ')));
  assert.equal(folded.replace(/\r\n /g, ''), long);
  assert.ok(!folded.includes('\uFFFD'));
  assert.equal(icsFold('SHORT:line'), 'SHORT:line');

  // A long title folds inside the event and in the whole file, and unfolds back.
  const title = `Everything Everywhere All at Once, a very long movie title for the feed ${'é'.repeat(30)}`;
  const file = icsCalendar([icsEvent({ uid: 'x', title, start, stamp })], ['X-WR-CALNAME:Weberplex']);
  assert.ok(file.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Weberplex//EN\r\n'));
  assert.ok(file.includes('\r\nX-WR-CALNAME:Weberplex\r\n'));
  assert.ok(file.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'));
  for (const l of file.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75, l);
  assert.ok(file.replace(/\r\n /g, '').includes(`SUMMARY:${title.replace(/,/g, '\\,')}\r\n`));

  // The single-night download is the same formatter.
  const one = buildIcs({ uid: 'n1-sam', title: 'T', start, stamp });
  assert.ok(one.includes('BEGIN:VEVENT\r\nUID:n1-sam@weberplex\r\n'));
  assert.ok(one.includes('BEGIN:VALARM\r\nTRIGGER:-PT2H\r\n'));
  assert.equal(icsCalendar().split('\r\n').slice(-3, -1).join('|'), 'METHOD:PUBLISH|END:VCALENDAR');
});

test('recommendations rank shared directors first and explain why', () => {
  const p = tasteProfile([
    { name: 'Hereditary', genres: ['Drama', 'Horror', 'Mystery'], director: ['Ari Aster'], country: 'United States' },
    { name: 'REC', genres: ['Horror'], director: ['Paco Plaza'], country: 'Spain' },
  ]);
  const recs = recommend(p, [
    { id: 'tt1', name: 'Midsommar', genres: ['Drama', 'Horror'], director: ['Ari Aster'], imdbRating: '7.1' },
    { id: 'tt2', name: 'A Rom-Com', genres: ['Comedy'], imdbRating: '6.0' },
  ]);
  assert.equal(recs[0].reason, 'Because you liked Hereditary (Ari Aster)');
  assert.ok(!recs.some((r) => r.meta.name === 'A Rom-Com'));
  assert.equal(isForeign({ country: 'Spain, Mexico' }), true);
  assert.equal(ballotGenre([{ genres: ['Horror'] }, { genres: ['Horror', 'Drama'] }]), 'Horror');
});

test('movieFromMeta maps Cinemeta fields within rule limits', () => {
  const m = movieFromMeta({ id: 'tt15239678', name: 'Dune: Part Two', year: '2024', trailerStreams: [{ ytId: 'U2Qp5pL3ovA' }], description: 'x'.repeat(900), genres: ['Action'] });
  assert.equal(m.imdbId, 'tt15239678');
  assert.equal(m.trailer, 'U2Qp5pL3ovA');
  assert.equal(m.description.length, 600);
});
