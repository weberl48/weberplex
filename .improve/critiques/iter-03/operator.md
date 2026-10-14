# Iteration 3: operator critique (Priya)

Inputs read: `.improve/scenario.py`, the listed `public/js/*`, `firestore.rules`, `lib/*`, `api/*`, `tests/e2e.py`, the four `console.json` files (all `[]`), and the timing table. Nothing else was opened. Line numbers are as of 2026-10-14.

The happy path is clean: no page errors or console errors in four runs, and every timed step is under 1.4 s on the local emulator. That's all the logs show. The scenario only listens for errors (`scenario.py:196-197`), so a clean `console.json` proves the absence of exceptions and nothing about the network, the read budget or the lock. Each finding below is one I tried to break; what's still inferred is marked **GUESS**, along with what would confirm it.

---

## Step by step

| step | median / worst (ms) | verdict | why (finding) |
|---|---|---|---|
| newcomer: open link to first screen | 1346 / 1351 | **slow** | The walkthrough needs no data but can't open until the Firestore SDK has come down from gstatic (O9) |
| newcomer: Count me in on the reveal to the name form | 45 / 47 | none | `requireMe` with the `#next` button as the pending tap (`app.js:635`) |
| newcomer: name to her ticket | 328 / 332 | **fragile** | `join()` sits outside the busy guard and the "Not sent yet" watchdog (O1). Landing on the ticket waits for the server here but not on the named path (O1) |
| newcomer: thumbs-up (button pressed) | 66 / 74 | **fragile** | "Pressed" is the local echo, not the server's answer; a vote shows no confirmation of its own (O2, O10, O13) |
| newcomer: I'm free that evening to server-confirmed toast | 348 / 563 | none | Honest: the toast comes only after the ack (`app.js:1254-1259`) |
| regular: open link to the reveal | 1370 / 1374 | **slow** | The reveal waits for every list to load in full (O6). The poster is a cold download (O11) |
| not-coming: Count me in on the reveal to her ticket | 54 / 56 | **fragile** | The ticket shows at 54 ms. The same write's ack takes about 348 ms (the free-evening toast). It's optimistic (O2) |
| host: Put it on the marquee to confirmation | 651 / 664 | **slow** | Slowest step: two reads one after the other before anything is queued, and nothing moves on screen meanwhile (O8) |

Not timed, but on the critical path: **the lock** (O3, O12), **load with Firestore unreachable** (O5, O7), and **the spoiler surfaces** (O4).

---

## Findings

### O1 · Major · The name step is the one write with no watchdog and no busy state
- `join()` (`app.js:1032-1077`) calls `await A.join(name)` directly. It isn't wrapped in `once()`/`sending()` (`app.js:1000-1030`), and the submit handler (`app.js:1087-1101`) has no in-flight guard. `A.join` waits for a `getDoc` and then a `commit()` (`actions.js:57-60`). The repo's own comment says a commit never resolves while writes can't get through (`firebase.js:16-17`).
- Here's what happens on a connection that's up but carrying nothing, the same model `honest_sending_checks` uses (`e2e.py:332`): the newcomer taps "That's me" and nothing happens. There's no "Not sent yet", no error and no spinner, for as long as the page stays open. The watchdog exists for exactly this failure, and the newcomer's first write is the only one it doesn't cover.
- Inconsistent landing: after the name, the ticket landing waits for the server's ack (`app.js:1063`, `run` is `once`'s promise). Someone who already has a name lands at once (`app.js:638`). On a slow link the newcomer sits wherever the name form was, with the form gone.
- **GUESS (worst case):** a second tap while the first commit is pending runs `getDoc` again. That `getDoc` probably sees the pending local doc, returns "exists", and saves `ps.me` (`app.js:1036`) before the server has the person. If the tab then dies, the phone has a name with no `people` doc. `maybeRevealMovie`/`maybeRevealTie` return early forever (`app.js:661, 671`: `S.me && !myDoc()`). The ticket stays "The movie is…" until showtime, with no "Reveal the movie" button. `savePrefs` can never create the doc, because a set-merge without `name` fails the create rule (`firestore.rules:80-81`), and the failure only reaches `console.warn` (`app.js:64`). **Confirm:** abort `**/Firestore/Write/**`, submit the name twice, check `localStorage['ps.me']` against `people/<key>` in the emulator, then open a new context with that `ps.me` while a locked night is up. Separately, a read-only prod check: every `nameKey` in votes/seen/free should have a `people/{key}` doc.

