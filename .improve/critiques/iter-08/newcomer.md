# Iteration 8: newcomer critique (Gma)

Persona: Gma, 70s, taps the link in the family group text on a mid-range Android phone with the system text size turned up. She has never seen the site, never reads instructions, and gives up after about ten seconds of confusion. Her goal is to say she's free Friday and find out what movie they're watching.

Inputs used: `.improve/evidence/iter-08/run-s1-1/` (gma-*, gma200-*, frames/gma-open-*, frames/gma-reveal-*), both contact sheets, the Gma sections of `transcript.md`, and the timing table in the brief.

**Verdict:** she gets there. Tap the card, tap **Count me in**, type "Gma", tap **That's me**. That's three taps and one word, and the movie, the day, the host and who's coming are on screen before she's asked for anything. Nothing in her core flow dead-ends. What hurts is everything around that path: about 4 s of ceremony before the first button she can act on, one toast that covers content through six screenshots, jargon buttons right under her ticket, and a second Friday with its own **Count me in**.

---

## Walkthrough

### 0. Tapping the link: the curtain (`frames/gma-open-*`, contact sheet `gma-open-contact.png`)
- **0081ms:** a full white frame (`gma-open-0081ms.jpg`) before a page that is otherwise near-black. On a phone this is a white flash. It may be the browser's blank page before the first paint, so it's unconfirmed.
- **0588 → 1271ms:** the closed red curtain doesn't change. The four frames (`0588`, `0938`, `1104`, `1271`) are effectively the same: no words, no name, nothing saying who sent this. For about 0.7 s (frames 0588 to 1271), and probably longer since the frame before is the white flash, Gma is looking at a still red rectangle. That reads as "still loading", not as a show starting.
- **1421 → 2537ms:** the curtain parts and the card shows. The valance is still hanging at 2537 and gone by 2985.
- Timing: **2614 ms** median from the tap to the card in view.
- **Rating: slow.** The parting is lovely. The roughly 0.7 s of still curtain before it moves is dead air at the very start of her ten-second patience.

