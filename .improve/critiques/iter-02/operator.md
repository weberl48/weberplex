# Operator critique, iteration 2 (Priya)

Inputs read: `.improve/scenario.py`, the listed `public/js/*`, `firestore.rules`, `lib/*`, `api/*`, `tests/e2e.py`, the four `console.json` files (all `[]`), and the timing table. Nothing else.

**Bottom line.** On a healthy connection the happy path holds. The rules make every night transition one-way. The lock is a transaction. The server clock uses an `updateTime` precondition. The toasts wait for the server's ack. The weak spots are around those strengths:

- The ticket and the buttons go ahead of the server, while only the toast waits for it.
- The unsent-tap watchdog misses every write that starts with a read.
- A dead connection at load is never named.
- A phone can lock the night with data it held in memory.
- When the server clock fails, it says "skipped" to nobody.

The empty `console.json` files show only that the happy path is clean. No step in the scenario is failure-shaped: no slow or dropped connection, no quota, no Cinemeta outage, no stale tab.

---

## Walkthrough, step by step

### 1. Newcomer: open link to first screen: 1359 ms median (1471 worst). **Slow, fragile.**
The walkthrough needs no data. Even so, it opens from `app.js:1040`, inside a module that statically imports `firebase.js`, and `firebase.js` pulls `firebase-app.js` and `firebase-firestore.js` from gstatic (`firebase.js:3-7`, `app.js:5`). On localhost the first screen still takes 1.36 s. That's consistent with most of that time going to Google's CDN (GUESS; a network waterfall in the scenario would confirm). On a phone network it will be several seconds. If the CDN stalls or fails, the module graph never evaluates. The page then shows no tour, no name form and no error. → O11

### 2. Newcomer: walkthrough, then the reveal (signed out). **Fragile (O3).**
The reveal waits for `ready()` (`app.js:52`, `218-221`), so the timing is right. Opening on a dead connection, though, is never named:

- `store.js:2` throws away snapshot metadata (`fromCache`, `hasPendingWrites`).
- `got()` marks a list loaded on its first snapshot, whatever that snapshot is (`app.js:53`).
- The `offline` handler fires only on a transition (`app.js:1075`), so a phone that was already offline, or on lie-fi, gets no message.

One of two things then happens, and both are silent:

- If the SDK raises its empty from-cache snapshot once it decides it's offline (I believe it does: GUESS), the page goes `ready()` with empty lists. The marquee says "No night planned" (`app.js:256-259`) and the shelf says "The shelf is empty. Add the first movie." (`app.js:790`).
- If it doesn't, the marquee stays on "Warming up the projector…" for good (`app.js:254-255`).

To confirm: route-abort `**/google.firestore.v1.Firestore/Listen/**` before `goto`, then screenshot after 15 s.

### 3. Newcomer: thumbs-up, name form, thumbs-up counted: "378 ms". **Measurement is wrong (O10). The flow itself is the best-guarded one on the site.**
`scenario.py:278` waits for the toast to contain `Welcome, Gma.`. `join()` shows exactly that toast at `app.js:1005`, as soon as the people doc is created. That's before the pending thumbs-up is even clicked (`app.js:1013-1018`). The server-confirmed "Welcome, Gma. Your thumbs-up on X counts." comes later (`app.js:1020`). So the 378 ms is "name to person created", not "name to thumbs-up confirmed".

The thumbs-up itself goes through `once()`. It's queued synchronously, so the watchdog covers it, and e2e covers it with the Write channel aborted (`e2e.py:324-341`). One flaw: `sent()` also resolves when the write is *rejected* (a rejected write is no longer pending). If the vote is refused, for example because the movie was removed a moment earlier, the "Welcome… counts" toast can land after the error toast and replace it (`app.js:1020` vs `app.js:972`). That's rare; it's in the notes, not the table.

### 4. Newcomer: Count me in from the day panel: 327 ms median, 888 worst. **Fragile (O1).**
The toast is honest: it waits for the commit (`app.js:1211-1216`). The page is not. `render()` runs straight away (`app.js:1217`), and the free listener fires on the local write. The button becomes "You're in ✓" (`app.js:385-388`), and the ADMIT ONE ticket appears in Up next (`app.js:484-497`) before the server has anything. The 888 ms worst case on a *local* emulator shows how wide that gap gets even with no real network.

### 5. Regular: open link to the reveal: 1401 ms median. **Slow-ish; dead-ends for one class of phone (O6).**
The reveal waits for nights, movies, votes, seen and free, plus your people doc (`app.js:642`). When `ps.me` is set but `people/{nameKey}` doesn't exist, it never plays:

- `maybeRevealMovie` and `maybeRevealTie` both return early on `S.me && !myDoc()` (`app.js:632`, `642`).
- `pendingShow` still reports the reveal as owed (`app.js:240-241`), so `faceDown` keeps the marquee, the ticket and the day panel on "The movie is…" (`app.js:247`, `270`, `483`, `700`) until showtime (`app.js:236`).
- Nothing on the page explains it, and the only way out is "Not you?" followed by joining again.

