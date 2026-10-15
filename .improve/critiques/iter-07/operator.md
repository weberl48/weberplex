# Operator critique, iteration 7 (Priya)

Written 2026-10-14. Judged only from the listed inputs: the scenario, the 20 source files, `tests/e2e.py`, the four empty `console.json` logs, and the timing table in the brief. Line numbers refer to the files as they were read on that date.

## Verdict

There are no Blockers. The write path is careful. A tap only counts once the server has it, the "Not sent yet" note doesn't rely on `navigator.onLine`, the clock won't lock a night from this phone's cached copy, and both the phone and the server lock with conditional writes. All four console logs are empty, so the scenario walk produced no page errors and no `clock`/`settings not saved` warnings.

The weak spots are at the edges:
- **Reads grow with history.** Every read scales with the size of the whole history, not with what's on screen. The HA poll pays that cost 48 times a day even when nobody is looking.
- **Some failures get the wrong message.** A refused read is reported as "check your connection". The "Not sent yet" note promises delivery for taps that can't deliver themselves.
- **Some dependencies have no fallback.** The SDK is loaded from gstatic, the catalog comes from Cinemeta, and the server functions make Firestore REST calls with no timeout.

## Step by step

| step | median / worst (ms) | label | why |
|---|---|---|---|
| newcomer: open link to the curtain gone | 2640 / 2643 | **slow**, fragile | About 1300 ms of this is the curtain's own removal timer (`app.js:78`), so the curtain started parting at about 1340 ms. Readiness needs five lists from the server on a cold, memory-only cache (`app.js:53`, `app.js:284`). On a real phone network that can pass the 2.5 s cap (`app.js:80`). The curtain then parts onto "Warming up the projector…", and the reveal mounts afterwards over the lit page (`app.js:795`). Whether that happens on real networks is a **GUESS** (see the confirm note under O1). |
| newcomer: Count me in on the reveal to the name form | 34 / 49 | none | `play()` hands straight to `requireMe` on the next tick (`app.js:719-722`). |
| newcomer: name to her ticket | 849 / 857 | **slow**, fragile | Two sequential round trips happen before anything paints: `getDoc` (`actions.js:57`), then the create commit (`actions.js:60`). Only after that do the pending tap and the free write run (`app.js:1208-1220`). On a stalled connection the 4 s note says the name "goes through when your connection is back", but a failed read never goes through by itself (O5). |
| newcomer: thumbs-up (button pressed) | 73 / 80 | none | The local write shows at once. The server's answer is silent unless it takes more than 4 s (`app.js:1165`). |
| newcomer: I'm free that evening to server-confirmed toast | 887 / 979 | slow, not attributable | `setFree(…, true)` is one batched write with no reads (`actions.js:121-133`). On a 16 GB emulator this number measures the box, not the code. |
| regular: open link to the reveal mounted | 1298 / 1312 | fragile (**GUESS** on a real network) | The reveal waits for the people doc plus five server lists (`app.js:278-281`, `app.js:792`). All of them come over a cold connection on every visit. |
| regular: open link to the curtain gone | 2597 / 2621 | **slow** | 2597 − 1298 = 1299: the gap is exactly the curtain's fixed 1300 ms (`app.js:78`), and every visit pays it. |
| not-coming: Count me in on the reveal to her ticket | 52 / 53 | none | The local write is shown first and the toast follows the server (`app.js:717`). |
| host: Put it on the marquee to confirmation | 1212 / 1427 | **slow**, fragile | Three sequential round trips: night read (`actions.js:139`), free read (`actions.js:144`), then the commit. Offline, the reads fail even though the note promised delivery (O5). |

Steps without a timing:
- **Reveal turn.** Fixed at 650 ms to the title (`reveal.js:86`). The medium poster is fetched only when the overlay mounts (`reveal.js:36`). That the card can turn onto an empty face on a slow link is a **GUESS**, not observed.
- **How it works and the news cards.** Nothing to flag. The logs are clean.

## Findings

### O1 — Major (a trend, not today's numbers). Every open re-reads the whole history.

The phone listens to entire collections:
- all nights, with the comment "No cap" (`store.js:13-16`)
- every movie, thumbs-up, seen mark and person (`app.js:112-115`)
- up to 12 past nights' reviews, fetched with `getDocs` on every open (`app.js:1031-1035`)

The cache is memory-only (an operating fact), so every open is a full re-read.

Two Firebase billing rules make this worse. These come from Firebase's docs, not from anything in these inputs:
- A listener that has been disconnected for more than 30 minutes is billed as a brand-new query. Every unlock of a phone that has the tab open counts as a full open.
- An empty query still costs one read.

**Today's numbers:**
- About 2 + 36 + 3 + 10 + 3 + ~1 + 1 season + ~4 sub-collections + ~1 past review ≈ **60 reads per open**.
- That leaves about 800 opens a day of headroom. Fine.

**A plausible year out** (an assumption, not data): about 54 nights, 110 movies, 150 thumbs-ups, 60 seen marks and 12 people.
- That is roughly **420 reads per open**.
- With O3's poll on top, the headroom is about 90 opens a day.
- A dozen people on movie day, counting the resumes, can get there.

