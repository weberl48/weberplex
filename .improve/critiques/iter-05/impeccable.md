# Impeccable critique, iteration 5 (9d5a270)

Two isolated reviewers. A: design review (headless Playwright, writes blocked, its own seeds `a10-tie` and `a10-theme`; captures in the scratchpad's `assess-a10/`). B: the detector (CLI plus the in-browser overlay at 412 and 360).

## A: design review, 29/40

**Specificity:** very specific above the shelf (marquee, ticket, hosting slip, concession stripe, letter-board stats, SAMPLE stamps, reveal); from the shelf down it is competent dark UI rather than the house (the shelf card body and its pills, Sort/Show, Also planned, the locked-night card for someone not coming, Watched rows).

| # | Heuristic | Score | Key issue, and what would make it a 4 |
|---|---|---|---|
| 1 | Visibility of system status | 3 | No today mark on the calendar; the landed reel drops the tie context. |
| 2 | Match with the real world | 3 | Slip promises "It goes up on the marquee for everyone" when an earlier night holds it; Sam's own panel says "Sam is hosting"; a new night's news says "Changes to a night you're not on the list for". |
| 3 | User control and freedom | 3 | A signed-out thumbs-up strands you at the top after naming yourself; taps pass blind through the closed curtain. |
| 4 | Consistency and standards | 2 | Host tools mix commit models (time needs Change time, theme saves on change); two amber calls per block (Reveal the movie + Add to calendar; news Count me in + Next); "Gma, Kim and 1 more" beside all three chips; "thumbs-up" vs "Thumbs-ups"; `--rule-strong` 2.96:1 on velvet-3. |
| 5 | Error prevention | 3 | Blind taps through the curtain; theme menu commits with no undo. |
| 6 | Recognition rather than recall | 3 | The locked movie has no "Showing Fri" stamp on the shelf; the reel doesn't name what it beat. |
| 7 | Flexibility and efficiency | 3 | The shelf has no cap: 7 movies take ~2,400 CSS px at 360. |
| 8 | Aesthetic and minimalist design | 3 | Shelf card action pile (3-4 rows of pills); the curtain opens onto a dimmed scrim with a sheet up; tour card 1's sample marquee under the real one. |
| 9 | Help users recover from errors | 3 | Errors are toasts, not on the failed control. |
| 10 | Help and documentation | 3 | Card 3 is five dense lines; at 200% the tour body is cut behind the sticky foot. |

**Priority issues**
- **P2-A** A signed-out thumbs-up strands the person (scrollY 2715 → 325 → 0; vote top 3257 at innerHeight 800). Cause: `requireMe` plus `join()` focusing with `preventScroll`. Fix: scroll the tapped control back into view after joining. (harden)
- **P2-B** Shelf card action pile and a shelf that never ends. Fix inside the one-sided card: a full-width vote pill, one compact row for the rest, Remove in the "Added by you" line, show 12 then "Show all", a "Booked Fri" stamp. (distill)
- **P2-C** 200% text inverts the hierarchy and buries the tour: `.board h1` computes to 16px under 24px heads (`site.css:146`); the tour foot takes ~40% of the card and card 3 is cut (582 vs 383); the fresh dot sits on the numerals. (adapt)
- **P2-D** The curtain parts onto a dimmed house: the tour or news sheet is already up behind it; taps go blind through it. Fix: hold the tour, news and reveal until the curtain ends; let taps through only once it's mostly open. (animate)
- **P3-E** The reel lands without a fairness receipt: add "Won the reel over Jaws and The Grand Budapest Hotel, 1 thumbs-up each". (clarify)

**Cognitive load:** fails single focus, chunking, hierarchy at 200%, working memory (stranded vote, reel forgets contenders), minimal choices (theme menu 12, start time 9, shelf card actions up to 6, guest chips up to 30, playbill 8 + 9 cards).

**Emotional journey:** curtain (delightful, but parts onto a dimmed house) → tour (warm, clear) → the reveal is the peak → the ticket prints in → a long calm page → the shelf is the valley → the stats end warm.

**Strengths:** the reveal and ticket sequence (honest endings, the fairness line, back means not now, face down holds everywhere); the box-office day panel and hosting slip; "If it locked now".

**Persona red flags:** Casey (36px pills 6px apart; Stremio next to Plot leaves the site); Jordan (curtain, five cards, reveal, name form; the stranded vote); Sam (P2-C; only the title is in the live region after the turn); the group-text relative (8-headline playbill monthly; 12px dim meta; "Leading Oct 19" on a different night from the marquee's).

**Minor observations:** the host's automatic free mark is double-reported in news; news demo chips not centred; only the first title in a multi-movie headline gets marquee letters; "Download the invite" is 20px tall; amber edge on the news bar; tour card 1's sample marquee outshines the real one; the marquee countdown wraps to three lines at 360; Up next for someone not coming has no poster.

**Questions:** should the ticket carry the poster? Is the shelf a ballot or a library at 60 movies? Is the curtain the prelude to the page or to the reveal? Should a monthly visitor get the one-card playbill? Should host tools live only in the day panel?

**Limits:** writes blocked (post-write states read from source); back approximated with go_back; 200% emulated by viewport; no TalkBack; shared seed was being written by other agents during capture.

## B: detector

- CLI `public/index.html`: exit 0, 0 findings (DEGRADED: HTML parser modules unavailable; regex fallback).
- CLI `public/js`: exit 0, 0 findings.
- CLI `public/css/site.css`: exit 2, 3 findings, all sanctioned in DESIGN.md: side-tab `.snack` (concession stripe), 11px `.chip .n` (Courier count), `#c99a3e` (the curtain valance fringe).
- Browser at 412 and 360: the same 7 findings on 5 elements, all sanctioned: dark-glow on `.marquee`, `#board`, `.card.lead`; nested-cards `#board`; all-caps-body `p.sub`; thin-border-wide-shadow `.card.lead`; kicker-above-heading.
