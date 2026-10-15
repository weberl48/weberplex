# Operator critique, iter-06 (Priya)

Inputs read: the scenario, the listed source files, `tests/e2e.py`, the four `console.json` files (all `[]`), and the timing table from the brief. Nothing else was opened or run. Line numbers refer to the files as they are on `improve-loop` today (2026-10-14).

**Verdict.** The write path is more honest than most hobby Firestore apps I've seen. A tap counts once the server acknowledges it. The weak spots are around that path:
- The page paints the result before the server has it.
- A phone can lock a night from lists it never confirmed were fresh.
- The server clock is invisible when it fails.
- The read bill grows with all-time history, and HA pays it 48 times a day.

None of this is a Blocker today. Three of the findings are Majors whose cost goes up with use.

**Protect this:** a tap is only confirmed when the server acknowledges it: `once()` resolves on the commit (app.js:1115-1124), and "Not sent yet", then "Sent.", is driven by that (app.js:1129-1153; e2e.py:348-406 blocks the Write stream to test it). Both lock paths are conditional writes: a transaction with `expect` (actions.js:183-191) and the REST call with `ifUpdateTime` (lib/tick.js:25). Keep both exactly as they are.

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| O1 | A phone that has just woken up, or one whose clock runs fast, can lock the night to the wrong movie, and the host can't undo it after the lock time | Major | app.js:149-152 (the only guard is a 5 s timer), app.js:55-57 (`fromCache` dropped after the first load), app.js:162-164 (the pick uses in-memory `S.votes`/`S.free`), actions.js:186-188 (the transaction re-checks only vetoes and theme), app.js:197 (Unlock hidden after the lock time) vs firestore.rules:222 (rules allow unlock until showtime), firestore.rules:219-221 (no time check on a lock), e2e.py:624-651 (a phone 8 h fast locks a night the server wouldn't) |
| O2 | The ticket, "You're in ✓" and the pressed thumb are painted from writes the server hasn't acknowledged. If the phone is pocketed before the ack and Chrome freezes or discards the tab, the RSVP she saw printed never lands | Major (borderline Blocker) | store.js:3 (rows include pending local writes; `serverTimestamps: 'estimate'`), app.js:181/463/565 (`imFree` drives the button and the ticket), no `hasPendingWrites` anywhere in the inputs; memory-only cache (operating fact); app.js:1139 (the note waits 4 s); app.js:1154 (`beforeunload` is the only guard). Android Chrome doesn't fire it on swipe-away or tab discard: platform behaviour, **GUESS**, see below |
| O3 | The read bill grows with all-time history. `/api/status` re-reads every thumb and every finished night on each 30-minute HA poll; each page load reads every collection with no cap. Fine today, about 40 loads a day of headroom on year-one numbers | Major (structural, not urgent) | lib/status.js:12 (all `done` nights), :64 (all votes), :70-71 (all movies when there's a theme or veto); lib/preview.js:46 (pays for the leader reads and uses none of them); store.js:13-16 ("No cap"); app.js:105-111, 1005-1009; production counts and HA cadence from the brief; arithmetic below |
| O4 | When reads fail (quota, or any error that kills a listener), the page blames the connection, says it "catches up by itself", and tells people to reload. People and season errors are swallowed, so a signed-in page can sit on "Warming up the projector…" forever. The owner gets no signal | Major (the SDK-behaviour part is a **GUESS**) | app.js:103 ("Reload to try again"), app.js:303 ("Check your connection; this page catches up by itself"), app.js:108/112 (`() => {}`), app.js:297/301-303 (signed in, no people list, so "Warming up…" and the 8 s flag never set because `ready()` is true), no re-subscribe anywhere |
| O5 | If the pinned gstatic SDK fails to load, the curtain probably stays closed with no message | Major, **GUESS** | Only app.js opens the curtain (app.js:69-77), and app.js statically imports firebase.js, which imports gstatic (firebase.js:3-7). A failed import means app.js never runs. Confirm: block `www.gstatic.com` in the scenario, screenshot at 10 s, and check index.html and the CSS for a fallback (neither is in my inputs) |
| O6 | On a connection that hangs, "Not sent yet. It goes through when your connection is back" is false for a new name, hosting and adding a movie. Each reads first and fails as offline instead of being queued | Minor | app.js:1129, 1254 (the promise); actions.js:57, :139/:144, :82 (reads first, of docs that can't be in the cache); e2e.py:409-423 (an unreachable name is expected to end in an error) |
| O7 | The server clock can't be diagnosed. Status throws away tick's outcome, there are no fetch timeouts, and HA is the only frequent clock. A lock that lands after showtime skips the reveal entirely | Minor | api/status.js:10 (result discarded), lib/tick.js:28-29 (every failure filed as "a phone got there first"), lib/firestore-rest.js:37-41 (no timeout), api/status.js:10-11 (tick then status in one 10 s function; the limit is unverified), app.js:282 (`started` means no reveal) |
| O8 | While Firestore can't be reached, the page below the marquee shows a confident empty house: "Nobody has said they're free yet.", "0 movies", and live "I can host" and "I'm free" buttons | Minor | app.js:270 and :788-840 (the calendar has no `ready()` guard), :826, :891 (the count is written before the ready check at :920) |
| O9 | Hosting takes three round trips in series, two of them reads the page already holds. It's the slowest step, and it can't work offline | Minor | actions.js:139, :144, :145; "Put it on the marquee" 1335 ms vs 829 ms for a single write on the same emulator |
| O10 | If Cinemeta hiccups, "Surprise me" hangs on "Rummaging through the catalog…" with an unhandled rejection | Minor (that `topMovies` throws is a **GUESS**: cinemeta.js isn't in my inputs) | app.js:1575-1581 (no try/catch); compare app.js:992 and :1559, which degrade properly |
| O11 | Signed out, the reveal replays on every visit, not "once per phone" as the comment and the scenario caption say | Polish | app.js:33 (`reelsSeen` lives in memory), :286, :762-763; only `ps.me` may persist |
| O12 | The reveal turns over without waiting for the medium poster, which only starts loading when the card mounts | Polish, **GUESS** | reveal.js:9, :33 (eager load at mount), :73-84 (no load wait). Confirm: throttle the scenario to Fast 3G and look at the `reveal-turn` frames |

---

## The walk, step by step

| step | median / worst | rating | why |
|---|---|---|---|
| Newcomer: open link to first screen | 2612 / 2615 | **slow, fragile** | Median and worst are 3 ms apart, so this is the curtain, not the network. Data was ready at about 1.3 s, then 1.3 s of animation (app.js:75) before the tour can rise. On a real phone the 2.5 s cap (app.js:77) plus 1.3 s means about 3.8 s before the first usable tap, worse cold. Fragile: O5 |
| Tour to reveal, turn the card | — | none / fragile (O12) | Readiness is gated correctly: every list from the server, the people doc for a signed-in viewer (app.js:261-264, 751, 766) |
| Count me in on the reveal to the name form | 36 / 40 | none | |
| Name to her ticket | 852 / 852 | **confusing, fragile** | The name waits for the server (a read, then a commit: actions.js:57-60, app.js:1161-1164), which is right. Then the ticket is printed from her unacknowledged RSVP, so 852 ms measures the paint, not the confirmation (O2). On a hanging connection a new name is promised and then refused (O6) |
| Thumbs-up (button pressed) | 63 / 78 | none (O2 applies, low stakes) | Pressed state is local; the toast-free thumb has no ack signal at all except "Not sent yet" at 4 s |
| Tap an open evening | — | none | |
| I'm free that evening to server-confirmed toast | 829 / 1034 | none | This is the right design: the words come only after the server acknowledges. The absolute number is emulator noise (16 GB process; A/B parity last round), so I don't rate it slow |
| Regular: open link to reveal mounted / curtain gone | 1299 / 2599 | **slow** | The same 1.3 s curtain cost after the reveal is already mounted behind it. The reveal correctly waits for her people doc |
| Regular: see my ticket, news cards | — | none | `lastSeen` is server-stamped and compared with server-stamped `at` fields (app.js:91, logic.js:343); news is never marked read while cards are unread (app.js:97, 444-445). Careful work |
| Not coming: Count me in on the reveal to her ticket | 52 / 57 | **fragile** | 52 ms is the optimistic paint; the only real confirmation is the "You're in" toast after the ack (app.js:692). O2 |
| Host: Put it on the marquee to confirmation | 1335 / 1346 | **slow, fragile** | Three round trips in series (O9). Offline it fails after promising to queue (O6) |
| Server: HA poll (`/api/status`), daily cron (`/api/tick`) | not measured | **fragile, can't be diagnosed** | O3, O7 |

---

## Detail

### O1: the phone's lock trusts lists it never checked were fresh
Every snapshot carries `metadata.fromCache` (store.js:10, 16, 21). The page uses it once, to ignore an empty first snapshot (app.js:55-57), and throws it away after that. A woken tab is guarded only by "wait 5 s" (app.js:149-152). Then `clock()` picks from whatever `S.votes` and `S.free` hold (app.js:162-163) and commits. The transaction re-reads only the night doc and compares only vetoes and theme (actions.js:186-188). The free marks and thumbs, which decide the pick ("most thumbs from the people coming"), are not checked.

Picture a phone left on the page overnight. It wakes in the 30 minutes between the lock time and HA's next poll, and the reconnect takes longer than 5 s. One mechanism makes this plausible, but it's inferred, not observed: the transaction is a single request, while re-listening runs through the long-poll channel. The phone then locks from yesterday's RSVPs, right when people are counting themselves in before the lock. A visible tab in a dead zone has no `wokeAt` at all.

Once the lock time has passed the host can't undo it: Unlock is shown only before the lock time (app.js:197), although the rules allow it until showtime (firestore.rules:222). The rules also accept a lock at any time (firestore.rules:219-221), so whichever phone's clock says the night is due decides. e2e.py:624-651 depends on exactly that, with a phone 8 hours fast. Android's automatic time makes large skew rare, so that half is the lesser one.

The mechanism is proven in code; how often it happens is inferred. To confirm: open a page, hide it, write a free mark and a thumb that change the pick, move the lock time into the past, then show the page with Listen responses delayed 8 s, and see which movie locks.

Cheap fix: record `fromCache` per list and lock only when all five are server-fresh and have no pending writes. Keep Unlock until showtime.

### O2: confirmation-shaped UI before the confirmation
`rows()` includes the phone's own pending writes (store.js:3; the `'estimate'` option exists for exactly those rows). `imFree` (app.js:181) then prints the ADMIT ONE ticket (app.js:565) and "You're in ✓" (app.js:463) before the server has anything.

The honest signal comes later. The toast is tied to the ack, and "Not sent yet" appears at 4 s (app.js:1139). If she pockets the phone at second 2, the note fires into a hidden tab. Chrome then throttles and freezes the tab. Either the RSVP waits until she happens to reopen Chrome, after the lock has picked without her, or the tab is discarded and the write is gone: memory-only cache, and `beforeunload` (app.js:1154) doesn't fire on Android swipe-away or tab discard. That last part is **GUESS**, from platform behaviour, not observed here.

Why Major and not Blocker: the loss needs an unacknowledged write, a fast pocket, and a freeze or discard all at once, and the page shows the truth when she comes back. It still breaks the promise the ticket makes. Fix: render a "Sending…" state from `metadata.hasPendingWrites`, and print the ticket once the RSVP is acknowledged.

### O3: the read bill
Firestore bills every document a listener or query returns (an empty result still costs one read). A listener that's been disconnected for more than 30 minutes is billed again as a new query. That second rule is from Firestore's billing docs, not observed here; it means every return to a pocketed tab counts as a fresh load.

| | today (counts from the brief) | plausible year one (52 nights, 100 movies, 300 thumbs, 150 seen, 12 people) |
|---|---|---|
| one page load | about 60 (2+36+3+10+3+1+1, plus 2-4 subcollection listeners and past-review queries) | about 700 |
| one HA poll in a week with a planned night | about 11, or 47 with a theme or veto | about 360-460 (lib/status.js:12, :64, :70-71, plus tick's two queries, lib/tick.js:11) |
| HA per day (48 polls) | about 0.5k-2.3k | about 17k-22k |
| page loads left under 50k | about 800 | about 40 |

Forty a day is a dozen phones checking three or four times in a movie week. Over the cap, the site is dark until the reset, and per O4 it won't say why.

The single worst amplifier is status reading **all votes ever** (thumbs on watched movies are never deleted) and **all finished nights** just to find the last one, 48 times a day. Status's 60 s cache (api/status.js:12) never helps a 30-minute poller. Preview pays the same leader reads and uses none of them (lib/preview.js:49-58 reads only state, time, host, count, title, poster).

This is a projection with stated assumptions; today's headroom is about 20×. The growth is structural, though: cost scales with all-time totals, not the coming week.

### O4: what over budget looks like
The page's texts are proven in code. Whether a quota error kills listeners or is retried quietly by the SDK is **GUESS**. To confirm, answer Listen requests with `RESOURCE_EXHAUSTED` in a Playwright route.

- If listeners die: the toast says "Reload to try again" (app.js:103). Every reload is another full read attempt, and the page never recovers on its own, even after the reset.
- If the SDK retries quietly: after 8 s the board says "Check your connection" (app.js:303). That's wrong in both cases.
- If only the people listener dies: the error is swallowed (app.js:108), `knowsMe()` stays false, `ready()` is true so the 8 s flag never sets, and a signed-in viewer sits on "Warming up the projector…" with no reveal and no news (app.js:297, 301-303, 751).

Nothing reaches the owner except HA's 502 body (api/status.js:16 does carry the error text, which is good).

### O5: one CDN fetch decides whether the curtain ever opens
Reasoning above. It's a **GUESS** only because index.html and the CSS aren't in my inputs. A newcomer with a cold cache on a weak signal is the person most likely to hit it.

### O6: the promise in "Not sent yet"
The note exists for "a connection that's up but carrying nothing" (app.js:1126-1129). For a pure write, the promise holds. But `join` (actions.js:57), `hostNight` (:139, :144) and `addMovie` (:82) first read a doc that doesn't exist yet. With nothing cached and no server, that read is refused as offline once the SDK gives up on the connection. That takes about 10 s on a hanging link, or longer if the socket hangs without failing, and is inferred from SDK behaviour. So 4 s says "it goes through", and later it didn't.

The end state is honest: passMsg and "That didn't go through" (app.js:1149, 1203-1207), and e2e.py:409-423 expects exactly that for an unreachable name. But Gma reads the 4 s promise and puts the phone down. Say "Waiting for a connection" for read-first actions, or drop the reads (O9).

### O7: the server clock is invisible
- `/api/status` discards `tick()`'s actions (api/status.js:10). tick's own reasons, including `empty-shelf`, never reach HA (lib/tick.js:24, 28-29).
- No timeouts on Firestore fetches (lib/firestore-rest.js:37-41). tick and status run in series in one function (api/status.js:10-11), against a 10 s limit that the brief says is unverified.
- If HA is down, only the daily cron locks. Its hour isn't in my inputs: **GUESS**. A lock that lands after showtime means no reveal at all (app.js:282) and no lock card for anyone who wasn't looking.

Fix: put tick's actions into the status JSON (HA can alert on `skipped`), and set a 3 s abort on each REST call.

### O8: the empty house while unreachable
The marquee is honest (app.js:303). Below it, the calendar paints from empty lists with live buttons, "Nobody has said they're free yet." (app.js:826), and the shelf header says "0 movies" (app.js:891). Guard `renderCalendar` and the count on `ready()` the way the shelf and Up next already are (app.js:493, 920).

### O9: hosting does three round trips
The night doc and her free mark are already in `S.nights` and `S.free`. The rules already refuse hosting over a live night: a `set()` on an existing night is an update, and only a cancelled night may be re-created (firestore.rules:207-230, :229), and the free mark is skipped exactly when it exists. Two reads in series buy a friendlier error message, at the cost of the slowest step and offline failure.

---

## What the tests and the scenario don't cover
- **Covered** (e2e.py): Write stream blocked gives "Not sent yet" then "Sent." for a thumb, dropping out and a new name (348-406). A fully unreachable name gives an error and never "Sent." (409-423). Opening with Listen blocked says so (426-431) and catches up with empty lists (565-589). The locking phone shows its reveal first (620-651).
- **Not covered:**
  - Any `/api/*` function: tick, status, calendar, preview. The server clock has no end-to-end test in my inputs.
  - A woken or long-lived tab locking from stale lists (O1).
  - A connection lost mid-visit, after the first load.
  - Tab freeze or discard with an unacknowledged write (O2).
  - A quota or listener error (O4).
  - gstatic or Cinemeta failing (O5, O10).
  - Hosting or adding a movie offline (O6).
  - The scenario runs on localhost with zero network latency, as it says (scenario.py:21-23).
- **Logs:** all four `console.json` files are `[]`. That's mildly useful: the app's own failure traces (`settings not saved` at app.js:83, `clock` at :168) are warnings the scenario records (scenario.py:211), so no prefs write or clock pass failed in these runs. It says nothing about failure paths, which the scenario never exercises.
- **Timings:** the write steps sit on an emulator holding about 16 GB, with last round's A/B showing parity. I've used them only for relative cost (three round trips vs one), never as absolute slowness.
