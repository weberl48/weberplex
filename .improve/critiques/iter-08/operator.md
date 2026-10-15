# Operator critique, iteration 8 (Priya)

Judged only from the listed inputs: scenario.py, the public/js sources, firestore.rules, lib/, api/, tests/e2e.py, the four console.json files and the timing table in the brief. Anything I could not see is labeled GUESS, with what would confirm it.

## What the evidence shows before I start

- **The logs aren't empty.** The brief says they are. Every run (s1-1, s1-2, s1-3, s2) logs the same warning for `jo`: "Allow attribute will take precedence over 'allowfullscreen'". It comes from screen.js:40-41, which sets both `allow="…fullscreen"` and `allowfullscreen`. The useful part is what's missing: no `clock` warnings (app.js:184), no `settings not saved` (app.js:95), no listener errors (app.js:115), no pageerror and no scenario-failure. The happy path ran clean.
- **The open timing isn't purely local.** firebase.js:3-7 imports the SDK from www.gstatic.com, scenario.py never routes it, and each `Phone` is a fresh context with no shared HTTP cache. So "open link to the curtain gone" includes a real CDN download on every run.
- **About half of the open step is a fixed animation.** The curtain is removed 1300 ms after it starts opening (app.js:83), and it starts opening as soon as the lists are in (app.js:293). A 2606–2622 ms spread means the data was ready at about 1.3 s and the remaining ~1.3 s is the curtain itself.
- **The host step shows no regression.** Over four alternating A/B pairs, the previous release averaged 1722 ms (range 151 ms) and this code 1780 ms (range 369 ms). The 58 ms difference is well inside the noise, so it can't be blamed on this code. What does matter is the structure behind it (O6).

## Walkthrough, step by step

### Gma, newcomer (signed out, 360 px)

**Open link → curtain gone: 2614 ms median, 2620 worst. Rating: slow, and fragile on a real network.**
- On every load the page starts seven listeners (app.js:116-124): movies, votes, seen, people and nights in full (store.js:9-17, "No cap"), plus free marks from 8 days back and the season doc. It also starts two subcollection listeners for each night it shows (app.js:128-140) and a one-shot reviews query for each of up to 12 past nights (app.js:1046-1050). With today's production counts that is roughly 60–70 billed reads per cold open, because the cache is memory-only and nothing survives a reload.
- The curtain's own clock opens it at 2.5 s whatever the network does (app.js:85). On real 4G the data often isn't in by then, so it opens onto "Warming up the projector…". When the data does arrive, the reveal mounts over a page she may already be scrolling (app.js:812: `atOnce` only while the curtain is closed). See O11.
- Until the data arrives, the calendar and day panel are live and wrong (O4). renderCalendar has no `ready()` guard (app.js:828-880), even though renderNext (app.js:522) and renderShelf (app.js:963) both have one.

**Turn the card. Rating: fragile (GUESS).**
- The medium poster starts loading only when the overlay mounts (reveal.js:36). The title lands at 650 ms whether or not the image has decoded (reveal.js:87). On a slow link the signature flip can turn onto an empty face. See O11.

**Count me in (reveal) → name form. Rating: none.**
- The reveal resolves `{seen, rsvp}`, and `requireMe(… { ticket: true })` runs after the repaint (app.js:731-735). The pending tap is found again by key after the form hides it (app.js:490, 1222-1236). The wiring holds.

**Name → her ticket: 851 ms median, 854 worst. Rating: fragile.**
- Nothing on screen changes for two sequential round trips: `join` does a `getDoc` and then a commit (actions.js:54-66). Only after that does the pending Count me in fire (app.js:1224-1236), and the submit button never shows that it's working.
- If Firestore decides it's offline, the `getDoc` on a name that isn't in the memory cache rejects instead of queuing. The page will already have shown "Not sent yet. It goes through when your connection is back" at 4 s (app.js:1171, 1181), and then it says the opposite. See O5.
- The ticket is drawn from the local echo of the free mark, before the server has it (O2).

