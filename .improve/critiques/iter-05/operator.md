# Operator critique, iter-05 (Priya)

Judged on 2026-10-14 from the listed inputs only: the scenario, the source files, `tests/e2e.py`, four empty `console.json` files and the timing table. No server functions, no Home Assistant config, no `index.html`, no `cinemeta.js`.

## First, what the evidence can and can't carry

- **The timings can't show a regression in either direction.** The emulator was holding about 15 GB. The same code swung from 433 to 712 ms on "I'm free" and from 833 to 995 ms on "Put it on the marquee" within one day. Previous against this release on name-to-ticket: 849/875 against 868/946, two runs each, overlapping apart from one outlier. Every number is localhost with no network throttling, so nothing here says how a phone on a weak signal behaves, and that's the case I care about.
- **An empty `console.json` doesn't prove the scenario passed.** The 200% walk catches everything and does nothing (`scenario.py:319-328`, `except Exception: pass`). A failed news walk only goes to the transcript (`scenario.py:356-357`). A dead 200% reveal would still produce `[]`.
- What the empty logs do tell me: in these runs no listener errored (`onErr` uses `console.error`, `app.js:84`) and nothing logged `clock` or `settings not saved` warnings (`app.js:64,144`). The Phone hook records warnings too (`scenario.py:197`).
- **What's never exercised anywhere:**
  - A connection that comes back after the page opened unreachable (`e2e.py:418-424` aborts Listen and never restores it).
  - A tab killed while a write is still unsent.
  - A phone locking a night right after waking.
  - Anything in `api/` or `lib/`.
  - Quota exhaustion.
  - A slow poster on the reveal.

## Step by step

| step | timing (median) | verdict | why |
|---|---|---|---|
| newcomer: open link to first card | 1348 | fragile | The tour opens at module evaluation (`app.js:1166`), so it needs the whole gstatic SDK graph first (`firebase.js:3-7`). That part is good: it doesn't wait for data. But if the page opened while the network was flaky, the data under it may never arrive (O1). |
| tour next ×4 | n/a | none | |
| tour done to reveal | n/a | fragile | Waits for `ready()` (`app.js:232`). Same stuck-load risk (O1). |
| turn the card | not in table | fragile (GUESS) | The flip doesn't wait for the medium poster (O15). |
| Count me in on the reveal to the name form | 41 | none | |
| name to her ticket | 843 | slow, confusing | Two serial server round trips with nothing visible changing (O12). If the read fails, the "Not sent yet" note promises something false (O4). |
| thumbs-up (button pressed) | 79 | fragile | "Pressed" is the local echo. No thumb is ever confirmed by the server unless it takes over 4 s (O3). |
| tap an open evening | n/a | none | |
| I'm free to server-confirmed toast | 712 | none | Honest: the toast only comes after the server has it (`app.js:1339-1344`). The spread is emulator noise. |
| Gma at 200% | n/a | can't judge | The scenario swallows its failures (O16). |
| regular: open link to the reveal | 1366 | fragile | Same as O1. O11 applies to a phone holding a name with no people doc behind it. |
| reveal to See my ticket | n/a | none | |
| news cards | n/a | Polish | Card buttons say they're done before anything ran (O18). |
| not-coming: Count me in on the reveal to her ticket | 62 | fragile | ADMIT ONE is printed about 650 ms before even the local emulator acknowledges the write (O3). |
| host: I can host to slip | n/a | none | |
| host: Put it on the marquee to confirmation | 995 | slow | Three serial round trips (O13). The confirmation is server-backed, which is good. A night hosted under a day out gets auto-locked by this phone from its own lists (O2). |

## The things I was told to look hard at

**How taps are confirmed, and the watchdog.** The shape is right.
- `once()` and `sending()` say "done" only after the server acknowledges (`app.js:1067-1105`).
- The watchdog watches the action rather than the write queue.
- `beforeunload` guards unsent taps.

