import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nameKey, cleanName, initials, countdownParts, countdownText, buildIcs, ticketNumber, reviewSummary, pickRandom,
  movieFromMeta, parseRuntime, tasteProfile, recommend, isForeign, ballotGenre, stremioUrl, placeLabel,
  watchedIds, tallyShelf, pickMovie, lockFields, lockDue, doneDue, lockAt, upcomingNights, pastNights, hostCounts,
  dayKey, dayFromKey, calendarDays, tallyDays, sinceLastLook, shelfTags, excludedFor,
  icsEvent, icsCalendar, icsFold, icsEscape,
  tasteMatch, pickLeaders, mostWanted, recap,
  ballotFor, nightPick, howDecided, BALLOT_SIZE,
  vetoedFor, pickable, fitsTheme, themeOptions, cleanTheme, showtimeShort, showtimeLong, looksLike, whenWords, sinceWords, googleCalendarUrl,
  parseMovieList, matchMovie, pasteStates, releaseYear, PASTE_MAX,
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

test('names that may be the same person get a second look', () => {
  assert.ok(looksLike('Grandma', 'Gma'));     // letters left out
  assert.ok(looksLike('Sam', 'Samantha'));
  assert.ok(looksLike('Jon', 'Jo'));
  assert.ok(looksLike('Sarah', 'Sara'));
  assert.ok(looksLike('Kyle', 'Kile'));       // one typo apart
  assert.ok(!looksLike('Sam', 'Sam'));        // the same name is the same person, not a lookalike
  assert.ok(!looksLike('Jo', 'Sam'));
  assert.ok(!looksLike('Kim', 'Sam'));
  assert.ok(!looksLike('Fran', 'Jo'));
  assert.ok(!looksLike('A', 'Al'));           // one letter tells nothing
});

test('how far off, in words', () => {
  const now = new Date(2026, 9, 14, 10, 0);
  assert.equal(whenWords(new Date(2026, 10, 2, 21, 0), now), 'in 19 days');
  assert.equal(whenWords(new Date(2026, 9, 16, 20, 0), now), 'in 2 days');
  assert.equal(whenWords(new Date(2026, 9, 15, 20, 0), now), 'tomorrow');
  assert.equal(whenWords(new Date(2026, 9, 15, 1, 0), now), 'tomorrow');    // past midnight and 15 hours off
  assert.equal(whenWords(new Date(2026, 9, 15, 1, 0), new Date(2026, 9, 14, 20, 0)), 'in 5 hr'); // tomorrow by the calendar, but tonight to a person
  assert.equal(whenWords(new Date(2026, 9, 14, 15, 20), now), 'in 5 hr 20 min');
  assert.equal(whenWords(new Date(2026, 9, 14, 10, 40), now), 'in 40 min');
  assert.equal(whenWords(new Date(2026, 9, 14, 9, 0), now), 'now');
});

test('since you last looked, in words', () => {
  const now = new Date(2026, 9, 14, 15, 0); // a Wednesday
  const time = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(' ', '\u00a0');
  const noon = new Date(2026, 9, 14, 12, 28);
  assert.equal(sinceWords(noon, now), `${time(noon)} today`); // never "since Wed" on a Wednesday
  const late = new Date(2026, 9, 13, 21, 5);
  assert.equal(sinceWords(late, now), `yesterday at ${time(late)}`);
  const mon = new Date(2026, 9, 12, 21, 5);
  assert.equal(sinceWords(mon, now), `${mon.toLocaleDateString(undefined, { weekday: 'short' })} ${time(mon)}`);
  const old = new Date(2026, 9, 3, 9, 0);
  assert.equal(sinceWords(old, now), old.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  assert.doesNotMatch(sinceWords(noon, now), / (AM|PM)/); // the time keeps its AM/PM on the same line
});

test('Add to Google Calendar link for a night', () => {
  const url = new URL(googleCalendarUrl({ title: 'Movie night: Jaws', start: new Date(Date.UTC(2026, 10, 4, 1, 0)), minutes: 150, details: 'At Jo’s', location: 'Jo’s' }));
  assert.equal(url.host, 'calendar.google.com');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), 'Movie night: Jaws');
  assert.equal(url.searchParams.get('dates'), '20261104T010000Z/20261104T033000Z');
});

