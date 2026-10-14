# Iteration 2 (2026-10-14)

The reveal now waits in the dark for you to turn it and ends on the right button, a tap no longer claims to be saved before it is, and the walkthrough's samples can't be mistaken for the real night; the critics then found the reveal's payoff duller than its wait, a spoiler when you back out of it, and a gap in the new send watchdog.

## What changed (commits on improve-loop)
- **bfd1c20 Honest sending.** Confirmations wait for the server; anything unsent after 4 s shows a lasting "Not sent yet" note, then "Sent."; a retap while sending says so; leaving with unsent writes asks first. Root-caused the flaky e2e (P-016): a theme tapped just before Lock was overtaken by the lock transaction and bounced off the locked night; locking now waits for pending writes and picks from what the server has.
- **43a7824 The reveal.** Waits until every list has loaded (so someone coming gets See my ticket, not OK); the house goes fully dark; the face-down card waits in a ring of chasing bulbs until tapped (or Enter/Space); someone with a name who isn't coming ends on Count me in / Not this time; the news no longer opens over the ticket.
- **d5d8019 How it works.** Samples stamped SAMPLE with weekdays and made-up names; card 3 teaches "I'm free that evening" and "Count me in" as one thing; each card announced to screen readers.
- **984a52a** The reveal cover's question mark centred again.

Before → after wording: reveal button "OK" → "See my ticket" (coming) / "Count me in" + "Not this time" (named, not coming); after a name, "Welcome, Gma. Your thumbs-up on X counts." now appears only once the server has it; tour card 5 sample "Fri, Oct 16 · Jo's" → "Fri · 8:00 PM · Ava's".

## The Draft
Scenario (`.improve/scenario.py`, now with Kim, who isn't coming): evidence in `.improve/evidence/iter-02/` (raw, not committed); contact sheets `jo-`, `gma-`, `kim-reveal-contact.png`.

- Jo opens the link: the house goes dark and the face-down card waits, bulbs chasing (frames `wait-0000` … `wait-1132ms`); she taps; 1045 ms later the poster, "Alien", "Friday 8 PM at Hal's" and **See my ticket**; the ticket fills Up next with "8 updates" waiting in the bar (`jo-02-ticket.png`, 1.5 s later, no sheet).
- Kim (not coming) ends on **Count me in / Not this time**; Count me in lands her on her ticket in 61 ms (`kim-01`, `kim-02`).
- Gma (signed out) walks the tour with SAMPLE-stamped demos, turns the card, and ends on **OK** (`gma-06`), then names herself at a thumbs-up and counts herself in from the calendar.
- Hal hosts from the NOW BOOKING slip.

Timings (median of 3, ms; previous median in brackets): open to first card 1359 (1347); tap card to title 1045-1061 (new); See my ticket 57 (53); Kim's Count me in to ticket 61 (new); Count me in from the calendar 327 (621); host confirm 727 (415, now waits for the real confirmation, so not comparable); name to confirmed 378 (256, now waits for the server; the operator notes it still stops at the join toast). Full table: `evidence/iter-02/timings.md`.

Previous Pivot: all three met their success criteria and are kept (scorecard `pivots[0].results`).

## The Harsh Critique
Critics in `critiques/iter-02/`. Impeccable: design review 29/40 (unchanged); detector shows two new off-scale values from this iteration (1.05rem, 12px).

| rank | id | problem | severity | evidence |
|---|---|---|---|---|
| 1 | P-045 | Back on the face-down card opens the news, which names the movie | Major | assess-a7 d_first.png; app.js maybeWalk |
| 2 | P-017 | Send watchdog misses writes that read first (drop-out, veto) | Major | actions.js:121-127,168-175 |
| 3 | P-046 | Signed-out reveal ends on a bare OK | Major (taste) | gma-06; 3 critics |
| 4 | P-044 | The payoff has less life than the wait | Major (taste) | frame diffs |
| 5 | P-023 | Ticket and titles break at 200% text | Major | assess-a7 z_ticket_el.png |
| 6 | P-050 | Opening on a dead connection shows an empty house | Major | store.js; GUESS which outcome |
| 7 | P-047 | A name chip lands under her finger after a nameless tap | Major | gma-09 → gma-10 |
| 8 | P-048 | "Guest list" reads as an RSVP but doesn't count you in | Major | gma-07, gma-11 |
| 9 | P-022 | About 7 taps before the page | Major | gma-01..06 |
| 10 | P-025 | Locked night without a ticket is the flattest block | Major (taste) | fran412_page_first.png |

Protect lines: newcomer, "the marquee and the ADMIT ONE ticket reading GUEST Gma"; connoisseur, "the reveal's buttons fit each person … and land on an ADMIT ONE stub with your own name"; operator, "rules that make every night transition one-way and conflict-safe, and toasts that speak only after the server has acked".

## The Pivot (iteration 3)
1. **The reveal end to end** (P-045, P-046, P-044, P-058): never spoiled by the news; signed-out ends on Count me in (name, then ticket); the payoff lights up; news held back only when landing on a ticket; Not this time lands on Up next. Proof: e2e for the spoiler and the signed-out RSVP; frames showing the bulbs change after the turn.
2. **Honest sending, fixed** (P-017, P-050): the watchdog watches the action; a dead connection at load says so. Proof: e2e drop-out with writes aborted shows the note; e2e with Firestore unreachable at load.
3. **Big text and the toast** (P-023, P-053, P-054): stacked ticket below 340 px, headings that don't split words, full-width toast, values back on the scale. Proof: 200% measurements; toast width; detector.

Left for later: the name gate (P-047, P-048), tour length (P-022), the locked night without a ticket (P-025), back on news (P-002), stale-tab lock (P-036), server clock logging (P-035).

## Health
- Tests: unit 35 → 35, emulator 41 → 41, e2e PASS → PASS (2 new checks).
- Live: shipping this iteration's kept commits to production (user approved shipping each kept iteration).
- Processes: static server 5173 and emulator 8181 stay up for the loop; overlay server 8400 stopped by its reviewer.
- Assumptions: unchanged from iteration 1.