There are three holes:
1. **The local echo prints success-shaped UI before the server has the write**: the ticket at 62 ms and the pressed thumb at 79 ms. The cache is memory-only by design, so that write exists only in this tab until it lands (O3).
2. **The note's promise is false for actions that read first** (O4). These are the name step, hosting, unmarking an evening, a veto, adding a movie and cancelling. The note says "It goes through when your connection is back". In fact the `getDoc` fails with `unavailable` around 10 s later, nothing is queued, and the person has to tap again. `e2e.py:401-416` proves this for the name step: the name fails, it is not queued.
3. **On the name step nothing moves for two round trips** (O12).

**What the page shows when it can't reach Firestore.** The board is honest for 8 s. After that the rest of the page tells lies:
- The calendar renders from empty lists: every evening says "Nobody has said they're free yet" and offers "I can host" (`app.js:740-792`, no `ready()` gate).
- The shelf header says "0 movies" (`app.js:843`, before the gate at 872).

Worse, "this page catches up by itself" (`app.js:270`) is false in two cases:
- When a core query is genuinely empty (O1).
- After any listener error, which ends that listener for good (O6).

**The reveal's readiness and endings.**
- Data readiness is careful: it waits for all five lists and, for someone with a name, their people doc (`app.js:232, 710, 722`).
- The poster isn't covered by that readiness (O15).
- The endings are complete:
  - Count me in, with or without a name.
  - Not this time.
  - Back before the turn, which keeps it face down with "Reveal the movie" (`app.js:548, 647`).
  - Back after the turn, which counts as seen.
- Two gaps:
  - Signed out, "once per phone" is false: nothing is stored, so it replays on every load (O14).
  - A phone holding a name with no people doc never gets a reveal and never gets the button (O11).

**The phone's lock (the movie lock run by a phone).** The 5 s wake delay (`app.js:122-128`) is a timer, not a freshness check. The transaction re-reads the night but checks only vetoes and theme (`actions.js:183-191`). Votes and free marks come from whatever this tab last heard. A network drop that never hid the tab never sets `wokeAt` at all. "Lock the movie now" first waits for this phone's pending writes (`app.js:1394`); the automatic clock doesn't (`app.js:140`). Nothing records who locked, or from what data (O2). The deadline itself is enforced only by each phone's own clock (O10).

**The server clock.**
- `lib/tick.js` is correct and properly conditional (`ifUpdateTime`, `tick.js:25,36`).
- `/api/status` throws away tick's report (`api/status.js:10`). A refused lock, an empty shelf or a lost race is never logged anywhere.
- There's no fetch timeout (`firestore-rest.js:38`), and tick blocks the status build. A hanging Firestore therefore becomes a Vercel timeout with no detail.
- With HA down, the only server clock is the daily cron (O9).

**The read budget.** About 5–12% of the 50k today (estimate below). Every read path grows with history, nothing is capped, and the cache is memory-only (O7). One possible poll isn't in my inputs at all (O8).

Today's estimate, from the code against the 2026-10-14 production counts:
- **Per page open, about 60 reads:** 36 movies, 10 seen, 3 votes, 3 people, 2 nights, about 1 free mark, 1 season doc, 2–4 night subcollection queries, and up to 12 past-review queries. Each empty query still costs 1 read.
- **Per HA poll, about 8–45 reads.** Planned and locked nights are read twice (tick, then status). Then all done nights, the free marks and the snacks. For a planned night, all votes too, plus all movies when it has a theme or vetoes.
- **Daily, about 0.4–2.3k from HA and about 3.6k from people** (a dozen people opening about 5 times a day). A tab coming back after 30+ minutes away is a full re-read, because nothing persists.

Every one of those collections grows with history.

## Findings

