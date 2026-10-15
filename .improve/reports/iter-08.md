# Iteration 8 (2026-10-15)

For the first time, the newcomer critic found no Blocker and no Major: Gma goes from the group text to a ticket with her name on it in three taps and one word. The design review held at 29/40. Its "what would make it a 4" now points almost entirely at the everyday screens, which are the subject of the next iteration:
- the shelf card
- news in counts
- guarded name taps
- one amber call per block
- toasts that eat taps
- focus rings at the reveal

## What changed (commits on improve-loop)
- **c556284 Out of the way.** Good news drops in at the top and lets taps through; problems stay at the bottom until tapped away. While the guest list is up for a night, its own Count me in steps aside.
- **863a0a4 The tap and the ticket.**
  - On the tap the house narrows to a spotlight and the card comes forward 8%.
  - Leaving the reveal (or reel), the lights come up over 0.38 s.
  - The ticket prints in, top first.
- **925f1d9 You, and one way to save.** "You're hosting", "your place", and "you" first in the coming lists; the host's time saves when chosen, like the theme.
- **c2ef671** The screening room's player asks for fullscreen once (no console warning); its glow colour is documented.

## The Draft
Evidence is in `.improve/evidence/iter-08/`, including the screening room filmed (`jo-trailer-*`, stand-in player). Timings are flat, with one exception: Put it on the marquee went 1212 → 1770 ms. A same-hour A/B against 5fe1aba over four alternating pairs overlapped (old 1638-1789 ms, new 1529-1898 ms), so that's emulator drift.

Pivot criteria:
- **PV-8a: met.** e2e.
- **PV-8b: met.** e2e and frames; the lift criterion was revised from 10% to 8% before implementing.
- **PV-8c: met.** e2e.

## The Harsh Critique
- **Design review (impeccable): 29/40.** Efficiency is at 2 (the shelf). The detector found only sanctioned items plus one undocumented colour (documented).
- **Blockers:** none.
- **Newcomer:** no Major.
- **Checked and not occurring:** the operator's "a name with no people doc dead-ends" was compared read-only against production. Every active name has a people doc.

| rank | id | problem | severity |
|---|---|---|---|
| 1 | P-130 | After showtime a night can't be cancelled; at +12 h it's filed as watched and its movie leaves the shelf for good | Major (needs a rules change) |
| 2 | P-127 | A name tap signs you in as that person; the host can drop out of their own night | Major |
| 3 | P-128 | Keyboard focus rings show for phone users at the reveal (a skewed white ring mid-flip) | Major |
| 4 | P-101 | The booked movie is unmarked on the shelf; ties wear two LEADING crowns | Major |
| 5 | P-088 | Shelf cards ~630 px at 360; no search | Major |
| 6 | P-131 | The tap has no beat; the wait shows no people | Major (taste) |
| 7 | P-091 | The ticket prints from the local echo (GUESS on discard) | Major |
| 8 | P-095 | Read growth (projection) | Major (trend) |

What each critic said to protect:
- **Newcomer:** "the reveal's landing screen … with one big Count me in, followed by an ADMIT ONE ticket with her name on it."
- **Connoisseur:** "the landed reveal … then an admit-one ticket with your name on it."
- **Operator:** "locking is race-safe end to end."
- **Design review:** the reveal and ticket ("the card back on the ticket … a smart recovery"), the hosting slip, robustness at 200%.

## The Pivot (iteration 9): the everyday screens
1. **The shelf card, trimmed** (P-088, P-101). Actions in two fixed rows, with Remove as a link; the booked movie wears BOOKED and tied leaders read TIED.
2. **Names, not counts, and one amber call** (P-079, P-078, P-105). "Gma thumbed up Alien"; name tags on the news; a ghost Next where a card has its own call.
3. **Safe taps** (P-127, P-128, P-077):
   - A name tap asks once.
   - No drop-out on your own night.
   - An error toast no longer eats the tap under it.
   - Focus rings appear for keyboard users only.

Left for later:
- **P-130:** needs a Firestore rules change, which only you can deploy; flagged in the summary.
- **P-131:** bounded by your face-down rule.
- **P-129:** the tie reel behind the curtain.
- **P-132:** Up next density.
- **P-095:** read growth.
- **P-091:** a GUESS.
- **P-003:** the tour at 206 px.

## Health
- **Tests:** unit 35, emulator 41, e2e PASS.
- **Score history** (impeccable, same instrument): 29, 29, 30, 31, 29, 30, 29, 29. It's flat within the reviewer's ±2 noise, while the newcomer and operator critiques have lost all their Blockers and the newcomer's Majors.