**Thumbs-up counted. Rating: none.**
- The local echo flips `aria-pressed`. A rejected write rolls back and shows a toast through `once` (app.js:1157-1166).

**Tap an open evening → "I'm free that evening". Rating: none.**
- The toast waits for the server (app.js:1449-1454).

**How it works and its next cards. Rating: none.**
- Entirely local.

**200% re-open. Rating: none from my lens.**
- The reveal replays because a signed-out phone keeps reelsSeen in memory only (app.js:35). That is consistent with only `ps.me` being allowed in browser storage.

### Jo, regular (signed in, 412 px)

**Open → curtain gone: 2606 ms median, 2622 worst. Rating: slow (as above), and fragile for anyone whose `ps.me` has no people doc (O3, GUESS).**
- A signed-in page waits for `people` (knowsMe, app.js:323), and its error handler is `() => {}` (app.js:120). Both the reveal and the walk need `myDoc()` (app.js:451, 791, 806).

**Turn the card. Rating: fragile (GUESS).**
- Same as Gma's (O11).

**See my ticket. Rating: none.**

**Since-you-last-looked cards → Got it. Rating: fragile (Polish).**
- Got it calls `markSeen`, which calls `savePrefs` (app.js:467). That write is fire-and-forget: it isn't counted in `unsent`, and a failure only reaches `console.warn` (app.js:95). On a flaky network, or when the tab closes, the same cards come back next visit. See O12.

**Trailer in the screening room. Rating: none.**
- It produces the only console line in every run (O13).

### Kim, invitee (signed in, not coming)

**Count me in from the reveal → ticket. Rating: fragile.**
- `play()` starts `setFree` and calls `landOnTicket` straight away (app.js:725-737). It does not wait for the server's acknowledgement, so the ticket prints from the local echo. See O2.

### Hal, host

**Day panel → I can host → slip. Rating: none.**

**Put it on the marquee → confirmation: 1770 ms median, 1922 worst (A/B is noise). Rating: slow.**
- `hostNight` makes three sequential round trips: getDoc on the night, getDoc on his free mark, then the commit (actions.js:137-153).
- During the two reads nothing on screen moves, and the button isn't disabled or relabelled (app.js:1470-1481).
- The local echo then puts the night on the marquee while the slip still asks him to confirm. The slip only closes and the toast only appears after the server acknowledges (app.js:1477-1480).
- A second tap is caught ("Still sending that one…", app.js:1158).
- See O6.

**Also planned. Rating: none.**

### Off-screen: the clocks, the rules and the budget

- **Locking is race-safe.**
  - The phone transaction bails out if the vetoes or theme have moved (actions.js:183-192).
  - The server writes with an `updateTime` precondition (tick.js:25, 36).
  - The phone refuses to lock while any list is still the phone's own copy, or while one of its own taps is unsent (app.js:170).
  - The e2e covers a stale lock (e2e.py:614-650) and a slow lock (e2e.py:726-757).
- **Two weaknesses remain on the clock side.**
  - A night that didn't happen can't be backed out of after showtime (O1).
  - The phone clock is trusted for when a lock is due (O7).