| id | problem | severity | evidence or GUESS |
|---|---|---|---|
| O1 | A phone that opens while flaky can stay on "Can't reach the box office… this page catches up by itself" for good. **Cause in the page:** `got()` drops the first empty cache snapshot (`app.js:55-58`). **Cause in the SDK:** listeners don't use `includeMetadataChanges` (`store.js:6,12,17`), so an unchanged empty answer from the server raises no new event. Any core query that is genuinely empty therefore never counts as loaded. The likeliest is free marks from 8 days back: production has 1 free mark in total. Only a reload gets out. | Major | Code: `app.js:52,55-58,60,270`; `store.js:16-18`. The SDK not re-raising is INFERRED from documented listener behavior. **Confirm:** no free marks in range, abort Listen for 12 s, unroute, then assert the board leaves "reach the box office" within 30 s. **Fix:** `includeMetadataChanges: true` on the five core listeners, and count a list as loaded on its first `fromCache: false` snapshot. |
| O2 | A phone can auto-lock the wrong movie from stale votes and free marks: after a wake longer than 5 s, after a reconnect that never hid the tab, or with its own unsent marks. The guard checks only vetoes and theme. The lock records no source (`lockedAt` only), and the server's report is discarded, so "why Alien?" can't be answered afterwards. | Major | `app.js:122-128,139-140`, `actions.js:183-191`, `app.js:1394` against `app.js:140`, `firestore.rules:219-221`, `api/status.js:10`. Frequency is a GUESS. **Confirm:** a test that sleeps a tab, adds a thumb from a second phone, wakes it after the lock time with Listen delayed 8 s, and compares the locked movie with `pickMovie` on server data. **Fix:** lock only when every core list has had a `fromCache: false` snapshot since the last wake or `online` (same metadata as O1), and `await sent()` as lock-now does. |
| O3 | ADMIT ONE and a pressed thumb are drawn from the local echo while the write exists only in this tab's memory. No warning appears for 4 s. On a weak signal, a person who taps and pockets the phone can have the tab discarded before the write lands; they saw a ticket and aren't on the list, so the pick and the count go ahead without them. | Major | Timings: ticket 62 ms and thumb 79 ms, against 712 ms for a server-confirmed toast. Code: `app.js:528-541` (no pending state), `app.js:1091` (4 s), `firebase.js:10` (default memory cache). That Android tab discard and swipe-close skip `beforeunload` (`app.js:1106`) is a GUESS. **Fix:** a "Saving your seat…" stub while `hasPendingWrites`, and the ticket number only once the server has it. |
| O4 | "Not sent yet. It goes through when your connection is back…" and the offline toast promise queueing. Actions that read first (name, host, unmark, veto, add movie, cancel) aren't queued: they fail with `unavailable` and need a fresh tap. | Minor | `app.js:1081,1201`; reads at `actions.js:57,82,125,139,144,169,209`; the name failing is shown in `e2e.py:401-416`. |
| O5 | Unreachable, the page below the board lies: an empty, fully tappable calendar ("Nobody has said they're free yet", "I can host" on an evening that's already hosted) and "0 movies". | Minor | `app.js:740-792` (no gate), `app.js:843` against the gate at 872; `e2e.py:423` checks only `#next`. |
| O6 | Listener errors are terminal and misdescribed. Quota exhaustion, the one hard limit that will eventually be hit, reads as "Lost the connection… Reload" and "Check your connection; this page catches up by itself". Open tabs stay dead after the daily reset once the 12 s toast is gone. A people-listener error is swallowed (`() => {}`), leaving a person with a name on "Warming up the projector…" forever. There's no client error reporting at all; the owner only sees HA's 502. | Minor | `app.js:60,84,89,93,270`; `ui.js:71`; `api/status.js:16`. |
| O7 | Every read path grows with history. Status reads every done night just to name the last one, plus all votes every 30 min for a planned night and all movies on themed or vetoed nights. Tick and status read planned and locked nights twice per poll. The calendar feed reads every done night to keep 30 days. The page listens to everything uncapped with a memory-only cache, and reads recent reviews twice. Today is roughly 5–12% of 50k. | Minor | `lib/status.js:12-14,64,71`; `lib/tick.js:11`; `lib/calendar.js:46,53`; `store.js:9-12`; `app.js:85-88,97-110,957-960`. The projection is a GUESS: at about 1,000 docs of history, HA alone is about 30k/day on a themed night, plus about 30k from 30 opens, which is over the limit. **Confirm:** the daily reads in the Firebase console, now and in a month. **Cheapest fix:** `orderBy startsAt desc, limit 1` for the last done night, and reuse tick's night reads in status. |
| O8 | HA polls `control/shield` straight from Firestore, at an interval not in my inputs. At 10 s that's 8,640 reads/day, 17% of the budget, before anyone opens the site. | Minor | GUESS, from `firestore.rules:66` ("Home Assistant polls this doc"). **Confirm:** HA's `scan_interval` for that sensor. |
| O9 | The server clock fails silently. Tick's actions (locked, skipped and why, empty shelf) are dropped by `/api/status`. A slow Firestore has no timeout and blocks the status build, so HA gets a bare timeout. With HA down, only the daily cron locks, which can be most of a day late unless a phone opens. | Minor | `api/status.js:10`; `firestore-rest.js:38`; `lib/tick.js:24,29`. **Fix:** log `result.actions` when it isn't empty and include it in the status JSON; use `AbortSignal.timeout` on fetch. |
| O10 | The lock deadline is enforced only by the phone's own clock. The rules allow planned to locked at any time, so a phone whose clock is wrong locks early on its own. | Polish | `firestore.rules:219-221`, `logic.js:187`, `app.js:129-140`. Name-only identity means the rule can't tell the host apart, but the automatic clock could check its skew against a server timestamp. |
| O11 | A phone holding a name with no people doc dead-ends. The reveal never plays (`S.me && !myDoc()`), no "Reveal the movie" button appears, the movie stays face down everywhere, and the news never walks. `savePrefs` can't create the doc and only warns. | Minor (would be a Blocker for anyone it hits) | `app.js:254,261,548,710,722,391`; `app.js:64`; `firestore.rules:80-81` against 85. The trigger is a GUESS: only a name saved before people docs existed, or one set by hand. Production has 3 people docs for about a dozen guests. **Fix:** if there's a name, people have loaded and there's no doc, call `A.join(S.me.name)` once. |
| O12 | On the name step, nothing visible happens for two serial server round trips (the read, then the acknowledged commit): 843 ms locally against 62 ms for the same Count me in once a name exists. On a phone it's 1–3 s of nothing, then "Still sending that one…" on the second tap. | Minor | `app.js:1108-1125`, `actions.js:54-66`, timings table. |
| O13 | "Put it on the marquee" makes three serial round trips, and the two reads don't depend on each other. It's the slowest step at 995 ms locally. | Polish | `actions.js:139,144,145`. |
| O14 | Signed out, the tour and the reveal replay on every load. "Once per phone" in the code comment and the scenario caption is false, because nothing is stored. A newcomer who opens the link twice before giving a name gets 5 tour cards twice. | Minor | `app.js:718-719` against `app.js:33,64,1166`; `ui.js:52-54`; `scenario.py:289`. |
| O15 | The reveal's readiness ignores the poster. The medium poster starts loading when the overlay opens, and the flip at 650 ms doesn't wait for it. On a slow phone it can flip onto a blank face. A medium 404 falls back to a text tile, not to the small poster the page already has. | Minor | GUESS: `reveal.js:9,32,64-75`; `ui.js:29-34`. **Confirm:** run the scenario with Fast-3G throttling and look at the turn frames. |
| O16 | The scenario hides failures (the 200% reveal and the news walk), and its timings can't support any regression claim. | Minor | `scenario.py:319-328,356-357`; 15 GB emulator; same-code spread 433→712 and 833→995 ms. |
| O17 | A Cinemeta hiccup while adding a movie is permanent. The fallback is the search row, or `{ name: imdbId }`, and movies can't be edited. The result is a shelf movie with no genres or runtime (invisible to themes), or titled "tt…". | Polish | `app.js:1506`, `firestore.rules:123`. |
| O18 | News-card buttons flip to "You're in ✓" or pressed before the page has acted, and stay that way if the write failed or `once()` refused it. | Polish | `tour.js:117-126`, `app.js:1068`. |

## Protect this

No success message appears until the server has the write (`once()` and `sending()`, `app.js:1067-1105`). The lock is guarded twice: a transaction on phones, and a write conditioned on the night's last update time on the server (`actions.js:183-192`, `lib/tick.js:25`). Both run under rules that hold no secret. Keep that, and build O1–O3 on the same honesty.
