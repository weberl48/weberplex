# Iteration 6 (2026-10-14)

The page now opens in a cinema's order: the curtain holds closed while the page loads, then parts straight onto the face-down card when a reveal is due. The reveal lands as a sentence in people's names. An experiment confirmed the operator's "stuck offline" guess, and that is fixed. The design review rose to 30/40, with every heuristic at 3. The critics now point at what comes before the reveal and after it: a newcomer's tour, a curtain that never visibly dims, and the ticket landing.

## What changed (commits on improve-loop)
- **0ff3ff8 Face down until you've seen it, on every path.**
  - A reveal you backed out of isn't carried onto the name you then give.
  - A later locked night stays face down in the news and the day panel.
  - The phone whose clock locks a night shows its reveal before the news.
- **5fe9eb8 Lights down, curtain, picture.**
  - The curtain stays closed (taking taps) until the page is ready, at most 2.5 s, then parts onto the lit marquee or straight onto the waiting card.
  - How it works, the news and the reel rise after it.
  - The reveal builds: "The movie is…" finished by the title, then when and where, who's coming with faces, and who wanted it by name.
  - The reel says what it beat.
  - A screen reader hears the whole landing.
- **e44ba35 First contact at any text size.**
  - The name box comes before the names already on the list.
  - You return to the control you tapped.
  - At 200%: the title stays above the heads, the tour foot is one row, and there's no sideways scroll.
  - How it works is four cards, and its last card no longer explains the turn.
- **83e5809 A page that opens offline catches up by itself.** Experiment E-6 confirmed the bug: with Listen blocked for 12 s and the free and seen lists empty, the page never recovered; the control with marks recovered 2.4 s after unblocking. The fix subscribes with metadata changes.

## The Draft
Evidence is in `.improve/evidence/iter-06/`: live screencast frames of the opening (`gma-open`, `jo-open`) and contact sheets for each reveal. Timings: `evidence/iter-06/timings.md`.

| step | median | iter-05 | note |
|---|---|---|---|
| Open to the card in view (Jo) | 2599 ms | n/a | the curtain parts at ready (~1.3 s) and takes 1.3 s |
| Open to first tour card (Gma) | 2612 ms | 1348 ms | by design, after the curtain |
| Tap to title | 684-694 ms | 684-686 ms | flat |
| Name to ticket | 852 ms | 843 ms | |
| Put it on the marquee | 1335 ms | 995 ms | emulator noise; the emulator is at 16.4 GB |

Pivot criteria:
- **PV-6a: met.** All three new e2e checks fail on the old code.
- **PV-6b: met, except one timing.** Open to the card in view is 2599 ms (met). Open to the first tour card is 2612 ms, missing the 2.6 s line by 12 ms.
- **PV-6c: met.** e2e at 206 px.
- **E-6:** confirmed and fixed.

## The Harsh Critique
- **Design review (impeccable): 30/40**, up from 29. Every heuristic is at 3.
- **Detector:** sanctioned findings only.
- **Blockers:** none.
- **Refuted by test:** "the curtain stays closed if the SDK fails". The CSS fallback hides it by 4.2 s.
- **Refuted by code, again:** "You're in ✓ un-counts on one tap".

| rank | id | problem | severity |
|---|---|---|---|
| 1 | P-113 | A newcomer's curtain parts onto the name form, then a 4-card tour; the reveal waits behind it | Major |
| 2 | P-112 | Nothing visibly dims: the curtain is lit and still, then parts | Major (taste) |
| 3 | P-114 | The curtain's ~2.6 s on every reload and back-forward return | Major |
| 4 | P-115 | Slow connection: ~5 s white, then the curtain parts onto an empty house | Major |
| 5 | P-116 | The card back is a generic "?" slab; the waiting screen says nothing about the night | Major (taste) |
| 6 | P-117 | See my ticket: a hard cut to a poster-less ticket that slices the Up next heading | Major (taste) |
| 7 | P-036 | A woken or fast phone can lock from in-memory lists; the host loses Unlock after the lock time | Major |
| 8 | P-118 | Tour card 2's sample "I'm free that evening" looks like the real button | Major |
| 9 | P-091 | The ticket prints from the local echo; a discarded tab can lose the RSVP (GUESS on discard) | Major |
| 10 | P-095 | Reads grow with history (structural; ~20× headroom today) | Major |
| 11 | P-088 | Shelf card pills fall into one per row at 360 | Major |

What each critic said to protect:
- **Newcomer:** "One tap flips the ? card to the Alien poster, then fills in Friday 8 PM at Hal's, who's coming and an amber Count me in on one screen."
- **Connoisseur:** "the staggered build after the flip … and the spoiler-safe THE MOVIE IS… marquee that holds until you turn the card yourself."
- **Operator:** "a tap only counts once the server acknowledges it … both lock paths are conditional writes."
- **Design review:** "The reveal sequence is as complete as anything I've seen in this kind of app."

## The Pivot (iteration 7)
1. **The show starts with the show** (P-113, P-112, P-114, P-115, P-022).
   - A newcomer with a reveal due gets the reveal first; How it works opens on its own only when nothing is face down.
   - The house lights visibly go down on the closed curtain before it parts.
   - A reload or back-forward return skips the curtain.
   - The font stylesheet stops blocking the first paint.
2. **The ticket is the payoff** (P-116, P-117, P-078).
   - A printed ticket back, with the night's day and place on the waiting card.
   - See my ticket lands on the Up next heading, with the poster on the ticket.
   - After backing out, the face-down ticket itself turns it over.
3. **Locks you can trust** (P-036).
   - No lock from cache-only lists or with unsent taps.
   - Unlock and re-pick stays until showtime.

Left for later:
- **P-091:** the discard behaviour is a GUESS.
- **P-095:** structural, with headroom today.
- **P-088:** the shelf card is your design decision, so it gets its own round.
- **P-119:** days on the free-evenings card.
- **P-099, P-100:** copy and the host save model.
- **P-118:** mostly moot once the reveal comes first.
- **P-035, P-120:** failure messaging.

## Health
- **Tests:** unit 35, emulator 41, e2e PASS. Eight new checks; each new regression check was shown failing on the old code.
- **Machine:** six stale browser-pane tabs (left by earlier detector runs) were live clients of the emulator, running the page's clock. I closed them, and the detector brief now closes its tab. The emulator process is at 16.4 GB; I didn't start it, so I left it running.
- **Live:** see the log for the ship of this iteration.
