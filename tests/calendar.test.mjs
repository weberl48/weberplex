// The calendar feed (/calendar.ics) and the link-preview page, against the
// emulator's REST API, plus the vercel.json routing that points bots and
// calendar apps at them.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction, deleteField, setDoc, updateDoc } from 'firebase/firestore';
import { makeActions } from '../public/js/actions.js';
import { buildCalendar } from '../lib/calendar.js';
import { buildPreview, genericPreview } from '../lib/preview.js';
import calendarHandler from '../api/calendar.js';
import previewHandler from '../api/preview.js';

const F = { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction, deleteField };
const P = 'demo-picture-show';
const where = { base: 'http://127.0.0.1:8181/v1', projectId: P, apiKey: '' };
const SITE = 'https://weberplex.test';
const D = 86400000;
const dayOf = (d) => d.toISOString().slice(0, 10);
const stampOf = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
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

const movie = (n, extra = {}) => ({ imdbId: `tt00000${n}0`, title: `Movie ${n}`, year: '2001', poster: 'https://images.metahub.space/poster/small/x/img', runtime: '101 min', rating: '7.7', genres: ['Comedy'], trailer: 'abc123', description: '', ...extra });
const asAdmin = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

// A finished night, written past the rules (they only allow creating future nights).
const doneNight = (admin, startsAt, host, m) => setDoc(doc(admin, 'nights', dayOf(startsAt)), {
  day: dayOf(startsAt), startsAt, host, hostKey: host.toLowerCase(), status: 'done', createdAt: new Date(startsAt.getTime() - 5 * D),
  lockedMovieId: m.imdbId, lockedMovie: { imdbId: m.imdbId, title: m.title, year: m.year, poster: m.poster, runtime: m.runtime, rating: m.rating, genres: m.genres, trailer: m.trailer },
  lockedTie: [], lockedAt: new Date(startsAt.getTime() - D), finishedAt: new Date(startsAt.getTime() + 12 * 3600000),
});

// Unfolded VEVENTs as { UID: ..., SUMMARY: ... } maps (the event's own lines, not its alarm's).
function events(ics) {
  const text = ics.replace(/\r\n /g, '');
  return [...text.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map((m) => {
    const own = m[1].split('BEGIN:VALARM')[0];
    return Object.fromEntries(own.split('\r\n').filter(Boolean).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1)]));
  });
}

