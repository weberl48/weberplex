# Impeccable critique, iteration 8 (925f1d9)

A: design review (headless Playwright, writes blocked, YouTube stubbed; its own seeds `a13-tie` and `a13-plan`; captures in the scratchpad's `assess-a13/`). B: the detector.

## A: design review, 29/40

**Specificity:** highly specific; contrast passes everywhere measured (faint on velvet-3 4.82:1, ticket label 5.45, rule-strong 3.2). The world thins in the everyday parts: the shelf card's six pills, the concessions chips and field, the news bar's ghost buttons, the ragged trailer/Stremio buttons, the host-tools form, the Stats meters.

| # | Heuristic | Score | What would make it a 4 |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Stamp booked movies on the shelf; print "TIED · OCT 19" on tied cards. |
| 2 | Match with the real world | 3 | "Gma thumbed up Alien", not "1 new thumbs-up on 1 movie"; "Seen by you" beside "Added by you". |
| 3 | User control and freedom | 3 | Confirm a guest-list name tap; hide the RSVP on your own night. |
| 4 | Consistency and standards | 3 | One amber call per block (news cards); the reel behind the curtain like the reveal; one tie vocabulary. |
| 5 | Error prevention | 3 | Guard identity takeover and the host dropping out. |
| 6 | Recognition rather than recall | 3 | Label the voter faces; a selected night stacks four marks. |
| 7 | Flexibility and efficiency | 2 | Cards ~630 px tall at 360 (six pills in four rows), ~12,000 px for 40 movies; no shelf search. A tighter action grid and a title filter. |
| 8 | Aesthetic and minimalist design | 3 | A planned Up next stacks ~10 blocks; collapse concessions; fold leaders/vetoes. |
| 9 | Recover from errors | 3 | The bottom error toast eats the tap meant for what's under it; add a retry. |
| 10 | Help and documentation | 3 | Offer How it works after the ticket for a reveal-first newcomer; set button names in bold. |

**Priority issues**
- **P2 Focus rings for phone users at the peak**: script focus paints focus-visible rings on the face-down card (skews into a white parallelogram mid-flip), on See my ticket, and on tour Next. Move the card's ring inside the bulb ring; track input modality. (polish)
- **P2 The tie reel lacks the curtain's dramaturgy**: the curtain parts onto a lit page, then the 97% scrim snaps on with the page ghosting through. Mount it behind the curtain; a fully dark scrim. (animate)
- **P2 The booked movie unmarked; ties wear two crowns**: Alien (4 thumbs, booked) uncrowned with a live thumb while Jaws and Forrest Gump wear LEADING; Up next says TIED. BOOKED ribbon; TIED wording. (clarify)
- **P2 Up next and the shelf card dense at 360**: collapse concessions; a fixed veto column; a two-row card action grid, Remove as a link. (distill, layout)
- **P3 News cards**: two amber calls; inert chips look like buttons and are top-aligned; "1 new thumbs-up on 1 movie"; no rise on the sheet. (clarify)

**Cognitive load:** fails single focus, chunking, minimal choices, recognition (unlabelled faces; stacked calendar marks).

**Emotional journey:** arrival builds anticipation (parts ~1.3 s, gone ~2.6 s, no jank); peak = face-down card, spotlight turn, landing as a sentence, the ticket printing in. Dips: the tie's cut to the scrim; a news sheet popping in with no motion; the admin feel of the planned card and the shelf; "why isn't Alien leading?"; declining then being asked to Count me in by the news.

**Strengths:** the reveal and ticket (the card back on the ticket "a smart recovery"); the hosting slip and day panel; robust at 200%.

**Minor:** the reveal box shifts ~12 px when "5 coming…" wraps; the screening room's seats pop in before the lights-down finishes, and the portrait room is a small screen in much dark (acceptable, fullscreen exists); "SHOW" floats between chip rows; trailer/Stremio buttons wrap raggedly; Stats meters are decorative amber; no today mark; first paint ~0.59 s, the curtain's rules inside the render-blocking site.css (inline them to paint at first byte; Google Fonts isn't the cause).

**Limits:** no real device (focus-ring and cold-network timing from headless Chromium); writes blocked.

## B: detector

- CLI `public/index.html`: exit 0, 0 (DEGRADED). `public/js`: exit 0, 0. `public/css/site.css`: exit 2, 6: the five sanctioned ones (`.snack` stripe, 11 px count, `#c99a3e` valance and screen frame, 1.125rem heads below 300 px) plus `rgba(200, 215, 255, 0.16)`, the screen's projection glow, described in DESIGN.md but undocumented as a value (documented in c2ef671).
- Browser at 412 and 360: the same sanctioned set (marquee, board, two lead cards' leader glow, kicker, all-caps subline).
- Tabs closed afterwards.