- **The server clock gives nothing to diagnose (O8).** api/status.js:10 awaits `tick()` and throws away its `actions`, including every `skipped` reason. Neither the REST client (lib/firestore-rest.js:37-41) nor any caller has a timeout.
- **Read budget (O9).** It's fine today. It grows linearly with history, and the Home Assistant poll grows with every vote ever cast.

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| O1 | **A night that doesn't happen burns its movie.**<br>• Once showtime passes, a night can't be cancelled or unlocked: the cancel and unlock rules require `request.time < before.startsAt`, and the UI hides both.<br>• At startsAt + 12 h, a phone or the server files it as `done` automatically.<br>• The movie then leaves the shelf for good (watchedIds), re-adding it is refused ("We already watched…"), and the stats and pick board count it.<br>• No rule leads out of `done`, and nights can't be deleted, so only the Firebase console can undo it.<br>• Example: a host who calls the night off at 8:15 PM loses the group's top pick. | Major | firestore.rules:222-228, 232-236; logic.js:76-78, 188; tick.js:34-36; app.js:181-182, 214-217, 1603 |
| O2 | **A ticket that was never sent.**<br>• The ticket ("ADMIT ONE") is drawn from the local echo of the free mark (no `hasPendingWrites` check). From the reveal it prints before the server acknowledges.<br>• The cache is memory-only, so an unsent RSVP lives only in the open tab. The "Not sent yet" note waits 4 s, and `beforeunload` can't help when Android freezes or discards a locked phone's tab.<br>• Net effect: tap Count me in on a flaky signal, see the ticket, lock the phone, and the RSVP can vanish with no trace. | Major (frequency is a GUESS) | store.js:3; app.js:199, 601-615, 725-737, 1171, 1181, 1196; firebase.js:10. To confirm on a real Android phone: block Firestore, tap Count me in, lock within 4 s, discard the tab via chrome://discards, reopen. |
| O3 | **A signed-in phone with no people doc is a dead end.**<br>• `maybeRevealMovie` and `maybeRevealTie` return early on `S.me && !myDoc()`, but the movie still counts as face down.<br>• So the marquee and the ticket stay "The movie is…" until showtime, there is no tour and no news, and nothing says why.<br>• `savePrefs` merge-sets a doc that doesn't exist, which counts as a create and is refused (console only), so the page never heals.<br>• The `people` listener's error handler is `() => {}`.<br>• Only "Not you?" plus retyping the name fixes it. | Major if any such phone exists (**GUESS**) | app.js:20-22, 99-112, 120, 305-320, 791, 806; firestore.rules:80-92. To confirm: read-only, compare prod's distinct nameKeys in votes, seen and free against the people ids. |
| O4 | **The calendar is live and wrong before the data arrives.**<br>• Every evening shows "Nobody has said they're free yet" and offers I can host, even on hosted days.<br>• A signed-out tap there opens the name form, and the next repaint hides it again (`#pass.hidden = !(… && ready())`), so the tap looks dead.<br>• The server-side guards stop bad writes, but the first message is "Someone may have just changed it". | Minor | app.js:364-367, 828-880 (no `ready()` guard), 1132-1143; actions.js:139-141; ui.js:117-121 |
| O5 | **"Not sent yet" and the offline toast promise queuing that read-first actions can't do.**<br>• "It goes through when your connection is back" (and "What you tap now sends when you're back online") is false for a new name, hosting and adding a movie, and "Lock the movie now" can't run its transaction offline either.<br>• Each of these first does a `getDoc` on a doc that isn't in the memory cache. That rejects once Firestore decides it's offline, ending in "You look offline. Try again".<br>• The e2e only blocks `Write`, apart from one name case, where it asserts the failure. | Minor | app.js:1171, 1297; actions.js:57, 82, 139-144, 185; ui.js:122; e2e.py:360, 386, 403, 413-427 |
| O6 | **The host step costs three sequential round trips with no sign of progress.**<br>• Two reads, then the commit, with no in-flight state on the button.<br>• The marquee updates from the local echo while the slip still says "Put it on the marquee".<br>• The confirmation waits for the server.<br>• The 1770/1922 ms is emulator noise according to the A/B, but three round trips is the floor on a phone. | Minor | actions.js:137-153; app.js:1470-1481; A/B pairs in the brief |
| O7 | **The phone clock is trusted for locking.**<br>• The planned→locked rule has no time bound, so a phone whose clock runs fast locks early. The e2e does exactly that: a phone 8 h fast locks a night 6 h before its deadline, and the rules accept it.<br>• A woken tab waits a fixed 5 s, then may lock from vote and RSVP lists the SDK hasn't flagged as cached. The transaction re-checks only vetoes and theme. (**GUESS** on how a frozen tab's metadata behaves.) | Minor | firestore.rules:219-221; e2e.py:730-757; app.js:158-170; actions.js:186-188. To confirm the second part: freeze a tab with CDP, vote elsewhere, unfreeze, and compare the pick. |
| O8 | **The server clock can't be diagnosed and has no deadline.**<br>• status.js discards tick's per-night `actions`, including `skipped` reasons. The cron's response body is never logged.<br>• No fetch timeout, so a Firestore stall runs into Vercel's limit (10 s, unverified).<br>• preview.js's catch never runs in that case, so "It never fails a share" doesn't hold.<br>• `planned` and `locked` are queried twice per poll. | Minor | api/status.js:10; lib/firestore-rest.js:37-41; api/preview.js:2-3, 10-16; lib/tick.js:11; lib/status.js:12 |
| O9 | **The read budget grows with history, and when it runs out the page blames the guest.**<br>• Every cold open reads every movie, vote, seen mark and night ever. Watched movies and their votes are never pruned.<br>• While a night is planned, each Home Assistant poll (48 a day) reads every vote ever, and with a theme or veto the whole shelf as well.<br>• Rough thresholds: 500 votes and 150 movies is about 31k reads a day from Home Assistant alone, against 50k. Today it is about 60–70 reads per open and at most about 2.4k a day from Home Assistant, which is fine.<br>• When it does blow, guests are told "Check your connection; this page catches up by itself" and "Reload to try again". Both are wrong until the daily reset. | Minor (projection, not a current breach) | store.js:9-17; app.js:64, 115-124, 329, 1046-1050; lib/status.js:12, 64, 71 |
| O10 | **A Cinemeta hiccup does lasting damage.**<br>• If `movieMeta` fails, the movie is added from the search item, without runtime, genres, trailer or description. Movies can never be updated, so it stays that way and never matches a theme.<br>• A slow Cinemeta fetch sits inside `once()`, so after 4 s "Not sent yet" blames the guest's connection.<br>• A hung fetch keeps `unsent` above 0, which stops this phone's lock clock. (**GUESS:** cinemeta.js isn't in my inputs, so whether it has a timeout is unknown.) | Minor | app.js:170, 1605-1612, 1181; firestore.rules:123 |
| O11 | **The reveal doesn't wait for what it shows (GUESS).**<br>• The turn finishes at 650 ms whether or not the medium poster has loaded.<br>• On a slow open, the curtain parts at 2.5 s onto "Warming up…", and the reveal later drops over a page that is already in use. | Minor | reveal.js:36, 87; app.js:85, 293, 812. To confirm: film the turn on a throttled "Fast 3G" CDP profile. |
| O12 | **Preference writes are fire-and-forget.**<br>• lastSeen (Got it, the 4 s look, leaving the page), reels and toured all bypass the watchdog, and their errors only reach console.warn.<br>• If one is lost, the news and the reveal come back next visit. | Polish | app.js:95, 109, 467, 471-473, 720 |
| O13 | **One noisy console line in every run.**<br>• The only console line in all four runs is the `allow`/`allowfullscreen` conflict, and the brief calls these logs empty. | Polish | screen.js:40-41; run-s1-1/2/3 and run-s2 console.json |

## Step ratings at a glance

- **Newcomer**
  - Open: slow, and fragile on a real network.
  - Turn the card: fragile (GUESS).
  - Count me in → name form: none.
  - Name → ticket: fragile.
  - Thumbs-up: none.
  - Calendar tap and "I'm free that evening": none.
  - How it works: none.
  - 200%: none.
- **Regular**
  - Open: slow (fragile if O3 is real).
  - Turn the card: fragile (GUESS).
  - See my ticket: none.
  - News cards → Got it: fragile (Polish).
  - Trailer: none.
- **Invitee**
  - Count me in → ticket: fragile.
- **Host**
  - Slip: none.
  - Put it on the marquee: slow (not a regression).
  - Also planned: none.

## Protect this

Locking is race-safe end to end, and that design should be kept:
- phone transactions that bail if vetoes or theme moved (actions.js:183-192);
- a server tick with an `updateTime` precondition (tick.js:25, 36);
- a phone clock that won't lock from cached lists or while its own taps are in flight (app.js:170).
