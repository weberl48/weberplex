# Iteration 5 (2026-10-14)

The reveal now lands with people, and the house curtain (your request) opens every load. The critics agree on where the moment still falls short: the curtain opens in the wrong order relative to the lights-down, the tap has no build, and the why line names nobody. The design review came in at 29/40, two below iteration 4's reviewer. The checkpoint judge's verdict is below.

## What changed (commits on improve-loop, shipped as a390baa)
- **b228528 Honest to the end.**
  - A failed tap never says "Sent.", and each new outage brings the note back.
  - The phone's lock re-checks the night's vetoes and theme inside the transaction, and doesn't lock within 5 s of waking.
- **8f29764 The reveal and the reel land with people.**
  - The house lights go down (0.9 s) before the card comes up.
  - The landed reveal shows who's coming and why it won.
  - Back or Esc before the turn means "not now": the card stays face down and no news sheet rises.
  - See my ticket brings the ticket to the top, where it prints in.
  - A tie's reel lands like the reveal.
- **b0220b6 Face down in Stats; a clean name step.**
  - Most wanted leaves out a booked movie, and "Picks that made it" counts watched nights only.
  - Count me in without a name brings the guest list to the top and says why inside the form (no toast over the field).
  - Name chips ignore taps for 700 ms.
- **a47e8a7 The house curtain opens on every load** (your request mid-iteration).
  - Two pleated oxblood panels gather to the sides under a fringed valance; everything is clear by 1.75 s.
  - Taps go through it, and there's no curtain with reduced motion.
- **9d5a270** The why gets its own line, and reduced motion skips the lights-down (a landscape phone was scrolling while the card waited to come up).

## The Draft
Evidence is in `.improve/evidence/iter-05/`, including contact sheets for the curtain and for each reveal. Timings: `evidence/iter-05/timings.md`.

Read-only steps are flat against iteration 4:

| step | median | iter-04 |
|---|---|---|
| Open | 1348 ms | 1338 ms |
| Tap to title | 684-686 ms | 681-699 ms |
| Tour steps | ~90 ms | ~96 ms |

The write steps look slower but aren't a regression:
- Name to ticket went 344 → 843 ms, I'm free 330 → 712 ms, and put it on the marquee 657 → 995 ms.
- A same-hour A/B on the same emulator had iteration 4's code just as slow: 849 and 875 ms against 868 and 946 ms.
- The emulator held 15 GB, and the same code drifted 433 → 712 ms between two sets of runs.

The previous Pivot's success criteria:
- **PV-5a: met.** e2e: an unreachable name step never says "Sent."; emulator test: a lock whose theme changed is refused. Gap: the automatic clock still picks from votes and free marks it may hold stale (P-036).
- **PV-5b: met.** Frames show the lights-down; the landed reveal shows "N coming" and the why; e2e: Esc keeps it face down with no news sheet; e2e: a tie ends on the feature heading with Count me in.
- **PV-5c: met at 412, not at 200%.** e2e: Stats leave the face-down movie out, and a chip tap within 700 ms is ignored. At 200%, six name chips push the field off screen (gma200-05). P-076 stays open.

All changes were kept.

## The Harsh Critique
- **Design review (impeccable): 29/40.** Consistency scored 2: two commit models in the host tools, two amber calls per block, and copy that contradicts itself.
- **Detector:** sanctioned findings only. The curtain's gold is now documented.
- **Blockers:** none.
- **Refuted guesses:**
  - "You're in ✓ un-counts her on one tap": the first tap only arms "Tap again: can't make it".
  - The 200% walk is a different visitor, not Gma's second device.

| rank | id | problem | who it hurts | severity |
|---|---|---|---|---|
| 1 | P-081 | The curtain parts onto the page, then the lights go down: curtain, page, lights down instead of lights down, curtain, picture. Taps pass blind through the closed panels; two headings overlap mid-fade. | everyone, every load | Major (taste) |
| 2 | P-082 | The tap has no build: everything lands in one frame, and "The movie is…" is replaced instead of finishing "…Alien" | everyone, every reveal | Major (taste) |
| 3 | P-083 | The why is a grey fraction; names nobody, no faces | everyone, every reveal | Major (taste) |
| 4 | P-022 | Five dense tour cards before the reveal; card 5 spoils the turn and contradicts the marquee | every newcomer | Major |
| 5 | P-076 | The name step lists everyone's names before your own box; at 200% the field is off screen | newcomers, big text | Major |
| 6 | P-087 | A signed-out thumbs-up strands you at the top after you give a name | newcomers who vote first | Major |
| 7 | P-089, P-003 | At 200%, the marquee title is 16px under 24px heads; the tour foot eats 40% of the card | big text | Major |
| 8 | P-090 | A flaky start with a genuinely empty query may stay on "Can't reach the box office" (untested SDK assumption) | anyone on a bad signal | Major |
| 9 | P-036 | The automatic clock can lock from stale votes and free marks | the group, rarely | Major |
| 10 | P-091 | Ticket and thumb shown from the local echo; a discarded tab loses the write (GUESS on discard) | anyone on a bad signal | Major |
| 11 | P-088 | Shelf card actions wrap 3-4 rows at 360; the shelf has no cap | everyone | Major |

