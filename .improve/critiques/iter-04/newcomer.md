# Newcomer critique, iteration 4: Gma

Persona: Gma, in her 70s, on a mid-range Android phone with the system text size turned up. She taps the link in the family group text. She doesn't read instructions and gives up after about 10 seconds of confusion. Her goal: say she's free Friday and find out what the movie is.

Inputs: only the run-s1-1 Gma screenshots, the frames, the contact sheet, the two Gma sections of transcript.md, and the timing table.

## Verdict

**At 360 px she gets there.** The face-down card is the best thing on the site. One tap gives her "Friday's feature / Alien / Friday 8 PM at Hal's / Count me in" (gma-06), which answers both of her questions. The name detour is a speed bump, not a wall, and she ends up holding a ticket with her name on it.

**At 200% text she probably stalls.** "Count me in" drops her mid-page into a column of other people's names. The heading has scrolled off the top. The box for typing her name is under a toast. The name chip under her thumb is lit (gma200-05). That step is where her 10 seconds run out.

The recurring way this site fails: **toasts sit on top of the button she needs next.**

---

## Walkthrough

### 0. She taps the link
1338 ms to the first card (median; worst 1342). That was measured against a local server. — **slow (GUESS)**: on cellular on a mid-range phone, expect noticeably more. A throttled run would confirm.

### 1. Tour card 1 (gma-01)
The real marquee behind the sheet is dimmed: "THE MOVIE IS... FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S · Starts in 2 days". Half her answer is already on screen, greyed out. In front of it is a brighter **sample** marquee reading "WEBERPLEX / PICK A NIGHT · PICK A PICTURE", so there are two marquees on one screen and the fake one is the vivid one. Below that is "HOW IT WORKS · 1 OF 5", five dots, Skip and Next. She reads "1 of 5" as homework and taps Skip or mashes Next. — **generic**: take away the name and this is every onboarding carousel ever made.

### 2. Tour cards 2–5 (gma-02 … gma-05)
- The Skip button moves on every card (y ≈ 835 → 1157 → 607 → 909 → 837 in the 900-px display) because the sheet changes height. Next stays put, so mashing Next still works.
- Card 3 (gma-03) is a trap for someone who doesn't read. The sample shows "**Friday** / Ava and Ben are free." with a big amber "**I'm free that evening**" button, which is exactly her goal and looks exactly like a real button. The only warning is a small grey "SAMPLE" tag. She will tap it. If nothing happens, the site looks broken. If it reacts, she may think she's done (**GUESS** about what a tap does; tapping the sample would confirm). The text under it is a six-line paragraph that names three different buttons ("I'm free that evening", "Count me in", "I can host"). She won't read it.
- Card 5 (gma-05) shows a sample ticket: "WHEN Fri · 8:00 PM / WHERE **Ava's**". That is the real night with a host who doesn't exist (the group is Fran, Hal, Jo, Kim, Sam; gma-07). Someone who looks at pictures instead of words can take "Ava's" as the venue.
- Card 5 also promises: "Then you turn the card over, and your ticket appears." That isn't what happens (see step 5).
- Overall: **confusing, forgettable**.

### 3. The face-down card, before she touches it (wait-0000 … wait-1190)
"The movie is..." sits above a maroon card with a gold "?", with "TAP TO TURN IT OVER" underneath. The bulbs chase: the bulb positions differ between wait-0000 and wait-0592. There's one obvious target and one instruction. She taps it. — **none**. This screen works.

### 4. The flip (turn-0000 … turn-1591; contact sheet)
- **turn-0000:** "TAP TO TURN IT OVER" disappears and the whole stage drops about 40 px (the heading moves from y≈383 to y≈420).
- **0142:** the card is edge-on.
- **0265:** the poster is showing.
- **0583:** the poster has settled. The heading still says "The movie is..." and there's no title yet.
- **0751:** the heading becomes "Friday's feature", "Alien" and the buttons appear, and the stage **jumps up about 55 px** (card top moves from y≈495 to y≈440).

So the frame lurches twice in under a second, during the one moment the product is built around.

The poster is also **soft at 583 and 751 ms** and only sharp by 1093 ms. In a side-by-side crop of the egg, the first two are visibly low-res. The hero image is blurry at the exact moment of the reveal.

Finally, "The movie is..." never gets its payoff. The setup line is swapped for a different heading instead of finishing as "The movie is… Alien."

