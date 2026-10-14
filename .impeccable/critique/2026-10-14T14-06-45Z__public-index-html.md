---
target: public/index.html (guest page, Operate, Android 360/412)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-10-14T14-06-45Z
slug: public-index-html
---
Method: dual-agent (A: design-review subagent · B: detector and browser subagent). Local emulator only, at 360 and 412 px; A blocked every Firestore write while rendering.

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Countdowns, "Leading:", news bar, toasts are strong. Writes have no pending or offline state, and the lock happens out of sight. |
| 2 | Match System / Real World | 3 | Warm cinema copy. Leaks: "Stremio", "Fewest have seen", "19d 12h", and the tour says "Vote" where the page says thumbs-up. |
| 3 | User Control and Freedom | 3 | Veto undo, unlock, two-tap cancel, Esc on every overlay. You can't look at a day without changing your availability. |
| 4 | Consistency and Standards | 2 | Marking yourself free has 5 labels; the lock countdown has 4 wordings; vote pills use an SVG thumb but lists use 👍; sort and filter rows look identical. |
| 5 | Error Prevention | 2 | Day taps and snack chips write on a single tap; Veto is a 28 px pill; a near-duplicate name quietly creates a new person. |
| 6 | Recognition Rather Than Recall | 3 | Name chips, faces, "Seen by" help. The sign-in bounce forgets what you tapped. |
| 7 | Flexibility and Efficiency | 2 | One scroll of about 5,300 px, no jump points except news "Show me"; no "in play for Tuesday" shelf view. |
| 8 | Aesthetic and Minimalist Design | 3 | Coherent look; dense: 5–6 pills per shelf card, about 120-word Subscribe panel, countdown shown twice. |
| 9 | Error Recovery | 3 | Plain-language errors; the sign-in bounce doesn't resume the action. |
| 10 | Help and Documentation | 3 | Replayable tour; its demos render wrong (ADMIT ONE at 1.73:1) and the last card crams six rules into about 50 words. |
| **Total** | | **27/40** | **Acceptable (top of the band)** |

Cognitive load: high, with 4 clear failures (chunking, one thing at a time, minimal choices, working memory) and 1 partial (grouping). Decision points with more than 4 options: shelf card pills (5–6 per card), sort and filter (7+ chips), browse (5 tabs plus Surprise me), name form (field plus 7 chips), concessions (6), host tools (5).

### Design Specificity Verdict

Design review: above the fold, nothing else could be Weberplex: a working marquee status board, the admit-one ticket, concession-stripe snacks. Below it, the page slides into generic dark UI. The shelf (about 1,900 px, the biggest surface) is velvet cards each carrying 5–6 identical outline pills, the Stats tiles are the most SaaS-looking thing on the page, and sort and filter are two unlabeled chip rows. "Theme everywhere, light in one place" is half done: the light discipline is excellent, but the materials stop at about four props.

Detector: index.html returned 0 findings, but the run was degraded, not clean: the skill's HTML parser modules aren't installed, so it fell back to regex. public/js had 4 advisory findings (undocumented tour-demo poster colors, tour.js:35–38). site.css had 30 findings, down to 12 after the incumbent's real radii, inks and caption size were documented in DESIGN.md. In the browser: the same 44 findings on 33 elements at 412 and 360. Real ones: 16 low-contrast (faint #8a747c on raised velvet, 4.24:1), 6 tiny-text (11 px "seen by" lines), the 10 px ribbon, and full sentences in the all-caps label style. About 14 were false positives DESIGN.md allows (marquee and board glow, letter board as a nested card, kicker, Courier tracking, leader glow) plus a monotonous-spacing artifact from the overlay itself.

Visual overlays: live in the "[Human] Weberplex" tab of the Browser pane.

### Overall Impression
The marquee and ticket are excellent and the fairness rules are visible. The calendar's main gesture does two things at once, and the reveal is spoiled three ways before it plays. Biggest opportunity: fix the calendar tap, then carry the marquee's materials down into the shelf.

### What's Working
1. The marquee is the information and the brand at once (app.js:204).
2. The fairness rules show on the page: what the people coming want, vetoes, "One veto each", plain fallbacks.
3. Live updates are well made: paint() keeps focus, typed text and the caret; overlays trap focus, close on Esc and give focus back; aria-pressed toggles; reduced motion stops the bulbs.