What each critic said to protect:
- **Newcomer:** "the reveal, then Count me in, then a ticket reading GUEST Gma plus You're in for Friday."
- **Connoisseur:** "the bulb-framed Friday's feature poster, the admit-one ticket … one-tap Count me in / Not this time right on the reveal."
- **Operator:** "no success message appears until the server has the write, and the lock is guarded twice."
- **Design review:** the reveal and ticket sequence, the box-office day panel and hosting slip, "If it locked now".

## Health
- **Tests:** unit 35, emulator 41, e2e PASS. New checks cover:
  - Esc and back keep it face down.
  - The people lines and the reel endings.
  - Stats face-down.
  - The name step at the top.
  - The chip guard.
  - The curtain's taps-through and reduced motion.
- **Data:** read-only production backup taken (61 reads, `.improve/backups/iter-05`). The kept code loaded a copy cleanly in a separate emulator namespace. Its only writes were the usual last-seen stamp and a tour flag.
- **Live:** master fast-forwarded to a390baa and pushed as weberl48.
- **Machine:** the Firestore emulator process is holding about 15 GB. I didn't start it, so I left it running.

## The checkpoint judge (fresh copy of 9d5a270, no `.improve/`, no history)
**Genuinely impressed: yes.** Its best moment was the reveal: lights down, the face-down card in bulbs, one tap to "Friday's feature / Knives Out / Friday 7:30 PM at Jo's / 8 coming … / 5 of the 8 coming thumbed it up", then a ticket with your name. It found no Blocker and no Major.

Its brag: "Knives Out at Jo's, Friday 7:30! The site turned the lights down, flipped a card over and handed me a ticket with my name on it, and it even said 5 of the 8 of us coming had thumbed it up."

Its top Minor, which I raised to Major (P-106): back out of the face-down card before you have a name, then give one, and the reveal is burned for good; the next visit spoils it. That breaks this iteration's own "back means not now" promise. Its other Minors:
- The news names a second locked night's movie.
- The locking phone opens the news before its own reveal.
- 8 px of sideways scroll at 200% zoom.
- The SDK's heartbeat database in IndexedDB.
- Read-budget growth.
- Page length at big text.

The full verdict is in `critiques/iter-05/judge.md`.

The skill stops only when no untagged Major is open. Several still are, so the loop continues.

## The Pivot (iteration 6)
1. **Face down until you've seen it, on every path** (P-106, P-107, P-108).
   - A reveal you backed out of isn't carried onto your name.
   - No news line names a locked night you haven't seen.
   - The locking phone shows its reveal before the news.
   - Proof: e2e for the backed-out signed-out path and the locking phone; a news unit test with two locked nights.
2. **Lights down, curtain, picture, and a reveal that builds** (P-081 to P-084, P-102).
   - The curtain holds until the page is ready, then parts onto the lit marquee, or straight onto the waiting card.
   - Sheets rise after it opens.
   - "The movie is…" is completed by the title, with when, who (faces) and who wanted it (names) arriving in turn.
   - The reel names what it beat.
   - Proof: frames, e2e copy checks, open to clear page within 2.6 s.
3. **First contact at any text size** (P-076, P-087, P-089, P-003, P-109, P-022).
   - The name field comes first, and you return to the control you tapped.
   - The marquee title stays above the heads at 200%, the tour foot is one compact row, and there's no sideways scroll.
   - Tour card 5 loses its spoiler.
   - Proof: 200% captures and measurements; e2e for the stranded vote.
4. **Experiment E-6** (P-090): confirm or kill "stuck on Can't reach the box office".

Left for later:
- **P-036** (stale clock lock): rare, and it needs a design for the automatic pick.
- **P-091** (local echo on a discarded tab): GUESS.
- **P-088** (the shelf card's pile and the shelf's length): touches your card decision, so it gets its own round.
- **P-078, P-099, P-100** (consistency and copy, behind the 29/40).
- **P-077** (toasts over buttons).
- **P-024, P-025, P-079** (news and the locked-night card).