Tap to title: 681 ms. That's fine.

Overall: **none on clarity; minor `taste` faults**. Not generic: a marquee-framed card flip that lands on a poster belongs to this product.

### 5. The reveal lands (gma-06)
"Friday's feature / Alien / Friday 8 PM at Hal's / [Count me in] [Not this time]". Both of her questions are answered with one button. She taps Count me in.

It doesn't count her in. Within 41 ms she's thrown out of the quiet full-screen moment into the busy page (gma-07). The page is scrolled so the marquee's "ALIEN" is cut off at the top. She sees:
- "Put your name on the guest list."
- Five chips with other people's names.
- "New here? Your first name is fine; this phone remembers it."
- A text box and a "That's me" button.
- A toast: "Put your name down first. Then that counts." Then *what* counts? The toast is sitting on the Up next card's Count me in button.

At 360 px the form is fully visible, so she types "Gma" and taps That's me. Name to ticket: 344 ms median, 848 ms worst. — **confusing**: the button's label promised one thing and did another, and card 5 promised a ticket.

### 6. Her ticket (gma-08)
"ADMIT ONE / ALIEN / WHEN Friday, October 16 at 8:00 PM / WHERE Hal's / GUEST **Gma** / RUNNING 1979 · 117 min", a "You're in ✓" button, and "4 coming: Gma, Hal, Jo, Sam". The toast reads "Welcome, Gma. You're in for Friday." **Her Count me in survived the name detour.** This is the payoff and it's genuinely good.

Under it are "Add to calendar", "Not on Google Calendar? **Download the invite**" and "**Watch in Stremio**". She's going to Hal's, not streaming, and she doesn't know what Stremio is. A curious tap sends her off-site. — **confusing (minor)**.

### 7. The rest of the page (gma-09, 15,930 px ≈ 6.6 screens)
Concessions, "Also planned", calendar, shelf, Watched, Stats. None of it is for her. She's done at the ticket. — **forgettable**, but it doesn't hurt her: she can stop.

### 8. Shelf and first thumbs-up (gma-10 → gma-11)
On Alien, the thumbs-up count goes from 3 to 4, the pill fills amber and a "G" joins "F H S". Confirmed in 72 ms. The feedback is clear.

But:
- Alien, the movie she was just told is Friday's feature, has **no badge** on the shelf. The Grand Budapest Hotel gets a "LEADING OCT 23" banner.
- The toast on screen is still "Welcome, Gma. You're in for Friday." from three screens earlier, and it covers the Parasite title and the LEADING banner.
- The cards are a standard poster grid with "Stremio / Plot" pills. — **generic**, which is acceptable for a utility shelf.

### 9. Tapping an open evening (gma-12)
She taps 18. The day panel says "Sunday, October 18 / Fran, Jo / [I'm free that evening]". The **same welcome toast is still there, cutting through the middle of that button's label** (the bottom half of "I'm free that evening" is hidden). It's the only action on the panel and it's half-covered.

The counts under the day numbers in the calendar are tiny: the "2" is about 7 CSS px next to day numbers about 30 px tall. The cream "selected" outline on 18 isn't in the legend. Tap to panel: 45 ms. — **fragile**.

### 10. I'm free that evening (gma-13)
18 turns green and the count goes from 2 to 3. The panel says "Fran, Gma, Jo" and the toast says "You're free Sunday. If someone hosts, you're on the list." The wording is clear and honest. The new toast again lands on the button, covering whatever it changed into: a green outline is visible just above the toast. 330 ms. — **none on wording, fragile on placement**.

