---
target: public/index.html (guest page, Operate, Android 360/412)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-10-14T18-08-15Z
slug: public-index-html
---
Method: dual-agent (A: design-review subagent · B: detector subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Same-day hosting slip says "locks a day before"; it doesn't |
| 2 | Match System / Real World | 3 | News "Hal's Tuesday" three weeks out while the ribbon says "Nov 3"; "any Drama movie" when one fits |
| 3 | User Control and Freedom | 3 | Android back on the news deck marks all 11 updates read and removes the bar |
| 4 | Consistency and Standards | 3 | News theme outlined tag vs solid chip; day panel "Hal" vs "1 coming:"; two bulb buttons on one news card |
| 5 | Error Prevention | 3 | Slip misstates the lock at the moment of commitment |
| 6 | Recognition Rather Than Recall | 3 | "Which Tuesday?" in news |
| 7 | Flexibility and Efficiency | 3 | ‹ › stepping helps; the open hosting form slows the common "I'm free" |
| 8 | Aesthetic and Minimalist Design | 3 | Shelf cards 505-689px tall at 360; 120px demo box for a 64px poster |
| 9 | Error Recovery | 3 | Plain-language errors, toast-only, no inline retry |
| 10 | Help and Documentation | 2 | Sticky foot hides the payoff line of every tour card |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict

LLM: unmistakably Weberplex; face-down discipline everywhere; generic only in the tour/news sheet chrome (stock carousel), the three Stats boxes, and same-structure sections.
Deterministic: CLI index.html 0 (DEGRADED), js 0, site.css 2 sanctioned (snack stripe, 11px chip count); the font-size rule misses 12 11px sizes in font shorthands. Browser 412/360: 10 findings, 8 sanctioned (glows on marquee/board/lead card, board nesting, uppercase subline, countdown tracking, kicker); new unsanctioned cramped-padding on the "Fits Hal's Drama night" chip (0 vertical padding, label wraps) and weakly on .pick-poster. Overlays in the built-in pane's "[Human] Weberplex" tab.

## Overall Impression

30 -> 29, caused by a regression shipped in 9846143: the sticky sheet foot. Next opportunity: back shouldn't discard the news, and a joinable night should outrank housekeeping.

## What's Working

1. The hosting slip (NOW BOOKING, who's on the list, Put it on the marquee / Not yet, back folds it).
2. If it locked now: the algorithm as a sentence about people, with the shelf's ribbon and the Veto.
3. Face-down ritual through the ticket; strong 200% calendar.

## Priority Issues

[P1] Sheet foot covers the last 18px of every card (live in prod): .tour-foot sticky bottom:0 with margin -18px inside an 18px-padded scroller sticks at the padding edge. Measured: overlap 18px on all 5 tour and 9 news cards at 360 and 412, even unscrolled; taps near the bottom of Count me in hit the foot. Fix: bottom:-18px plus ~12px air above the perforation. Command: harden.
[P2] Back/Esc on the news deck marks all read (tour.js backCloses -> close('skip'); app onDone -> markSeen). Fix: back/Esc = later (bar and count stay); Got it/Skip mark read. Command: harden.
[P2] At 200% the sheet is mostly foot (~216 of 383px; label wraps 4 lines). Fix below 300px: hide dots, Back as a 44px ‹, Show me as a link in the body, label "2 of 9". Command: adapt.
[P2] Day panel shows I'm free and the full hosting form at once. Fix: panel = who's free + I'm free + ghost I can host; the slip carries time and theme as blanks; nothing written until Put it on the marquee. Command: distill.
[P2] Same-day slip misstates the lock (fixed "locks a day before", app.js:723). Fix: say it locks the moment it goes up when lockAt <= now. Command: clarify.

## Persona Red Flags

Casey: back wipes the news; Count me in half under the foot; ‹ › in the far top-right.
Jordan: tour cards hide their last line; "Leading: Blade Runner" with 0 thumbs; "any Drama movie" rule-speak; open hosting form reads as an expectation.
Sam: dialog/calendar/stars good; at 200% sheet mostly buttons; day-panel changes not announced.
Relative: playbill plus 8 housekeeping cards; "Hal's Tuesday" ambiguous; 4 s two-tap confirms with no countdown.

## Minor Observations

- News ranks a joinable night 5th, behind "filed under Watched".
- News theme as outlined tag vs solid theme chip; two bulb buttons on one news card; news poster left-aligned in a 120px box.
- Day panel on a night lacks "N coming:".
- Remove makes a 4th pill row at 360; could sit on "Added by you".
- "Show" label centers across two chip rows.
- Concessions outside the night card's border.
- "Fits Hal's Drama night" chip has no vertical padding.

## Questions to Consider

- Should a joinable night outrank everything except your own in news?
- Should the marquee say "Leading:" for a movie nobody has thumbed up?
- Could the slip be the hosting form?
- Should the sheet be program stock with a perforated foot?
