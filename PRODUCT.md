# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One small private group of friends and family. It is not a product for strangers, and future work can assume everyone knows each other.

- **Guests:** friends and family who open one link from a Google Messages group text, which opens in Chrome. Everyone in the group uses an Android phone. They put down a first name (no accounts, no passwords), mark the evenings they're free, add movies, thumbs-up what they'd watch, and turn up.
- **Hosts:** any guest who volunteers a night at their house. Hosting is volunteer only, with no rotation and no default house. The host can change the time or theme, lock early, unlock until a day before, mark the night watched, or cancel it.
- **Owner:** Lucas. The password-gated owner console (`/host`) holds the season title, house picks, Show on the Shield and the owner password. It isn't used to run nights day to day.

## Product Purpose

Getting the group into a room with a movie on. Weberplex replaces the group-text back-and-forth about when, where and what: people say when they're free, someone volunteers to host, and the site picks the movie.

Success means:
- **Nights actually happen.** Fewer loops in the group chat, and the calendar and volunteer hosting do the herding.
- **The pick feels fair.** Everyone coming has a say through thumbs-ups, vetoes and themes, and no one person's taste quietly wins every time.
- **The ritual is fun.** The reel, the reveal, tickets, the marquee season title and the stats are part of the night itself, not just the planning around it.

## Positioning

It's the group's own house. Weberplex does when (free evenings plus a volunteer host), where (whose house) and what (one shared shelf) in one place, then decides the movie itself: a day out, the night locks to the movie with the most thumbs-ups *from the people free that evening*. Poll apps, Letterboxd and group chats each cover one slice, and none of them pick. It also reaches into the real room: when the night is in the Webers' basement, Home Assistant warms it up and the tablet starts the show on the Shield.

## Operating Context

- **Getting in:** a link pasted into a group text. Link previews (`/api/preview`) show the next night, or its poster once locked. Guests type or tap their first name, and the browser remembers only that. Everything else lives on `people/{name}`, so it follows the person to any phone.
- **Planning:** on phones, in spare moments across the weeks before a night. The calendar covers four weeks of evenings. Nights go into Google Calendar through **Subscribe** (`/calendar.ics`, via Google's web subscribe link, because Android ignores `webcal://`) or as a single-night ticket `.ics`.
- **Coming back:** "Since you last looked" step-through cards show what other people did since your last visit.
- **The night:** at someone's house. At the Webers' basement, Home Assistant (`sensor.movie_night`, `binary_sensor.movie_night_at_home`) warms the room 30 minutes before, and a bar-view tablet card offers "tap to start the show", which opens the movie in Stremio on the Nvidia Shield. Every movie card carries Stremio links.
- **After:** the night files itself as watched the morning after, and people rate and review it under **Watched**.

## Capabilities and Constraints

**Capabilities** (README is the canonical feature list):
- **Calendar:** free evenings over four weeks, and volunteer hosting (one night per day; first volunteer hosts; the start must be in the future). Being free on an evening and coming to a night held on it are one record, by decision on 2026-10-14: if someone later hosts that day, you're on its list. The UI should say so rather than ask again.
- **Up next:** the nearest night with its host, attendees, theme, what those people have thumbed up, and snacks. Everyone coming, host included, gets one veto per night.
- **The shelf:** grows only and has no cap. Movies come in by search, Trending, New this year, For you or Surprise me, each with an optional "why this one". Thumbs-up ("I'd watch it") and **Seen it** are per person and carry over. Sort and filter options. House picks are seeded by the owner.
- **The pick:** a night locks a day before. It takes the most thumbs from the people free that night; if none of them voted, the most thumbs overall; if nobody voted, anything on the shelf. A theme narrows the pool, and vetoes remove movies. A tie runs the reel once on everyone's phone. A clear winner gets the card-flip reveal once per person. A watched movie leaves the shelf.
- **Watched** and **Stats:** ratings, reviews, hours, hosting counts, most wanted, whose picks made a night, and who you agree with most.
- **How it works:** a first-visit walkthrough, replayable.

**Constraints:**
- **Firestore rules are the backend.** The static site in `public/` writes straight to Firestore, and nothing server-side sits in the write path. Every new write needs a rule, and rule changes go live only when Lucas runs `firebase deploy --only firestore:rules`.
- **Free tier:** Firebase Spark allows 50k reads a day, and going over breaks the site until the reset. New features can't add collections or listeners without a read-budget reason, and server endpoints must CDN-cache.
- **No new npm dependencies** in the deployed site or API (`vercel.json` installs nothing).
- **Browser storage holds only the guest's name** (`ps.me`). Per-person state goes on `people/{name}`.
- **Times are shown in `America/New_York`.**
- **Android first.** Judge every surface at Android phone widths first (360 and 412 CSS px), and desktop second. Anything handed off to the OS (calendar, sharing, link previews) targets Google (Android Chrome, Google Calendar, Google Messages), not Apple.
- **Production is live and on the free tier.** Review and test against the local Firestore emulator (README, "Making changes"). Never reload https://weberplex.vercel.app in loops, and never tap anything there that writes (thumbs, free marks, hosting, vetoes). A push to `master` deploys production.
- **News stays complete.** Any new kind of change a person can make must appear in "Since you last looked" or be marked quiet with a reason. `tests/news.test.mjs` fails otherwise.

**Terminology** (use these words in the UI): the shelf, thumbs-up / "I'd watch it", Seen it, Up next, host / "I can host", lock, veto, theme, the reel, the reveal, house picks, tickets, Watched, Stats, Since you last looked, How it works, Subscribe, season title, Show on the Shield.

## Brand Commitments

- **Name:** Weberplex, never "Speakeasy" in UI or copy. The site was renamed from Speakeasy Picture Show; the old `speakeasy-picture-show.vercel.app` address redirects. The Firebase project id stays `speakeasy-picture-show` because Firebase can't rename it.
- **The look is kept, not replaced:** the cinema marquee world (dark velvet background, bulb-gold lights, Limelight display type, Archivo body, Courier Prime for ticket details). Design work here is refinement inside that world. DESIGN.md documents it.
- **Voice (not settled):** the current copy is plain and warm, in short sentences with no jargon and a light old-movie-house flavor ("Put your name on the guest list", "That's me", "Warming up the projector…"). Treat this as the incumbent voice to match. It isn't binding, and the user may change it.

## Evidence on Hand

- `e2e-shots/`: screenshots of real flows (guest, host, reel, reveal, tour, stats, landscape, long names) from the Playwright suite.
- `public/img/og.png`: the 1200×630 link-preview card.
- `seed/spooky-season.json`: a pinned house list.
- Real shelf, nights, votes and reviews in Firestore (`speakeasy-picture-show`).
- No standalone logo file (the favicon is an inline SVG in `public/index.html`), and no photography. Posters come from the movie catalog (Cinemeta).

## Product Principles

1. **The site decides, so nobody has to argue.** Picking, locking and filing happen on their own. People state preferences and the rules settle it.
2. **The people coming get the say.** Picks, vetoes and themes weigh the people free that evening over the shelf at large.
3. **The ritual is part of the night.** The reel, reveal, tickets and stats are reasons to open the site, not decoration to trim.
4. **A name and a link, nothing more.** There's no sign-up, no accounts and no setup for guests. What a person has done follows their name to any phone.
5. **Nobody misses a change.** If someone did something, everyone else hears about it the next time they look.
