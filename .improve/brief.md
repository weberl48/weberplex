# Improve loop brief: Weberplex

Source of truth for the loop. README.md stays the source of truth for how the product works.

## The product

- **One sentence:** a movie-night site for one small private group: friends open one link, say which evenings they're free, volunteer to host, add movies to a shared shelf and thumbs-up what they'd watch, and the site picks the movie. (README.md:3-5)
- **Real users:** one group of friends and family, all on Android phones, opening the link from a Google Messages group text in Chrome. No accounts; people pick a name. (PRODUCT.md "Users"; the user's brief in this session, 2026-10-14) Group size: a dozen or so people (`inferred` from the seed: Jo, Sam, Kim, Fran, Hal, Wren, Newbie).
- **Goal, in the user's words:** "run the impeccable loop used in this session until the app is truly impressive and hits a 40/40" (the impeccable critique's Nielsen score, out of 40). Success criteria from PRODUCT.md: nights actually happen; the pick feels fair; the ritual is fun.
- **The signature moment:** the movie being picked and revealed on everyone's phone: "The movie is…", the card turns over to the poster, then **See my ticket** lands on the admit-one ticket. (README.md:26-43; public/js/reveal.js; app.js `play`) Runner-up: **If it locked now**, the live answer to "what are we watching, and why?" (README.md:21)
- **The reference:** Partiful (group invites and RSVPs that arrive by text, loved for personality and for showing who's coming). `inferred`: neither the README nor the user names one. For the reveal itself, the bar is a real cinema's lights-down moment. `inferred`.

## Running it

- **Locally, most realistic:** Firestore emulator `firebase emulators:start --only firestore --project speakeasy-picture-show` (port 8181, firebase.json), static site `python -m http.server 5173 --bind 127.0.0.1 --directory public`, open http://localhost:5173/?emu. (README.md:173-174)
- **Tests:** `node --test tests/logic.test.mjs tests/news.test.mjs` (unit); `FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 node --test --test-concurrency=1 tests/rules.test.mjs tests/status.test.mjs tests/calendar.test.mjs` (emulator); `PYTHONIOENCODING=utf-8 python tests/e2e.py e2e-shots` (Playwright, a whole night in three browsers). No lint or build step. (package.json; README.md:170-172)
- **Golden scenario:** `PYTHONIOENCODING=utf-8 python .improve/scenario.py <out-dir> [seed]`. It resets the emulator, seeds a deterministic group, and drives three phones. It needs the emulator and serves `public/` itself on 5173 if nothing is there.
- **Logs:** local: the scenario's `timings.json` and `console.json` per run; the emulator's `firestore-debug.log`. Production: Vercel's function logs (not reachable from here); Firestore usage in the Firebase console.

## The live service

- **What:** the static site and four Vercel functions (status, tick, calendar, preview) at https://weberplex.vercel.app, deployed by Vercel from GitHub `weberl48/weberplex` on every push to `master`. (README.md:7, 14, 144; vercel.json `outputDirectory: public`)
- **Runs from this checkout?** No. It runs from GitHub `master`. This checkout is a working copy; nothing here serves real users. `.improve/` is outside `public/`, so it is never served.
- **Reloads itself?** Vercel deploys each push to `master` atomically. Open pages keep the JS they loaded until they reload; nothing is dropped mid-session.
- **"Restart" = ship:** fast-forward `master` to the kept `improve-loop` commit and push. The user approved shipping each kept iteration without asking (2026-10-14, this session). Push as `weberl48`: see the memory note `push-account`. Then confirm the new files are served (curl a changed static file; no page loads, which cost Firestore reads).
- **User activity check:** a deploy doesn't interrupt anyone, so the 15-minute activity check is not needed for UI-only changes. Any change to how data is written still gets the copy-and-check step first.
- **Backups:** before a ship that changes how data is read or written, export the public collections read-only through Firestore REST into `.improve/backups/iter-NN/` (a few hundred reads). UI-only ships don't touch data, so they skip it; the report says so.
- **Rules:** `firestore.rules` changes go live only when Lucas runs `firebase deploy --only firestore:rules`. The loop never deploys rules; it calls them out. (README.md:175-176)

## Hard limits

- **Firestore Spark plan:** 50,000 document reads a day; going over breaks the site until the daily reset. (README.md:189-196) Writes 20,000 a day, deletes 20,000 a day, 1 GiB stored. (firebase.google.com/docs/firestore/quotas, from memory: `inferred`) Page loads read the whole shelf, thumbs, seen marks and upcoming free marks. (README.md:190-192)
- **Vercel Hobby:** a cron at most once a day (the tick is daily). (README.md:127-129) Function duration 10 s on Hobby (vercel.com/docs/functions/limitations, from memory: `inferred`).
- **No npm dependencies in the deployed site:** plain ES modules, no build. (PRODUCT.md constraints; vercel.json `installCommand: echo no-install`)
- **Browser storage:** only `ps.me` may be stored. (user's brief, 2026-10-14)
- **Time zone:** America/New_York. (PRODUCT.md)
- **Phones:** judge at 360 and 412 CSS px first, then 200% text (simulated as a 206 px viewport), then desktop. (user's brief)

## House rules

- Never load https://weberplex.vercel.app in loops, and never tap anything there that writes. Look at the app locally. (user's brief)
- Live data changes only through the product's own interfaces. The loop never writes to production Firestore.
- Never commit `.env.local` (it holds the owner key). Secrets live in `.env.local` and Vercel's env settings; never print them. (README.md:178)
- Any new user action must be added to `tests/news.test.mjs`. (README.md:77-82)
- Commits: the user is the sole author; no Co-Authored-By trailers. (global CLAUDE.md)
- Brand: Weberplex, never "Speakeasy"; keep the cinema-marquee world; Android and Google, not Apple. (PRODUCT.md; DESIGN.md)

## Version control

- Branch `improve-loop`, in this checkout (C:\Users\lwebe\Projects\picture-show). No separate worktree is needed because no live service runs from this checkout.
- `.improve/evidence/` and `.improve/backups/` are git-ignored. `.improve/` is committed on the branch at the end of each turn. When a kept iteration ships, `master` is fast-forwarded to it (so `.improve/` reaches the repo too, but not the served `public/`).
- Unfinished round-5 edits from before the loop are in `git stash` ("round5-partial": news uses dates for nights over a week off; a night you could join ranks right after your own). They are a candidate for a Pivot, not part of the baseline.

## Personas

1. **The newcomer: Gma.** In her 70s, the group's grandmother. Taps the link in the Google Messages group text on a mid-range Android phone, with system text bumped up. Has never seen the site. Never reads instructions; gives up after about ten seconds of confusion. Her goal: say she's free Friday and find out what they're watching. Least convenient context: a 360 px phone, and the same first screens at 200% text.
2. **The connoisseur: Dana.** Plans every group outing on Partiful and knows it intimately: the invite that arrives in the group text, the RSVP that takes one tap, the guest list with faces, the personality in every screen. Also a film buff who loves the moment the house lights go down. Judges the signature moment (the pick and the reveal) frame by frame against that bar.
3. **The operator: Priya.** Has run small Firebase-backed consumer apps at 100× this scale. Reads the rules, the write paths and the clock. Looks for what blows the 50k-read budget, races (two phones locking a night, two hosts on one day), fails silently offline, or can't be diagnosed.

## Scoring instrument

Each iteration also runs the impeccable critique of `public/index.html` (two isolated reviewers: a design review that scores Nielsen's ten heuristics out of 40, and the detector). The user's target is 40/40. History before the loop: 27, 29, 29, 30, 29 (`.impeccable/critique/`).
