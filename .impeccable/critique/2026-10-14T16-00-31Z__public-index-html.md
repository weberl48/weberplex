---
target: public/index.html (guest page) after the second command round, deployed 45dc333
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-10-14T16-00-31Z
slug: public-index-html
---
Method: dual-agent (A: design-review subagent · B: detector and browser subagent). Local emulator only, writes blocked. Run after the second command round (harden, clarify, distill, delight, bolder, adapt, typeset, polish), deployed to production as 45dc333 on 2026-10-14.

### Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Count me in" and "I'm free" give no confirmation; a day tap can change a panel that's off-screen. |
| 2 | Match System / Real World | 3 | The "Their thumbs…" why-line has a pronoun that may not refer to anyone (app.js:401). |
| 3 | User Control and Freedom | 3 | Back doesn't turn a flipped card over; back after a jump link does nothing, then leaves the site. |
| 4 | Consistency and Standards | 3 | "Calendar" link vs "When are you free?" heading; the theme saves at once while the time needs "Change time". |
| 5 | Error Prevention | 3 | Every theme-menu change writes and creates a news card. |
| 6 | Recognition Rather Than Recall | 2 | The calendar's six kinds of mark have no key. |
| 7 | Flexibility and Efficiency | 3 | Five free evenings take ten taps plus scrolling. |
| 8 | Aesthetic and Minimalist Design | 3 | Up next stacks dim hints and has no poster. |
| 9 | Error Recovery | 3 | One fallback can show raw error text (ui.js:317). |
| 10 | Help and Documentation | 3 | The tour demo says "FRI 17"; October 17, 2026 is a Saturday. |
| **Total** | | **29/40** | **Good** |

Cognitive load: moderate, 3 of 8 checks fail (chunking, minimal choices, working memory).

### Design Specificity Verdict
Design review: clearly this product's own (status on the marquee, dog-eared lobby cards, the NOW BOOKING slip, the face-down marquee). Generic remnants: stat cards, the sort, filter and review controls, and above all "If it locked now" as a text box with no poster.
Detector: site.css 2 (both sanctioned), js 0, index.html 0 (degraded scan), browser 8 at 412 and 360, all sanctioned glow and letter-board treatment; the rest were the detector's own labels and hidden controls.

### Priority Issues
1. [P1] The calendar is unreadable at 200% text: cells 21×22 px, dates clipped by the fixed shape and overflow:hidden (site.css:505). Fix: at narrow widths drop the fixed shape and the month and count lines, keep cells at least 44 px tall, or switch to one week per row. Command: /impeccable harden
2. [P2] "If it locked now" is plain text with an unclear why-line. Fix: a mini lobby card with poster and "Leading" ribbon; reasons with names; fold "One veto each" into the Veto button. Command: /impeccable clarify
3. [P2] The calendar has no key, and its action can be below the fold. Fix: a one-line printed key; scroll the day panel into view when needed. Command: /impeccable clarify
4. [P2] Back is half handled: jump links add history entries, and with manual scroll restoration back does nothing, then exits; a flipped card ignores back. Fix: jump links without history entries; back turns a card over and folds a slip. Command: /impeccable harden
5. [P2] News can still be a 9-card wall (mostly another night's changes); "Show me" restarts the deck. Fix: one combined card per night you're not coming to; lead with what needs your tap; remember your place. Command: /impeccable distill

### Persona Red Flags
Casey: a day tap changes an off-screen panel; back after a jump link; 36 px inline Veto; sort chips wrap at 360.
Jordan: "FRI 17" mismatch; tour card 3's copy vs its demo; unclear "Their thumbs…"; link vs heading mismatch.
Sam: no radiogroup on #calendar; day-panel changes not announced; at 200% clipped dates, three-row top bar, playbill opens at its bottom; paper pill borders 2.69:1.
Relative: "13 things since…"; unexplained calendar digits; Stremio unexplained; card back cramped at 360; no confirmation on dropping out.

### Minor Observations
Introduced this round: backing out of a reveal before it turns shows the title for the rest of the visit (app.js:549); "Nosferat u" breaks in the tour demo; paper pill borders 2.69:1. Older: the .ics ignores face-down; no confirmation on Count me in or I'm free; vote buttons misaligned across a shelf row; a second animated marquee in the tour demo; curtain pleats on phones; empty band in review boxes.

### Questions to Consider
- Should tapping your own evening be the free toggle itself?
- A face-down ticket printed the moment you're counted in?
- One combined card for a night you're not coming to?
- Sort and Show behind one chip?
