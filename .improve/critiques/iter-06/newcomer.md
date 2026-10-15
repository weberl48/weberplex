# Iteration 6: newcomer critique (Gma)

Persona: Gma, in her 70s. She taps the family group-text link on a mid-range Android with the text size turned up. She has never seen the site, won't read instructions, and gives up after about ten seconds of confusion. She wants two things: say she's free Friday, and find out what movie they're watching.

Inputs used: `run-s1-1/frames/gma-open-*`, `gma-01`…`gma-12`, `frames/gma-reveal-wait-*` and `gma-reveal-turn-*`, `gma200-01`…`gma200-05`, the Gma lines in `transcript.md`, and the timing table in the brief.

Verdict: she gets both answers, and the reveal is the reason. The trouble is getting there. The opening curtain parts onto a sign-up form, a stock four-card tutorial covers that form, and the tutorial's second card has a fake version of the very button she came to press. After the reveal the page holds up, apart from overlapping toasts and a few labels that make no sense to her.

---

## Step 0: tapping the link (frames `gma-open-*`, 2612 ms to first card)
- **0079 ms:** a pure white frame on a dark site.
- **0623–1387 ms:** a closed red curtain with nothing on it: no name, no "Friday", nothing to read. For about 0.8 s Gma is looking at fabric.
- **1554–2171 ms:** the curtain parts. What's behind it is not a show. It's **"Put your name on the guest list" / [Your name] / [That's me]** plus the name chips (frames 2171, 2337, 2487). The site header is still hidden under the valance.
- **3038 ms:** about half a second later a "HOW IT WORKS · 1 OF 4" sheet slides up over the form she was just shown.
- What Gma thinks: "It's asking my name. Oh, now it's something else." The curtain promises a show and delivers a form, and the form gets snatched away.
- Rating: **slow** (2.6 s on a *local* server before anything she can act on), **fragile** (the form is visible and tappable, then covered), and **flat** as a signature moment. The curtain itself is not generic. What it reveals is.

## Step 1: the walkthrough (`gma-01` … `gma-04`, ~93 ms per Next)
- The chrome is the standard onboarding carousel: "HOW IT WORKS · 1 OF 4", four dots, Skip / Back / Next. Take the name off and this is any app's tutorial. **Generic.**
- Behind the dimmed sheet, the marquee reads **"THE MOVIE IS…"**. Her question is answered right behind a tutorial she has to get through first. She will hit Skip or press Next three times without reading. That's four taps, or one if she spots Skip, before she gets the movie.
- **Card 2 (`gma-02`)** is the dangerous one. It shows a highlighted **"Fri"**, "Ava and Ben are free.", and a big amber **"I'm free that evening"** button. That is her exact goal, drawn in the same style as the real button. The only hint it's fake is a small grey "SAMPLE" tag, and Ava and Ben aren't in her group (the real chips are Fran, Hal, Jo, Kim, Sam). A Gma who taps it and sees something happen, or nothing happen, may believe she's done and put the phone down. **Confusing**, and the outcome is a **GUESS**: tap the sample button and check whether anything is recorded or shown.
- **Card 3 (`gma-03`)** has sample buttons "👍 4 / Seen ✓ / Trailer". The real cards say "Seen it / Stremio / Plot" (`gma-09`), so the lesson doesn't match the real screen.
- **Card 4 (`gma-04`)** is jargon: "the movie locks", "everyone coming gets a veto; a tie spins the reel", "the house lights go down on everyone's phone". Its sample ticket says "WHERE Ava's", while the real night behind it is at Hal's. **Confusing** for anyone who does read it.

## Step 2: tour done, waiting for the reveal (`gma-reveal-wait-*`)
- **0000–0218 ms:** the full page and the name form again, undimmed, for about 0.45 s.
- **0663 ms:** a double exposure. "The movie is…" sits over "THE MOVIE IS…", and the "?" card sits over the "Your name" field and "That's me".
- **0913–1136 ms:** a clean black screen, the "?" card, and "TAP TO TURN IT OVER".
- The table says 44 ms from tour done to the animation, but the frames show about 0.9 s before the card is clean. This is the second time a form flashes up and gets taken away. Rating: **fragile** and a **muddy** transition.
- The face-down card is easy to understand: one instruction in big letters, one obvious thing to tap.

## Step 3: turning the card (`gma-reveal-turn-*`, 690 ms to title)
- 147 ms: the card is edge-on. 286–449 ms: the Alien poster swings in. 784 ms: "Alien". 960–1146 ms: "Friday 8 PM at Hal's". 1324 ms: "3 coming: Hal, Jo and Sam". 1491 ms: "Hal and Sam thumbed it up".
- It builds in a sensible order: what, when and where, who. **Not generic**, and the best moment in the session.

## Step 4: reveal landed (`gma-05`)
- "Alien / Friday 8 PM at Hal's / 3 coming: Hal, Jo and Sam / Hal and Sam thumbed it up / [Count me in] [Not this time]".
- Both of her questions are answered on one screen, and the next step is the obvious amber button. She taps **Count me in**. No problems here.

## Step 5: Count me in leads to the name form (`gma-06`, 36 ms)
- The reveal disappears and she lands partway down the page, on the same "Put your name on the guest list" box she has already had flashed at her twice. The movie and date have scrolled off the top.
- The only line explaining why she's here, "One step left: your name, and you're on the list.", sits **below** the That's me button, in grey.
- Just below the form, the Up next card shows another amber **"Count me in"**. She tapped that a second ago. Seeing it again says "it didn't take". If she taps it again, the result is a **GUESS** (loop back to the form? nothing?).
- The field shows no focus ring, so it probably needs one more tap to bring up the keyboard (**GUESS**).
- Rating: **confusing**, but she most likely gets through by typing her name and tapping That's me.

## Step 6: her ticket (`gma-07`, 852 ms)
- The toast says "Welcome, Gma. You're in for Friday." The marquee now reads "NOW BOOKING / ALIEN". The header shows "G Gma · Not you?". The ADMIT ONE ticket shows WHEN Friday, October 16 at 8:00 PM, WHERE Hal's, GUEST Gma. **Goal done**, and it feels like a ticket rather than a form receipt. Not generic.
- Problems on the same screen:
  - **"Watch in Stremio"** is a full-size button right under her ticket. Gma is going to Hal's house and has no idea what Stremio is. If she taps it, it probably sends her off the site (**GUESS**).
  - **"You're in ✓"** is drawn as a button the same size as "Add to calendar". Gma may tap it to "confirm". Whether that silently takes her name off is a **GUESS**.
  - "You're in for **Friday**" gives no date, yet the page lists two Fridays (see step 7).

## Step 7: the whole page (`gma-08`, ~6.6 phone screens long)
- Contents, top to bottom: Up next (ticket, concessions, "I'll bring…"), **Also planned: "Friday, October 23 at 8:00 PM · at Sam's · 2 coming" with its own "Count me in"**, the calendar, the day panel, the shelf (sort and filter controls, 7 cards with 4 buttons each), Watched, and Stats.
- Two Fridays on one page, each with a Count me in button, plus a toast that just says "Friday". If the group text meant *next* Friday, she could easily have said yes to the wrong one. **Confusing.**
- The shelf and calendar are **generic** (a watchlist poster grid and a month grid). That's fine, because Gma doesn't need them.

## Step 8: thumbs-up (`gma-09` → `gma-10`, 63 ms)
- The thumb goes from "👍 3" to an amber "👍 4", and a G avatar joins F, H, S. Instant and clear.
- The "Welcome, Gma. You're in for Friday." toast is **still** covering the bottom of the shelf (it hides the Parasite title and the "LEADING OCT 23" banner).

## Step 9: tapping an open evening (`gma-11`, 43 ms)
- Sunday 18 gets a white ring, and the "Sunday, October 18" panel opens at the very bottom of the screen. Its **"I'm free that evening" button is half-covered by the same stale welcome toast.** **Fragile.** Whether a slower, human-paced session would still have that toast up is a **GUESS**; measuring the toast's lifetime would settle it.
- The small numbers under the dates ("2", "1", "4 🏠") are only explained by a legend *below* the grid.

## Step 10: I'm free that evening (`gma-12`, 829 ms median, 1034 ms worst)
- The 18 cell turns green with a "3", the panel reads "Fran, Gma, Jo", and the toast says "You're free Sunday. If someone hosts, you're on the list." The message is clear.
- But it takes nearly a second when the thumbs-up takes 63 ms, and nothing in the evidence shows the button reacting in between. Gma taps again when nothing happens. Whether a second tap undoes it is a **GUESS**. The new toast also covers the button that just changed. **Slow.**

## Step 11: at 200% text (`gma200-*`, 2633 ms to first card)
- **Tour cards (`gma200-01`, `-02`):** the body text is cut off mid-sentence by the footer ("it), say when you're…"; "Anyone can host:") with no sign that the card scrolls. The sample pictures are gone, and "HOW IT WORKS · 1 OF 4" wraps onto three lines. She won't read it anyway, but at this size the tutorial is just a wall of text with a Next button. **Fragile.**
- **Reveal (`gma200-03`, `-04`):** fits on one screen and is easy to read. Good.
- **Odd state (`gma200-04`, `-05`):** on this phone, which doesn't know her, the reveal says "4 coming: **Gma**, Hal, Jo and Sam / **Gma**, Hal and Sam thumbed it up" but still offers "Count me in" and then the name form. This is partly carried-over test state. It's also exactly what Gma would see on a second device or after clearing her browser data. If she types "Gma" again, does that create a second Gma? **GUESS.**

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| N1 | The curtain parts onto a sign-up form instead of the show, and a tutorial covers that form about 0.5 s later. Before that: a white flash, then ~0.8 s of blank curtain with nothing to read. 2.6 s before anything she can act on. | Major (`taste`, slow) | `gma-open-0079ms` (white), `0623`–`1387ms` (blank curtain), `2171`–`2487ms` ("Put your name on the guest list"), `3038ms` (tour sheet); open link to first card 2612 ms |
| N2 | A stock four-card tutorial (dots, Skip/Back/Next) stands between her and the answer, while the marquee behind it reads "THE MOVIE IS…". | Major (generic, slow) | `gma-01`…`gma-04` |
| N3 | Tour card 2 has a fake amber "I'm free that evening" under a highlighted "Fri", which is her exact goal, styled like the real button. Marked only by a small grey "SAMPLE" tag, with names that aren't her group ("Ava and Ben"). She may tap it and think she's done. | Major (confusing) | `gma-02-tour-2.png`; what the tap does is a **GUESS** (tap the sample button and check whether anything is recorded or shown) |
| N4 | Tutorial wording and samples don't match the real thing: "the movie locks", "a tie spins the reel", "house lights go down on everyone's phone"; the sample "Trailer" button vs the real "Stremio / Plot"; the sample ticket says "Ava's" while the night is at Hal's. | Minor (confusing) | `gma-03`, `gma-04` vs `gma-09` |
| N5 | Tour to reveal: the name form shows undimmed for ~0.45 s, then a double-exposure crossfade ("?" card over the name field). The card is clean only at ~0.9 s, though the table reports 44 ms. | Minor (fragile, flat) | `gma-reveal-wait-0000`, `-0218`, `-0663`, `-0913ms` |
| N6 | After Count me in she lands on the same name form, with its explanation below the button and a second amber "Count me in" just below it. | Minor (confusing) | `gma-06`: "One step left: your name, and you're on the list." What a second tap does, and whether the field is focused, is a **GUESS** |
| N7 | "Watch in Stremio" is a full-size button under her ticket, and "Stremio" appears again on every shelf card. The name means nothing to her and it probably leaves the site. | Minor (confusing) | `gma-07`, `gma-09`; where it goes is a **GUESS** |
| N8 | Two Fridays on one page, each with a "Count me in", and the confirmation says "You're in for Friday." with no date. | Minor (confusing) | `gma-07` toast; `gma-11` "Also planned: Friday, October 23 … at Sam's · Count me in" |
| N9 | Bottom toasts sit on the action area: the welcome toast still covers the shelf and half of "I'm free that evening", and the next toast covers the button that just changed. | Minor (fragile) | `gma-09`, `gma-10`, `gma-11`, `gma-12`; whether it lasts that long at human pace is a **GUESS** (measure the toast lifetime) |
| N10 | "I'm free that evening" takes ~0.8–1.0 s to confirm and name to ticket 0.85 s, against 63 ms for a thumbs-up, with no evidence of a pressed state in between. That invites a second tap. | Minor (slow) | Timings 829 / 1034 ms and 852 ms; `gma-12`. Whether a second tap undoes it is a **GUESS** |
| N11 | "You're in ✓" is drawn as a full-size button next to "Add to calendar". If she taps it to confirm, it might take her off the list. | Minor (fragile) | `gma-07`, `gma-08` day panel; what it does is a **GUESS** |
| N12 | At 200% text, tutorial cards cut off mid-sentence with no scroll cue, the sample pictures disappear, and the "1 OF 4" header wraps to three lines. | Minor (fragile) | `gma200-01` ("it), say when you're"), `gma200-02` ("Anyone can host:") |
| N13 | A phone that doesn't know her shows "4 coming: Gma…" on the reveal yet asks her to Count me in and type her name again. | Minor (confusing) | `gma200-04`, `gma200-05`; whether typing "Gma" again creates a duplicate is a **GUESS** |

**Protect this:** the reveal. One tap flips the "?" card to the Alien poster, then fills in "Friday 8 PM at Hal's", who's coming and an amber Count me in on one screen (`gma-05`, still readable at 200% in `gma200-04`). It answers both of Gma's questions at once and ends on the ADMIT ONE ticket with "GUEST Gma" on it (`gma-07`).