### O2 · Major · Tickets and pressed buttons show before the server has the write, and on Android an unsent tap can vanish without a word
- `rows()` keeps pending local writes as if they were real (`store.js:3`, with no `hasPendingWrites` check). Kim's ticket appears at 54 ms and the thumbs-up shows pressed at 66 ms. The server-confirmed toast for the same kind of write (`setFree`) takes 348 ms (worst 563). So the ticket and the pressed thumb come from the phone's local echo, not from the server.
- The only honest signal in that window is the 4 s watchdog (`app.js:1020`). The cache is memory-only (a hard limit), so pending writes die with the page; the page's own copy says so ("as long as this page stays open", `app.js:1013`). The only guard on leaving is `beforeunload` (`app.js:1031`). **GUESS:** Android Chrome doesn't fire that for an app switch or a background tab discard, which is the normal "tap Count me in, go back to Messages" move.
- Net effect on a flaky link: she saw her ticket, left within 4 s, the tab got discarded, and she's not on the list. The host's count and the pick both miss her. Nothing told her. Not covered by e2e.
- Fix direction: render `hasPendingWrites` rows as "Sending…" on the ticket and the button, and send `visibilitychange→hidden` with `unsent > 0` to a sticky state that's shown on return.

### O3 · Major · The phone's lock is picked from whatever the phone last held; the transaction re-checks only `status`
- `clock()` builds the pick from in-memory `S.movies/S.votes/S.free` and the local night (`app.js:131-133`), then `lockNight` runs a transaction that reads the night and checks only `status === 'planned'` (`actions.js:182-186`). The vetoes and theme it just read sit on that same doc and are ignored. The rules don't check the pick either (`firestore.rules:219-221`).
- **Veto/theme race:** a veto that lands between the local snapshot and the transaction lets the vetoed movie win. "Lock the movie now" flushes only the host's own writes (`app.js:1309`), not other people's.
- **Stale resume (GUESS on ordering):** `clock()` fires from the 30 s interval (`app.js:1485`) and from the first snapshot of any list (`app.js:57, 85`). A tab resumed after the lock time can lock before its `free`/`votes` listeners catch up. `free`, the main input, is registered last (`app.js:90`). Whenever a phone is open, it beats HA to the lock (30 s against 30 min), so this is the path that usually locks.
- The server does it right, which makes the contrast worse: `tick` reads fresh and writes with `ifUpdateTime` (`lib/tick.js:16, 25`). **Fix:** re-pick inside the transaction from `snap.data()` (vetoes, theme), and skip the automatic lock until every listener has delivered a non-cache snapshot since the last resume. **Confirm:** abort Listen on an open phone, change the free marks through the emulator admin so the pick should flip, make the night due, unroute, and see which movie locks.

