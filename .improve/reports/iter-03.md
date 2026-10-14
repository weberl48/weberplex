# Iteration 3 (2026-10-14)

The reveal now works for everyone, and the design review moved up a point to 30/40. It never spoils itself, ends on Count me in even for someone with no name yet, and lights up when it lands. A tap is honest even when the app reads before it writes, a dead connection says so, and big text no longer breaks the ticket. The critics' next target: while the nearest night is locked, the next open night goes dark.

## What changed (commits on improve-loop)
- **a5085d1 Honest sending, fixed.** The watchdog watches the action itself, so dropping out and vetoing, which read first, are covered. Empty lists from an empty cache no longer count as loaded. After 8 s the marquee says "Can't reach the box office yet…".
- **6085e44 The reveal, end to end.**
  - Backing out no longer lets the news name the movie ("Friday's movie is locked").
  - Signed-out visitors get Count me in / Not this time; Count me in asks the name, then lands on the ticket.
  - On landing, the bulbs flash and hold lit, and the heading resolves to "Friday's feature" with the title in amber at display size.
  - The news is held back only when the reveal lands on a ticket.
  - "Locked for FRI" now reads "Locked for Friday".
- **d6e0cf0 Big text.**
  - The ticket stacks below 340 px.
  - The marquee and ticket titles size to their box, so they shrink instead of splitting.
  - The toast spans the column.
  - Two values are back on the design scale.
- **38b6de4** The title lands as the poster settles (650 ms) instead of at 1 s.

## The Draft
Evidence is in `.improve/evidence/iter-03/` (raw, not committed); contact sheets are `jo-`, `gma-` and `kim-reveal-contact.png`, plus `jo-turn-contact.png`. The scenario now films the turn itself and takes Gma through the reveal's Count me in.

- **Gma (signed out):**
  - Walks the SAMPLE-stamped tour.
  - The card waits face down; she taps it, and it is edge-on at about 140 ms and settled by about 600 ms.
  - "Friday's feature / Alien / Friday 8 PM at Hal's / Count me in · Not this time".
  - Count me in → the name form in 45 ms → her ticket 328 ms after her name.
  - Then a thumbs-up, and an open evening marked free.
- **Jo:** turns the card in 698 ms and gets See my ticket; her ticket stands on its own, with the news count in the bar.
- **Kim:** Count me in on the reveal → her ticket in 54 ms.

### Timings
Median ms, previous iteration in brackets:

| step | median |
|---|---|
| tap to title | 682–699 (1045–1061) |
| open to first card | 1346 (1359) |
| See my ticket | 47 (57) |
| I'm free to server-confirmed | 348 |
| host confirm | 651 (727) |

Full table: `evidence/iter-03/timings.md`.

### Previous Pivot
All three changes met their criteria and are kept.

## The Harsh Critique
Full critiques are in `critiques/iter-03/`.
- **Impeccable design review: 30/40**, up from 29; consistency rose from 2 to 3.
- **Impeccable detector:** only findings DESIGN.md sanctions.
- **No Blockers.**

| rank | id | problem | severity | evidence |
|---|---|---|---|---|
| 1 | P-060 | With the nearest night locked, the crown sits on the locked movie and no open night shows its pick; a face-down movie is still named by the crown and a news detail | Major | assess-a8 sam360_back_* |
| 2 | P-063 | The name step has no busy guard or watchdog | Major | app.js join() |
| 3 | P-062 | The "Not sent yet" toast swallows taps on the sheet's Next | Major | assess-a8 sam412_news1.png |
| 4 | P-064 | The sample ticket answers "what movie" wrongly | Major | gma-05 |
| 5 | P-065 | Amber Count me in on Also planned rows sits under the ticket | Major | gma-09; so360_back_upnext |
| 6 | P-002 | Back on the news marks everything read | Major | tour.js, app.js |
| 7 | P-031 | Asked to rate a night you weren't at | Major | app.js canRateNight |
| 8 | P-055 | The ticket shows before the server has the RSVP | Major | 54 ms vs 348 ms |
| 9 | P-066 | The landed reveal has no why and no who; See my ticket hard-cuts | Major (taste) | jo-01, jo-02 |
| 10 | P-061 | The tie reel ends flat | Major (taste) | reel_fran412_end.png |

**Not acted on:** the link preview and calendar feed name the locked movie (P-068). That stays as the user's decision from critique #1 to keep the poster in link previews.

**What the critics said to protect:**
- **Newcomer:** "the landed reveal and the ticket … answers both of her questions in big plain words."
- **Connoisseur:** "the face-down card in a chasing bulb marquee that turns over to a full-height poster on black, with no spoiler anywhere … and the Count me in / Not this time invitation everyone gets."
- **Operator:** "every confirmation waits for the server, the 4 s watchdog follows the action … the server's lock uses conditional writes."

## The Pivot (iteration 4)
1. **The next open night stays alive** (P-060, P-043).
   - The crown and the ribbon follow the next planned night.
   - The day panel and the Also planned row show what would win.
   - Nothing names a face-down movie.
2. **Honest everywhere** (P-063, P-062, P-002, P-070).
   - The name step gets the busy guard and the watchdog.
   - Toasts dock above an open sheet.
   - Back on the news means later.
   - "Sent." still follows the "Not sent yet" note.
3. **First contact and amber discipline** (P-064, P-065, P-031).
   - The sample ticket stays face down.
   - Also planned gets a ghost Count me in.
   - Only people who were there are asked to rate.

**Left for later:** the tie reel ending, why and who on the reveal, the ticket before the server, the stale-tab lock, tour length, the locked night without a ticket, and the host tools.

## Health
- **Tests:** unit 35 → 35, emulator 41 → 41, e2e PASS → PASS (4 new checks).
- **Live:** shipping this iteration (user-approved).
- **Processes:** static server and emulator stay up for the loop; the overlay server is stopped.
