# Weberplex

Movie night at the Webers'. Friends open one link, tick the nights they can
make, suggest up to **five** movies each, and thumbs-up the ballot. The host
locks the night and the picture; Home Assistant takes it from there.

- Guest site: https://weberplex.vercel.app (the old
  speakeasy-picture-show.vercel.app address redirects here)
- Host console: https://weberplex.vercel.app/host (the ready-made
  link with the key is `HOST_LINK` in `.env.local`, which git ignores)
- HA endpoint: https://weberplex.vercel.app/api/status

## What guests can do

| Phase | What shows |
| --- | --- |
| No night booked | Dark marquee, last movie, past screenings |
| Voting open | Name gate, showtimes to tick, five-frame filmstrip of your picks, browse tabs (Search · Trending · Trending <ballot genre> · New this year · For you) + "Surprise me", the ballot (posters, tags, trailer, Stremio link, plot, votes, front-runner/tie ribbons, tag filters), concessions |
| Locked (before showtime) | Admit-one ticket with a ticket number, Add to calendar (.ics with a 2-hour alert), trailer, "Can't make it", who's coming, final vote tally, concessions |
| Showing (after showtime) | Same ticket, plus star ratings and one-line reviews |
| Finished | Moves to Past screenings with the average rating |

Hosting is volunteer-based: every candidate night is posted as "host
needed". Any guest can tap **I can host** (which also counts them in), and the
host picks among the volunteers when locking, or leaves it undecided and sets
it later from the locked night, where the regulars (`PLACES` in
`public/js/config.js`: Weber, Ferger, Libby, Huey) are quick choices. The
house shows on the showtimes, marquee, ticket and calendar file. Home
Assistant only warms the basement when the house is one of the names in
`binary_sensor.movie_night_at_home`.

The host console books a night (title plus any number of candidate times),
adds or removes nights, adds **house picks** (tagged, outside everyone's five;
same browse tabs, with "For the crowd"), removes picks, renames, sends any
movie to the basement screen (**Show on the Shield**), **spins the reel** to
break a tie (or to pick at random), locks, reopens, marks a night watched, or
cancels.

