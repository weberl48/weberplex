# Improve loop log

## Iteration 1 (2026-10-14): orient and baseline
- Before the loop: hotfixed production (1f5d93c): the tour and news sheet footer covered the last 18px of every card (sticky `bottom: 0` stops at the padding edge). User-approved push.
- Set up: branch `improve-loop` in this checkout (production deploys from GitHub master, not from here); `.improve/` with brief, scorecard, the golden scenario (`scenario.py`: Gma joins cold, Jo returns to the reveal and news, Hal hosts) and `timings.py`.
- Baseline: unit 35/35, emulator 41/41, e2e PASS; scenario 3× seed 1 + 1× seed 2, 18 timed steps each, no page errors. No product changes.
- Learned: the reveal turns over within ~250 ms of appearing, with no build-up; the news sheet opens 4 ms after See my ticket, on top of the ticket. Scenario fixes for next time: wait for smooth scrolls before screenshots; pitches no longer name a movie.

## Iteration 2 (2026-10-14)
- Shipped to the branch: honest sending (bfd1c20, also fixed the flaky e2e: the lock overtook a theme write), the reveal that waits in the dark and ends on the right button (43a7824), stamped walkthrough samples (d5d8019).
- All three Pivot criteria met; kept. Impeccable 29/40 (unchanged). Critics: the payoff is duller than the wait, back on the card spoils it through the news, signed-out ends on OK, the send watchdog misses read-first writes, the ticket breaks at 200%.
- Learned: watching the write queue misses actions that read first; watch the action. A deferred reveal still lets the news through.
- Next: the reveal end to end, honest sending fixed, big text and the toast. Deferred: the name gate, tour length.

## Iteration 3 (2026-10-14)
- Kept: the honest-sending fix (a5085d1), the reveal end to end (6085e44), big text and the toast (d6e0cf0), the title at 650 ms (38b6de4). Impeccable 30/40 (up from 29).
- The scenario now films the turn and walks Gma through the reveal's Count me in; earlier "name to counted" numbers were measuring a leftover toast.
- Critics: no Blockers. Next: keep the next open night alive while the nearest is locked, the name step's guard and toast placement, the sample ticket and amber discipline.
- Not acted on: link previews name the locked movie (user chose to keep the poster, critique #1).