test('the feed has exactly the planned, locked and recent done nights, with who is coming', async () => {
  const sam = await A.join('Sam'); const jo = await A.join('Jo'); const al = await A.join('Al'); const bo = await A.join('Bo');
  await A.addMovie(jo, movie(1));
  await A.addMovie(jo, movie(2, { year: '1999', runtime: '135 min' }));
  const now = new Date();
  const at = (days) => new Date(now.getTime() + days * D);

  // Planned, with a theme, and one friend coming besides the host.
  const planned = at(5);
  await A.hostNight(jo, dayOf(planned), planned);
  await A.setFree(dayOf(planned), sam, true);
  await asAdmin((admin) => updateDoc(doc(admin, 'nights', dayOf(planned)), { theme: 'Foreign' }));

  // Hosted, then locked: the same UID, so a calendar updates the event it has.
  const locked = at(3);
  await A.hostNight(al, dayOf(locked), locked);
  await A.setFree(dayOf(locked), bo, true);
  await A.setFree(dayOf(locked), sam, true);
  const beforeLock = events(await buildCalendar({ ...where, siteUrl: SITE, now }));
  assert.deepEqual(beforeLock.map((e) => e.SUMMARY), ["Movie night at Al's", "Movie night at Jo's"]);
  await A.lockNight(dayOf(locked), { movie: movie(2, { year: '1999', runtime: '135 min' }), tie: [] });

  // Cancelled: absent.
  const cancelled = at(8);
  await A.hostNight(bo, dayOf(cancelled), cancelled);
  await A.cancelNight(dayOf(cancelled));

  // A night that finished ten days ago stays; one from forty days ago is gone.
  const recent = at(-10);
  const old = at(-40);
  await asAdmin(async (admin) => { await doneNight(admin, recent, 'Sam', movie(1)); await doneNight(admin, old, 'Al', movie(1)); });
  await A.setFree(dayOf(recent), jo, true);
  await A.setFree(dayOf(recent), al, true);
  await A.setFree(dayOf(old), jo, true);

  const ics = await buildCalendar({ ...where, siteUrl: SITE, now });
  const evs = events(ics);
  assert.deepEqual(evs.map((e) => e.UID), [`${dayOf(recent)}@weberplex`, `${dayOf(locked)}@weberplex`, `${dayOf(planned)}@weberplex`]);
  assert.ok(!ics.includes(dayOf(cancelled)) && !ics.includes(dayOf(old)));

  const [done, lock, plan] = evs;
  assert.equal(lock.UID, `${dayOf(locked)}@weberplex`);
  assert.equal(done.SUMMARY, "Movie 1 at Sam's");
  assert.equal(done.DESCRIPTION, `Coming: Al\\, Jo\\n2001 · 101 min\\n${SITE}`);
  assert.equal(lock.SUMMARY, "Movie 2 at Al's");
  assert.equal(lock.DESCRIPTION, `Coming: Al\\, Bo\\, Sam\\n1999 · 135 min\\n${SITE}`);
  assert.equal(lock.DTSTART, stampOf(locked));
  assert.equal(lock.DTEND, stampOf(new Date(locked.getTime() + 135 * 60000)));
  assert.equal(plan.SUMMARY, "Movie night at Jo's");
  assert.equal(plan.DESCRIPTION, `Coming: Jo\\, Sam\\nTheme: Foreign\\n${SITE}`);
  assert.equal(plan.DTEND, stampOf(new Date(planned.getTime() + 150 * 60000)));
  for (const e of evs) { assert.equal(e.URL, SITE); assert.equal(e.DTSTAMP, stampOf(now)); }

  // The calendar itself: headers, one alarm per event, CRLF, short lines.
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  for (const h of ['X-WR-CALNAME:Weberplex', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']) assert.ok(ics.includes(`\r\n${h}\r\n`), h);
  assert.equal(ics.split('BEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY').length - 1, 3);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n') && !/[^\r]\n/.test(ics));
  for (const l of ics.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75, l);
});

test('an empty database still gives a valid, empty calendar', async () => {
  const ics = await buildCalendar({ ...where, siteUrl: SITE });
  assert.deepEqual(events(ics), []);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR') && ics.endsWith('END:VCALENDAR\r\n'));
});

// Fixed showtimes (written past the rules after hosting) so the New York
// times in the preview are exact: Oct 16 is daylight time, Dec 18 standard.
async function hostAt(who, startsAt) {
  const soon = new Date(Date.now() + 5 * D);
  await A.hostNight(who, dayOf(soon), soon);
  await asAdmin((admin) => updateDoc(doc(admin, 'nights', dayOf(soon)), { startsAt }));
  return dayOf(soon);
}

test('preview: nothing planned is the plain Weberplex card', async () => {
  const html = await buildPreview({ ...where, siteUrl: SITE });
  assert.equal(html, genericPreview(SITE));
  assert.match(html, /<title>Weberplex<\/title>/);
  assert.match(html, /<meta property="og:title" content="Weberplex">/);
  assert.match(html, /<meta property="og:description" content="Mark your evenings\. Host a night\. Vote on what we watch next\.">/);
  assert.match(html, new RegExp(`<meta property="og:image" content="${SITE}/img/og\\.png">`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${SITE}/">`));
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, new RegExp(`<a href="${SITE}/">`));
});

test('preview: a planned night, with a host name that has to be escaped', async () => {
  const bad = await A.join('<b>&"');
  const sam = await A.join('Sam');
  const day = await hostAt(bad, new Date('2026-10-17T00:00:00Z'));
  await A.setFree(day, sam, true);
  const html = await buildPreview({ ...where, siteUrl: SITE, now: new Date('2026-10-15T00:00:00Z') });
  const title = "Movie night Fri Oct 16, 8 PM at &lt;b&gt;&amp;&quot;&#39;s";
  assert.ok(html.includes(`<title>${title}</title>`), html);
  assert.ok(html.includes(`<meta property="og:title" content="${title}">`));
  assert.ok(html.includes('content="2 coming so far. Thumbs-up what you&#39;d watch.">'));
  assert.ok(html.includes(`content="${SITE}/img/og.png"`));
  assert.ok(!html.includes('<b>') && !html.includes('&"'), 'nothing raw from a name');
});

test('preview: a locked night shows the movie, the time and the poster', async () => {
  const al = await A.join('Al');
  const sam = await A.join('Sam');
  await A.addMovie(sam, movie(3, { title: 'Tom & Jerry <3 "quoted">' }));
  const day = await hostAt(al, new Date('2026-12-19T01:30:00Z'));
  await A.setFree(day, sam, true);
  await A.lockNight(day, { movie: movie(3, { title: 'Tom & Jerry <3 "quoted">' }), tie: [] });
  const html = await buildPreview({ ...where, siteUrl: SITE, now: new Date('2026-12-18T00:00:00Z') });
  const title = 'Tom &amp; Jerry &lt;3 &quot;quoted&quot;&gt; · Fri Dec 18, 8:30 PM at Al&#39;s';
  assert.ok(html.includes(`<title>${title}</title>`), html);
  assert.ok(html.includes(`<meta property="og:title" content="${title}">`));
  assert.ok(html.includes('content="https://images.metahub.space/poster/medium/x/img"'), 'the medium poster');
  assert.ok(html.includes('content="2 coming so far. Open the page to count yourself in.">'));
  assert.ok(!html.includes('<3') && !html.includes('"quoted">'), 'nothing raw from a title');
});

// ---- the endpoints, with Firestore stubbed out (no network) ------------------------
function call(handler) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(body) { this.body = body; } };
  return handler({}, res).then(() => res);
}
async function withFetch(impl, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = real; }
}
const emptyFirestore = async () => new Response(JSON.stringify([{ readTime: '2026-10-13T00:00:00Z' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
const downFirestore = async () => new Response('nope', { status: 503 });

test('/calendar.ics sends the feed as text/calendar with the CDN cache headers', async () => {
  const ok = await withFetch(emptyFirestore, () => call(calendarHandler));
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['content-type'], 'text/calendar; charset=utf-8');
  assert.equal(ok.headers['cache-control'], 's-maxage=900, stale-while-revalidate=3600');
  assert.ok(ok.body.startsWith('BEGIN:VCALENDAR\r\n'));
  const bad = await withFetch(downFirestore, () => call(calendarHandler));
  assert.equal(bad.statusCode, 502);
  assert.equal(bad.headers['cache-control'], 'no-store');
});

test('/api/preview sends HTML for five minutes, and never fails a share', async () => {
  const ok = await withFetch(emptyFirestore, () => call(previewHandler));
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(ok.headers['cache-control'], 's-maxage=300');
  assert.match(ok.body, /<title>Weberplex<\/title>/);
  const logged = console.error;
  console.error = () => {}; // the handler logs the failure it is about to hide
  const down = await withFetch(downFirestore, () => call(previewHandler)).finally(() => { console.error = logged; });
  assert.equal(down.statusCode, 200);
  assert.equal(down.headers['cache-control'], 'no-store');
  assert.match(down.body, /<meta property="og:image" content="https:\/\/weberplex\.vercel\.app\/img\/og\.png">/);
});

// ---- vercel.json ----------------------------------------------------------------------
// Link-preview bots are sent to /api/preview by a redirect, not a rewrite: Vercel
// serves a static file (public/index.html at "/") before it tries any rewrite,
// but redirects run first. People's browsers never match the rule.
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('vercel.json: calendar rewrite, bot-only preview redirect, and the old rules kept', () => {
  assert.deepEqual(config.rewrites, [{ source: '/calendar.ics', destination: '/api/calendar' }]);
  assert.equal(config.crons[0].path, '/api/tick');
  assert.ok(config.redirects.some((r) => r.has?.[0]?.type === 'host' && r.destination.startsWith('https://weberplex.vercel.app/')));
  const rule = config.redirects.find((r) => r.destination === '/api/preview');
  assert.equal(rule.source, '/');
  assert.equal(rule.permanent, false);
  assert.deepEqual([rule.has.length, rule.has[0].type, rule.has[0].key], [1, 'header', 'user-agent']);

  // The pattern uses no flags (they may not exist where Vercel runs it), and
  // must work whether Vercel anchors the whole header or searches inside it.
  const matches = (ua) => new RegExp(rule.has[0].value).test(ua) && new RegExp(`^${rule.has[0].value}$`).test(ua);
  const bots = [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Facebot', 'Twitterbot/1.0',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'WhatsApp/2.23.20.0 A', 'TelegramBot (like TwitterBot)', 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
    'SkypeUriPreview Preview/0.5 skype-url-preview@microsoft.com', 'Mozilla/5.0 (Macintosh) Version/14 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
    'redditbot/1.0', 'Mozilla/5.0 (compatible; Embedly/0.2; +http://support.embed.ly/)', 'vkShare; +http://vk.com/dev/Share',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
    // Google Messages (the group texts, since everyone is on Android) fetches previews as a bare token.
    'GoogleMessages',
  ];
  for (const ua of bots) {
    for (const v of [ua, ua.toUpperCase(), ua.toLowerCase()]) assert.ok(matches(v), v);
  }
  const people = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    // Pinterest's in-app browser says "Pinterest", so it's left out: people there get the site.
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [Pinterest/iOS]',
    'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0', 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0', '',
    // Android phones: Chrome (also what Google Messages opens links in) and Samsung Internet.
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S926U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  ];
  for (const ua of people) assert.ok(!matches(ua), ua);
});
