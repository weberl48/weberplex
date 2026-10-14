# Improve loop log

## Iteration 1 (2026-10-14): orient and baseline
- Before the loop: hotfixed production (1f5d93c): the tour and news sheet footer covered the last 18px of every card (sticky `bottom: 0` stops at the padding edge). User-approved push.
- Set up: branch `improve-loop` in this checkout (production deploys from GitHub master, not from here); `.improve/` with brief, scorecard, the golden scenario (`scenario.py`: Gma joins cold, Jo returns to the reveal and news, Hal hosts) and `timings.py`.
- Baseline: unit 35/35, emulator 41/41, e2e PASS; scenario 3× seed 1 + 1× seed 2, 18 timed steps each, no page errors. No product changes.
- Learned: the reveal turns over within ~250 ms of appearing, with no build-up; the news sheet opens 4 ms after See my ticket, on top of the ticket. Scenario fixes for next time: wait for smooth scrolls before screenshots; pitches no longer name a movie.
