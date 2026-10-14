# Loop, stats and a more fun pick — design (2026-10-13)

Three pieces, built in order. Each one leaves every test green.

Shared constraints (all pieces):
- No new npm dependencies in the deployed site or API (`vercel.json` installs nothing).
  Dev-only test deps are fine but avoid them if possible.
- Nothing new in browser storage. Per-person state goes on `people/{nameKey}`
  (see `savePrefs` in `public/js/actions.js`); only `ps.me` lives in localStorage.
- Match the existing code style: small pure functions in `public/js/logic.js`
  (shared by browser and server), writes in `public/js/actions.js`, rendering
  in `public/js/app.js` via `out(sel).innerHTML = …` (which repaints through
  `paint()`), rules in `firestore.rules`, server reads via `lib/firestore-rest.js`.
- Times shown to people use `America/New_York`.
- Read budget: Firestore Spark is 50k reads/day. New server endpoints must set
  CDN caching (`s-maxage`) and read as little as possible.

Tests: `node --test tests/logic.test.mjs`; emulator suites with the emulator
already running on 127.0.0.1:8181:
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 node --test --test-concurrency=1 tests/rules.test.mjs tests/status.test.mjs <new emulator tests>`;
browser flow: `python tests/e2e.py e2e-shots` (headless Playwright; uses the
running emulator and the static server on :5173).

---

## Piece 1 — keep people in the loop

### 1a. Calendar subscription: `GET /calendar.ics`
- `vercel.json` rewrite `/calendar.ics` → `/api/calendar`.
- `api/calendar.js` → `lib/calendar.js` `buildCalendar({ base, projectId, apiKey, siteUrl, fetchImpl, now })`
  returns the `.ics` text. Response: `Content-Type: text/calendar; charset=utf-8`,
  `Cache-Control: s-maxage=900, stale-while-revalidate=3600`.
- Contents: one VEVENT per night that is `planned` or `locked` (any date) or
  `done` within the last 30 days. Cancelled nights are simply absent (calendar
  apps drop events that leave the feed).
  - `UID:<day>@weberplex` (stable, so a lock updates the same event).
  - `SUMMARY`: planned → `Movie night at <host>'s`; locked/done → `<title> at <host>'s`.
  - `DESCRIPTION`: who's coming (names), theme if any, the movie's year/runtime when
    locked, and the site link. `URL:<siteUrl>`.
  - `DTEND` = start + runtime (locked) or + 150 min.
  - One `VALARM` 2 h before (`ACTION:DISPLAY`).
  - Calendar headers: `X-WR-CALNAME:Weberplex`, `REFRESH-INTERVAL;VALUE=DURATION:PT1H`,
    `X-PUBLISHED-TTL:PT1H`.
- Refactor `buildIcs` in `logic.js` so the single-night download and the feed
  share one VEVENT formatter (line folding at 75 octets, escaping). Keep
  `buildIcs`'s current signature and output working.
- Who's coming: query `free` docs with `day >=` today-minus-30 (add a `gte`
  filter helper next to `eq` in `lib/firestore-rest.js`) — one query, not one
  per night.
- Site: a **Subscribe** control in the calendar section head ("When are you
  free?"). It opens a small panel with: an Apple/iPhone link
  `webcal://<host>/calendar.ics`, and for Google "copy this link, then Other
  calendars → From URL" with a Copy button for `https://<host>/calendar.ics`.
  One line of honesty: Google refreshes subscribed calendars slowly.

### 1b. Link previews for group texts
- `vercel.json` rewrite of `/` to `/api/preview` **only** when the user-agent
  matches link-preview bots (case-insensitive: facebookexternalhit, Facebot,
  Twitterbot, Slackbot, Discordbot, WhatsApp, TelegramBot, LinkedInBot,
  SkypeUriPreview, Applebot, redditbot, Embedly, vkShare, Pinterest).
  Humans always get the static page, so a broken preview can't break the site.
- `api/preview.js` → `lib/preview.js` `buildPreview(...)` returns a tiny HTML
  page: `<title>`, `og:title`, `og:description`, `og:image`, `og:url`,
  `og:type=website`, `twitter:card=summary_large_image`, plus a normal link to
  the site. Uses `buildStatus` from `lib/status.js` (don't run the clock here).
  - locked: title `"<Title> · <Fri Oct 17, 8 PM> at <host>'s"`, image = the
    medium poster.
  - planned: title `"Movie night <Fri Oct 17, 8 PM> at <host>'s"`, description
    adds "<n> coming so far. Thumbs-up what you'd watch.", image = static card.
  - none: title "Weberplex", static description, static card.
  - All values HTML-escaped. `Cache-Control: s-maxage=300`.
- Static card: `public/img/og.png`, 1200×630, made once with Python/PIL in the
  site's marquee look (dark plum background, warm bulb dots, "WEBERPLEX",
  "Pick a night · Pick a picture"). Also add static `og:image` +
  `twitter:card` tags to `public/index.html` pointing at it (absolute URL).

