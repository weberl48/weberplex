# Weberplex

Movie night at the Webers' (and wherever else someone hosts). Friends open
one link, mark the evenings they're free, volunteer to host, add movies to a
shared shelf, and thumbs-up what they'd watch. The site picks the movie.

- Site: https://weberplex.vercel.app (the old speakeasy-picture-show.vercel.app
  address redirects here)
- Owner console: https://weberplex.vercel.app/host. It's Lucas's: the link
  only shows when you're signed in as Lucas, and it asks for Lucas's password
  each visit. (`HOST_LINK` in `.env.local` carries the original key and stops
  working once the password is changed from the console.)
- HA endpoint: https://weberplex.vercel.app/api/status
- Code: https://github.com/weberl48/weberplex (pushes to `master` deploy)

## How it works

| Part | What people do |
| --- | --- |
| **Calendar** | Four weeks of evenings. Tap the ones you're free. Anyone can pick a day, choose a start time and tap **I can host**: that puts a movie night on it (one per day; first volunteer hosts; the start has to be in the future, and hosting less than a day out locks the movie right away). |
| **Up next** | The nearest night: when, whose house, who's coming, what *those people* have thumbed up, snacks. The host can change the time, lock early, unlock (until a day before), mark it watched (once it's started), or cancel (until it starts). |
| **The shelf** | Every movie anyone has added; it only grows. Add by search, Trending, New this year, For you or Surprise me, with an optional "why this one". Thumbs-up ("I'd watch it") and **Seen it** are per person and carry over; every card shows who has seen it. Sort by most wanted, newest, fewest have seen, shortest; filter by tag, unseen by me, added by me. No cap. |
| **Watched** | Finished nights with ratings and reviews, hours watched, and who has hosted how often. |

**The pick.** A day before each night, the movie locks itself: the most
thumbs from the people free that night; if none of them voted, the most
thumbs overall; if nobody voted, anything on the shelf. Ties go to the reel,
which plays once on everyone's phone. A watched movie leaves the shelf. The
night files itself as watched the morning after.

Also: a "since you last looked" banner (new nights, locks, movies, thumbs,
free marks), a first-visit walkthrough (and **How it works** to replay it),
tickets with an .ics invite, Stremio links on every card, and a season title
on the marquee.

## How it's built

There is no server in the write path. The static site in `public/` writes
straight to Firestore (project id `speakeasy-picture-show`, which Firebase
can't rename), and **`firestore.rules` is the backend**:

- Guests are identified by name only (a deliberate choice: no accounts).
  The browser remembers only that name. Everything else about a person
  lives on `people/{name}`: when they last looked (for the "since you last
  looked" banner), whether they've seen the walkthrough, their usual start
  time, and which tie reels they've watched. So it follows them to any phone.
- `movies/{imdbId}`: the shelf. Guests add under their name; house picks
  (`by == ''`) need the owner key. Movies are never edited.
- `votes/` and `seen/`: one doc per person per movie. `free/{day}__{name}`:
  the calendar.
- `nights/{YYYY-MM-DD}`: one per day, created by its host. The rules allow
  only these changes: new time; planned → locked (to a movie on the shelf);
  locked → planned before showtime; locked → done after showtime; cancel;
  and re-hosting a cancelled day. Snacks and reviews live under each night.
- The owner password (a fresh `hostops/<id>` doc in the same batch, compared
  with the never-readable `config/host`) guards only: changing the password, the season title, house
  picks, removing house picks, and Show on the Shield.

**The clock.** Any phone that notices a night is due locks it (in a
transaction) or files it. `/api/tick` does the same server-side, run by HA's
status poll and a daily Vercel cron, so quiet weeks still lock on time. It
needs no key: locking a due night is something any guest may do.

```
public/            static site (Vercel serves it; cleanUrls)
  js/logic.js      pure helpers: shelf tally, the pick, calendar, news, .ics
  js/actions.js    every write (injected SDK, shared with the tests)
  js/store.js      live subscriptions
  js/app.js        guest page          js/host.js   owner console
  js/browse.js     Trending / New / For you tabs   js/tour.js  walkthrough
  js/reel.js       the tie-breaker     js/ui.js     DOM helpers
lib/tick.js        the server clock    lib/status.js  JSON for HA
lib/firestore-rest.js  tiny REST client for both
api/               Vercel functions: status, tick (cron daily)
firestore.rules    the backend
seed/              house lists (pinned IMDb ids); tools/seed.mjs loads them
tests/             logic + rules + server (emulator) and e2e.py (Playwright)
```

## Home Assistant

`/config/packages/movie_night.yaml` on the Pi (the canonical copy):

- `sensor.movie_night` (every 30 min): `none` / `planned` / `locked` for the
  next night, with host, start, lock time, attendees, leader or movie, snacks.
- Pushes when someone volunteers to host and when a movie locks.
- `binary_sensor.movie_night_at_home`: the night is in our basement (host is
  Weber or Lucas). Only then does the basement warm up 30 minutes before, and
  the tablet card offers "tap to start the show".
- `script.movie_night_start`, `script.movie_night_open_in_stremio`, and the
  Show-on-the-Shield automation (polls `control/shield` every 15 s).

The tablet card lives in `/config/dashboards/speakeasy.yaml`, bar view.

## Making changes

Anyone can open a pull request; people Lucas adds as collaborators can push.

1. Clone it, then `npm install` (Node 18+; Java for the Firestore emulator).
2. `npm test` (logic, then rules + server in the emulator) and
   `npm run test:e2e` (a whole night in three browsers; serves the site itself).
3. Run locally: `python -m http.server 5173 --directory public`, open
   http://localhost:5173/?emu with the emulator running.
4. Merges to `master` redeploy the site. Rule changes go live only when Lucas
   runs `firebase deploy --only firestore:rules`, so call them out.

Never commit `.env.local` (it holds the owner key). The Firebase web config
in `public/js/config.js` is public by design.

## Operations

- Seed a list: `HOST_KEY=... npm run seed -- seed/<list>.json [--seen-as Lucas] [--season]`
- Run the clock by hand: `node tools/tick.mjs`
- Change the owner password: the Password section of the owner console (it
  needs the current one). If it's lost, delete `config/host` in the Firebase
  console and create it again with a 20+ character key (the rules allow one
  create), then change it from the console.
- Read budget: Spark allows 50k reads a day and going over breaks the site
  until the daily reset. Page loads read the whole shelf, thumbs, seen marks
  and upcoming free marks; HA's status poll reads every thumbs-up while a
  night is planned. Watch usage in the Firebase console as the shelf grows.
- An old pre-rebuild night doc (`nights/KjFWrXDWTF21O8drpded`) is left in
  place; nothing reads it.
