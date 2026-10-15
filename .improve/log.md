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

## Iteration 4 (2026-10-14)
- Kept: the next open night stays alive and taps stay honest (4616f02), the face-down sample ticket and attendee-only rating (faf2b0d). Impeccable 31/40.
- Critics: a failed name step can say "Sent." (my bug), a phone's lock can use stale data, Esc spoils the reveal, Stats leak the face-down pick, the reveal and reel land without people.
- Next: honest to the end, the reveal and reel with people, face down everywhere plus a clean name step at big text. Iteration 5 ends with the checkpoint judge.

## Iteration 5 (2026-10-14)
- Kept and shipped as a390baa:
  - honest to the end (b228528)
  - the reveal and reel land with people (8f29764)
  - Stats face down and the name step (b0220b6)
  - the house curtain, at the user's request (a47e8a7)
  - the why line and reduced motion (9d5a270)
- Impeccable 29/40, down from 31; consistency scored 2.
- Timings: the write steps' slowdown was the 15 GB emulator. A same-hour A/B against the previous commit showed the same numbers.
- Checkpoint judge: yes, genuinely impressed (the reveal). Its top Minor (a backed-out signed-out reveal is burned once you give a name) is raised to Major (P-106).
- Next: face down on every path; lights down, curtain, picture; a reveal that builds; first contact at any text size.

## Iteration 6 (2026-10-14)
- Kept:
  - face down on every path (0ff3ff8)
  - lights down, curtain, picture, and the reveal builds (5fe9eb8)
  - first contact at any text size (e44ba35)
  - offline start recovers (83e5809, experiment E-6 confirmed the guess first)
- Impeccable 30/40, every heuristic at 3.
- Learned: stale browser-pane tabs were live clients locking nights under the tests; a regression check must be shown failing on the old code (two of them initially passed on it).
- Next:
  - the show starts with the show (reveal before the tour, a visible dim, no curtain on reload, fonts off the critical path)
  - the ticket as payoff
  - locks from fresh data only

## Iteration 7 (2026-10-14)
- Kept:
  - the show starts with the show (a7c67cd)
  - the ticket is the payoff (3769eb0)
  - locks you can trust (8ea7b87)
- After the critique (63190dd): the screening room, at the user's request; plus fixes for the five regressions the critique found (curtain restart, face-down leak, night-card cascade, squeezed ticket, 9 px).
- Impeccable 29/40.
- Learned:
  - a measured A/B killed the font-stylesheet idea, so it was reverted;
  - the reviewers' probes (a delayed app.js, a cascade injection) caught bugs the e2e didn't;
  - CDP offline emulation, not route aborts, makes the SDK report cache-only lists.
- Next:
  - toasts out of the way and one Count me in
  - the tap and the ticket
  - "you" and one save model for the host
