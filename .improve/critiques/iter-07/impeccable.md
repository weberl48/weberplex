# Impeccable critique, iteration 7 (8ea7b87)

Two isolated reviewers. A: design review (headless Playwright, writes blocked; its own seeds `assess-a12-tie` and `assess-a12-theme`; captures in the scratchpad's `assess-a12/`, with probes `probe_curtain.py`, `probe_nightface.py` and `probe_spoil.py`). B: the detector.

## A: design review, 29/40

**Specificity:** highly specific (letter board, admit-one ticket, NOW BOOKING slip, concession stripe, letter-board stats, the card back printed like a ticket); weak spots are the shelf card's pill cluster, the host-tools row and the filter chips. "The problems that matter are in execution, not identity: a cascade bug, an animation restart and a spoiler leak."

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | On a slow first load the curtain parts, snaps shut and parts again; "Not sent yet" uses the error toast. |
| 2 | Match with the real world | 3 | News in counts ("1 new thumbs-up on 1 movie"); hosts see "Sam is hosting" / "at Sam's". |
| 3 | User control and freedom | 3 | "Got it" can't be undone; no "see the reveal again". |
| 4 | Consistency and standards | 2 | Two host commit models; "you" vs "Sam"; two amber calls on news night cards; the Up next card broken by a cascade bug. |
| 5 | Error prevention | 3 | The host can drop off their own night; quick-snack chips add instantly, even a second Popcorn. |
| 6 | Recognition rather than recall | 3 | Bare initials under shelf cards, face circles 1.08:1 against the card; "+1" unexplained. |
| 7 | Flexibility and efficiency | 3 | Marking several free evenings takes a tap and a toast each; a long host path. |
| 8 | Aesthetic and minimalist design | 3 | Shelf card pills in three ragged rows at 360; ~13 host controls; Stremio and "5 coming" outside the Up next card for a non-guest. |
| 9 | Recovering from errors | 3 | Errors are toast-only, away from the control. |
| 10 | Help and documentation | 3 | At 200% every tour card hides 2-4 lines under the sticky foot (487 vs 383); a first-timer with a reveal due never gets How it works that visit. |

**Priority issues**
- **P1 Curtain stutter on slow first loads**: the CSS fallback started parting at 2.5 s after styles applied; `.open` swapped `animation-name` and restarted it (app.js delayed 3 s: scaleX 0.15 at 3.91 s, back to 1 at 4.04 s, parted again to 5.19 s). Fix: one clock. (animate)
- **P1 Face-down leak through news and the shelf**: "1 new thumbs-up on 1 movie — Friday's movie" with Show me to the shelf, where the only "+1" sits on Alien; Alien tops Most wanted with no crown. Fix: leave it out of vote news, suppress its marks, or print its shelf card face down. (harden)
- **P2 Night card broken by the cascade**: `.host-card { display: grid }` overrides `.night-face { display: flow-root }`, so the art sits alone top-left; Stremio and "5 coming" hang outside the card. (layout)
- **P2 Ticket at 360**: the 64 px poster plus the 74 px stub leave a ~60 px value column; When wraps to 4 lines, Running to 2. (layout)
- **P2 Host tools**: two commit models in one wrapping row; "Sam is hosting" to Sam. (clarify)

**Cognitive load:** fails chunking (shelf pills, Show row), grouping (host tools), minimal choices (Add a movie 6 routes; ~10 shelf controls before the first card; card actions up to 6; host tools 5-6; a coming guest's planned-night card 8+).

**Emotional journey:** peak = the reveal (dim, part onto the card, flip, bulbs, the title as a sentence); strong end = the ticket printing under Up next. Valleys: the slow-load stutter; a first-timer asked to Count me in before knowing the site; the broken non-guest card; the pill-heavy shelf; "1 new thumbs-up on 1 movie".

**Strengths:** the reveal and reel as a complete ritual with face-down discipline nearly everywhere; the material system executed in earnest (ticket stacks below 340 px, no sideways scroll at 206 px); fairness in people's names.

**Persona red flags:** Casey (36 px pills, 20 px "Download the invite", ~43 px calendar cells); Jordan (curtain, card, Count me in, name form; no How it works that visit; unmarked button names in tour copy); Sam (tour lines hidden at 206 px; How it works gone from the top bar below 300 px; a cream focus ring on the card at load; 9 px "Tap to turn it over"; fresh dots over the numerals at 200%; no `<main>`); the monthly relative (counts not names; bare initials; the 4-line When).

**Minor:** news chips not centred; a lone thumb pill as a news picture; "thumbs-up" vs "THUMBS-UPS"; Seen it styled like the links; the solid "Recent favorite" tag beside your amber thumb; the veto note breaking mid-phrase; a dangling "·" in the countdown; the reel scrim showing the page through; "0 free" day labels.

**Questions:** a face-down card in the shelf slot? Does the curtain need to wait for data? Should How it works follow the name form for a reveal-first newcomer? Could the hosting slip be the host tools? Why numbers rather than names for a group of six?

## B: detector

- CLI `public/index.html`: exit 0, 0 (DEGRADED). `public/js`: exit 0, 0. `public/css/site.css`: exit 2, 4, all sanctioned (`.snack` stripe, 11 px `.chip .n`, `#c99a3e`, 1.125rem section heads below 300 px).
- Browser at 412 and 360: the same 8 findings on 6 elements: the 7 sanctioned ones plus **undersized-ui-text on `span.tap`** (the card back's 9 px "Tap to turn it over"), a real breach of DESIGN.md's 11 px floor.
- The tab was closed afterwards.

## Fixed before shipping (63190dd)
The curtain's one clock, the face-down shelf and vote news, the night-card cascade, the ticket's details clearing the poster at 360, and the 11 px card-back label.