Whether any production phone is in this state is a **GUESS**. Production has 3 people docs for a group of "about a dozen". To confirm with a read-only check, list the `nameKey`s on the 10 seen marks, 3 thumbs-ups and 1 free mark, and see whether any has no `people/` doc. The people listener's error handler is also a no-op (`app.js:82`). If that listener dies, named users get "Warming up the projector…" for good and no toast.

### 6. Regular: See my ticket, then the news cards. **None.**
`landOnTicket` polls for 3 s (`app.js:618-624`), and the news cards back off while the reveal is open (`app.js:357-363`). Both are fine.

### 7. Not coming: Count me in on the reveal, then her ticket: 61 ms. **Fragile, confusing (O1).**
That 61 ms is the tell. Compare it with step 4's 327 ms toast, which waits for the server. Whatever the emulator's real ack time, nothing in the code waits for it:

1. `play()` calls `once(setFree)` (`app.js:610`) and then `render()`.
2. `landOnTicket` focuses a ticket built from the pending local write (`app.js:613`).

So the reveal's new ending lands her on "ADMIT ONE", with a ticket number, whether or not the server has her. If the connection is up but carrying nothing, the only correction is the sticky "Not sent yet" toast, 4 s later (`app.js:983`). Someone who just got her ticket is likely to have pocketed the phone by then. The other guard is `beforeunload` (`app.js:991`). Android Chrome generally doesn't prompt when a tab is swiped away or discarded in the background, so on this group's phones that guard does little (GUESS on platform behaviour). Firestore's cache is memory-only, so a discarded tab loses the RSVP.

### 8. Host: I can host, the slip, Put it on the marquee: 727 ms median. **Slow (O7).**
`hostNight` makes three serial round trips: `getDoc(night)`, `getDoc(free)`, then the commit (`actions.js:137-153`). That's 2.2× a single write on localhost, and roughly 1-2 s on a phone. Throughout, the slip's button looks exactly as it did before the tap: no busy state, no label change. The only feedback is "Still sending that one…" on a second tap (`app.js:970`).

The `getDoc(free)` is redundant: the page already holds today's and later free marks (`app.js:83`). Hosting also falls outside the watchdog (O2), because its first await is a read. In practice it fails loudly instead: offline, a `getDoc` of a night that doesn't exist yet rejects with `unavailable`, and the page shows "You look offline" (inferred from the SDK).

### 9. The lock (seeded already locked; not driven by the scenario). **Fragile (O4, O5).**
The good part: two phones can't lock different movies (transaction, `actions.js:181-188`), and the server can't overwrite a phone's lock (`ifUpdateTime`, `lib/tick.js:25`).

