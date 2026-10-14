# Iteration 1: orient and baseline (2026-10-14)

The reveal, which is the moment the product lives on, plays with no build-up, tells someone who is coming "OK" instead of "See my ticket", and is then covered by the news; and a tap on a bad connection can claim it saved when it didn't.

Before the loop: production had a live regression from the previous push (the tour and news sheet footer covered the last 18 px of every card). Hotfixed and pushed with the user's approval (1f5d93c); measured 0 px overlap on all 5 tour and 9 news cards at 360 px and 200% text.

## The Draft

Scenario: `.improve/scenario.py`, local emulator, seed 1 three times and seed 2 once. Evidence in `.improve/evidence/iter-01/` (raw, not committed).

**Gma, a newcomer, 360 px phone, no name yet** (`run-s1-1/gma-*`):
1. The link opens on the walkthrough sheet over the marquee; the marquee says "THE MOVIE IS…" for Friday at Hal's (`gma-01-first-screen.png`).
2. Five walkthrough cards (`gma-02..05`). Card 5's sample ticket reads "THE WITCH · Fri, Oct 16 · Jo's", under the real Friday night at Hal's.
3. The reveal: the "?" card turns within ~200 ms of appearing and lands on The Grand Budapest Hotel with an "OK" button (`frames/gma-reveal-*`, `gma-reveal-contact.png`).
4. The page (`gma-07`, `gma-08`). Her first thumbs-up brings up the name form (`gma-10`, captured mid-scroll); she types "Gma" and the thumbs-up goes through (`gma-11`).
5. She taps Friday on the calendar (`gma-12`) and Count me in: "You're in for Friday." (`gma-13`), then Up next shows her ticket (`gma-14`).
6. At 200% text: first screen, card 2, the reveal, the page (`gma200-*`).

**Jo, a regular, a day later, 412 px phone** (`run-s1-1/jo-*`):
1. The reveal plays straight away (`frames/jo-reveal-*`, `jo-reveal-contact.png`): turned by 278 ms, titled by 1148 ms, button "OK" although Jo is coming.
2. See my ticket shows the ticket (`jo-02-ticket.png`), and 4 ms later the news sheet slides up over it.
3. "Since you last looked": a program card listing 8 updates ("Locked for FRI: The Grand Budapest Hotel", "1 new movie on the shelf: Forrest Gump", "Sam is hosting Friday, October 23 at 8:00 PM", …) and 8 more cards (`jo-03..11`).

**Hal hosts an open evening** (`run-s1-1/hal-*`): day panel, the NOW BOOKING slip, Put it on the marquee, then Up next and Also planned.

### Timings (local emulator; median and worst over 3 seed-1 runs; ms)

| step | median | worst | spread | seed 2 |
|---|---|---|---|---|
| gma: open link to first card | 1347 | 1348 | 7 | 1496 |
| gma: tour next (each) | 96-99 | 102 | ≤15 | 87-95 |
| gma: tour done to reveal | 44 | 46 | 2 | 49 |
| gma: thumbs-up asks for a name | 36 | 47 | 14 | 58 |
| gma: name to thumbs-up counted | 256 | 380 | 129 | 966 |
| gma: tap the night on the calendar | 49 | 75 | 33 | 179 |
| gma: count me in | 621 | 934 | 364 | 625 |
| gma200: open link to first card | 1336 | 1363 | 61 | 1346 |
| jo: open link to reveal | 1381 | 1670 | 326 | 1376 |
| jo: see my ticket | 53 | 60 | 11 | 53 |
| jo: news cards open (after the ticket) | 4 | 4 | 0 | 4 |
| hal: I can host to slip | 42 | 44 | 3 | 51 |
| hal: put it on the marquee | 415 | 430 | 36 | 519 |

No limits apply to these local steps; none is near the 10 s function limit. The operator noted that "name to thumbs-up counted" was satisfied by leftover toast text and the host step accepted any toast (P-041): those two numbers are not trustworthy and the scenario is fixed for iteration 2.

## The Harsh Critique

