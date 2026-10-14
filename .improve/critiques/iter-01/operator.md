# Operator critique, iter-01 (Priya)

Inputs: `.improve/scenario.py`, the listed `public/js`, `lib`, `api` files, `firestore.rules`, the four `console.json` logs (all `[]`) and the timing table. Nothing else was opened. Line numbers refer to the working tree as of 2026-10-14.

## Verdict

The happy path works, and the night lifecycle's concurrency is sound. Three things will hurt the real group. First, the read budget grows with history on every page open and every Home Assistant poll, and the database has no cap or cache to stop it. Second, a tap made on a dead connection looks saved and can disappear. Third, a signed-in phone with no `people` doc never gets its reveal. The scenario can't see any of these, and one of its five timings doesn't measure what its label says.

## Reads: what one open and one day cost

Every page load attaches listeners to the whole of `nights`, `movies`, `votes`, `seen` and `people`, plus `free` from yesterday on and `config/season` (app.js:78-84; store.js:8-12 says "No cap" on purpose). It adds two listeners for each followed night (the next night and every night finished in the last 7 days) (app.js:88-100). It also makes one one-shot `getDocs` per finished night, up to 12 (app.js:857-861). That last set double-reads the recent nights that are already subscribed, and each one costs at least 1 read even when the night has no reviews.

The cache is memory only (firebase.js:10). The "only `ps.me` in browser storage" rule also rules out `persistentLocalCache`. So every cold open, every reload, every Chrome tab discard and every return after 30+ minutes away re-reads everything.

| per cold open | scenario seed | this group a year in (assumed: 15 people, 120 movies, 600 thumbs, 250 seen, 45 nights, 30 upcoming free marks) |
|---|---|---|
| nights / movies / votes / seen / people | 3 / 7 / ~16 / ~7 / 6 | 45 / 120 / 600 / 250 / 15 |
| free (from yesterday), season | ~10, 1 | 30, 1 |
| snacks + reviews listeners, one-shot past reviews | ~5, 1 | ~10, ~48 |
| **total** | **~56** | **~1,120** |

**The HA poll is the bigger leak.** `/api/status` runs every 30 minutes, which is 48 times a day. Its CDN cache is `s-maxage=60` (api/status.js:12), which is useless against a 30-minute poll: every call misses. While the next night is still *planned*, which is most days, one call reads:

- planned and locked nights twice, once in `tick` and once in `buildStatus`;
- every finished night ever (lib/status.js:12);
- **every vote ever**, including votes on watched movies, which are never deleted (lib/status.js:64);
- every movie, if the night has a theme or a veto (lib/status.js:71).

A year in, that is about 650-770 reads per poll, or about **31k-37k reads a day from one sensor**. Once the night locks, a poll drops to about D+8 reads (D = finished nights).

**Break-even.** Let L be cold opens a day and V the total thumbs-ups. Assume movies ≈ V/5, seen ≈ V/2 and about 30 finished nights. Then a normal day with a planned night uses roughly

`48·(V+38) + L·(1.7V+145)`

reads. That reaches 50k at **V ≈ 400 with L = 36** (12 people, 3 opens each) and at **V ≈ 700 with L = 12**. So the whole site dies until 3 AM ET once the group passes roughly 400-700 thumbs-ups in total. That is about 35-60 per person, a shelf of about 80-150 movies. How close you are today is a GUESS. To confirm, count the docs in `votes`, `seen`, `movies` and `nights`, and read Firebase console › Usage for a day with a planned night.

**At 100× (about 1,200 people):**
- V is around 60k, so one page open costs about 100k reads: twice the daily budget, for one person.
- `/api/status` would page 200 × 300-doc pages of votes one after another (firestore-rest.js:46-54) inside a 10 s function. It times out, so server-side locking stops.
- Every `lastSeen` write (app.js:71, 368-370) fans out one read to every open tab.
- Phones would pull megabytes of votes just to draw a shelf.

## Step by step

