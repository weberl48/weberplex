# Impeccable critique, iteration 6 (83e5809)

Two isolated reviewers. A: design review (headless Playwright, writes blocked; its own seeds `assess-a11-tie` and `assess-a11-plan`; the curtain filmed with a CDP screencast, normal and throttled; captures in the scratchpad's `assess-a11/`). B: the detector (CLI plus the in-browser overlay at 412 and 360).

## A: design review, 30/40

**Specificity:** strongly specific; the marquee world carries the moments that matter: curtain parts onto the face-down card, the landing as a sentence in people's names, the admit-one ticket, the NOW BOOKING slip, the letter board. It drifts toward generic dark UI in the shelf card body and pill rows, the host-tools row, the add box's browse chips, the Stats tiles, the news demo chips, and the "Reveal the movie" button.

| # | Heuristic | Score | Key issue, and what would make it a 4 |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Throttled (300 ms / 60 KB/s), the curtain parts at ~5.2 s onto "Warming up the projector…" with Up next, the calendar and the shelf empty. Dressed placeholders in house materials while lists load. |
| 2 | Match with the real world | 3 | Your own night says "Sam is hosting" (app.js:830), "at Sam's"; "5 coming: Gma, Hal…" vs the reveal's "you"; "Leading Oct 19" next to an Up next about Oct 16; "the movie locks" unexplained in the tour. |
| 3 | User control and freedom | 3 | A guest-list chip joins as that person at once (only fix: two-tap Not you?); a pitch can't be edited after adding. |
| 4 | Consistency and standards | 3 | Host tools: Change time button vs theme saves on change; two amber calls per block (Reveal the movie + Add to calendar; news Count me in + Next); inert news `span.chip`s look tappable; the locked-night heading switches from Limelight to Archivo when you're not coming. |
| 5 | Error prevention | 3 | The pitch is written before the pick ("Why this one? … Write it before you pick", index.html:128). |
| 6 | Recognition rather than recall | 3 | The free-evenings news card names people, not days; Show me only scrolls; the green fresh dot isn't in the key. |
| 7 | Flexibility and efficiency | 3 | The curtain costs ~2.6 s on every load, reloads and back-forward returns from Stremio/YouTube/Calendar too. Skip or shorten it for `navigation.type` reload/back_forward (no storage needed). |
| 8 | Aesthetic and minimalist design | 3 | Shelf cards 487-560 px tall at 360 with 4-6 pills (7 movies = 2,410 of 5,778 px); Watched's aside repeats Stats. |
| 9 | Recognize, diagnose, recover | 3 | Fallback errors are generic; name what changed ("Hal locked Friday a moment ago"); keep typed text. |
| 10 | Help and documentation | 3 | Tour card 2 embeds button names in prose; vetoes, themes and the Leading ribbon never explained. |

**Priority issues**
- **[P2] Shelf card action rows don't hold their shape at 360**: on Sam's Alien card every pill took its own row (675 px tall). Vote pill full-width at the foot, a fixed 2×2 for the rest (Plot keeps its label, aria-expanded), "+1" as a dot, Remove into "Added by you · Remove". (layout)
- **[P2] On a slow connection the curtain breaks its promise at both ends**: ~5 s white (render-blocking Google Fonts CSS, index.html:19, inferred), then the curtain parts onto an empty house. Load fonts non-blocking; dressed loading states. (harden, optimize)
- **[P2] Up next buries the calendar for a ticket holder**: the calendar at 1,355 px at 360. Fold Concessions to one line, Download the invite behind the calendar fallback, collapse Also planned. (distill)
- **[P2] The free-evenings news card makes you recall; its chips misrender** (logic.js:427, news.js:12): print the days as small `.day` cells; Show me selects the first; inert names as stamps. (clarify)
- **[P3] Turning the movie over after backing out is a generic button** (app.js:585-586): make the face-down ticket itself the control ("TAP TO TURN IT OVER" stamp). (delight)

**Cognitive load:** fails chunking (Up next ~11 controls for a ticket holder; shelf card up to 6 pills), minimal choices, working memory (pitch before pick; news without days; the Leading crown on another night); partial progressive disclosure.

**Emotional journey:** peak = curtain, lights down, card in chasing bulbs, the turn, the title finishing "The movie is…" with names, the ticket printing in. Valleys = first-timer curtain + 4 tour cards before content; the long shelf; weak signal white screen then empty house; a news sheet after the curtain every time there's news.

**Strengths:** the reveal sequence ("as complete as anything I've seen in this kind of app"); fairness legible in names; robust at Android sizes (no sideways scroll at 206 px, ticket restacks, calendar falls back, back closes every overlay, unsent taps reported honestly).

**Persona red flags:** Casey (Download the invite 113×20; 36 px pills 6 px apart; curtain on every reload); Jordan (curtain, 4 cards, reveal, Count me in, name form; "the movie locks" unexplained; "Leading Oct 19" vs Friday's Alien; no "booked" stamp on Alien; "That's me" for a new name; Stremio unexplained); Sam (200% tour body under its sticky foot, 487 vs 385; inert chips look focusable; landscape reveal scrolls "The movie is…" off the top; controls under the curtain Tab-reachable for ~1.3 s); the group-text relative (13 px dim key facts; 12 px meta; full news deck monthly; weak signal white then empty).

**Minor:** host-tools label wraps; If-it-locked-now ribbon covers a quarter of the poster; "WHAT THE PEOPLE COMING WANT one veto each" breaks mid-note; day-panel date wraps beside the arrows; reel scrim lets the face-down marquee ghost through; "Not sent yet" in Spilled Soda before it's a failure; Watched aside duplicates Stats; five browse chips plus Surprise me; taken tiles at 0.55 opacity.

**Questions:** for a ticket holder, is the visit about Friday or the next free evening? Should the curtain play on a reload or back-forward return? Is the shelf a ballot or an archive at 60 movies? Could the ticket be where you turn the movie over? Is "the movie locks" the group's word?

**Limits:** writes blocked (post-write states read from source); back via history.back(); synthetic throttling; white-screen cause inferred; the emulator is faster than production.

## B: detector

- CLI `public/index.html`: exit 0, 0 (DEGRADED: HTML parser modules unavailable; regex fallback, undercount).
- CLI `public/js`: exit 0, 0.
- CLI `public/css/site.css`: exit 2, 4, all sanctioned in DESIGN.md: side-tab `.snack` (concession stripe), 11px `.chip .n`, `#c99a3e` (valance), 1.125rem section heads below 300px. The 11px step and `#c99a3e` are in DESIGN.md's prose but not its front-matter tokens.
- Browser at 412 and 360: the same 7 findings on 5 elements, all sanctioned (marquee, board, leader glow, kicker, all-caps subline). Two text-occlusion findings on chips inside the closed "Add a movie" details are an artifact (not rendered).
- The tab was closed afterwards (no live client left on the emulator).