### 1c. "Someone's hosting" notification (Home Assistant — done by the reviewer, not the builder)
HA push to Lucas's phone whenever a new planned night appears anywhere in
`/api/status`'s `upcoming` list (not only the next night). No Twilio.

### Tests for piece 1
- logic: the shared VEVENT formatter (escaping, folding, UID, alarm).
- emulator (`tests/calendar.test.mjs`): a planned night, a locked night, a
  cancelled night and an old done night → feed has exactly the right events,
  summaries and attendees. Preview HTML for none / planned / locked, including
  escaping of a host name like `<b>&"`.

---

## Piece 2 — stats and history

A new **Stats** section after Watched (`#statsSec`), hidden until data is ready.
All derived client-side from data the page already has (movies, votes, nights).
Pure functions in `logic.js`, each unit-tested:

- `tasteMatch(votes, meKey, { minThumbs = 3 })` → others sorted by Jaccard
  similarity of thumbs (|A∩B| / |A∪B|, all movies incl. watched), each
  `{ nameKey, name, pct, shared }`; people with fewer than `minThumbs` thumbs
  are left out; ties by name. Shown when signed in: top 3 as
  "You and Sam agree 82%".
- `pickLeaders(nights, movies)` → people whose shelf additions became a
  locked/done night's movie, `{ nameKey, name, picks }` desc. House picks
  (`by == ''`) count as "House".
- `mostWanted(shelfMovies, n = 5)` → unwatched movies with ≥1 thumb, most first.
- `recap(nights, votes, movies)` → `{ nights, hours, shelf, thumbs, topVoter }`
  for done nights (hours from runtimes).
Empty states read naturally ("Thumbs-up a few movies to see who you agree with").

---

## Piece 3 — a more fun pick

### Data (on the night doc, so the clock/server need no extra reads)
- `theme`: string, `''` = none. A shelf tag or a genre (≤40 chars).
- `vetoes`: map `nameKey → imdbId`, one veto per person per night.
- `hostNight(who, day, startsAt, theme = '')` writes `theme` and `vetoes: {}`.

### Rules (`firestore.rules`)
- `newNight`: also allow keys `theme`, `vetoes`; `theme` is a string ≤40;
  `vetoes == {}`. (Old docs without the fields must keep working everywhere.)
- `nightChangeOk` new planned→planned transitions:
  - theme change: `changed.hasOnly(['theme'])`, string ≤40.
  - veto set/clear: `changed.hasOnly(['vetoes'])`; exactly one key of `vetoes`
    affected (`after.vetoes.diff(before.vetoes ?? {})` — handle the field being
    absent before); that key `k` must be `validKey(k)` and either the host
    (`before.hostKey`) or have a free mark (`exists(/free/<day>__<k>)`); if set,
    the value is a string id with `movieExists`; at most 30 vetoes.
- Locking stays as is (rules don't check vetoes; the clients do).

### Pick (`logic.js`, used by the browser clock, the "lock now" button, `lib/tick.js`, and `lib/status.js`'s leader)
- `pickMovie({ ..., vetoed = new Set(), theme = '' })`:
  1. drop vetoed movies (if that empties the shelf, ignore vetoes);
  2. if `theme`, keep movies whose `shelf` tags or `genres` include it
     (case-insensitive); if none match, fall back to the whole remaining shelf
     and return `themeFallback: true`;
  3. then the existing coming → everyone → shelf rule and tie reel.
- `vetoedFor(night)` helper → `new Set(Object.values(night.vetoes || {}))`.
- `lib/status.js`: planned leader honours vetoes + theme; expose `theme` and
  `vetoes` (count) in the JSON. `lib/tick.js` passes both.

### UI
- Hosting form (calendar day detail): optional theme select ("No theme" +
  shelf tags + genres present on the shelf).
- Up next (planned): a theme chip; the host can change the theme (select in
  host tools). In "What the people coming want", each movie gets a **Veto**
  button for someone who is free that night or hosting and hasn't vetoed yet;
  vetoed movies show struck through with "vetoed by Sam"; your own veto shows
  "Undo veto". A short line explains: "One veto each. Vetoed movies can't be
  picked this night."
- Reveal moment (`public/js/reveal.js`): when the next night is locked with no
  tie (ties already get the reel) and you haven't seen its reveal, a one-time
  overlay flips a card to the poster with the title, "Friday 8 PM at Jo's" and
  an OK button. Seen-state: `people.reels` entry `r:<day>.<imdbId>` via
  `savePrefs` (signed in) or an in-memory set (not signed in). Same a11y as
  `reel.js` (focus moves in, Tab trapped, Esc closes, focus restored,
  `prefers-reduced-motion` skips the flip).

### Tests for piece 3
- logic: pickMovie with vetoes, theme, theme fallback, all-vetoed fallback.
- rules: host and free people can veto once and undo; a person not free and
  not hosting can't; can't veto for someone else's key twice-over (only one
  key per write); theme change while planned; old night docs without
  `theme`/`vetoes` still lock/unlock/finish.
- status/tick: lock honours a veto and a theme.
- e2e: veto a movie, see it struck; set a theme; reveal shows once.
