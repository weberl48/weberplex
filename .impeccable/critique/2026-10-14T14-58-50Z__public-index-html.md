---
target: public/index.html (guest page, Operate, Android 360/412) after the 9-command pass
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-10-14T14-58-50Z
slug: public-index-html
---
Method: dual-agent (A: design-review subagent · B: detector and browser subagent). Local emulator only; every Firestore write was blocked during the renders. Run after the shape, adapt, bolder, typeset, delight, onboard, clarify, harden and polish pass of 2026-10-14.

### Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | The projected pick is invisible when the people coming have no qualifying thumbs; the shelf crowns Paddington but Hal's Drama night would pick Jaws. |
| 2 | Match System / Real World | 3 | "Movie locks in 19d 11h" is shorthand; "I'm free" quietly means "I'm coming"; the turn icon reads as refresh. |
| 3 | User Control and Freedom | 3 | Android back never closes an overlay; hosting has no confirmation. |
| 4 | Consistency and Standards | 3 | Two amber buttons in the day panel; tour demos don't match the real controls; ★ as text. |
| 5 | Error Prevention | 3 | "I can host" is a single tap that alerts the group. |
| 6 | Recognition Rather Than Recall | 3 | Working out the fallback pick needs the theme and genres in your head. |
| 7 | Flexibility and Efficiency | 3 | News cards can't be acted on. |
| 8 | Aesthetic and Minimalist Design | 3 | Up next stacks six jobs; Watched opens every rateable night's form at once. |
| 9 | Error Recovery | 3 | Errors live in toasts that vanish after 5.2 s. |
| 10 | Help and Documentation | 3 | Veto and theme rules are thin; two demos don't match the page. |
| **Total** | | **29/40** | **Good** |

Cognitive load: high, 4 of 8 checks fail (chunking, one thing at a time, minimal choices, working memory). Decision points over 4: shelf toolbar 8–11, Watched 21, host tools 5, concessions 6, card back 5, theme select 10+.

### Design Specificity Verdict
Design review: very specific. The ticket, lobby cards, letter-board stats, guest-list tags and concession stripe are this group's own props, and only the marquee animates. Still generic: the tour and news card carousel, the Watched form, the stat cards and Up next panels, a day panel that doesn't look like a window, and amber diluted across five fills on one shelf screen.
Detector: browser 44 → 9 findings on 6 elements, all but one sanctioned by DESIGN.md (the exception is a monotonous-spacing heuristic); site.css 30 → 7 (the snack stripe, two inks with no token, four off-scale sizes); public/js 4 → 0; index.html 0 but a degraded scan (HTML parser modules missing).
Overlays: in the "[Human] Weberplex" tab of the Browser pane.

### Priority Issues
1. [P1] What would be picked is hidden, and the shelf contradicts it: Up next lists only attendee-thumbed movies (app.js:380); "Leading:" is blank (app.js:238); the shelf crowns Paddington while the pick for a Drama night is Jaws; there's no veto on the real front-runner. Fix: lead Up next with the projected pick, its basis and a Veto; always show Leading on the marquee; scope the shelf ribbon to the next night. Command: /impeccable clarify
2. [P1] Hosting is one tap and the day panel has two amber buttons (app.js:949). Fix: make I can host a ghost button that opens a hosting slip on ticket paper and confirms with "Put it on the marquee"; at minimum, a second tap. Command: /impeccable harden
3. [P2] Android back never closes an overlay (no history handling); play() marks the reveal seen before it shows (app.js:481). Fix: a history entry per overlay, closed on back; mark seen when the reveal finishes. Command: /impeccable harden
4. [P2] News cards: night items always first so new movies overflow; the fixed card height leaves cards half empty; movie cards have no thumb. Fix: rank by impact, size cards to their content with the nav pinned, add a thumbs-up. Command: /impeccable distill
5. [P2] The lock toast names the movie (app.js:973) and toasts draw above the reveal backdrop (z-index 50 against 40 and 41); the reveal ends on "OK". Fix: "Locked. Your reveal is next."; hide toasts during the reel and reveal; end on "See my ticket". Command: /impeccable delight

### Persona Red Flags
Casey: news cards cover the marquee; Skip is top-right; back leaves the site; the first thumbs-up is about 1,570 px down; dropping out gives no confirmation.
Jordan: five tour cards first; the card-4 demo doesn't match the real card; "free" and "Count me in" are the same record; expects Paddington, gets Jaws.
Sam: focus drops to body after That's me; days announce as toggles; stars read glyph by glyph; at 200% the calendar cells are 21 px, the name collapses, and the marquee is about 1.4 screens.
Relative: up to 8 cards; the keyboard covers the guest list on a new phone; "19d 11h" jargon; "Add to calendar" downloads an .ics (unverified on a device).

### Minor Observations
Introduced this round: turn icon covers titles and reads as refresh; .program-list overflow; "Count yourself in" twice; empty groove line on the stats board; days use the weaker --rule edge; half-empty news cards. Older: amber default chips; every rateable night's form at once; a flex gap splits "Hal" from "is hosting"; the tour ticket splits "8:00 / PM"; the review placeholder is cut off; the news label wraps; possible repeated aria-live announcements.

### Questions to Consider
- Is "free" the same as "coming"?
- Whose crown is "Most wanted": the shelf's or the next night's?
- Could "what changed" be a lit line on the letter board instead of a modal?
- Between the lock and showtime, should the ticket be the hero?
