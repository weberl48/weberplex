---
target: public/index.html (guest page, Operate, Android 360/412)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-10-14T16-43-31Z
slug: public-index-html
---
Method: dual-agent (A: design-review subagent · B: detector subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | One news batch counts three ways: bar "13 updates", deck "1 of 9", playbill 11 lines |
| 2 | Match System / Real World | 3 | "Leading TUE" for a night 20 days out; "since Wed 12:28 PM" on a Wednesday; Stremio unexplained |
| 3 | User Control and Freedom | 3 | Back closes slip/overlays, Undo veto; news Skip and Got it both mark all seen, no "later" |
| 4 | Consistency and Standards | 3 | Planned nights show bare "H Hal" vs locked "N coming:"; news sentences in Limelight; Sort menu shaped as a chip |
| 5 | Error Prevention | 4 | Hosting slip, lookalike check, two-tap drop-out, future-time check |
| 6 | Recognition Rather Than Recall | 3 | Theme night's eligible movies invisible (no genres on cards, no theme filter) |
| 7 | Flexibility and Efficiency | 2 | Marking several evenings: tap day, panel, free, back up to the grid, each time |
| 8 | Aesthetic and Minimalist Design | 3 | Shelf cards dominated by equal pills plus "Nobody has marked it seen" |
| 9 | Error Recovery | 3 | Plain-language errors that stay until tapped |
| 10 | Help and Documentation | 3 | Replayable tour, inline hints; nothing explains how a theme narrows the pick |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

LLM: authored for this product through the calendar (marquee kicker, "Leading: Jaws", ticket, NOW BOOKING slip, letter-board stats, concession stripes, the If-it-locked-now mini lobby card). Character fades below: shelf cards wrap into 3 rows of identical outlined pills, Watched is stacked velvet boxes, tour/news sheets are a dark card with an amber 1px edge (the closest thing to generic dark-mode SaaS).

Deterministic: CLI index.html 0 (DEGRADED regex fallback, undercount), public/js 0, site.css 3: side-tab .snack (sanctioned concession stripe), 11px .chip .n (sanctioned), .d-num clamp endpoint 1.1rem off-ramp at site.css:481 (real; from round 3's 200% calendar rule). Browser at 412 and 360: same 9 findings on 7 targets (dark-glow x3 marquee/board/lead card, nested-cards #board, all-caps-body p.sub, wide-tracking span.count, cramped-padding .pick-poster, gpt-thin-border-wide-shadow lead card, kicker-above-heading), all sanctioned by DESIGN.md. Detector surfaced a doc contradiction: leader glow is in the Shadow Vocabulary but the Don'ts forbid a second glowing element at rest.

Overlays: injected in the built-in browser pane tab "[Human] Weberplex" (laid out at 360, viewport since reset to desktop).

## Overall Impression

29 -> 30. Peaks protected (face-down movie, reveal hands focus to the ticket, reasons in names). Biggest opportunity: the themed-night pick's explanation disagrees with the page's own Stats. Two issues this round were regressions/blind spots from round 3 (tour demo calendar; 200% overlays unmeasured).

## What's Working

1. Marquee answers what/when/where in the first 360px viewport; "The movie is…" protects the reveal.
2. Reasons in people's names on a mini lobby card wearing the shelf ribbon; serves "the pick feels fair".
3. Guard rails without accounts: 44px name tags, lookalike check, paper hosting slip that Android back folds away.

## Priority Issues

[P1] Themed night says "the group's favorite" when it means the favorite among theme-fitting movies. pickable() (logic.js:143) narrows to the theme before basis 'everyone'; app.js:420 copy doesn't name the theme; genres never shown on cards; Show chips are shelf tags only (app.js:724). Seed: Jaws leads Hal's Drama night while Stats/Most wanted say Paddington (Jaws is Drama only via the e2e stub genre; mechanism holds on any themed night). Fix: "…so it goes to the favorite among Drama movies"; ribbon "Leading Nov 3"; a "Fits Hal's Drama night" Show chip while a themed night is planned. Command: clarify.

[P1] Walkthrough breaks at narrow widths. 200% text: Skip wraps "Sk/ip"/"S/ki/p", demo marquee "WEBE/RPLE/X", Next/Got it below the sheet's scroll on card 1 (z200-out-tour1.png, z200-news-card1.png). Plain 360: tour demo calendar shows bare dates because .tour-cal is also a .cal size container under 280px (out-360-tour-card3.png; round-3 regression). Fix: tour-top buttons flex:none + nowrap; sticky .tour-foot with perforated edge; drop the demo below ~300px; scope the container rule to #calendar. Command: adapt.

[P2] News deck counts three ways (items 13 / cards+playbill 9 / playbill lines 11); sinceText() always prints a weekday ("since Wed" on Wednesday); sentence headlines in Limelight against the Marquee Letter Rule; the not-on-the-list night card has no Count me in. Fix: one unit everywhere; "since 12:28 PM today"; prompt-style headlines with only names in Limelight; RSVP on that card. Command: typeset, clarify.

[P2] Marking several evenings costs two taps and two scrolls each (tap day, panel scrolls in, free, scroll back to grid). Fix: ‹ › stepping arrows in the day panel header; slip names who's free ("Kim and Sam are free, so they're on the list"). Command: shape.

[P2] Shelf-card pills outweigh the movie: 5-6 equal pills wrap to 3 rows at 360/412 (app.js:765-775); "Nobody has marked it seen" on nearly every card; Plot has no visible open state. Fix within the user's chosen layout: "Hide plot" when open; seen line only when someone has seen it; optionally Trailer · Stremio · Plot as one credit line. Command: distill.

## Persona Red Flags

Casey: return visit opens on up to 9 cards; Skip marks "Rate it while it is fresh" seen; thumb travel grid <-> panel; Trailer/Stremio (leave the site) beside the 36px Seen it.
Jordan: is "H Hal" on a planned night host or guest?; "LEADING TUE" which Tuesday?; what is Stremio?; tour calendar demo shows dates only.
Sam: calendar radiogroup good; stars role=radio with no arrow keys = 5 Tab stops (app.js:555); at 200% sheets break, calendar free vs night by hue alone, key lists counts the cells hide.
Group-text relative: monthly visit opens on an 11-line playbill in display type; much 12px text; "I'm free that evening" vs "Count me in" for one act; Subscribe fallback "⋮ → Desktop site" beyond them.

## Minor Observations

- At 412 the countdown chip splits "Leading:" from "Jaws".
- Tour demo shows filled "Seen it"; real done state is "Seen ✓".
- .sort-pick is a 999px pill (site.css:243) so Sort reads as a chip, against DESIGN.md.
- Round-3 leftovers: duplicate 900px pleats media query (site.css:63-64), duplicate comments (54-55, 543-544).
- .d-num 1.1rem off-ramp; DESIGN.md contradiction on the leader glow.
- If-it-locked-now reason runs 3-4 lines at 360.
- Watched stacks rating stub, Also to rate, review list, past nights with no sub-labels.

## Questions to Consider

- If free and coming are one record, should that act wear one name everywhere?
- On a themed week, should movies that can't win dim on the shelf?
- What would a "closing credits" letter board (who came, snacks, stars) do for the end of the ritual?
- On a return visit, should the page open on the marquee plus one line ("3 things changed") instead of a deck?