**For you** is content-based (no keyless source offers "people who liked X"):
it builds a taste profile from what a person thumbed up and picked (or the
house list until they vote), pulls popular and featured titles in their top
two genres, and scores shared director > writer > cast, genre overlap, a
foreign-film lean, and rating. Each tile says why ("Because you liked The
Witch (Robert Eggers)"). Trending is Cinemeta's Popular catalog, which ranks
by current Stremio + Trakt popularity.

Seed a ballot from a list: `HOST_KEY=... npm run seed -- seed/<list>.json`
(pinned IMDb ids; see `seed/spooky-season.json`).

Everything updates live on every open phone.

## How it's built

There is no server. The static site in `public/` talks straight to Firestore
(project id `speakeasy-picture-show`, which Firebase can't rename), and
**`firestore.rules` is the whole backend**:

- Guests are identified by name only (a deliberate choice: no accounts).
  `logic.nameKey()` turns a name into the key the rules validate.
- **Five picks:** each movie is written with a slot doc `slots/<nameKey>__<1..5>`
  that points back at it. Slots can't be updated, so nobody can hold a sixth.
- **One movie per ballot:** movie doc id = IMDb id; a second create is refused.
- **Host-only changes:** a host write is a batch that also creates
  `hostops/<fresh id>` holding the key. The rules compare it with
  `config/host` (never readable) and require the op doc to be new in that
  batch, so an old op id can't be replayed.
- Picks and votes freeze when a night locks; RSVPs and snacks stay open;
  reviews open once the locked showtime has passed.

Movie data comes from Stremio's public Cinemeta catalog (keyless, CORS-open),
so every pick carries the IMDb id the Shield's Stremio deep link needs.

```
public/            static site (Vercel serves it; cleanUrls)
  js/logic.js      pure helpers: tally, slots, tickets, .ics, Cinemeta mapping
  js/actions.js    every write batch (injected SDK, shared with the tests)
  js/store.js      live subscriptions
  js/app.js        guest page          js/host.js   host console
  js/reel.js       spin-the-reel       js/ui.js     DOM helpers
lib/status.js      flattens the current night for HA (Firestore REST, no creds)
api/status.js      Vercel function wrapping lib/status.js (60 s edge cache)
firestore.rules    the backend
tests/             logic + rules + status (emulator) and e2e.py (Playwright)
```

## Home Assistant

`/config/packages/movie_night.yaml` on the Pi (the canonical copy) defines:

- `sensor.movie_night` (REST, every 15 min): state `none` / `open` / `locked`,
  with movie, poster, showtime, warm-up time, attendees, leader, snacks.
- `sensor.movie_night_shield_request` (Firestore REST, every 15 s) and
  `automation.movie_night_show_on_the_shield`: the host console's "Show on the
  Shield" opens that movie in Stremio within seconds. Requests older than two
  minutes are ignored, so restarts never replay one.
- `sensor.movie_night_showtime`: timestamp of the locked showtime.
- `script.movie_night_start`: Movie scene, then the winner's Stremio detail page
  by IMDb id, then a "Now showing" announcement on the Voice PE if it's online.
- `script.movie_night_open_in_stremio`: the deep link on its own.
- `automation.movie_night_warm_up_the_basement`: runs
  `script.speakeasy_warmup_basement` 30 minutes before showtime and pushes.
- `automation.movie_night_locked_notification`: pushes the poster when a night
  locks, and again if the date or movie changes.

The tablet card lives in `/config/dashboards/speakeasy.yaml`, bar view, right
under the greeting hero. Tap it (with a confirm) to start the show.

## Tests

```bash
npm test           # logic, then rules + status in the emulator
npm run test:e2e   # whole-night Playwright run (serves the site itself)
```

`e2e.py` runs a host and two guests through a whole night: five picks and a
refused sixth, a duplicate, a tie broken by the reel, lock, ticket and .ics,
reopen, reviews, then "We watched it". Run the site locally with
`python -m http.server 5173 --directory public` and open `/?emu` to use the
emulator.

## Operations

- Deploy: `vercel deploy --prod` from this folder.
- Rules: `firebase deploy --only firestore:rules`.
- Delete a night for good: `firebase firestore:delete nights/<id> --recursive -P speakeasy-picture-show`.
- Rotate the host key: delete `config/host` in the Firebase console, then create
  it again (the rules allow a one-time create), and update `.env.local`.
- Spark plan quota: 50k reads a day, and running out breaks the site until
  midnight Pacific. Budget: the Shield poll is ~5.8k/day; the status poll every
  15 min reads the whole ballot while voting is open (27 movies + votes) but
  only RSVPs + snacks once a night is locked; a guest page load reads every doc
  of the current night once. Watch usage in the Firebase console before
  shortening either poll.

## Making changes

Anyone can open a pull request; people Lucas adds as collaborators can push.

1. Clone it, then `npm install` (Node 18+; Java is needed for the Firestore
   emulator the tests use).
2. Run the site locally with `python -m http.server 5173 --directory public`
   and open http://localhost:5173/?emu with the emulator running
   (`firebase emulators:start --only firestore --project speakeasy-picture-show`),
   so you never touch the real ballot.
3. Before opening a PR: `npm test` and `npm run test:e2e`.
4. When a change lands on `master`, Vercel redeploys weberplex.vercel.app
   (pull requests get their own preview link).
   Changes to `firestore.rules` go live only when Lucas runs
   `firebase deploy --only firestore:rules`, so call them out in the PR.

Never commit `.env.local` (it holds the host key; `.gitignore` already
excludes it). The Firebase web config in `public/js/config.js` is public by
design: `firestore.rules` is what protects the data.