What isn't protected:
- **The pick's inputs.** The phone computes the pick from what the page holds in memory (`app.js:124-125`), and the transaction re-checks only `status` (`actions.js:184`). → O4
- **Undoing a bad lock.** After `lockAt`, the host has no Unlock: it's shown only before lock time (`app.js:155`), although the rules allow it until showtime (`firestore.rules:222`). A bad lock stays.
- **Seeing a server failure.** If the server clock fails, nobody can tell. → O5
- **Retrying.** A lock that keeps failing in the browser is retried on every snapshot and every 30 s, with no backoff. Each attempt costs a transaction read, and the only record is a `console.warn` (`app.js:115-116`, `130`, `1442`). Example trigger: a legacy movie doc missing one of the 8 `lockedMovie` fields makes `tx.update` throw on `undefined` (GUESS that such docs exist). It's cheap at this scale, so it's in the notes, not the table.

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| O1 | The ticket, "You're in ✓" and the thumbs-up count all show before the server has the tap. Only the toast waits for the server. The reveal's Count me in ending drops her straight onto an ADMIT ONE ticket that may not exist server-side. On lie-fi, the only correction is a toast 4 s later, and Android rarely honours `beforeunload`. A discarded tab loses the RSVP (memory-only cache). | **Major** | 61 ms reveal-to-ticket vs 327 ms Count-me-in-to-confirmed-toast. No step waits for the ack: `store.js:2` drops `hasPendingWrites`; ticket from `S.free` (`app.js:484-497`); `app.js:610-613`; `app.js:983`, `991`. Android `beforeunload`: GUESS |
| O2 | The "Not sent yet" watchdog never arms for writes that start with a read. `once()` calls `sending()` (which calls `waitForPendingWrites`) before such a write is queued, so it resolves at once and leaves `unsent` at 0. Dropping out of a night, veto and undo-veto change the page with no toast and no warning. They also get no `beforeunload` guard. If the tab closes before the write lands, the drop-out or veto is lost while the page showed it as done. | **Major** | `app.js:972`; reads before writes at `actions.js:124-127` (drop-out) and `actions.js:169-175` (veto); `firebase.js:16-18`. To confirm: in `honest_sending_checks`, abort Write and drop out of a night. Prediction: no "Not sent yet", no "off the list" toast, and the button flips anyway. |
| O3 | Opening the link on a dead or lie-fi connection is never named. Either the marquee stays on "Warming up…" for good, or empty from-cache snapshots mark every list loaded and the page says "No night planned" and "The shelf is empty. Add the first movie." | **Major** | `store.js:2` (drops `fromCache`), `app.js:53`, `256-259`, `790`, `1075` (fires only on a transition). Which of the two outcomes: GUESS. Confirm by aborting the Listen channel before `goto`. |
| O4 | A phone can lock the night with stale data. The pick comes from page memory (votes, free marks, vetoes, theme), and the transaction checks only `status`. A tab resumed after `lockAt`, before its listeners catch up, can lock a movie someone just vetoed. After `lockAt`, the UI offers no Unlock, so the host can't fix it. The server path reads fresh data and doesn't have this problem. | **Major** (how often the window opens: GUESS) | `app.js:121-126`; `actions.js:181-188`; Unlock hidden after `lockAt` at `app.js:155`, though `firestore.rules:222` allows it until showtime. Confirm: freeze a page (CDP `Page.setWebLifecycleState`), veto from a second phone, move the clock past `lockAt`, then resume. |
| O5 | Server-clock failures are invisible. Every per-night error in `tick` is recorded as `skipped`, on the assumption that "a phone got there first". `/api/status` throws tick's result away, `/api/tick` answers 200, and nothing is logged. A lock refused for a real reason (rules drift, quota, bad data) looks exactly like a lock a phone already made. | **Major** | `lib/tick.js:28-29`, `38-39`; `api/status.js:10`; `api/tick.js:11` |
| O6 | A phone with a name saved but no `people/{key}` doc never gets its reveal. Its movie stays face down everywhere until showtime, with no explanation. The people listener also fails silently. | **Major**; **Blocker** if such a phone exists | Code path: `app.js:632`, `642`, `240-241`, `247`, `270`, `483`, `82`. Existence: GUESS. Confirm read-only: production has 3 people docs; check whether any `nameKey` on the 10 seen, 3 thumbs or 1 free mark lacks a `people` doc. |
| O7 | Hosting takes three serial round trips with no busy state. One of the reads is redundant. | **Minor** | 727 ms vs 327 ms for one write on localhost; `actions.js:139`, `144`, `145`; `app.js:1237-1243` |
| O8 | A duplicate create is refused as an "update" for free marks, thumbs-ups and seen marks. Ways to hit it: a lost-ack resend, a second phone, or the reveal invite after counting in elsewhere. The page then says "That didn't go through… try again" about something that did go through, and a re-tap on a thumb takes the thumb back off. | **Minor** (SDK resend on a lost ack: GUESS) | `firestore.rules:137`, `147`, `159`; `ui.js:117-121`; toggle at `app.js:1294` |
| O9 | Listener failures are misdiagnosed and never recovered. A quota or permission failure says "Lost the connection… Reload" (a reload doesn't help until the daily reset). A failed listener is never re-attached, so the page shows frozen data once the 12 s toast fades. The people, season, snack and review listeners fail silently. Client errors never leave the phone, so an operator can't diagnose anything from logs. | **Minor** | `app.js:77`, `82`, `84`, `99`; `ui.js:125` |
| O10 | The scenario's "name entered to thumbs-up confirmed by the server" stops at the join's "Welcome, Gma." toast, before the thumbs-up is even sent. The loop is grading the wrong thing. | **Minor** | `scenario.py:278`; `app.js:1005` vs `app.js:1013-1020` |
| O11 | The first screen depends on Google's CDN. The walkthrough needs no data but waits on two gstatic modules, and a failed or stalled fetch leaves a dead page with no message. | **Minor** | 1359 ms first screen on localhost; `firebase.js:3-7`; `app.js:5`, `1040`. Share of time spent on the CDN: GUESS |
| O12 | Reads grow with history forever. Every open reads every movie, thumbs-up, seen mark, person and night (no cap, memory-only cache, a full re-read after more than 30 min in the background). The 30-minute Home Assistant poll reads all finished nights and all thumbs-ups, plus all movies on themed or vetoed nights. Estimate from production counts: about 60 reads per open today, so about 800 opens a day before the 50k limit. Fine today, never bounded. | **Minor** | `store.js:8-11` ("No cap"); `app.js:78-84`; `lib/status.js:12`, `64`, `71`; `lib/tick.js:11` (arithmetic estimate) |

Not in the table: the browser clock retries a failing lock with no backoff (step 9), and a rejected thumbs-up can still get the "counts" toast (step 3). Both are real, and both are cheap at this scale.

**Test coverage.** `e2e.py` covers honest sending only for a thumbs-up with the Write channel aborted (`324-341`), the reveal invite on a healthy connection (`344-367`), and the host's manual "Lock the movie now". It covers none of these:
- a drop-out or veto that isn't sent
- the ticket appearing before the ack
- opening on a dead connection
- the automatic lock, or a stale tab locking
- `/api/tick` and `/api/status`
- a saved name with no people doc

**Protect this:** rules that make every night transition one-way and conflict-safe (transaction lock, tick's `updateTime` precondition, marks that can only be created, never overwritten), and toasts that speak only after the server has acked.