Critics (fresh context, own inputs only): newcomer (Gma), connoisseur (Dana), operator (Priya); full write-ups in `critiques/iter-01/`. The impeccable critique ran alongside: design review 29/40 (unchanged from critique #5), detector unchanged (all findings sanctioned by DESIGN.md).

| rank | id | problem | who it hurts | severity | evidence |
|---|---|---|---|---|---|
| 1 | P-017 | A tap on a dead or lie-fi connection looks saved and can vanish ("counts" before it's sent; retaps ignored silently) | anyone on a bad signal | Blocker (data loss) | app.js:986-987, 955-959, 1042; firebase.js:10 |
| 2 | P-018 | The reveal opens before the lists load, so someone coming gets "OK" | everyone coming | Major | jo-reveal-1148ms; assess-a6 3/3 runs |
| 3 | P-019 | No build-up, lights don't go down; the "?" turns within ~200 ms | everyone, every lock | Major (taste) | jo-reveal-0000→0278ms; gma-reveal-0780ms |
| 4 | P-020 | The news sheet covers the ticket 4 ms after See my ticket | regulars | Major (taste) | jo-02-ticket.png; timings |
| 5 | P-021 | Walkthrough samples use real dates and names and contradict the real night | every newcomer | Major | gma-05 vs gma-06; tour.js:14-55 |
| 6 | P-022 | Five cards before the answer the newcomer came for | every newcomer | Major | gma-01..05 |
| 7 | P-024 | "X marked free evenings" for someone joining your night; host's own mark reported | regulars | Major | assess-a6; actions.js:143-151 |
| 8 | P-002 | Back on the news marks everything read | regulars | Major | tour.js, app.js |
| 9 | P-023 | Ticket at 200% text: one letter per line | big-text guests | Major | assess-a6 big-sam-full-a.png |
| 10 | P-025 | Locked night without a ticket is a plain box; four amber buttons | most of the week | Major (taste) | assess-a6 out-360-deferred-reveal.png |
| … | | 30 more Minor and Polish entries | | | scorecard.json |

Sharpest findings:
- **Newcomer:** "Tour card 5's sample ticket 'THE WITCH · Fri, Oct 16 · Jo's' sits under the real 'THE MOVIE IS… FRIDAY, OCTOBER 16 … AT HAL'S'. Same date and time, wrong film, wrong house." Protect: "once the movie is out, the marquee answers what, when and where at a glance, and the ADMIT ONE ticket ends the session with 'GUEST Gma' on it."
- **Connoisseur:** "It plays as a quick card flip, nothing like a cinema going dark… the button reads OK… then the ticket gets covered 4 ms after the tap." Protect: "the bulb marquee, the admit-one ticket stub, Hal's 'Now booking · Put it on the marquee' slip, and copy like 'Walk through it, or call it read.' Fix the reveal by bringing the marquee and ticket into it."
- **Operator:** "A tap on a dead or lie-fi connection looks saved and can vanish." Protect: "the night lifecycle's concurrency: phone locks are transactions, server locks are guarded by ifUpdateTime… Two phones, or a phone and the cron, can never disagree about a night."

Ratings changed from the critics': the operator's read-budget Blocker (O1) is Minor for now because production holds 3 thumbs-ups and 36 movies (read-only counts, 2026-10-14); the missing-people-doc Blocker (O3) is a GUESS that production rules out today (0 names without a doc). Discarded as seed or capture artifacts: the pick contradicting the page (my seed locked a movie by hand), the day panel cut off (screenshot mid-scroll), and a pitch about a shark on Alien.

## The Pivot (iteration 2)

1. **Honest sending (P-017).** Confirmations only after the server accepts a write; anything unsent after 4 s shows a lasting "Not sent yet" note, then "Sent." when it lands, even with no offline event; a retap while sending says so; leaving with unsent writes asks first. *Proof:* an e2e check that holds Firestore writes while the browser stays "online": the note appears within 6 s and no "counts" toast shows; releasing writes shows "Sent." and the vote exists. *Risk:* a slow working network shows the note briefly.
2. **The reveal (P-018, P-019, P-020).** Wait until every list has loaded; lights down; the "?" card waits face down in a chasing-bulb frame until tapped; after See my ticket the news doesn't open over the ticket this visit. *Proof:* See my ticket in 3/3 runs; frames show the "?" still face down at 1.5 s and turned and titled within 1.3 s of the tap; no news sheet for 5 s after See my ticket, ticket focused and on screen; overlay background alpha ≥ 0.95. *Risk:* one more tap; e2e flows updated.
3. **Walkthrough samples (P-021).** Stamped SAMPLE, no real dates or group names; card 3 teaches both labels as one thing; each card announced to screen readers. *Proof:* no sample shows a date number or a group name; e2e tour checks pass. *Risk:* samples feel less concrete.

Deliberately left for later: the ticket at 200% (P-023, next), "X is coming" news (P-024), back = later on news (P-002), the locked night without a ticket (P-025), the tour standing before the answer (P-022, eased by #3), and the operator's Minors.

## Health

- Tests: unit 35/35, emulator 41/41, e2e PASS (before = after; no product changes this iteration apart from the pre-loop hotfix).
- Live service: production at 1f5d93c (the hotfix), confirmed served. Nothing else shipped.
- Processes: the static server on 5173 and the emulator on 8181 stay up for the next iteration; the impeccable overlay server on 8400 was stopped by its reviewer.
- Branch `improve-loop` from 1f5d93c; `.improve/` committed there.
- Assumptions to confirm: the reference (Partiful, plus a cinema's lights-down) is inferred; Firestore write/delete quotas and Vercel's 10 s limit are from memory; group size is inferred from the seed.