### 11. The same start at 200% text (gma200-01 … 05)
- **Tour (gma200-01, -02):** the samples are dropped, so it's text-only, the thing she doesn't read. The text is **sliced mid-line** by the footer divider: "remembers it, and" is cut in half on card 2, and "what you'd watch." sits on the dashed line on card 1. The eyebrow breaks as "HOW IT / WORKS · 1 / OF 5". — **fragile**.
- **Reveal (gma200-03, -04):** solid. The buttons stack, everything fits, and the poster is sharp. — **none**.
- **After Count me in (gma200-05):** the "Put your name on the guest list" heading is scrolled off. She sees "On the list already? Tap your name." and a column of six big name pills. The "Your name" box is **completely hidden under the toast** "Put your name down first. Then that counts."
- And **Sam's pill is lit amber**. In gma200-04, Count me in sat at y≈1330–1500. In gma200-05, Sam's pill sits at y≈1255–1425, so it's directly under the thumb she just lifted. This looks like a leftover hover/focus state. Gma's reflex when "nothing happened" is to tap again. If one tap on a name signs her in as that person, which is what "Tap your name." implies, she becomes Sam (**GUESS** about the consequence; double-tapping Count me in at 200% and checking whose ticket appears would confirm). — **confusing + fragile**. This is where she gives up.

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| N1 | Toasts land on top of the action they refer to, and the welcome toast stays across five screens: it covers "I'm free that evening" (cutting its label in half), the Count me in button and the LEADING banner. | Major (fragile) | gma-12 (label cut by "Welcome, Gma. You're in for Friday."); gma-07 (over Count me in); gma-13; same toast in gma-08, -09, -10, -11, -12. How long it stays is a **GUESS** (the harness may move fast). |
| N2 | At 200% text, Count me in drops her into a list of other people's names. The heading is off-screen and the name box is hidden under the toast. | Major (confusing, fragile) | gma200-05: only "On the list already? Tap your name." and six pills are visible; the input is under "Put your name down first. Then that counts." |
| N3 | At 200% text, the name pill under her thumb (Sam) lights up right after Count me in. A second tap probably signs her in as Sam. | Major (Blocker if confirmed) | Count me in at y≈1330–1500 (gma200-04) overlaps Sam's pill at y≈1255–1425, outlined amber (gma200-05). Copy: "Tap your name." The consequence is a **GUESS**: double-tap at 200% and check the ticket. |
| N4 | "Count me in" doesn't count her in. It leaves the reveal for a mid-page form, contradicting the tour's "your ticket appears". The toast "Then that counts." is vague. | Minor (confusing) | gma-05 copy; gma-07 (marquee cut off, form, toast) |
| N5 | Reveal: the poster is soft at the moment of reveal, and the stage drops about 40 px on tap, then jumps up about 55 px when the title lands. | Minor (`taste`) | turn-0583 and turn-0751 soft vs turn-1093 sharp (side-by-side crop); heading y 383→420 (turn-0000), card top 495→440 (turn-0583→0751) |
| N6 | "The movie is..." is never completed; it's replaced by "Friday's feature" instead of ending "…Alien". | Polish (`taste`) | turn-0583 → turn-0751 |
| N7 | Tour card 3's sample is exactly her goal ("Friday", an amber "I'm free that evening" button) and looks live. The only marker is a small grey SAMPLE tag. | Minor (Major if the sample reacts like the real thing) | gma-03. What a tap does is a **GUESS**. |
| N8 | The samples invent a host for the real night: "WHEN Fri · 8:00 PM / WHERE Ava's" and "Ava and Ben are free". Neither Ava nor Ben is in the group. | Minor (confusing) | gma-05, gma-03 vs gma-07 names and "AT HAL'S" behind the sheet |
| N9 | A five-card dot carousel with Skip/Next stands between her and the answer. Card 3 is a six-line paragraph naming three buttons, and Skip moves on every card. | Minor (generic, forgettable) | gma-01 … gma-05; Skip y≈835/1157/607/909/837 |
| N10 | At 200% text the tour body is sliced mid-line by the footer, the samples are dropped, and the eyebrow splits "1 / OF 5". | Minor (fragile) | gma200-02 ("remembers it, and" cut), gma200-01 |
| N11 | "Watch in Stremio" and "Download the invite" on her ticket, plus a "Stremio" pill on every shelf card, are unexplained jargon for someone going to Hal's. | Minor (confusing) | gma-08, gma-10 |
| N12 | The shelf doesn't mark Alien as Friday's feature, while Grand Budapest gets "LEADING OCT 23". | Polish (forgettable) | gma-10 |
| N13 | Calendar head-counts are about 7 CSS px under day numbers about 30 px tall, and the selected-day outline isn't in the legend. | Polish | gma-12 (crop of 16/17/18/23) |
| N14 | 1338 ms to the first card on a local server. On cellular on a mid-range phone, likely much more. | Minor (slow) | Timing table. Real-network cost is a **GUESS**: a throttled 4G run would confirm. |

## Protect this
The face-down card turning into "Friday's feature / Alien / Friday 8 PM at Hal's / Count me in" answers both of Gma's questions on one screen, and that Count me in survives the name detour to become a ticket reading "GUEST Gma · You're in ✓".