**1. Newcomer: open link to first screen. 1347 ms median, 1348 worst. Slow, fragile.**
- The walkthrough needs no data, but it can't appear until the whole static ES-module graph has loaded and run (app.js:5-16). That graph includes the Firebase SDK, which comes from gstatic (firebase.js:3-7). So the "local" run still fetches the SDK over the real internet in a fresh context. 1.35 s with zero database latency is the floor, and a phone on 4G will be several times that. That gstatic dominates is INFERRED; a HAR would confirm it.
- No bundle, so the module tree takes several round trips before anything runs.
- One failed module fetch on a flaky network kills the whole graph: no retry, no message. GUESS: `index.html` wasn't in my inputs, so I can't see what is left on screen.
- This open costs about 56 reads on the seed and about 1,100 a year in, before she does anything.

**2. Newcomer: name entered to thumbs-up counted. 256 ms median, 380 worst. Fragile, and the number is meaningless.**
- Her first tap calls `requireMe`, which toasts "Put your name down first. Then that counts." (app.js:944).
- `toast()` only toggles a class, so the text stays in `#toast` after it fades (ui.js:62-71).
- The scenario's check reads `textContent` without checking visibility (scenario.py:231-233, 258). So "counts" is already true before `join()` makes its first round trip. The 256 ms is mostly Playwright's click.
- Even read as intended, the real success toast "Welcome, Gma. Your thumbs-up on X counts." fires right after `el.click()` (app.js:986-987), before the vote write has even been sent.
- On a dead or lie-fi connection she is told it counts while the write sits in a memory-only queue (O2).
- `join` itself is check-then-create (actions.js:54-67). The race of two phones joining the same new name is handled: the loser's set becomes an update, which the rules refuse, and the re-read finds the doc. Fine.
- In about 5 s, one newcomer writes her `people` doc four times: create, `toured`, carried `reels`, and `lastSeen` at 4 s (app.js:71-72, 969). Each write fans out to every open tab. That's harmless at 12 people.

**3. Newcomer: Count me in to confirmation. 621 ms median, 934 worst. Fragile.**
- This is the one honest timing: the toast waits for the server's acknowledgement (app.js:1178-1183).
- But the button flips to "You're in ✓" before that, through latency compensation on the `free` listener plus `render()` (app.js:1184).
- With no connection the acknowledgement never comes. A second tap is silently swallowed by the busy guard (app.js:956). The "you're offline" warning fires only on the browser's `offline` event (app.js:1042), and lie-fi never fires it.
- Android discarding the tab drops the queued write. Next day she isn't on the list, so she has no veto, no ticket, and her thumbs don't count toward the pick.
- 621 ms for one single-doc commit on localhost is also odd. The vote path, a read plus a commit, took 256 ms. GUESS: it waits behind her four queued `people` writes, which the SDK acknowledges in order, or it's emulator rules warm-up. Confirm with emulator request timestamps.

**4. Regular: open link to the reveal. 1381 ms median, 1670 worst. Slow, fragile.**
- Same module and SDK floor as step 1.
- The reveal needs `nights` plus your `people` doc, to know which reveals you've seen (app.js:628, 237). That part is good: it doesn't wait on votes.
- But if `ps.me` names someone whose `people` doc doesn't exist, the page never repairs it, and four things follow:
  - `maybeRevealMovie` and `maybeRevealTie` return early forever (app.js:618, 628);
  - `pendingShow` keeps the movie face down (app.js:237, 244), so the marquee and ticket say "The movie is…" for the whole night;
  - the news cards never open (app.js:351);
  - every prefs save is a set-merge, which on a missing doc becomes a *create* the rules refuse (rules:80-81), logged only as `console.warn` (app.js:57).

  No code path creates the doc except `join()`. Whether any phone is in this state is a GUESS. Candidates: phones from before the `people` doc existed (app.js:19-21 mentions older local-only versions), or a doc edited or removed in the console. To confirm, look for any `nameKey` on `votes`, `free` or `seen` with no `people/{key}`.

**5. Host: Put it on the marquee to confirmation. 415 ms median, 430 worst. None for the user, but the measurement is loose.**
- Two hosts on one evening is safe:
  - `hostNight` is read-then-set (actions.js:137-153), but the loser's `set` lands as an update that `nightChangeOk` refuses, and its RSVP is in the same batch, so nothing half-lands.
  - The loser does see "That didn't go through. Someone may have just changed it; try again." (ui.js:119) rather than "Hal is hosting". Only a retry tells him who.
- The step makes three serial round trips: read the night, read his free mark, commit. The listeners already hold both answers.
- The scenario's wait accepts any visible toast, *including the red error toast*, as "confirmation" (scenario.py:336-337).