Spark's limit then takes the site down for everyone until the daily reset, which by Firebase's docs comes around midnight Pacific (about 3 AM in New York). Nothing in the page ages history out of the reads.

### O2 — Major (**GUESS**). If the Firebase SDK doesn't load from gstatic, the page dies silently behind a closed curtain.

`firebase.js:3-7` imports the SDK from `www.gstatic.com` at module top level, and `app.js:5` imports `firebase.js`. The curtain is opened only by `app.js` (`app.js:72-80`), and it "takes the taps" while closed. One failed module fetch on a flaky phone network means `app.js` never runs: no curtain opening, no message, no retry.

**To confirm:** block `**/www.gstatic.com/**` in Playwright and screenshot at 10 s. Also check `index.html` and `site.css` for a curtain fallback that doesn't need JavaScript. Neither file was in my inputs.

### O3 — Minor (the cheapest fix for O1). The HA poll pays for history 48 times a day while nobody is looking.

`/api/status` runs `tick()` first, which queries planned and locked nights (`tick.js:11`). `buildStatus` then queries planned and locked again, plus **every finished night ever** (`status.js:12`), just to find the last one. While a night is planned it also reads **every thumbs-up** (`status.js:64`), and every movie if the night has a theme or vetoes (`status.js:70-72`).

- Today that is about 11 reads a poll, or about 530 a day (about 2.2k with a theme).
- At the year-out sizes in O1 it is about 10–15k a day, before any human opens the page.
- The CDN's `s-maxage=60` (`api/status.js:12`) never helps a 30-minute poll.

### O4 — Minor. A refused read is reported as a bad connection, and a dead listener is promised to recover.

Any listener error gives the toast "Lost the connection to the box office. Reload to try again." (`app.js:110`). Errors on the people and season listeners are swallowed entirely (`app.js:115`, `app.js:119`). If any list never loaded, the board says after 8 s: "Check your connection; this page catches up by itself" (`app.js:63`, `app.js:320`).

Firebase's documented behaviour is that a listener gets no more events after an error. So after a quota error or a rules mistake:
- "catches up by itself" is false
- "check your connection" is the wrong diagnosis
- "reload" does nothing until the reset

There is also an edge case: a signed-in phone whose people listener alone dies sits on "Warming up the projector…" forever. `knowsMe()` stays false (`app.js:314`, `app.js:318`), and `unreachable` only fires when the lists aren't ready (`app.js:63`).

The only signal the operator gets is HA: `/api/status` returns HTTP 502 with `state: 'error'` and Firestore's message in the body (`api/status.js:16`). The group gets nothing they can act on.

### O5 — Minor. "Not sent yet" promises delivery for taps that read first.

The note (`app.js:1155`) says "It goes through when your connection is back". That only holds for pure writes. These actions read before they write:

| action | read |
|---|---|
| join (the name step) | `actions.js:57` |
| dropping out | `actions.js:125` |
| hosting | `actions.js:139`, `actions.js:144` |
| adding a movie | `actions.js:82` |
| veto | `actions.js:169` |
| cancel | `actions.js:209` |
| lock and finish (transactions) | `actions.js:185`, `actions.js:199` |

On a stalled connection those reads fail and the tap is dropped. The SDK gives up after a timeout of about 10 s (from my knowledge of the SDK, not observed here). The note then flips to "You look offline. Try again in a moment." (`ui.js:122`), so the user is told two contradictory things within seconds. The repo's own test expects the name step to end in an error when Firestore is fully blocked, waiting up to 30 s for it (`e2e.py:413-428`).

The watchdog tests block only `Firestore/Write` (`e2e.py:360`, `e2e.py:386`, `e2e.py:403`). The reads still pass in those tests, so they only check the case where the promise is true.

### O6 — Minor. The calendar is live before anything has loaded.

`render()` paints the calendar on every pass (`app.js:287`), and `renderCalendar` never checks `ready()` (`app.js:814-866`). Up next and the shelf do check it (`app.js:510`, `app.js:946`). On a slow open after the 2.5 s curtain, or offline, the calendar shows a month where nobody is free and nobody is hosting, with "I'm free" and "I can host" live.

- **Signed in:** "I'm free" on a day she is already free sends a `set` on an existing doc. Rules refuse updates to free marks (`firestore.rules:159`), so it comes back as "Someone may have just changed it" (`ui.js:120`).
- **Signed out:** the name form that `requireMe` raises (`app.js:1117-1118`) is hidden again by the next render while the lists aren't ready (`app.js:356-357`).

### O7 — Minor. One phone with a fast clock locks the night early for everyone.

The planned-to-locked rule has no time condition (`firestore.rules:219-221`), and phones decide `lockDue` from their own `Date.now()` (`app.js:160`, `app.js:172-175`, `logic.js:187`). The repo's own test relies on this: a phone 8 h fast locks a night whose deadline is 6 h away (`e2e.py:688-715`).

When that happens, late thumbs-ups, RSVPs and vetoes stop counting. "Unlock and re-pick" gets re-locked at once by the same phone (the comment at `app.js:208`). Android's automatic network time makes this rare, but nothing in the rules backs it up.