test('a showtime keeps its time and AM/PM together', () => {
  const s = showtimeLong(new Date(2026, 10, 3, 21, 0), 'en-US');
  assert.match(s, /9:00 PM$/);
  assert.doesNotMatch(s, /\d PM/);
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
  // Thumbs from the people coming are level (Al thumbed Alpha, Jo thumbed Bravo), so thumbs
  // from everyone break it: Alpha has three, Bravo two. Nothing left to tie.
  const level = pickMovie({ movies, votes, watched, attendees: ['al', 'jo'], rand: () => 0.99 });
  assert.equal(level.movie.imdbId, 'tt1');
  assert.deepEqual(level.tie, []);
  // Level on everything the ballot weighs (thumbs from them, who has seen it, thumbs overall): the reel.
  const tie = pickMovie({ movies, votes: [votes[0], votes[3]], watched, attendees: ['al', 'jo'], rand: () => 0.99 });
  assert.deepEqual(tie.tie.sort(), ['tt1', 'tt2']);
  assert.equal(tie.basis, 'coming');
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
  assert.match(text[0], /^Locked for .*: Smile$/); // your own night comes first
  assert.equal(text[1], '1 new movie on the shelf: New'); // then what needs your tap
  assert.match(text[2], /^Jo is hosting /);
  assert.match(text[3], /^\S+ thumbed up \S/); // who and what, in names (not "1 new thumbs-up on 1 movie")
  assert.equal(text[4], 'Al marked free evenings');
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

test('pick leaders: whose shelf additions became a watched night', () => {
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
  ]); // Jo's tt3 is locked, not watched yet: it would give the movie away
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

// ---- themes and vetoes ----------------------------------------------------------
// A small shelf with tags and genres. Thumbs: Alpha 3, Bravo 2 (both from the
// people coming), Charlie 1, Delta 0.
const tmovies = [
  { imdbId: 'tt1', title: 'Alpha', at: at(1), genres: ['Comedy'] },
  { imdbId: 'tt2', title: 'Bravo', at: at(2), genres: ['Horror', 'Thriller'], shelf: ['Foreign'] },
  { imdbId: 'tt3', title: 'Charlie', at: at(3), genres: ['Horror'] },
  { imdbId: 'tt4', title: 'Delta', at: at(4), genres: ['Drama'], shelf: ['Recent favorite'] },
];
const tvotes = [
  ...['al', 'bo', 'cy'].map((k) => ({ movie: 'tt1', nameKey: k, name: k })),
  ...['al', 'bo'].map((k) => ({ movie: 'tt2', nameKey: k, name: k })),
  { movie: 'tt3', nameKey: 'al', name: 'al' },
];
const tpick = (extra) => pickMovie({ movies: tmovies, votes: tvotes, attendees: ['al', 'bo', 'cy'], rand: () => 0, ...extra });

test('a veto takes a movie out of the pick', () => {
  assert.equal(tpick().movie.imdbId, 'tt1');
  const v = tpick({ vetoed: new Set(['tt1']) });
  assert.equal(v.movie.imdbId, 'tt2', 'the next favorite wins');
  assert.equal(v.basis, 'coming');
  assert.deepEqual(v.tie, []);
  // Vetoing the whole top tier hands it to the next tier.
  assert.equal(tpick({ vetoed: new Set(['tt1', 'tt2']) }).movie.imdbId, 'tt3');
  // The votes of the people coming still decide first: Delta (no thumbs) is never next.
  assert.equal(tpick({ vetoed: new Set(['tt1', 'tt2', 'tt3']) }).movie.imdbId, 'tt4');
  assert.deepEqual([...vetoedFor({ vetoes: { al: 'tt1', bo: 'tt1', cy: 'tt3' } })].sort(), ['tt1', 'tt3']);
  assert.equal(vetoedFor({}).size, 0, 'old nights have no vetoes field');
  assert.equal(vetoedFor(undefined).size, 0);
});

test('when every movie is vetoed the vetoes are ignored', () => {
  const all = new Set(tmovies.map((m) => m.imdbId));
  const p = tpick({ vetoed: all });
  assert.equal(p.movie.imdbId, 'tt1');
  assert.equal(p.basis, 'coming');
  // Watched movies leave the shelf before vetoes are weighed.
  assert.equal(tpick({ vetoed: all, watched: new Set(['tt4']) }).movie.imdbId, 'tt1');
});

test('a theme narrows the pick to movies with that tag or genre', () => {
  // Horror: Bravo and Charlie fit; Bravo has more thumbs from the people coming.
  const h = tpick({ theme: 'Horror' });
  assert.equal(h.movie.imdbId, 'tt2');
  assert.equal(h.themeFallback, false);
  // Case-insensitive, and shelf tags count as well as genres.
  assert.equal(tpick({ theme: 'horror' }).movie.imdbId, 'tt2');
  assert.equal(tpick({ theme: 'recent favorite' }).movie.imdbId, 'tt4');
  assert.equal(tpick({ theme: 'FOREIGN' }).movie.imdbId, 'tt2');
  // A theme beats thumbs: Delta has none and still wins its own theme.
  assert.equal(tpick({ theme: 'Drama' }).basis, 'shelf');
  // No theme at all is the plain pick, flagged false.
  assert.equal(tpick().themeFallback, false);
  assert.equal(tpick({ theme: '' }).themeFallback, false);
  // The theme's ties still go to the reel.
  const tie = pickMovie({ movies: tmovies, votes: [], theme: 'Horror', rand: () => 0.99 });
  assert.deepEqual(tie.tie.sort(), ['tt2', 'tt3']);
});

test('a theme nothing fits falls back to the whole shelf and says so', () => {
  const w = tpick({ theme: 'Western' });
  assert.equal(w.themeFallback, true);
  assert.equal(w.movie.imdbId, 'tt1', 'the ordinary favorite');
  // Vetoes apply first: with the only Horror favorite vetoed, the other fits.
  assert.equal(tpick({ theme: 'Horror', vetoed: new Set(['tt2']) }).movie.imdbId, 'tt3');
  // Both Horror movies vetoed: no fit left, so the theme drops and the rest of the shelf is picked.
  const none = tpick({ theme: 'Horror', vetoed: new Set(['tt2', 'tt3']) });
  assert.equal(none.themeFallback, true);
  assert.equal(none.movie.imdbId, 'tt1');
  // pickable() is what the UI lists "what the people coming want" from.
  const shelf = tmovies.map((m) => ({ ...m, voters: [], votes: 0 }));
  assert.deepEqual(pickable(shelf, { theme: 'Horror' }).movies.map((m) => m.imdbId), ['tt2', 'tt3']);
  assert.equal(pickable(shelf, { theme: 'Western' }).themeFallback, true);
  assert.equal(pickable(shelf, { vetoed: new Set(['tt1']) }).movies.length, 3);
  assert.equal(pickable(shelf, { vetoed: new Set(shelf.map((m) => m.imdbId)) }).movies.length, 4);
  assert.equal(pickMovie({ movies: [], votes: [], theme: 'Horror' }), null);
});

// ---- the ballot -------------------------------------------------------------------
// Seven movies. Thumbs from the people coming (al, bo, cy): Alpha 3, Bravo 2, Charlie 1,
// Delta 1, Echo 1, Foxtrot 1 (and one more from someone not coming), Golf 0. Alpha has
// been seen by someone coming (Bo); Bravo only by someone who isn't.
const bmovies = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf'].map((title, i) => ({ imdbId: `tt${i + 1}`, title, at: at(i + 1), genres: i === 6 ? ['Horror'] : ['Comedy'] }));
const bthumbs = [
  ...['al', 'bo', 'cy'].map((k) => ({ movie: 'tt1', nameKey: k, name: k })),
  ...['al', 'bo'].map((k) => ({ movie: 'tt2', nameKey: k, name: k })),
  { movie: 'tt3', nameKey: 'al', name: 'al' }, { movie: 'tt4', nameKey: 'bo', name: 'bo' },
  { movie: 'tt5', nameKey: 'cy', name: 'cy' }, { movie: 'tt6', nameKey: 'cy', name: 'cy' },
  { movie: 'tt6', nameKey: 'zed', name: 'zed' }, // Foxtrot: one more thumb overall, from someone not coming
];
const bseen = [{ movie: 'tt1', nameKey: 'bo', name: 'bo' }, { movie: 'tt2', nameKey: 'zed', name: 'zed' }];
const COMING = ['al', 'bo', 'cy'];
const ids = (rows) => rows.map((r) => r.movie.imdbId);
const ballot = (night = {}, extra = {}) => ballotFor(night, { movies: bmovies, votes: bthumbs, seen: bseen, attendees: COMING, ...extra });
const bpick = (extra) => pickMovie({ movies: bmovies, votes: bthumbs, seen: bseen, attendees: COMING, rand: () => 0, ...extra });
const thumb = (movie, nameKey) => ({ movie, nameKey, name: nameKey });

test('the ballot: thumbs from the people coming rank it, top five, ties by who has seen it, then thumbs overall, then title', () => {
  const rows = ballot();
  assert.equal(BALLOT_SIZE, 5);
  // Alpha 3 and Bravo 2 lead. At one thumb each, Foxtrot has the most thumbs overall; then
  // Charlie, Delta and Echo by title, and Echo is sixth. Golf has no thumbs: off the ballot.
  assert.deepEqual(ids(rows), ['tt1', 'tt2', 'tt6', 'tt3', 'tt4']);
  assert.deepEqual(rows.map((r) => r.thumbsComing), [3, 2, 1, 1, 1]);
  // Row shape: how many of the people coming have seen it, who voted, who wrote it in.
  assert.deepEqual(rows[0], { movie: rows[0].movie, thumbsComing: 3, seenComing: 1, votes: [], writeInBy: null });
  assert.equal(rows[0].movie.title, 'Alpha');
  assert.equal(rows[1].seenComing, 0, 'Bravo was seen by someone who is not coming');
  // At equal thumbs a movie nobody coming has seen comes before one somebody has...
  const same = ballotFor({}, { movies: bmovies.slice(0, 2), votes: [thumb('tt1', 'al'), thumb('tt2', 'al')], seen: [{ movie: 'tt1', nameKey: 'bo', name: 'bo' }], attendees: ['al', 'bo'] });
  assert.deepEqual(ids(same), ['tt2', 'tt1']);
  // ...and fewer people coming who have seen it come before more.
  const fewer = ballotFor({}, { movies: bmovies.slice(0, 3), votes: [thumb('tt1', 'al'), thumb('tt2', 'al'), thumb('tt3', 'al')], seen: [{ movie: 'tt1', nameKey: 'bo', name: 'bo' }, { movie: 'tt1', nameKey: 'cy', name: 'cy' }, { movie: 'tt2', nameKey: 'bo', name: 'bo' }], attendees: COMING });
  assert.deepEqual(ids(fewer), ['tt3', 'tt2', 'tt1']);
  // Nobody has thumbed anything: the ballot is still five, in title order.
  assert.deepEqual(ids(ballotFor({}, { movies: bmovies, votes: [], attendees: COMING })), ['tt1', 'tt2', 'tt3', 'tt4', 'tt5']);
  assert.deepEqual(ballotFor({}, { movies: [] }), []);
});

test('the ballot keeps write-ins and voted movies that fell out of the top five, once each', () => {
  const night = { ballotVotes: { al: 'tt7', bo: 'tt7', cy: 'tt2' }, writeIns: { al: 'tt7', bo: 'tt5', cy: 'tt3' } };
  const rows = ballot(night);
  // Golf is off the top five but holds two votes and a write-in; Echo is sixth and written in.
  assert.deepEqual(ids(rows), ['tt1', 'tt2', 'tt6', 'tt3', 'tt4', 'tt5', 'tt7']);
  const byId = Object.fromEntries(rows.map((r) => [r.movie.imdbId, r]));
  assert.deepEqual(byId.tt7.votes, ['al', 'bo']);
  assert.equal(byId.tt7.writeInBy, 'al');
  assert.equal(byId.tt5.writeInBy, 'bo');
  assert.equal(byId.tt3.writeInBy, 'cy', 'a write-in already in the top five just wears the tag');
  assert.deepEqual(byId.tt2.votes, ['cy']);
  assert.equal(byId.tt1.writeInBy, null);
  assert.equal(new Set(ids(rows)).size, rows.length, 'nothing twice');
  // Two people writing in one movie: the first name (by key) is the one shown.
  assert.equal(ballot({ writeIns: { cy: 'tt7', al: 'tt7' } }).at(-1).writeInBy, 'al');
});

test('the ballot leaves out vetoed and off-theme movies, and ignores people who are not coming', () => {
  // A vetoed movie is gone, and so is a write-in or vote for it; the next one moves up.
  const vetoed = ballot({ vetoes: { al: 'tt1' }, ballotVotes: { bo: 'tt1' }, writeIns: { cy: 'tt1' } });
  assert.deepEqual(ids(vetoed), ['tt2', 'tt6', 'tt3', 'tt4', 'tt5']);
  assert.ok(vetoed.every((r) => !r.votes.length && !r.writeInBy));
  // A theme narrows the pool first (Golf is the only Horror, and has no thumbs).
  assert.deepEqual(ids(ballot({ theme: 'Horror' })), ['tt7']);
  assert.deepEqual(ids(ballot({ theme: 'horror', writeIns: { al: 'tt1' } })), ['tt7'], 'a write-in that does not fit the theme is off too');
  // Someone who dropped out: their vote and write-in count for nothing, and do not keep a movie on.
  const out = ballot({ ballotVotes: { zed: 'tt7', al: 'tt2' }, writeIns: { zed: 'tt7' } });
  assert.deepEqual(ids(out), ['tt1', 'tt2', 'tt6', 'tt3', 'tt4']);
  assert.deepEqual(out.find((r) => r.movie.imdbId === 'tt2').votes, ['al']);
  // Watched movies and other nights' picks are not pickable.
  assert.deepEqual(ids(ballot({}, { watched: new Set(['tt1']) })), ['tt2', 'tt6', 'tt3', 'tt4', 'tt5']);
  // An old night (no ballot fields) works as before.
  assert.deepEqual(ids(ballotFor({ day: 'old' }, { movies: bmovies, votes: bthumbs, attendees: COMING })), ['tt1', 'tt2', 'tt6', 'tt3', 'tt4']);
  assert.deepEqual(ids(ballotFor(undefined, { movies: bmovies, votes: bthumbs, attendees: COMING })), ['tt1', 'tt2', 'tt6', 'tt3', 'tt4']);
  assert.deepEqual(nightPick({}), { vetoed: new Set(), theme: '', ballotVotes: {}, writeIns: {} });
});

test('the pick: the most votes on the ballot wins, even over more thumbs', () => {
  assert.equal(bpick().movie.imdbId, 'tt1', 'no votes: the top of the ballot');
  const v = bpick({ ballotVotes: { al: 'tt4', bo: 'tt4', cy: 'tt2' } });
  assert.equal(v.movie.imdbId, 'tt4', 'Delta has one thumb, but two votes');
  assert.equal(v.basis, 'ballot');
  assert.equal(v.score, 2);
  assert.deepEqual(v.tie, []);
  assert.deepEqual(v.lockedVotes, { tt1: 0, tt2: 1, tt6: 0, tt3: 0, tt4: 2 });
  // A voted movie that fell out of the top five is on the ballot, and can win.
  const g = bpick({ ballotVotes: { al: 'tt7' } });
  assert.equal(g.movie.imdbId, 'tt7');
  assert.equal(g.lockedVotes.tt7, 1);
  assert.equal(Object.keys(g.lockedVotes).length, 6);
  // Votes from people who are not coming, or for a vetoed movie, count for nothing.
  assert.equal(bpick({ ballotVotes: { zed: 'tt4' } }).basis, 'coming');
  assert.equal(bpick({ ballotVotes: { al: 'tt4' }, vetoed: new Set(['tt4']) }).movie.imdbId, 'tt1');
  assert.equal(bpick({ ballotVotes: { al: 'tt4', bo: 'tt4' }, attendees: ['cy'] }).basis, 'coming');
  // A theme that fits nothing drops back to the whole shelf, and the votes still count.
  const w = bpick({ ballotVotes: { al: 'tt2' }, theme: 'Western' });
  assert.equal(w.themeFallback, true);
  assert.equal(w.movie.imdbId, 'tt2');
});

test('the pick: a tie in votes goes to the reel among the tied', () => {
  const two = bpick({ ballotVotes: { al: 'tt2', bo: 'tt4' }, rand: () => 0.99 });
  assert.equal(two.basis, 'ballot');
  assert.equal(two.score, 1);
  assert.deepEqual([...two.tie].sort(), ['tt2', 'tt4']);
  assert.ok(two.tie.includes(two.movie.imdbId));
  // The reel's pick is one of the tied; the other end of the dial gives the other.
  assert.notEqual(two.movie.imdbId, bpick({ ballotVotes: { al: 'tt2', bo: 'tt4' }, rand: () => 0 }).movie.imdbId);
  // A third voter breaks it: no tie.
  const clear = bpick({ ballotVotes: { al: 'tt2', bo: 'tt4', cy: 'tt4' }, rand: () => 0.99 });
  assert.equal(clear.movie.imdbId, 'tt4');
  assert.deepEqual(clear.tie, []);
});

test('the pick with no votes: the top of the ballot, ties to the reel, then the old fallbacks', () => {
  const top = bpick();
  assert.equal(top.basis, 'coming');
  assert.equal(top.movie.imdbId, 'tt1');
  assert.deepEqual(top.tie, []);
  assert.equal(top.score, 3);
  // Level on thumbs from them, on who has seen it and on thumbs overall: the reel among those.
  const level = pickMovie({ movies: bmovies.slice(0, 3), votes: [thumb('tt2', 'al'), thumb('tt3', 'bo')], attendees: ['al', 'bo'], rand: () => 0.99 });
  assert.equal(level.basis, 'coming');
  assert.deepEqual([...level.tie].sort(), ['tt2', 'tt3']);
  // Level on thumbs but one of them was seen by someone coming: the unseen one, outright.
  const unseen = pickMovie({ movies: bmovies.slice(0, 3), votes: [thumb('tt2', 'al'), thumb('tt3', 'bo')], seen: [{ movie: 'tt2', nameKey: 'bo', name: 'bo' }], attendees: ['al', 'bo'], rand: () => 0 });
  assert.equal(unseen.movie.imdbId, 'tt3');
  assert.deepEqual(unseen.tie, []);
  // Nobody coming has thumbed anything: the old ladder (most thumbs overall, then anything).
  const everyone = bpick({ attendees: ['qq'] });
  assert.equal(everyone.basis, 'everyone');
  assert.equal(everyone.movie.imdbId, 'tt1');
  const shelf = pickMovie({ movies: bmovies, votes: [], attendees: COMING, rand: () => 0.99 });
  assert.equal(shelf.basis, 'shelf');
  assert.equal(shelf.tie.length, 7);
  // Votes still win when nobody coming has any thumbs.
  const votedZero = pickMovie({ movies: bmovies, votes: [], attendees: COMING, ballotVotes: { al: 'tt3' }, rand: () => 0 });
  assert.equal(votedZero.basis, 'ballot');
  assert.equal(votedZero.movie.imdbId, 'tt3');
  assert.equal(pickMovie({ movies: [], votes: [], ballotVotes: { al: 'tt3' } }), null);
});

test('a lock records the ballot for the card that says how it was decided', () => {
  const won = bpick({ ballotVotes: { al: 'tt4', bo: 'tt4', cy: 'tt2' } });
  assert.deepEqual(lockFields(won).lockedVotes, { tt1: 0, tt2: 1, tt6: 0, tt3: 0, tt4: 2 });
  assert.equal('lockedVotes' in lockFields({ movie: bmovies[0], tie: [] }), false, 'a bare pick (an old caller) writes none');
  const night = (pick, extra = {}) => ({ ...lockFields(pick), status: 'locked', ...extra });
  assert.deepEqual(howDecided(night(won)), { kind: 'vote', text: 'Delta won the vote, 2–1', short: 'won the vote, 2–1' });
  const tie = bpick({ ballotVotes: { al: 'tt2', bo: 'tt4' }, rand: () => 0.99 });
  assert.equal(howDecided(night(tie)).text, `Tied 1–1, the reel picked ${tie.movie.title}`);
  assert.equal(howDecided(night(bpick({ ballotVotes: { al: 'tt2' } }))).text, 'Bravo won the vote, 1–0');
  assert.equal(howDecided(night(bpick())).text, 'No votes, so the most-thumbed pick won');
  assert.equal(howDecided(night(bpick({ attendees: ['qq'] }))).text, 'No votes, so the most-thumbed pick won', 'with nobody coming, the ballot is the most-thumbed five');
  const level = pickMovie({ movies: bmovies.slice(0, 3), votes: [thumb('tt2', 'al'), thumb('tt3', 'bo')], attendees: ['al', 'bo'], rand: () => 0.99 });
  assert.match(howDecided(night(level)).text, /^No votes, tied on thumbs-ups, so the reel picked /);
  // Off the ballot altogether (a theme's fallback could do it): said plainly.
  assert.equal(howDecided({ status: 'locked', lockedMovieId: 'tt9', lockedMovie: { title: 'Hotel' }, lockedTie: [], lockedVotes: { tt1: 0 } }).text, 'No votes, so it came from the shelf');
  // Nights locked before the ballot said nothing.
  assert.equal(howDecided({ status: 'locked', lockedMovieId: 'tt1', lockedMovie: { title: 'Alpha' }, lockedTie: [] }), null);
  assert.equal(howDecided(undefined), null);
});

test('the theme menu: shelf tags first, then genres, each once', () => {
  assert.deepEqual(themeOptions(tmovies), ['Recent favorite', 'Foreign', 'Comedy', 'Drama', 'Horror', 'Thriller']);
  assert.deepEqual(themeOptions([]), []);
  // A genre spelled like a tag, another case, or too long to store is left out.
  assert.deepEqual(themeOptions([{ shelf: ['Horror'], genres: ['horror', 'x'.repeat(41)] }]), ['Horror']);
  assert.equal(fitsTheme({ genres: ['Horror'] }, ' horror '), true);
  assert.equal(fitsTheme({}, 'Horror'), false);
  assert.equal(fitsTheme({}, ''), true);
  assert.equal(cleanTheme('  Spooky   Night '), 'Spooky Night');
  assert.equal(cleanTheme(null), '');
  assert.equal(cleanTheme('x'.repeat(60)).length, 40);
});

test('showtimeShort reads like a person would say it', () => {
  assert.equal(showtimeShort(new Date(2026, 9, 16, 20, 0), 'en-US'), 'Friday 8 PM');
  assert.equal(showtimeShort(new Date(2026, 9, 16, 19, 30), 'en-US'), 'Friday 7:30 PM');
});

test('a pasted list: one entry per line, numbering and bullets and quotes stripped, blank lines ignored', () => {
  const text = [
    '1. It Follows', '2) Alien', '#3 Heat', '- Jaws', '* The Thing', '• Rear Window', '  ', '', '"Se7en"', '“Arrival”', "'Moonlight'",
  ].join('\r\n');
  assert.deepEqual(parseMovieList(text).map((e) => e.title), ['It Follows', 'Alien', 'Heat', 'Jaws', 'The Thing', 'Rear Window', 'Se7en', 'Arrival', 'Moonlight']);
  assert.deepEqual(parseMovieList('1. Alien\n\n\n2. Aliens'), [{ line: '1. Alien', title: 'Alien', year: null }, { line: '2. Aliens', title: 'Aliens', year: null }]);
  assert.deepEqual(parseMovieList('- 1. Alien').map((e) => e.title), ['Alien']); // a bullet, then a number
  assert.deepEqual(parseMovieList('1.\n---\n   \n'), []); // nothing left once the numbering goes
  assert.deepEqual(parseMovieList(''), []);
  assert.deepEqual(parseMovieList(null), []);
  assert.deepEqual(parseMovieList('Alien\rAliens').map((e) => e.title), ['Alien', 'Aliens']); // an old Mac line break
});

test('a pasted list: the year in each of its forms', () => {
  const one = (line) => parseMovieList(line)[0];
  assert.deepEqual(one('It Follows (2014)'), { line: 'It Follows (2014)', title: 'It Follows', year: 2014 });
  assert.deepEqual(one('It Follows [2014]'), { line: 'It Follows [2014]', title: 'It Follows', year: 2014 });
  assert.deepEqual(one('It Follows 2014'), { line: 'It Follows 2014', title: 'It Follows', year: 2014 });
  assert.deepEqual(one('It Follows - 2014'), { line: 'It Follows - 2014', title: 'It Follows', year: 2014 });
  assert.equal(one('It Follows – 2014').title, 'It Follows');
  assert.equal(one('It Follows, 2014').title, 'It Follows');
  assert.equal(one('It Follows(2014)').year, 2014);
  assert.equal(one('7. "It Follows" (2014)').title, 'It Follows'); // quotes around the title only
  assert.equal(one('"It Follows (2014)"').year, 2014); // quotes around the lot
  assert.equal(one('It Follows (1899)').title, 'It Follows (1899)'); // only 1900-2099 is a year
  assert.equal(one('It Follows (2100)').year, null);
  assert.equal(one('Metropolis 1927').year, 1927);
  assert.equal(one('Tenet 2099').year, 2099);
  assert.equal(one('Heat 12345').year, null); // not four digits at the end
});

test('a pasted list: titles that are or contain numbers are left alone', () => {
  const one = (line) => parseMovieList(line)[0];
  assert.deepEqual(one('2001: A Space Odyssey'), { line: '2001: A Space Odyssey', title: '2001: A Space Odyssey', year: null });
  assert.deepEqual(one('1917'), { line: '1917', title: '1917', year: null }); // a year with no title is the title
  assert.deepEqual(one('1917 (2019)'), { line: '1917 (2019)', title: '1917', year: 2019 });
  assert.deepEqual(one('1. 1917'), { line: '1. 1917', title: '1917', year: null });
  assert.deepEqual(one('Se7en'), { line: 'Se7en', title: 'Se7en', year: null });
  assert.deepEqual(one('Se7en 1995'), { line: 'Se7en 1995', title: 'Se7en', year: 1995 });
  assert.deepEqual(one('21 Jump Street'), { line: '21 Jump Street', title: '21 Jump Street', year: null });
  assert.deepEqual(one('4. 21 Jump Street (2012)'), { line: '4. 21 Jump Street (2012)', title: '21 Jump Street', year: 2012 });
  assert.equal(one('300').title, '300');
  assert.equal(one('12 Angry Men').title, '12 Angry Men');
  assert.equal(one('(500) Days of Summer (2009)').title, '(500) Days of Summer');
  assert.equal(one("Ocean's Eleven").title, "Ocean's Eleven"); // an apostrophe is not a quote
  assert.equal(one('2012 2009').title, '2012');
  // A title that ends in a year-like number reads as a year here; matching sorts it out (below).
  assert.deepEqual(one('Blade Runner 2049'), { line: 'Blade Runner 2049', title: 'Blade Runner', year: 2049 });
});

test('a pasted list is cut at 50 lines, and says how many there were when asked', () => {
  const text = Array.from({ length: 70 }, (_, i) => `Movie ${i + 1}`).join('\n');
  assert.equal(PASTE_MAX, 50);
  assert.equal(parseMovieList(text).length, 50);
  assert.equal(parseMovieList(text).at(-1).title, 'Movie 50');
  assert.equal(parseMovieList(text, Infinity).length, 70);
  assert.equal(parseMovieList(text, 3).length, 3);
  assert.equal(parseMovieList('x'.repeat(500))[0].title.length, 120);
});

const meta = (id, name, releaseInfo) => ({ id, imdb_id: id, name, releaseInfo });

test('matching a pasted line to the catalog: exact title, then the year, then a near title', () => {
  const heat = [meta('tt1', 'Heat', '1995'), meta('tt2', 'Heat', '1986'), meta('tt3', 'The Heat', '2013'), meta('tt4', 'Heat Wave', '1990')];
  assert.equal(matchMovie({ title: 'Heat', year: null }, heat).meta.id, 'tt1'); // the catalog's own order breaks a tie
  assert.equal(matchMovie({ title: 'Heat', year: 1986 }, heat).meta.id, 'tt2');
  assert.equal(matchMovie({ title: 'heat', year: 1995 }, heat).meta.id, 'tt1');
  assert.equal(matchMovie({ title: 'Heat', year: 1996 }, heat).meta.id, 'tt1'); // a year out still counts: catalogs differ by one
  assert.equal(matchMovie({ title: 'Heat', year: 1960 }, heat).meta.id, 'tt1'); // a wrong year doesn't lose the title
  // The other results come back best first, for "Wrong movie?".
  assert.deepEqual(matchMovie({ title: 'Heat', year: 1986 }, heat).alts.map((m) => m.id), ['tt1', 'tt3', 'tt4']);
  assert.equal(matchMovie({ title: 'The Heat', year: null }, heat).meta.id, 'tt3');
  assert.equal(matchMovie({ title: 'Heat', year: null }, [meta('tt3', 'The Heat', '2013')]).meta.id, 'tt3'); // "The" doesn't matter
});

test('matching: near titles, and nothing near is a miss', () => {
  assert.equal(matchMovie({ title: 'Seven', year: 1995 }, [meta('x', 'Se7en', '1995')]).meta.id, 'x'); // a slip or two
  assert.equal(matchMovie({ title: 'Alein', year: null }, [meta('x', 'Alien', '1979')]).meta.id, 'x'); // letters swapped
  assert.equal(matchMovie({ title: 'Romulus', year: null }, [meta('x', 'Alien: Romulus', '2024')]).meta.id, 'x'); // one inside the other
  assert.equal(matchMovie({ title: 'Spider-Man', year: null }, [meta('x', 'Spiderman', '2002')]).meta.id, 'x');
  assert.equal(matchMovie({ title: 'Amelie', year: null }, [meta('x', 'Amélie', '2001')]).meta.id, 'x'); // accents
  assert.equal(matchMovie({ title: 'Alien 3', year: null }, [meta('x', 'Alien³', '1992')]).meta.id, 'x');
  // Two-letter titles are not "a slip" from each other: Us is not Up.
  assert.equal(matchMovie({ title: 'Us', year: 2019 }, [meta('x', 'Up', '2009')]), null);
  assert.equal(matchMovie({ title: 'zzqxvkj', year: null }, [meta('x', 'Alien', '1979')]), null);
  assert.equal(matchMovie({ title: 'Anything', year: null }, []), null);
  // A near title with the right year beats an exact one in the wrong year; a year alone never makes a match.
  assert.equal(matchMovie({ title: 'Seven', year: 1995 }, [meta('a', 'Seven', '2010'), meta('b', 'Se7en', '1995')]).meta.id, 'b');
  assert.equal(matchMovie({ title: 'Xyz', year: 2001 }, [meta('a', 'Other', '2001')]), null);
});

test('matching: a year that is part of the title (Blade Runner 2049, Wonder Woman 1984)', () => {
  const runner = [meta('tt1', 'Blade Runner', '1982'), meta('tt2', 'Blade Runner 2049', '2017')];
  assert.equal(matchMovie({ title: 'Blade Runner', year: 2049 }, runner).meta.id, 'tt2');
  assert.equal(matchMovie({ title: 'Blade Runner', year: 1982 }, runner).meta.id, 'tt1');
  assert.equal(matchMovie({ title: 'Blade Runner', year: null }, runner).meta.id, 'tt1');
  const ww = [meta('a', 'Wonder Woman', '2017'), meta('b', 'Wonder Woman 1984', '2020')];
  assert.equal(matchMovie({ title: 'Wonder Woman', year: 1984 }, ww).meta.id, 'b');
  assert.equal(releaseYear({ releaseInfo: '2014–2016' }), 2014);
  assert.equal(releaseYear({ year: 1999 }), 1999);
  assert.equal(releaseYear({}), null);
  assert.equal(releaseYear(undefined), null);
});

test('a pasted list, row by row: ready, on the shelf, watched, listed twice, not found', () => {
  const found = (id) => ({ status: 'found', meta: meta(id, `Movie ${id}`, '2000') });
  const rows = [
    found('a'), found('b'), found('c'), found('a'), found('d'), found('a'),
    { status: 'miss', meta: null }, { status: 'error', meta: null }, { status: 'loading', meta: null },
  ];
  const shelf = new Map([['b', { imdbId: 'b', by: 'sam', byName: 'Sam' }]]);
  const kinds = pasteStates(rows, { shelf, watched: new Set(['c']) });
  assert.deepEqual(kinds.map((s) => s.kind), ['ready', 'shelf', 'watched', 'dup', 'ready', 'dup', 'miss', 'miss', 'loading']);
  assert.equal(kinds[1].movie.byName, 'Sam');
  // Listing a movie that is already on the shelf twice says so both times; nothing of it is kept.
  assert.deepEqual(pasteStates([found('b'), found('b')], { shelf }).map((s) => s.kind), ['shelf', 'shelf']);
  // Someone puts the first one on the shelf while you review: the row follows, and the repeats go with it.
  const later = pasteStates(rows.slice(0, 6), { shelf: new Map([['a', { imdbId: 'a', by: '', byName: 'The house' }]]) });
  assert.deepEqual(later.map((s) => s.kind), ['shelf', 'ready', 'ready', 'shelf', 'ready', 'shelf']);
  assert.deepEqual(pasteStates([]), []);
});