## Races

- **Two phones locking a night.** Correct. `lockNight` is a transaction, `tick` writes with `ifUpdateTime` (actions.js:181-188; lib/tick.js:25), and the rules pin `lockedAt == request.time`. One gap: the pick is computed *outside* the transaction from the page's copy (app.js:124-126). The transaction re-reads the night but doesn't recompute, so a veto or theme change that lands in between is ignored. The server path is immune, because the changed `updateTime` fails its precondition.
- **A phone waking with stale state.** The clock runs on any snapshot and on the 30 s timer (app.js:53, 78, 1398). It acts on whatever `S` holds. `rows()` drops `metadata.fromCache` (store.js:2), and nothing checks freshness before a lock. A phone resuming a frozen tab after lock time can lock using days-old thumbs and RSVPs, if it beats HA's 30-minute tick. How often a resumed tab beats its listeners' catch-up is a GUESS. After an automatic lock the host can't undo it from the page: Unlock is hidden once `lockAt` has passed (app.js:155), even though the rules allow unlock until showtime (rules:222).
- **Two nights, same movie.** Each phone's `lockedNow` only covers its own pass (app.js:120-126). Two phones locking two different nights in the same moment can both pick the same movie. The server can't, because it adds each pick to `watched` before the next (lib/tick.js:26). This is rare.
- **A name joined twice.** The simultaneous-join race is handled (above). Someone who types an existing name exactly becomes that person, with no prompt (app.js:1014-1015). That's the deliberate name-only identity, noted not rated.
- **Reels lost update.** `reels` is rewritten from the local copy (app.js:599, 969), and `arrayUnion` isn't used. The worst case is a reveal that replays once.

## When things go wrong

- **Offline or lie-fi:** O2 above. The cause is a memory-only write queue, combined with an interface that shows success before the server acknowledges.
- **A rejected write:**
  - user actions show a red toast for 12 s (app.js:958; ui.js:70). Good.
  - Prefs saves (`lastSeen`, `toured`, `reels`) only `console.warn` (app.js:57), so a failing doc fails forever without anyone knowing.
- **Firestore quota exhausted:**
  - the listeners die with "Lost the connection to the box office. Reload to try again." (app.js:77). That's the wrong advice: a reload only re-fails.
  - The marquee then sits on "Warming up the projector…" (app.js:251-252).
  - The `people` and `season` listeners swallow their errors (app.js:82, 84).
- **Vercel or Firestore REST blips:**
  - `fetch` has no timeout or retry (firestore-rest.js:37-41), and `tick` and `buildStatus` run one after the other in one function (api/status.js:10-11). So one slow Firestore call can cost the whole 10 s budget (the Hobby limit is from memory, unverified).
  - One 5xx means HA gets a 502 and the sensor is unavailable for 30 minutes.
  - The only fallback clock is one cron a day. So with HA down and nobody opening the page, a lock can land up to a day late.
- **HA's own reads:** HA "polls" `control/shield` directly (rules:66). At HA's default 30 s interval that's 2,880 reads a day; at 5 s, 17,280; at about 1.7 s or faster, the whole budget. The interval is a GUESS; check HA's config.
- **Cinemeta:**
  - search and the browse tabs fall back properly (app.js:844, 1330).
  - "Surprise me" has no `catch`, so a Cinemeta failure leaves "Rummaging through the catalog…" on screen forever (app.js:1347-1349).
  - If the catalog lookup and the list both miss, a movie is added titled with its IMDb id (app.js:1330). Movies can never be edited (rules:123), so that junk card stays until someone removes it.
- **One bad doc:** `render()` has no guard (app.js:203-226). A single document with a legacy shape or a console edit throws inside the microtask and blanks every section for everyone, every 30 s. The rules prevent new bad docs; old ones are a GUESS.
- **Time zone:** day keys, the calendar, `watchFree`'s start day and a host's start time all use the *device's* time zone (logic.js:280-292; app.js:83, 376). A phone set to Pacific time that hosts "8 PM" creates an 11 PM Eastern night. The scenario pins New York (scenario.py:187), so this is never exercised.
- **Deletes:** `votes`, `seen` and `free` are deletable by anyone, as are non-house `movies` (rules:122, 136, 146, 158). That follows from the name-only trust model. But nothing in my inputs takes a backup, and Spark has no managed backup or point-in-time recovery. A stray script wipes the group's history for good, and there's no audit trail to see who did it.

