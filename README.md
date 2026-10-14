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
| **Calendar** | Four weeks of evenings, with a printed key under the grid (you're free, how many are free, a movie night). Tapping a day only shows it in the panel below, which scrolls into reach if needed (the arrow keys move between days too); nothing is marked until you tap **I'm free that evening** there, and a toast says so. **‹ ›** beside the panel's date step to the evening before or after, so marking a run of evenings never means going back to the grid. At big text the grid keeps each date, and a night keeps its house mark as well as its gold ring. Being free on an evening and coming to a night held on it are the same thing: if someone hosts it later, you're on its list. Anyone can pick a start time and tap **I can host**, which prints a hosting slip saying who's already free that evening (and so on the list); **Put it on the marquee** confirms it, puts a movie night on the day and counts you in (one per day; first volunteer hosts; the start has to be in the future, and hosting less than a day out locks the movie right away). |
| **Up next** | The nearest night: when, whose house, who's coming, its theme, snacks, and **If it locked now**: a small card with the poster of the movie that would win right now and why, in people's names (the same rule as the lock; on a themed night it names the pool, "the group's favorite among Drama movies"), with a Veto on it. Its ribbon gives the night's date ("Leading Nov 3"). The marquee always shows it as "Leading:". **Count me in** says you're coming, the same button wherever a night shows; it turns into **You're in ✓**, and dropping out takes a second tap. Everyone coming (and the host) gets one **veto** on a movie for this night and can call snacks. The host can change the time or theme, lock early, unlock (until a day before), mark it watched (once it's started), or cancel (until it starts). |
| **The shelf** | Every movie anyone has added; it only grows. Add by search, Trending, New this year, For you or Surprise me, with an optional "why this one" (written before you pick). Each card has the poster, then right under it who has seen it (once someone has), the thumbs-up ("I'd watch it"), **Seen it**, the trailer, Stremio and **Plot** (which opens the plot in place and becomes **Hide plot**). The next night still open to the pick crowns its projected pick with a **Leading** ribbon (a locked night's movie never wears it, and a movie still face down for you wears nothing); with no night planned, the overall favorites wear **Most wanted**. Nights further out say what's leading in their Also planned row and their day panel. Thumbs-ups and seen marks are per person and carry over. Sort (one menu) by most wanted, newest, least seen, shortest; show by tag, unseen by me, added by me, or, while a themed night is planned, just the movies it can pick ("Fits Hal's Drama night"). No cap. |
| **Watched** | Finished nights with ratings and reviews, hours watched, and who has hosted how often. Only the people who were there (free that evening, or hosting) are asked to rate a night, one at a time: the newest unrated night, with the week's others a tap away. Everyone can read the reviews. The stars are one Tab stop; the arrow keys choose. |
| **Stats** | The long view, worked out in your browser from what the page already has, spelled out on a letter board: nights and hours watched, movies added, thumbs-ups and who gives the most; the most wanted movies on the shelf (a movie booked for an upcoming night leaves the list); whose shelf picks made a watched night (house picks count as "House"; a locked night counts once it's watched, so Stats never give a face-down movie away); and, when you're signed in, who you agree with most (how alike your thumbs-ups are, once you and they have at least three). |

**The pick.** A day before each night, the movie locks itself: the most
thumbs from the people free that night; if none of them voted, the most
thumbs overall; if nobody voted, anything on the shelf. A night can have a
**theme** (a shelf tag or a genre, picked when hosting or later from the host
tools): the pick sticks to movies that fit it, or to the whole shelf when none
do. A **veto** takes a movie out of that night's pick (one per person, undoable
until the lock; if everything is vetoed the vetoes are ignored). Ties go to the
reel, which plays once on everyone's phone; a clear winner gets the **reveal**
instead, once per person: the house lights go down and a face-down card waits in a
ring of chasing bulbs until you tap it over to the poster. It lands with the
night's feature, when and where, who's coming, and why it won ("3 of the 4
coming thumbed it up"); a tie's reel lands the same way. It waits until the
page has everything it needs, so it knows whether you're coming: it ends on
**See my ticket** if you are (the ticket comes to the top of the screen), and on
**Count me in** if you aren't (with no
name yet, the guest list comes to the top of the screen and asks for one, its
names ignoring taps for a moment so a second tap can't pick someone else's,
then it lands on your ticket). The news cards
wait in their bar instead of covering the ticket, and until your reveal has
played (say you backed out of it) they never name the locked movie. Until your reel or
reveal has played, the page keeps the movie face down (the marquee reads "The
movie is…", and so does your ticket). It plays after How it works and before
the news cards, so a "Locked for Friday" card never spoils it, and it counts as
seen only once it has turned: closing it with the back gesture (or Esc) before
the card turns means "not now", so no news card rises in its place and it plays
again next visit. The host's lock toast doesn't name the movie, and no toast
shows over the reel or the reveal. The link preview in a group text still shows
the poster once the night locks. A watched movie leaves the shelf. The night
files itself as watched the morning after.

Also: the house curtain parts on every load (taps go straight through it, and
with reduced motion there's none), a first-visit walkthrough (five cards; **How it works** replays it;
its examples are stamped SAMPLE and use no real dates or names, so nobody
mistakes the sample ticket for the real night),
tickets with **Add to calendar** (Google Calendar's add-event page, with the
.ics download as a fallback), Stremio links on every card, a season title on
the marquee, and jump links under it to each section (they scroll without
adding history). Android's back gesture closes whichever card, overlay or
hosting slip is open instead of leaving the site. A reveal closed with back
before it turns stays face down that visit, with **Reveal the movie** in Up
next. Errors stay on screen until tapped away. A tap counts once the server
has it: anything still unsent after a few seconds says **Not sent yet** (even
when the phone thinks it's online), then **Sent.**, and leaving the page with
something unsent asks first (dropping out and vetoes too, which read the night
before they write). Locking waits for a theme or veto tapped just before it, so
the lock can't overtake it. Opening the page with no connection says the box
office can't be reached yet, rather than showing an empty house.

**Names.** A name is all it takes. A tap before you've given one (a thumbs-up,
Count me in, a veto) brings up the name form and goes through once you have.
A name that looks like someone already on the list ("Grandma" when there's a
"Gma") asks "Is that you?" once before making a second person. **Not you?**
asks twice.

**Since you last looked.** When you come back and other people have done
something, step-through cards open by themselves (same style as How it works):
a night hosted, moved, themed, vetoed, cancelled, locked or filed as watched,
new movies and thumbs-ups, free evenings, snacks and reviews. They come most
useful first: your own night (one you're coming to or hosting), then what
needs your tap (new movies, a night you were at to rate), other nights,
thumbs-ups, free evenings, then snacks and reviews. A night you're not coming
to gets one card for all its changes ("Hal's Tuesday: now 9:00 PM · a Drama
night · Cards Movie vetoed"), and a **Count me in** if it's still ahead. On a
phone the cards rise from the bottom, so the marquee stays in view, and Next
stays in reach on a long card. Headlines are set as sentences, with a movie's
name in marquee letters. The bar counts what the cards say, the way a person
says when ("since 12:28 PM today"). With five or more updates the first card
is a playbill listing them, with **Got it** right there. A new-movies card has a working
thumbs-up for each movie. There are at most eight cards; the last one lists
everything else. **Show me** jumps to the section; **Got it** (or Skip) marks
it all seen; Android's back gesture (or Esc) means later, and the bar keeps
the count. Over an open sheet, a toast sits at the top and lets taps through. A slim bar keeps "Walk me through" to reopen them where Show me
left off. The rule for developers: any new kind of
change people can make must show up in these cards or be marked quiet, with a
reason, in `tests/news.test.mjs`. That test fails on any action in
`public/js/actions.js` (or server write in `lib/tick.js`) it hasn't been told
about, and checks that every kind in `NEWS_KINDS` (`public/js/logic.js`) is
produced by a fixture.

**Keeping people in the loop.** **Subscribe** (in the calendar section) gives
every night as a calendar feed, `/calendar.ics`: planned and locked nights
plus the last month's watched ones, with who's coming, the movie and a
reminder two hours before. Cancelled nights drop out of it. Everyone who uses
the site is on Android, so the panel is built for Google Calendar: Android
ignores `webcal://` links and the Calendar app can't add a calendar by URL, so
**Add to Google Calendar** is Google's web subscribe link
(`calendar.google.com/calendar/render?cid=webcal://…`), which asks to add the
feed and then syncs it to the app. The fallback, under **Didn't work?**, is the
https link pasted into *Other calendars → From URL* on the web (Chrome's
*Desktop site* on a phone).
Google refreshes subscribed calendars slowly. Pasting the site into a group
text (Google Messages included) shows a link preview (the next night, or the poster once it's locked), built
from the same data for link-preview bots only (`/api/preview`); people always
get the normal page.

## How it's built

There is no server in the write path. The static site in `public/` writes
straight to Firestore (project id `speakeasy-picture-show`, which Firebase
can't rename), and **`firestore.rules` is the backend**:

- Guests are identified by name only (a deliberate choice: no accounts).
  The browser remembers only that name. Everything else about a person
  lives on `people/{name}`: when they last looked (for "since you last
  looked"), whether they've seen the walkthrough, their usual start
  time, and which tie reels and movie reveals they've watched. So it follows
  them to any phone.
- `movies/{imdbId}`: the shelf. Guests add under their name; house picks
  (`by == ''`) need the owner key. Movies are never edited.
- `votes/` and `seen/`: one doc per person per movie. `free/{day}__{name}`:
  the calendar.
- `nights/{YYYY-MM-DD}`: one per day, created by its host. The rules allow
  only these changes: new time; a new theme; one person's veto set or taken
  back (the host's or someone free that evening's; one key per write, at most
  30 a night); planned → locked (to a movie on the shelf);
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
  img/og.png       the link-preview card (1200x630)
  js/logic.js      pure helpers: shelf tally, the pick, stats, calendar, news, .ics
  js/actions.js    every write (injected SDK, shared with the tests)
  js/store.js      live subscriptions
  js/app.js        guest page          js/host.js   owner console
  js/browse.js     Trending / New / For you tabs   js/tour.js  walkthrough
  js/reel.js       the tie-breaker     js/ui.js     DOM helpers
  js/reveal.js     the flip-the-card reveal of a locked movie
lib/tick.js        the server clock    lib/status.js  JSON for HA
lib/calendar.js    the .ics feed       lib/preview.js  link-preview page
lib/firestore-rest.js  tiny REST client for the server files
api/               Vercel functions: status, tick (cron daily), calendar, preview
firestore.rules    the backend
seed/              house lists (pinned IMDb ids); tools/seed.mjs loads them
tests/             logic + rules + server (emulator) and e2e.py (Playwright)
```

## Home Assistant

`/config/packages/movie_night.yaml` on the Pi (the canonical copy):

- `sensor.movie_night` (every 30 min): `none` / `planned` / `locked` for the
  next night, with host, start, lock time, attendees, leader or movie, snacks.
  `/api/status` also reports the night's `theme` and how many `vetoes` it has.
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
  night is planned (and the whole shelf too while that night has a theme or
  any veto, so its leader follows the same rule as the lock). Vetoes and themes live on the
  night doc, so the clock needs no extra reads for them. Watch usage in the
  Firebase console as the shelf grows. `/calendar.ics` (nights plus the last month's free marks) is cached 15
  minutes and `/api/preview` (the same reads as the status poll) 5 minutes.
- Link previews: `vercel.json` *redirects* `/` to `/api/preview` only when the
  user-agent is a known preview bot (a redirect, not a rewrite, because Vercel
  serves the static `index.html` before any rewrite runs). The match is
  written with `[Aa]`-style classes because the pattern can't carry a
  case-insensitive flag. Static `og:image`/`twitter:card` tags in
  `public/index.html` cover any bot the list misses. Facebook, Slack and
  iMessage keep their own cache of a link's preview, so a changed night
  can take a while to show up in an old text.
- An old pre-rebuild night doc (`nights/KjFWrXDWTF21O8drpded`) is left in
  place; nothing reads it.