### O4 · Major · The link preview and the calendar feed name the movie the page keeps face down
- The page hides the title until your reveal plays, even in "Add to calendar" (`app.js:570`, `app.js:1472-1475`). But `/api/preview` puts `movie_title` and the poster into the link card for a locked night (`lib/preview.js:51-56`), and the feed titles every non-planned night with the movie (`lib/calendar.js:20, 31`).
- The link travels through the group chat, so whoever pastes it after the lock spoils the reveal for everyone who sees the preview. The feed spoils it on the lock screen of anyone subscribed. This is outside my lane, but it defeats the signature moment and it comes from the server half. (HA's `movie_title` in `lib/status.js:51` is probably intended for the living room.)

### O5 · Minor · A listener error gets the wrong diagnosis, twice, and the page then looks normal while frozen
- `onErr` drops `e.code` and says "Lost the connection to the box office. Reload to try again." (`app.js:84`). If that happens at load, the board says "Check your connection; this page catches up by itself." 8 s later (`app.js:60, 263`). The two messages contradict each other. After an error a Firestore listener is finished and won't catch up. Reloading doesn't help when the cause is quota (`resource-exhausted`, which lasts until the daily reset) or a bad `firestore.rules` deploy (`permission-denied`), and the rules file changes every iteration.
- `people` and `config/season` errors are swallowed (`app.js:89, 91`). The toast fades after 12 s (`ui.js:71`). After that the page looks live, but its listeners are dead: taps show no change and then confirm by toast.
- e2e covers only an aborted Listen (`e2e.py:363`), where the SDK retries, so the error path never runs. Fix: map `resource-exhausted` and `permission-denied` to their own sentence, keep a persistent state on the board, and show the code, so a user's screenshot is enough to diagnose it.

### O6 · Minor (a projection, not today) · The read budget has no ceiling, and HA is the multiplier
- Every load reads every movie, vote, seen mark, person and night ever (`store.js:5-13`, `app.js:85-91`), with no carry-over between loads because the cache is memory-only. `renderWatched` adds up to 12 one-shot review reads per load (`app.js:900-903`).
- Every 30-minute HA poll reads every finished night just to find the latest one (`lib/status.js:12-14`), plus every vote while the next night is planned (`lib/status.js:64`), plus the whole shelf when that night has a theme or a veto (`lib/status.js:70-72`). That's 48 times a day, and the CDN cache (`s-maxage=60`, `api/status.js:12`) never hits at that interval. The calendar feed also reads every finished night (`lib/calendar.js:46`).
- At today's counts (36 movies, 3 thumbs, 10 seen, 2 nights) that's roughly 60 reads per load and about 10 per poll, which is far below 50k. **GUESS on the crossing point:** with around 450 thumbs, 150 movies, 150 seen marks and 40 finished nights, a planned week is about 48 × ~600 (HA) plus ~20 loads × ~800, which is around 45-50k a day. Votes on watched movies are never deleted, so the fuse only gets shorter. First fix: query the latest finished night with `orderBy`/`limit 1`, and count only the coming people's votes in status. The time to the reveal also grows with these lists, because `ready()` waits for all five (`app.js:52, 225`).

### O7 · Minor · Unreachable at load: the marquee is honest, but the rest of the page shows false empties
- `renderCalendar` has no `ready()` guard (`app.js:231, 687-739`), so every day says "Nobody has said they're free yet." (`app.js:725`) and offers "I can host" on evenings it knows nothing about. The shelf header says "0 movies" (`app.js:790`, which runs before the guard at `app.js:817`). e2e only checks that `#next` doesn't say "Nobody is hosting yet" (`e2e.py:366`).
- If a newcomer taps "I'm free" there, `requireMe` opens the name form (`app.js:981`), and the next repaint hides it again (`renderPass`: `need = !S.me && ready()`, `app.js:299-300`). The form she's typing into disappears within 30 s.

### O8 · Minor · Hosting is the slowest step and shows nothing while it waits
- `hostNight` does `getDoc(night)` and then `getDoc(free)` one after the other before it queues anything (`actions.js:139, 144`), so there's no optimistic night on screen. It takes 651 / 664 ms locally, the slowest timed step. **GUESS:** 1-2 s on a phone. The free read repeats state the page already has from its live `free` listener.
- **GUESS:** for actions that read before they write (host, join, add a movie), the 4 s note promises "It goes through when your connection is back". The `getDoc` may then reject offline, giving "You look offline" (`ui.js:122`), and nothing is ever queued. **Confirm:** abort both Listen and Write, then tap "Put it on the marquee".

### O9 · Minor · The first screen waits for a dependency it doesn't use
- The walkthrough opens from `app.js:1083`, and that line can't run until the static imports resolve, including the Firestore SDK from gstatic (`app.js:5` → `firebase.js:3-7`). The 1346 ms "open link to first screen" includes a real internet fetch even in the local run. **GUESS:** how much of the 1346 ms that is, and whether `index.html` shows anything at all if gstatic fails (the only "can't reach" message is in the module that wouldn't load). **Confirm** with a network trace and by blocking `www.gstatic.com`.

### O10 · Minor · There's one toast slot, so "Not sent yet" can be overwritten and "Sent." never comes
- Any toast replaces the sticky note (`ui.js:63-72`): "Back online." (`app.js:1119`), "Still sending that one…" (`app.js:1001`), or another action's confirmation. "Sent." only shows if the slot still holds `NOT_SENT` (`app.js:1028`). A vote has no confirmation of its own (`app.js:1337`), so after a flaky moment the person may never hear that it landed. "Back online." also fires before the SDK has flushed anything.

### O11 · Minor · The reveal turns whether or not the poster has loaded
- The reveal asks for the medium poster (`reveal.js:9, 30`), a different URL from the small one the shelf already loaded, so it's always a fresh download. The download starts when the card appears, and nothing waits for it: the title lands at 650 ms (`reveal.js:70`) however far the image has got. **GUESS:** on a slow link the flip lands on an empty frame, or on the text tile from `posterFail`. **Confirm** by throttling `images.metahub.space` in the scenario.

### O12 · Minor · When the server clock goes wrong, nothing records why
- `/api/status` runs `tick` and throws away its per-night results (`api/status.js:10`), and those results are where the reasons for skips live (`lib/tick.js:28-29`). A lock that keeps failing shows up only as "Locking now…" on the marquee (`app.js:274`). The REST client has no timeout (`lib/firestore-rest.js:37-41`), so a hung Firestore call uses up the whole function budget and HA gets a bare timeout. Cheap fix: add `tick.actions` to the status JSON, so HA can alert on `skipped`, and put an `AbortSignal` timeout on each call.

### O13 · Polish · The scorecard can't see what the operator needs
- "Thumbs-up confirmed (button pressed)" (`scenario.py:284`) and Kim's ticket (`scenario.py:352`) time the local echo, not the server. No run counts reads. `console.json` records only errors and warnings. e2e covers dropping a vote or an RSVP mid-send and an aborted Listen at load. It doesn't cover the name step under failure, a terminal listener error, a tab killed with writes pending, the lock race, or the four server functions.

---

## What's good and must be protected
Every confirmation waits for the server's ack (`once` → `await` → toast), the 4 s "Not sent yet" watchdog follows the action rather than the write queue, e2e proves it by aborting the Write channel, and the server clock's conditional writes (`ifUpdateTime`) do the same job for the lock. Keep all of that, and extend it to the name step and the phone's lock.