### Priority Issues
1. [P1] A calendar tap both selects a day and marks you free. Day cells are data-action="free", and the handler selects the day and flips availability together (app.js:803). Accidental marks give hosts wrong headcounts and send news to everyone. Fix: a tap only selects; the day detail gets one 44 px "I'm free this evening" toggle beside "I can host"; drop the hint. Command: /impeccable shape
2. [P1] Back-row text fails contrast, and the smallest text is too small. Faint on raised velvet is 4.24:1 at 9–13 px; placeholders 3.92:1; the aisle rule 1.30:1 is the only edge on pills and days; text sizes of 11, 10 and 9 px; Android's 200% text size makes the page scroll sideways (.stat-grid minmax(13rem)). Fix: faint at least 4.5:1 (one token clears 16 findings), a 12 px floor, the aisle rule toward 3:1 or a fill step, min(13rem, 100%). Command: /impeccable typeset
3. [P1] The reveal is spoiled before it plays. The reveal waits for the news cards (app.js:457), which include "Locked for <day>: <title>" with the poster (logic.js:343); the marquee prints the title as soon as the night locks (app.js:217), readable through the 0.88 scrim; the link preview shows the poster. Fix: a face-down board while a reveal is owed; a lock card without the title whose button plays the reveal; the reveal before the news cards; a near-opaque scrim; keep 53e1f21's no-stacking guarantee. Command: /impeccable delight
4. [P1] Main taps under 44 px: Count me in 34 (app.js:345), I'm free and thumbs 36, name chips 32, browse Add 30, Veto 28, top-bar links about 20. Fix: Count me in as a full bulb button, 44 px guest-list name tags, at least 36 px for Veto, Add and Post, 44 px hit areas on the top-bar links. Command: /impeccable adapt
5. [P2] Signing in forgets what you tapped: requireMe (app.js:683) bounces you to the name form, and join (app.js:700) never replays the action. Fix: hold the pending action, replay it after join, and confirm in a toast. Command: /impeccable onboard

### Persona Red Flags
Casey: day cells toggle on any tap; 32 px snack chips write on one tap; "Can't make it" sits in the Trailer and Stremio row and removes the ticket instantly; top-right links are 20 px; the news Next button moves between cards.
Jordan: six tour cards first; three labels for "I'm free"; an empty-state sentence renders as a numbered "1." item (app.js:349); the first thumbs-up is lost to the name bounce; "Stremio", "the shelf" and "Locks in 19d 12h" go unexplained.
Sam: the contrast failures; sideways scroll at 200%; the calendar is 28 tab stops with no arrow keys or skip link; "What the people coming want" is a span, not a heading; voter faces read as "J S".
Group-text relative: up to 8 news cards per visit, with a small underlined Skip; "Grandma" vs "Gma" makes a duplicate; Subscribe is about 120 words; "Open in Stremio" is opaque; "Not you?" signs out in one tap.

### Minor Observations
- The .tour-card p rule (site.css:473) recolors the demo board and ticket, so ADMIT ONE drops to 1.73:1.
- The tour says "five quick steps" (tour.js:12) but shows 6 dots; step 3 demos an offer strip the page doesn't have.
- The countdown appears twice (app.js:216, 317).
- At 360 px: "AT 9:00 / PM" splits in the marquee subline, a lone "PM" ends the night-card heading, the signed-in top bar wraps, and "Signed in as" reads like an account.
- Truncated placeholders; "Why this one?" asks before you've picked a movie; "Add a movie" has no close cue.
- Full sentences set in the all-caps label style.
- The 8-card news cap cuts shelf news first (it's still marked in place), and the buttons move as cards change height.
- 👍 emoji vs the SVG thumb; concessions show to people not coming; unrated boxes stack above the Watched history.
- Reel posters may be blank mid-spin (lazy loading); needs a real phone.
- "Most thumbs-ups" rewards volume.

### Questions to Consider
- If the link preview shows the locked poster, who is the reveal a surprise for?
- What if a calendar day were a seat you claim at a box-office window?
- Could a shelf card be a two-sided lobby card?
- Does a monthly visitor want eight cards, or one printed program?
- Should the shelf open on "in play for Tuesday"?