### O8 — Minor. Server clock failures are invisible, and server calls have no deadline.

- `/api/status` throws away the result of `tick()` and logs only a total failure (`api/status.js:10`).
- Per-night lock and file failures exist only in the returned `actions` list (`tick.js:28-29`, `tick.js:38-39`). On the cron path that response is seen by nobody (`api/tick.js:9-11`).
- `firestore-rest.js:37-38` calls `fetch` with no timeout. A Firestore REST call that hangs runs into Vercel's limit (10 s on Hobby, from memory, unverified) and returns a 504.
- That also breaks `preview.js`'s promise that it "never fails a share" (`api/preview.js:2-3`): its catch handles a thrown error, not a hang.

### O9 — Minor (**GUESS**). A woken phone may lock from stale thumbs-ups and RSVPs.

After `visibilitychange`, the clock waits a flat 5 s (`app.js:153-159`). The lock's precondition compares only the night's vetoes and theme (`actions.js:188`); it doesn't re-check the votes or free marks the pick was made from. If the stream reconnects slower than 5 s without the SDK flagging the lists as cached, the pick uses old thumbs and attendees. The test covers only an aborted Listen stream (`e2e.py:572-609`).

**To confirm:** delay the Listen stream (rather than abort it) for 10 s after waking, past the deadline, with a thumbs-up written on the server in between, and see which movie locks.

### O10 — Minor. Signed out, the reveal (or How it works) replays on every visit.

The comment promises the reveal "once per phone while signed out" (`app.js:788-789`). In fact the seen set is in memory only (`app.js:34`). The seen key is `|…` for nobody (`app.js:697`), and `savePrefs` does nothing without a name (`app.js:90`, `app.js:708`). With no reveal owed, `tourDue` is set on every signed-out load (`app.js:1246`), because `ps.toured` is deleted on load (`ui.js:53`).

So the signature moment plays every visit until she gives a name. That follows from the storage limit, but the code claims otherwise.

### O11 — Polish. The name step and hosting pay for round trips they don't need.

`join` reads `people/{key}` before creating it (`actions.js:57`). The live `S.people` list already knows whether the name exists, and the catch at `actions.js:61-62` already handles the race. `hostNight` awaits two independent reads one after the other (`actions.js:139`, `actions.js:144`).

These are the two slowest write steps in the table: 849 ms, and 1212 / 1427 ms.

### O12 — Polish. On a slow link the ticket lands late, with a jump.

After the name step, focusing and scrolling to the ticket waits for the server to confirm the free write (`app.js:1218-1220`). The ticket itself paints locally at once. On a slow link the page jumps to it seconds later, possibly after she has scrolled away.

### O13 — Minor (**GUESS**). "Surprise me" has no error handling.

`surprise()` awaits `topMovies()` with no `try`/`catch` (`app.js:1602-1608`). If Cinemeta rejects, the message stays on "Rummaging through the catalog…" and the rejection is unhandled. The Add path, `pick()`, has no visible deadline on `movieMeta` (`app.js:1586`). Meanwhile, after 4 s, the `once()` note blames "your connection" for what is really Cinemeta being slow.

**To confirm:** read `public/js/cinemeta.js` (not in my inputs) for timeouts and error handling, or block `v3-cinemeta.strem.io` and tap Surprise me.

## Read budget arithmetic (2026-10-14 production counts)

| reader | reads each time | how often | per day |
|---|---|---|---|
| phone open or resume after 30+ min | about 60 (nights 2, movies 36, votes 3, seen 10, people 3, free about 1, season 1, sub-collections about 4, past reviews about 1) | each open | about 60 × opens |
| HA poll (tick plus status, planned night, no theme) | about 11 | 48 | about 530 |
| HA poll with a theme or a veto | about 47 | 48 | about 2.2k |
| calendar feed | all nights plus free marks | at most every 15 min (CDN) | small |
| link preview | same as status | on each share, 5 min CDN cache | small |

Each table's term grows linearly and is never trimmed. The year-out sizes in O1 are an assumption; the formula isn't.

## What the tests do and don't cover

**Covered (by `e2e.py`):**
- the note while writes are held (360–391)
- a name failing when Firestore is fully blocked (413–428)
- opening with Listen blocked, and catching up afterwards (430–436, 629–653)
- no lock from cached lists (572–609)
- a slow lock still showing the reveal before the news (684–715)

**Not covered:**
- read-first actions on a stalled (not aborted) connection (O5)
- any listener error path, such as quota or permission-denied (O4)
- gstatic or Cinemeta failures (O2, O13)
- all four server functions (O3, O8)
- real latency; the scenario says it can't observe it

## Protect this

The clock never acts on anything but the server's answer, and it never double-locks. Three things make that true:
- the cached-list and unsent-tap gate (`app.js:165`)
- `got()` refusing to call an empty cached list "loaded" (`app.js:56-61`)
- conditional writes on both deciders: the phone's transaction (`actions.js:183-191`) and the server's `ifUpdateTime` (`tick.js:25`)
