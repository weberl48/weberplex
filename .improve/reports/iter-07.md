# Iteration 7 (2026-10-14)

The show now starts with the show: a newcomer's curtain parts straight onto the face-down card, and the house lights dim on it first. The card back is printed like a ticket, and the ticket carries the poster. Locks come only from data the server has confirmed. At the user's request, trailers now play here in a screening room.

The critique caught regressions this iteration introduced:
- a curtain restart on slow loads
- a face-down leak through the shelf and vote news
- a cascade bug on the night card
- a squeezed ticket at 360 px
- 9 px text

All of them are fixed before shipping. The design review scored 29/40.

## What changed (commits on improve-loop)
- **a7c67cd The show starts with the show.**
  - Someone new with a movie waiting gets the reveal first; How it works opens by itself only when nothing is face down.
  - While the page loads, the footlights go out and the curtain dims.
  - A reload or a return from another app skips the curtain.
- **3769eb0 The ticket is the payoff.**
  - The card back carries WEBERPLEX, the "?" and the night ("FRIDAY 8 PM / AT HAL'S").
  - See my ticket lands under the Up next heading, with the poster on the ticket.
  - After backing out, the card back on the night is the button that turns it over.
- **8ea7b87 Locks you can trust.**
  - No lock from cache-only lists or with unsent taps.
  - Unlock and re-pick stays until showtime.
- **63190dd The screening room, and the critique's fixes.** (After the critique; the trailer player ships uncritiqued, and the iteration 8 critics will see it.)
  - Trailers play on a gilt 16:9 screen under a "Now showing" marquee, whose own curtain parts as YouTube's privacy-enhanced player starts. Seat backs line the dark.
  - Back, Esc or Close ends the show, and a link opens YouTube if the trailer won't play here.
  - Fixes:
    - the curtain keeps one clock (no restart)
    - the face-down movie is off the shelf and out of the vote news
    - the night card's art floats again
    - the ticket's details clear the poster
    - the card-back label is 11 px

## The Draft
Evidence is in `.improve/evidence/iter-07/`. Timings are in `evidence/iter-07/timings.md`.
- Open to the card in view: 2640 ms for a newcomer (the reveal mounts at 1333 ms) and 2597 ms for a regular.
- Read-only steps are flat.
- The font stylesheet change was measured and reverted. Under 400 ms latency and 60 KB/s, the old page painted at 2685-2706 ms and the new one at 2668-2681 ms, so the font CSS isn't the long pole.

Pivot criteria:
- **PV-7a: met, except fonts (reverted).** Frames, plus an e2e check that a reload has no curtain.
- **PV-7b: met.** e2e and frames.
- **PV-7c: met.** The cached-copy check fails on the old code.

## The Harsh Critique
- **Design review (impeccable): 29/40.** Consistency is back at 2.
- **Detector:** sanctioned findings plus the real 9 px label (fixed).
- **Blockers:** none.

| rank | id | problem | severity |
|---|---|---|---|
| 1 | P-121 | Regressions found by the critique (curtain restart, face-down leak, night-card cascade, squeezed ticket, 9 px) | Major, fixed in 63190dd |
| 2 | P-077 | Toasts linger and cover the next button (the welcome toast over I'm free; a toast over all four tour cards) | Major |
| 3 | P-124 | The name form sits over a second live Count me in for the same night | Major |
| 4 | P-122 | The tap gets a stock flip: no further dark, the poster lands in the same frame | Major (taste) |
| 5 | P-123 | See my ticket is a cut to the lobby | Major (taste) |
| 6 | P-095 | Reads grow with history (~60 per open now; HA poll ~530 a day) | Major (trend) |
| 7 | P-099, P-100 | "Sam is hosting" to Sam; two host commit models | Minor (H4) |

What each critic said to protect:
- **Newcomer:** "one tap from the group text to a flipped card reading Alien · Friday 8 PM at Hal's · 3 coming … with a big Count me in."
- **Connoisseur:** "the sealed red WEBERPLEX card in a chasing-bulb frame that turns over to the poster, names the why … lands on a named ADMIT ONE stub."
- **Operator:** "the clock acts only on the server's answer and never double-locks."

## The Pivot (iteration 8)
1. **Out of the way** (P-077, P-124). Toasts dock under the top bar and are brief. While the guest list is up for a night, that night's Count me in gives way.
2. **The tap and the ticket** (P-122, P-123). On the tap, the house narrows to a spotlight and the card lifts as it turns. See my ticket prints the ticket out of its slot.
3. **You, and one way to save** (P-099, P-100). "You're hosting" and "you" everywhere; the host's time saves when chosen, like the theme.

Left for later:
- **P-095:** structural, with headroom today.
- **P-088:** the shelf card is your decision.
- **P-091:** a GUESS.
- **P-003:** the tour at 206 px.
- **P-079:** news in counts.
- **P-115:** an empty house on a slow connection.
- **P-125:** How it works for a reveal-first newcomer.
- **P-126:** the host drop-off guard.

## Health
- **Tests:** unit 35, emulator 41, e2e PASS.
- **Machine:** the emulator is still large, and the e2e no longer depends on YouTube (the player is stubbed).
- **Live:** shipped at the end of this turn (see the log).