### 1. First screen (`gma-01-first-screen.png`)
- "The movie is…", a crimson face-down card with **WEBERPLEX**, a big "?", and **FRIDAY 8 PM / AT HAL'S**. Underneath: **TAP TO TURN IT OVER**.
- Good: she already has half her answer (Friday, 8, Hal's) without touching anything. No other product's link preview opens like this. It passes the generic test.
- Weak: the only instruction is small, widely spaced amber capitals under the card (`gma-01`, about 13 px CSS). The card doesn't invite a tap. All six `gma-reveal-wait-*` frames (0000 to 1008ms) are identical: no pulse, no wiggle, no glint. The bottom ~40% of the screen is empty black. She'll most likely tap the card because it's the only thing there, but nothing moves to tell her to.
- **Rating: none to minor (confusing).** It works because it's the only thing on the screen.

### 2. The turn (`frames/gma-reveal-turn-*`, contact sheet `gma-reveal-contact.png`)
- **0179ms:** the card turns edge-on *inside* a bulb frame that stays put, so for a moment the frame is empty and the card looks like a sliver falling out of it (`gma-reveal-turn-0179ms.png`). Then the Alien poster lands (0343 to 0534) and the bulbs dim (1114 to 1519).
- The title fades in from 0716. Tap-to-title is **686 ms**, which is fine.
- After the title, the text arrives one line at a time: date (0915 to 1114), "3 coming: Hal, Jo and Sam" (1319), "Hal and Sam thumbed it up" (1519). **At 1519 ms there is still no button** (`gma-reveal-turn-1519ms.png`). Adding the 2.6 s curtain, it's roughly 4+ s from opening the link to the first thing she can tap that does what she came for.
- **Rating: slow (minor).** The flip is a real signature moment. The empty frame at 179 ms is the one ugly frame (taste, polish).

### 3. Reveal landed (`gma-02-reveal-landed.png`)
- **Alien** · "Friday 8 PM at Hal's" · H J S avatars, "3 coming: Hal, Jo and Sam" · "Hal and Sam thumbed it up" · **Count me in** (amber, primary) / **Not this time**.
- This is the best screen in the product for her. It answers her question in plain words, and the buttons are big and say exactly what she wants to do. "Count me in" means "I'm free Friday" in her own terms.
- **Rating: none.**

### 4. Name (`gma-03-name-form.png`)
- The reveal is gone and she's dropped on "Put your name on the guest list" / "Your first name is fine; this phone remembers it." / [Your name] / **That's me** / "One step left: your name, and you're on the list." / "On the list already? Tap your name." with chips **Fran, Hal, Jo, Kim, Sam**.
- "One step left" is right, and so is "Your name first, just above" on the Up next card below.
- Confusing: **"list" means two things on one card.** "Guest list" and "you're on the list" mean *coming Friday*. "On the list already?" means *anyone the site knows*. That list includes Fran and Kim, whom the reveal she just saw didn't count as coming ("3 coming: Hal, Jo and Sam"). For Gma, the guest list now has five names on it.
- Fragile (GUESS): five big chips sit just under the button she needs. One stray tap on **Hal** probably makes her Hal on this phone. The way back is a small underlined **Not you?** in the header (`gma-04`). To confirm: tap a chip in a fresh context and see what it does and how she'd get out.
- Timing: name to ticket **851 ms**. Fine.
- **Rating: confusing (minor).**

### 5. Ticket (`gma-04-ticket.png`)
- The marquee reads **NOW BOOKING / ALIEN / FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S / Starts in 2 days**. Below it: an **ADMIT ONE** ticket with WHEN, WHERE, **GUEST Gma** and RUNNING 1979 · 117 min. Then **Add to calendar** and **You're in ✓**, and a toast: "Welcome, Gma."
- This is her goal, done and visibly hers. Protect it.
- Fragile (GUESS): **You're in ✓** is an outlined box the same size and shape as **Add to calendar** next to it, so it looks like a button. If tapping it undoes her RSVP, a confused tap reverses the thing she just did. To confirm: tap it and see what happens.
- Confusing: **Watch in Stremio** sits two rows under her ticket (`gma-04`, `gma-05`). She doesn't know what Stremio is. "Watch … in" reads like "watch the movie now on this phone".
- **Rating: none for the ticket; confusing (minor) for Stremio.**

### 6. The rest of the page (`gma-05-page-full.png`, 16752 px tall at 3×, about 7 phone screens)
- Under her ticket, in order: Concessions (Popcorn · Hal, four chips, "I'll bring…" + Add), **Also planned** (*"Friday, October 23 at 8:00 PM · at Sam's · 2 coming · Leading: The Grand Budapest Hotel"* with a second **Count me in**), The calendar, The shelf (7 posters, each with five pills: 👍 n, Seen it, Trailer, Stremio, Plot), Watched, Stats.
- **Two Fridays, two "Count me in"s.** Her goal is "free Friday". The first thing below Concessions is another Friday with the same button she just pressed. She may well think she hasn't finished and press it again, signing up for the 23rd as well (GUESS; confirm by watching a real person scroll after the ticket). "Leading:" means nothing to her.
- Below the ticket it's generic. A two-column poster grid with five pill buttons per card (`gma-06`) could belong to any watchlist app. That's 35 pills for 7 movies.
- "Every night so far" shows **Inception** with a blank poster box (page-full, ~y 13,480 px).
- Probable capture artifacts, not judged: in the page-full image the ticket is cut off after WHERE, and the toast sits over the marquee title. Neither shows up in the viewport shots.
- **Rating: forgettable / generic (minor)**, plus the Friday trap.

### 7. Shelf and a thumbs-up (`gma-06-shelf.png`, `gma-07-after-vote.png`)
- The thumbs-up on Alien works and is clear: **👍 3 → 👍 4**, the pill turns amber, and a "G" appears in the avatar row.
- The toast **"Welcome, Gma. You're in for Friday."** is still on screen in both shots. It covers the top of the Alien poster and the **JAWS** logo.
- **Rating: fragile (minor), for the toast.**

### 8. Calendar and "I'm free that evening" (`gma-08-day-panel.png`, `gma-09-free-marked.png`)
- "When are you free? Tap a day to see who is, then say you are or host it." Tapping Sunday 18 opens "Sunday, October 18 · Fran, Jo · **I'm free that evening**". After the tap: **You're free ✓** and the toast "You're free Sunday. If someone hosts, you're on the list." The wording is clear.
- Confusing: the small numbers under the dates (17 → "1", 18 → "2", 16 → "4 🏠") have no meaning until a legend *below* the whole five-row grid ("you're free · 2 free that evening · movie night"). The display serif makes "17", "7" and "1" look ornamental, not like numbers to read.
- The day panel opens below the legend, at the bottom of the screen (`gma-08`: its button is at the bottom edge). With her bigger text it is likely below the fold after she taps a date (GUESS; confirm at 200% by tapping a date and capturing the viewport).
- The welcome toast is *still* up in `gma-08`, covering "Also planned" ("Friday … 2 coming").
- **Rating: confusing (minor).**

### 9. How it works, opened herself (`gma-10` … `gma-13`)
- Card 1: "Welcome to the Weberplex. Movie night, decided together…" It's warm, short and on-brand.
- Card 2: three button names in one paragraph ("I'm free that evening, or Count me in … tap I can host"). The sample also contradicts the real calendar: **Fri** is drawn green, which the live legend says means "you're free", yet the sample panel offers "I'm free that evening" as if she isn't (`gma-11` vs `gma-08` legend).
- Card 4: "the movie locks … everyone coming gets a veto; a tie spins the reel. Then the house lights go down on everyone's phone." That's four bits of jargon in one sentence. **"Veto" names a control she can't find.** No shelf card has one: the only pills are 👍, Seen it, Trailer, Stremio, Plot (`gma-06`).
- The toast "You're free Sunday…" sits *on top of* the tour sheet in `gma-10` and `gma-11`. In `gma-12` it fades out over the header, so "Weberplex How it works … Not you?" and the toast text are drawn on top of each other and neither can be read.
- Timing: next is about 95 ms, which is instant.
- **Rating: confusing (minor).**

### 10. At 200% text (`gma200-*`)
- `gma200-02`: the reveal reflows well. The buttons stack full width and every line is readable. Good.
- `gma200-03`: the name form reflows well and the chips stack one per row.
- `gma200-01`: the curtain valance is drawn **over the headline**. Only the bottom halves of "The movie is…" show below the gold bobbles. **WEBERPLEX** runs over the card's inner gold border on the right. (The valance is probably mid-retract, since at normal size it's gone by 2985 ms.)
- `gma200-04`: the tour body is **cut off mid-sentence**: "…Anyone can host:", then the Back/Next footer, with nothing showing there's more to scroll. The sample is gone (fine), but so is the instruction's punchline. "HOW IT WORKS · 2 OF 4" wraps onto three lines.
- **Rating: fragile (minor).**

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| N1 | About 4 s of ceremony before her first action button: the closed curtain doesn't move for at least 0.7 s, there's 2.6 s to the card, and after the flip the text arrives line by line with no button yet at 1.5 s | Minor (slow) | `gma-open-0588/0938/1104/1271ms` identical; timing 2614 ms; `gma-reveal-turn-1519ms.png` (no buttons) |
| N2 | The face-down card never invites a tap. The only cue is small, spaced capitals, and the card sits completely still | Minor (confusing) | `gma-reveal-wait-0000…1008ms` identical; "TAP TO TURN IT OVER" in `gma-01` |
| N3 | "List" means two things on the name card. "Guest list" means coming Friday, but "On the list already?" shows Fran and Kim, who the reveal said aren't coming | Minor (confusing) | `gma-03`: "Put your name on the guest list" / "On the list already? Tap your name." vs `gma-02` "3 coming: Hal, Jo and Sam" |
| N4 | Big name chips right under **That's me**. A stray tap probably signs her in as someone else, and the only exit is a small "Not you?" | Minor (fragile), **GUESS** | `gma-03` chip layout; confirm by tapping "Hal" in a fresh context |
| N5 | **You're in ✓** looks like a button. If it toggles, a confused tap undoes her RSVP | Minor (fragile), **GUESS** | `gma-04`; confirm by tapping it |
| N6 | A second Friday with a second **Count me in** sits just below her finished ticket ("Friday, October 23 … Leading: The Grand Budapest Hotel"). Her goal is "free Friday", so she may sign up twice | Minor (confusing), **GUESS** on the behavior | `gma-05` (Also planned), `gma-08` |
| N7 | One toast stays on screen through four screenshots (`gma-05`–`gma-08`) and the next one through `gma-09`–`gma-12`. They cover the posters, the JAWS logo and the "Also planned" text, sit on top of the How it works sheet, and the last one fades out over the header so both are unreadable | Minor (fragile) | `gma-06`, `gma-07`, `gma-08` ("Welcome, Gma. You're in for Friday."); `gma-10`, `gma-11` (over the sheet); `gma-12` (overlapping the header) |
| N8 | **Watch in Stremio** is a full-width button right under her ticket, plus a "Stremio" pill on every shelf card. It's meaningless to her and reads like "play it now" | Minor (confusing) | `gma-04`, `gma-05`, `gma-06` |
| N9 | Below the ticket the page is about 7 screens of generic list UI: a poster grid with five pills per card, 35 pills in total | Minor (generic/forgettable) | `gma-05-page-full.png` (16752 px at 3×), `gma-06` |
| N10 | The numbers on calendar days aren't explained until a legend under the whole grid, and the day panel opens at the bottom edge (probably off-screen at large text) | Minor (confusing); off-screen part **GUESS** | `gma-08`: "1", "2", "4 🏠" under the dates; panel button at the bottom edge |
| N11 | The tour leans on jargon ("locks", "veto", "a tie spins the reel", "house lights go down"), and "veto" names a control that doesn't exist on the shelf | Minor (confusing) | `gma-13` wording vs `gma-06` pills (👍, Seen it, Trailer, Stremio, Plot) |
| N12 | At 200% text the tour body is cut off mid-sentence ("Anyone can host:") with no sign it scrolls | Minor (fragile) | `gma200-04-tour-2.png` |
| N13 | At 200% the curtain valance covers the "The movie is…" headline, and WEBERPLEX runs over the card's inner border | Polish | `gma200-01-reveal-waiting.png` |
| N14 | The tour 2 sample paints Fri green ("you're free" in the real legend) while its panel still offers "I'm free that evening", so it teaches the color wrong | Polish | `gma-11` vs the legend in `gma-08` |
| N15 | Mid-flip the bulb frame stands empty while the card turns edge-on inside it, so the card looks like it's falling out | Polish (taste) | `gma-reveal-turn-0179ms.png` |
| N16 | White flash before the dark curtain | Polish, **GUESS** (may be the browser's blank page, not the app) | `gma-open-0081ms.jpg` |
| N17 | Inception has a blank poster box under "Every night so far" | Polish | `gma-05-page-full.png`, Watched section |

No Blocker. No Major: the core flow (card → **Count me in** → name → ticket) completes in three taps and one word, and nothing is lost or exposed.

**Protect this:** the reveal's landing screen, "Alien · Friday 8 PM at Hal's · 3 coming: Hal, Jo and Sam" with one big **Count me in**, followed by an ADMIT ONE ticket with her name on it. It answers her whole question in her own words before it asks her for anything.
