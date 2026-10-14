# Iteration 4: operator critique (Priya)

Inputs read: `.improve/scenario.py`, the nine `public/js` modules listed, `firestore.rules`, `lib/{tick,status,calendar,preview,firestore-rest}.js`, `api/{tick,status,calendar,preview}.js`, `tests/e2e.py`, the four `console.json` files (all `[]`), and the timing table. Nothing else.

What the logs say: four runs, zero page errors, zero console errors or warnings. The happy path is clean. That includes no `settings not saved` and no `clock` warnings. But every diagnostic this site has goes to the phone's own console (`console.warn`/`console.error`). In production nobody reads that, so "no errors in the logs" proves nothing beyond the emulator.

## Walking the scenario

| # | Step (timing, local emulator) | Verdict | Why |
|---|---|---|---|
| 1 | Newcomer: open link to first screen (1338 / 1342 ms) | **slow** | The tour needs no data, yet it waits for the whole unbundled module graph plus the Firestore SDK from gstatic (O8). |
| 2 | Tour, 4× Next, then Let's go to the reveal | none | The tour runs at module evaluation (app.js:1114). The reveal waits for `ready()` and for the tour to close (app.js:227-229, 676). |
| 3 | Turn the card | **fragile** | It turns whether or not the poster has arrived (O9). The movie it shows came from a lock that can ignore a fresh veto (O1). |
| 4 | Count me in on the reveal to the name form (41 / 45 ms) | none | `play()` hands the tap to `requireMe` with `pending` (app.js:651-655). |
| 5 | Name to her ticket (344 / **848** ms) | **slow, fragile** | Two serial round trips (getDoc, then create) come before the RSVP write even starts, with no busy state (O7). On a connection that dies after 4 s, the watchdog says **"Sent."** for a name that was never sent (O2). |
| 6 | Thumbs-up (72 / 76 ms) | none (fragile in a long outage) | The local echo is honest and the watchdog fires at 4 s. In a long outage, after the first warning is overwritten, later taps never warn (O5). |
| 7 | Tap an open evening | none (confusing when unreachable) | When Firestore can't be reached, the calendar still says every evening is open and offers hosting (O4). |
| 8 | I'm free that evening to the server-confirmed toast (330 / 432 ms) | none | One batch, and the toast waits for the ack (app.js:1285-1290). |
| 9 | Regular: open link to the reveal (1341 / 1357 ms) | **slow** | Locally this is the same floor as step 1 (the code load). On a real network, the WebChannel handshake, 6 collection listeners and her people doc all have to land before the card appears (app.js:52, 690). See O8. |
| 10 | See my ticket | none | `landOnTicket` polls at most 3 s (app.js:663-669). |
| 11 | "Since you last looked" cards | none | Only Got it, Skip or Esc mark them read. Card buttons claim success up front (O10, Polish). |
| 12 | Not coming: Count me in on the reveal to her ticket (55 / 57 ms) | none | Local echo, then the toast after the ack (app.js:649). |
| 13 | Host: I can host to the slip | none | Purely local. |
| 14 | Host: Put it on the marquee to confirmation (657 / 661 ms) | **slow** | Three serial round trips (getDoc on the night, getDoc on the free mark, commit) and a frozen slip in the meantime. That's the slowest tap locally (O7). |
| — | The lock itself (any open phone, or HA's poll) | **fragile** | O1, plus nothing records who locked or why (O6). |

## Findings

### O1 · Major · A phone can lock a movie someone just vetoed, and nobody can undo it
`clock()` works out the pick from the phone's own copy of nights, votes, free marks and vetoes (app.js:134). Only then does it call `lockNight(day, pick)`. The transaction re-reads the night but checks only `status === 'planned'`, then writes the pick it was handed (actions.js:181-188). Two consequences:
- If a veto (or a late "Count me in") has reached the server but not yet this phone's listener, the transaction reads the night *with* the veto and still locks the vetoed movie.
- A transaction retried because the night changed under it reruns with the **same** `pick`.

The rules don't stop it: planned → locked checks only that the movie exists (firestore.rules:219-221), with no veto check and no time check. The UI hides "Unlock and re-pick" once `lockAt` passes (app.js:164), so the wrong lock stands. The server half does this right: `tick` writes with an `ifUpdateTime` precondition and recomputes on its next poll (lib/tick.js:25). The phone half does not.

Trigger: a veto or RSVP within about a listener round trip of the lock, or a phone resuming a frozen background tab near `lockAt`. On resume, the 30-s interval, or any first snapshot, runs `clock()` before the other listeners have caught up (app.js:57, 85, 1516). The mechanism is certain from the code. **GUESS** on how often the resume case happens. To confirm: freeze a page with CDP `Page.setWebLifecycleState({state:'frozen'})`, add a veto through the emulator, move `startsAt` so the night is due, resume, and assert `lockedMovieId` isn't the vetoed movie. Fix direction: compute the pick *inside* the transaction from the night it just read (vetoes, theme), and re-read the free marks there too.

### O2 · Major · The name step can say "Sent." for a name that was never sent
`join()` starts the watchdog, then `A.join` does a `getDoc` before any write (app.js:1059-1061, actions.js:57). If that read rejects after the 4-s mark, the error goes to `#passMsg` ("You look offline…"), not to the toast (app.js:1100-1103). Then `finally → done()` finds the toast still reading "Not sent yet" and replaces it with **"Sent."** (app.js:1051, 1106). The read rejects with `unavailable` once the SDK has declared itself offline. Nothing was queued, so the "Not sent yet" promise was false too: "It goes through when your connection is back" (app.js:1036). Her pending Count me in never fires.

`pick()` has the same flaw: it swallows `addMovie` errors into `#pickMsg` and returns normally, so `once()` reports success and the toast reads "Sent." (app.js:1450-1455). There, a slow Cinemeta fetch inside the watchdog also reads as "Not sent yet" (app.js:1448; cinemeta.js is outside my inputs, **GUESS** that it has no timeout).

The e2e blocks only `Write` (e2e.py:382), so `getDoc` still succeeds over `Listen`. The case that lies is never exercised.

**GUESS** on the SDK's offline timing. The app-side mechanism is certain. To confirm: route both `Listen/**` and `Write/**` to `abort('connectionreset')` starting 1 s after submit (not `set_offline`, whose `offline` event toast happens to cover the lie) and assert the toast never reads "Sent." while `#pass` is visible.

### O3 · Minor today, Major at a few hundred thumbs · The read budget grows with the shelf, and when it runs out the page blames the guest's connection
- **Per page open:** every doc in `movies`, `votes`, `seen`, `nights` (store.js:9-10, "No cap") and `people`, plus `config/season`, the subcollections of the next and recent nights, and one `getDocs` per past night up to 12 (app.js:85-108, 923-927). Today that's about 60 reads (36 + 3 + 10 + 2 + 3 + about 6). Memory-only cache means every reopen, and every resume after more than 30 min, pays the full set again.
- **Home Assistant, 48 times a day:** `tick` runs two queries, then `buildStatus` lists planned, locked and *every finished night* (status.js:12). While the next night is planned it also lists **every vote** (status.js:64), plus **every movie** if the night has a theme or a veto (status.js:71). Today that's about 600-2,400 reads a day. At 500 votes it would be about 24,000 a day from HA alone, before anyone opens the page. Nothing in the repo prunes votes, seen marks or nights, and nothing counts reads. (The 500-vote point is a projection from the code, not a measurement.)
- **When it trips:** listeners die for good, and each one toasts "Lost the connection to the box office. Reload to try again" (app.js:84) for 12 s. The page then keeps showing frozen data, while writes, which have their own quota, still go through. After a reload the board says "Can't reach the box office yet. **Check your connection; this page catches up by itself**" (app.js:265). That's the wrong cause, and a false promise until Firestore's daily reset (about midnight Pacific).
- **Cheap fixes:** have `status` read the night's `free` marks and only the votes it needs (or cache the leader on the night doc), and give the `onErr` path a `resource-exhausted` message.

### O4 · Minor · Can't reach Firestore? The calendar still says every evening is open
`render()` calls `renderCalendar()` with no `ready()` guard (app.js:233, 706-758). `renderNext` and `renderShelf` both have one (app.js:451, 838). With `S.free` and `S.nights` empty, every day reads "Nobody has said they're free yet" and offers "I'm free that evening" and "Host this evening". The same false picture flashes for the first second or two of every cold open on a real network.

A signed-in guest who taps "I'm free" on a day she's already free on queues a `set` on an existing doc. When the connection comes back, the rules refuse it as an update (firestore.rules:159), and she sees "Someone may have just changed it; try again" (ui.js:120). The e2e unreachable check looks only at `#board` and `#next` (e2e.py:396-397).

### O5 · Minor · After the first warning is overwritten, the watchdog goes quiet
`warned` is one global latch, and it resets only when *every* pending action has landed (app.js:1040-1051). The toast has a single slot (ui.js:63-72). Once "Not sent yet" is replaced, most likely by the "Still sending that one…" that a re-tap produces (app.js:1024), or by the `offline` toast, every later tap in the same outage starts its own watchdog that never speaks. A thumbs-up has no success toast at all, so it looks done and isn't.

### O6 · Minor · The clock can't be diagnosed
- `/api/status` throws away `tick()`'s result (api/status.js:10). That result is the only record of per-night `skipped` reasons, rules refusals and `empty-shelf` (lib/tick.js:24, 28-30). The cron's `/api/tick` returns it as a response body nobody keeps.
- Phone-side clock failures are a `console.warn` on someone's phone (app.js:139).
- Neither lock path records who locked (actions.js:185, lib/tick.js:25).

So when O1 happens ("I vetoed that!"), there's no way to tell whether the server or which phone locked it, or from what state. Fix: write a `lockedBy` field (`'server'` or the nameKey) next to `lockedAt`, and `console.log` tick's actions in `/api/status`.

### O7 · Minor · Serial round trips with no busy state on the two taps that matter
- **The name:** `getDoc`, then the create (actions.js:57-60), and only after that ack does the pending RSVP write start (app.js:1081-1089). That's 344 ms median and 848 ms worst on a *local* emulator. The first write of the session also pays for setting up the write stream.
- **Put it on the marquee:** `getDoc` on the night, then `getDoc` on the free mark, then the commit (actions.js:139-152). 657 ms locally.

In both cases the button gives no sign anything is happening (no disabled state, no "Saving…") until the ack or the 4-s watchdog. On a phone, each round trip is 100-300 ms plus radio wake-up (**GUESS**: confirm with Playwright network throttling against the emulator). The two host reads can at least run in parallel.

### O8 · Minor · Cold start is a module waterfall
Opening to the tour (no data needed) takes 1338 ms, and opening to the reveal (all listeners plus the people doc) takes 1341 ms. They're identical, so locally the floor is code load, not data. `app.js` statically imports 12 modules (app.js:5-16), including `firebase.js`, which pulls the Firestore SDK from gstatic (firebase.js:3-7). Nothing runs, the tour included, until the whole graph has loaded and parsed. **GUESS:** 3-5 s on a mid-range Android over 4G. Confirm with Playwright CPU throttling at 4× and a Fast-4G profile.

**GUESS:** if gstatic is unreachable, the import fails and *no* app code runs, so not even the "can't reach" message appears. Confirm by blocking `www.gstatic.com` and screenshotting.

### O9 · Minor · The reveal can turn over to an empty frame
The medium poster is an `eager` `<img>` (reveal.js:30), but `turn()` doesn't wait for it to load or decode (reveal.js:60-71). `posterFail` only catches errors, not slow loads (ui.js:29-34). On a slow line, the signature moment flips to a blank card with the title underneath. **GUESS** on how often. Confirm by adding a 3-s route delay on `images.metahub.space/**` and taking frames at the turn.

### O10 · Polish · News-card buttons claim success before the page acts
tour.js:117-126 flips a card's thumb, or prints "You're in ✓", on the click itself. It does this even when the app refused the tap ("Still sending that one…") or the write later failed. It also strips `data-action`, so the card can't retry.

### O11 · Polish · Unsent taps on Android
The "Leaving with something unsent asks first" guard is `beforeunload` (app.js:1034, 1054). **GUESS:** Chrome on Android doesn't fire it for a tab-switcher close or an OS discard. With a memory-only cache, the queued RSVP is gone, and the next open just shows no ticket without saying so. The storage limit is deliberate, so the honest fix is in the wording.

### O12 · Polish · Signed out means the tour and the reveal on every open
`S.toured` and `S.reelsSeen` live only in memory (app.js:32-33, 1114). The comment at app.js:686-688 says "once per phone while signed out", but it's once per page load.

### O13 · Polish · Swallowed listener errors
The `people` and `config/season` listeners pass `() => {}` as their error handler (app.js:89, 93). If `people` fails, a signed-in guest sits on "Warming up the projector…" forever. `knowsMe()` stays false (app.js:259, 263), and the 8-s unreachable timer checks only `ready()` (app.js:60).

### O14 · Polish · Function hygiene
`/api/tick` is `no-store` and unauthenticated (api/tick.js:10), so any caller costs reads. The Firestore REST calls have no timeout (lib/firestore-rest.js:37-41), so a Firestore stall holds `/api/status` (tick, then status, run serially) until Vercel kills it, and HA gets a 504 with no JSON. The e2e doesn't exercise `/api/*` at all. Whether unit tests do is outside my inputs.

## Protect this
Every guest write goes through one `once()`/`sending()` path that confirms only on the server's ack. The server clock is idempotent, guarded by `ifUpdateTime` preconditions. And the rules pin every stamp to `request.time` and allow only the diffs they name. Keep all three; O1 and O2 are the two places that path leaks.