## Diagnosability

You'd learn of every failure above from a text in the group chat:
- The browser has no error reporting at all; failures go to the console only (app.js:57, 77, 130, 958).
- `/api/status` throws away `tick`'s result (api/status.js:10).
- `tick` files every per-night failure as `skipped` with the comment "a phone got there first" (lib/tick.js:28-30, 38-40). A rules refusal, a 429 and a lost race look the same, and none of them reaches a log.
- The scenario's empty `console.json` files only prove the seeded happy path throws nothing.

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| O1 | Reads grow with history on every open and every HA poll, with no cap or cache. HA alone reads every vote ever, 48 times a day, while a night is planned. An ordinary day passes 50k at roughly 400-700 total thumbs-ups, and then the site is down for everyone until 3 AM ET. | Blocker (on a timer) | lib/status.js:12, 64, 71; api/status.js:12; app.js:78-84, 857-861; store.js:8-12; firebase.js:10. Arithmetic above; current proximity is a GUESS (check doc counts and Usage) |
| O2 | A tap on a dead or lie-fi connection looks saved and can vanish. The button flips before the server acknowledges, the newcomer is told "counts" before the vote is sent, a retap is silently ignored, the warning only fires on the `offline` event, and the queue is memory only. | Blocker | app.js:986-987, 1178-1184, 956, 1042; firebase.js:10 |
| O3 | A signed-in phone with no `people` doc never reveals the movie: "The movie is…" for the whole night, no news, and prefs writes refused forever. Nothing repairs it. | Blocker if any such phone exists (GUESS) | app.js:237, 244, 351, 618, 628, 57; rules:80-81. Confirm: nameKeys on votes/free/seen with no people doc |
| O4 | The scenario's timings mismatch their labels. "Name to thumbs-up counted" is satisfied by leftover toast text before `join` makes its first round trip; "host confirmation" accepts an error toast; the "local" run fetches the SDK from gstatic. | Minor | app.js:944; ui.js:62-71; scenario.py:231-233, 258, 336-337; firebase.js:3 |
| O5 | Failures can't be diagnosed. The browser has no error reporting, `tick`'s per-night failures are discarded or filed as "a phone got there first", two listeners swallow errors, and the quota error advises a pointless reload. | Minor | api/status.js:10; lib/tick.js:28-30, 38-40; app.js:57, 77, 82, 84, 130 |
| O6 | The phone clock locks from possibly stale page state: `fromCache` ignored, the pick computed outside the transaction. The host can't undo an automatic lock in the page after `lockAt`. | Minor | store.js:2; app.js:113-133, 155; actions.js:181-188; rules:222. Resume timing is a GUESS |
| O7 | The REST client has no timeout or retry and pages serially, with `tick` and `status` run one after the other. Today one blip blanks HA for 30 min; at 100× the status call times out and server-side locks stop. | Minor | firestore-rest.js:37-41, 46-54; api/status.js:10-11 |
| O8 | The device time zone sets day keys and start times, so an out-of-zone phone hosts at the wrong hour. | Minor | logic.js:280-292; app.js:83, 376; scenario.py:187 |
| O9 | HA's direct polling of `control/shield` is an unmetered read drain. | Minor (GUESS) | rules:66; actions.js:281. Confirm HA's polling interval |
| O10 | A Cinemeta hiccup strands "Surprise me" on "Rummaging…"; a failed lookup can add a permanent card titled with the IMDb id. | Minor | app.js:1330, 1347-1349; rules:123 |
| O11 | One malformed doc blanks the page for everyone, because `render()` has no guard. | Minor (GUESS trigger) | app.js:203-226 |
| O12 | World-deletable votes, free marks and seen marks, with no backup or audit trail in sight. | Minor (trust model is deliberate; missing backup is a GUESS) | rules:122, 136, 146, 158 |
| O13 | Hosting makes three serial round trips the listeners already answered; the losing host gets a vague error. | Polish | actions.js:139-145; ui.js:119 |

## Protect this

The night lifecycle's concurrency must survive any rework. Phone locks are transactions, server locks are guarded by `ifUpdateTime`, vetoes are single-key field-path writes, and the rules pin every stamp to `request.time`. So two phones, or a phone and the cron, can never disagree about a night.
