# Newcomer critique: Gma (iter-03, run-s1-1)

Persona: in her 70s, opens the link from the family group text on a mid-range Android with large system text. Never reads instructions, gives up after about ten seconds of confusion. Goal: say she's free Friday and find out what movie they're watching.

**Verdict:** she gets there. It takes 8 taps plus typing her name (4 taps if she hits Skip). She knows "Alien, Friday 8 PM at Hal's" after the 7th tap and is counted in after the 8th. Every step responds in under 700 ms. The risks are elsewhere. The walkthrough puts a wrong answer to her exact question in front of her: a sample ticket for *The Witch*, Friday 8 PM. At 200% text, the box where a newcomer types her name sits behind a toast. And right under her ticket is a second "Friday … Count me in" for another night.

Taps to the goal: Next ×4, Let's go, tap the card, Count me in, type her name, That's me.

---

## Step by step

### 1. Link opens: first screen (`gma-01-first-screen.png`, 1346 ms to first card)
Behind a dim layer is the real marquee: "NOW BOOKING / THE MOVIE IS... / FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S / Starts in 2 days". On top of it sits a bright sheet, "HOW IT WORKS · 1 OF 5", whose loudest element is a second, **fake** marquee: "SAMPLE / NOW BOOKING / WEBERPLEX / PICK A NIGHT · PICK A PICTURE". She gets Friday, 8, Hal's. The movie slot literally reads "THE MOVIE IS...". The big yellow **Next** is obvious, so she taps it without reading.
- **Generic:** a five-dot carousel with Skip and Next is every app's onboarding. Only the sample art makes it this product's.
- **Slow:** in taps, not milliseconds. Five cards stand between the link and the answer she came for.

### 2. Cards 2 to 4 (`gma-02-tour-2.png` … `gma-04-tour-4.png`, ~95 ms each)
She doesn't read the paragraphs. She does look at the pictures, and the pictures look like real controls:
- Card 2: a filled name box "Ava" next to a yellow **That's me** button.
- Card 3: day tiles "Thu / Fri / Sat / Sun", a panel "Friday / Ava and Ben are free." and a big yellow **I'm free that evening** button. That is her goal, word for word, drawn as a button inside a demo. If tapping it does nothing (GUESS: tap the sample button to confirm), her ten-second clock starts.
- Card 3's text runs six lines and names three different buttons ("I'm free that evening", "Count me in", "I can host").
- **Confusing.**

### 3. Card 5 (`gma-05-tour-5.png`)
A cream ticket: "ADMIT ONE / THE WITCH / WHEN Fri · 8:00 PM / WHERE Ava's". A small grey "SAMPLE" tag sits in the corner. This is the one screen built exactly like the answer she wants, and it gives the wrong movie and the wrong house. A skimmer who stops here tells the family "The Witch, Friday at 8".
- **Confusing. Major.**

### 4. The face-down card (`frames/gma-reveal-wait-0000ms` … `1194ms`, 42 ms after "Let's go")
Full screen: "The movie is…", a maroon card with a "?", and "TAP TO TURN IT OVER" in small, widely spaced capitals. The only idle motion is the bulb border taking turns: alternate bulbs differ between frames 0000–0396 and 0597–0794. The card she has to tap never moves. The caption is plain, so she taps.
- **Forgettable (taste):** the back of the card is a generic mystery card. With the name removed it could belong to any quiz app. The theatre look stops at the frame.

### 5. The turn (`frames/gma-reveal-turn-0000ms` … `1440ms`, 687 ms from tap to title)
- 0 ms: the stack drops about 15 CSS px when the caption disappears (heading top moves from row 428 to row 473 of the screenshot).
- 147 ms: the bulbs light up and the card turns edge-on.
- 288–607 ms: the Alien poster swings in.
- 768 ms: the heading changes to "Friday's feature", and "Alien", "Friday 8 PM at Hal's" and two buttons appear. The whole stack jumps about 22 CSS px up (row 473 to 407).
- The poster is soft at the moment the title lands. Its edge measure is 274 at 768 ms and 323 at 941 ms, then jumps to 865 at 1110 ms. A low-resolution placeholder is swapped for the real image after the payoff. On a real network that swap would come later (GUESS: confirm with throttled 4G).
- The bulbs blink on landing (dark at 768, lit at 941, dark at 1110, lit at 1440).
- **Fragile (polish):** the payoff frame is blurry and jumps. The beat itself works, and it's fast.

### 6. Landed (`gma-06-reveal-landed.png`)
"Friday's feature / **Alien** / Friday 8 PM at Hal's / [Count me in] [Not this time]". Big, plain, and it answers both of her questions. She taps **Count me in**.
- **None.** This is the best screen in the session.

### 7. Name step (`gma-07-name-form.png`, 45 ms)
She's pulled out of the full-screen moment and dropped halfway down a long page. The marquee is cut off at the top ("ALIEN" sliced). The card reads "Put your name on the guest list / On the list already? Tap your name." with chips for Fran, Hal, Jo, Kim and Sam. Below them: "New here? Your first name is fine; this phone remembers it.", a "Your name" box and **That's me**. The toast says "Put your name down first. Then that counts." What is "that"? She tapped "Count me in". Did it count or not? The toast also covers a second **Count me in** button in the "Up next" card below it. At 360 px she finds the box and types her name.
- **Confusing (Minor).**

### 8. Her ticket (`gma-08-ticket.png`, 328 ms)
"ADMIT ONE / ALIEN / WHEN Friday, October 16 at 8:00 PM / WHERE Hal's / GUEST Gma / RUNNING 1979 · 117 min", then **Add to calendar** and **You're in ✓**, "4 coming: Gma, Hal, Jo, Sam", and the toast "Welcome, Gma. You're in for Friday." Her Count me in survived the name detour. **Goal met.** The ticket stub belongs to this product and nothing else.
- "**Watch in Stremio**" is a full-size button right under her ticket. She doesn't know what Stremio is, and "Watch" suggests she's meant to watch it herself at home, which muddies "at Hal's". **Confusing (Minor).**
- "You're in ✓" has a button's outline. Grandmothers tap the confirmation to make sure. If that tap un-counts her without asking (GUESS: tap it once and see), her RSVP silently disappears. **Fragile (Major if confirmed).**

### 9. The whole page (`gma-09-page-full.png`)
The page is 16,200 px tall at 3×, about 5,400 CSS px or seven phone screens. Directly under her ticket and the concessions: "ALSO PLANNED / Friday, October 23 at 8:00 PM · at Sam's · 2 in / [Count me in]". It's another Friday with the same yellow button and the same words she just used. "I'm free Friday" plus a button saying "Count me in" makes a second tap likely, which would put her down for Sam's on the 23rd as well.
- **Confusing (Major).**

Everything below that (calendar, a shelf of 7 cards with four pills each, the "How was Inception?" rating, "17 THUMBS-UPS", "PICKS THAT MADE IT 1. Sam 1 pick") is a dashboard a newcomer will never use. The shelf and stats fail the generic test: a poster grid with vote counts and a stats card could belong to any watchlist app. None of it blocks her, so there's no finding here.

### 10. Shelf and her thumbs-up (`gma-10-shelf.png`, `gma-11-after-vote.png`, 66 ms)
Before: "MOST WANTED" banners on 4 of 7 cards (Alien, Jaws, Parasite, The Grand Budapest Hotel), so the label means nothing. After her one thumbs-up on Alien, the pill goes gold, the count goes 3 → 4 and a "G" joins the voters, which is good feedback. But Jaws, Parasite and Budapest lose their banners at the same moment and Jaws's poster resizes. One tap from her changed other people's cards. The welcome toast from step 8 is still on screen in both shots, covering the Parasite and Budapest titles.
- **Confusing (Polish).**

### 11. Calendar (`gma-12-day-panel.png`, `gma-13-free-marked.png`, 45 ms and 348 ms)
She taps 18 and gets "Sunday, October 18 / Fran, Jo / [I'm free that evening]". The stale "Welcome, Gma. You're in for Friday." toast sits on top of that button; only the top half of the button shows. After the tap, the toast "You're free Sunday. If someone hosts, you're on the list." is clear copy, but it now covers the button's new state and the explanation underneath. Toasts keep parking on the thing she just acted on or needs next. Whether they outlast a human's scroll is a GUESS: measure the toast lifetime against a real scroll from the ticket to the calendar. The good part: the 16th shows green with "4" and a house, so the calendar reflects her RSVP. The "Subscribe" button next to "Next four weeks" reads like a paid sign-up to her, but she won't tap it.
- **Fragile (Minor).**

### 12. At 200% text (`gma200-01` … `gma200-05`; 1344 ms to first card)
- **Tour** (`gma200-01-first-screen.png`, `gma200-02-tour-2.png`): the sheet now covers the marquee completely, so the date and host are gone. The sample pictures are dropped. The header wraps to three lines ("HOW IT / WORKS · 1 / OF 5"). The body text is sliced mid-line by the footer divider: card 1 stops at "what you'd watch." and loses "and the site picks the movie"; card 2 cuts through "remembers it, and". It looks broken. Whether the text area scrolls is a GUESS. Next and Skip stay reachable. **Fragile (Minor).**
- **Reveal** (`gma200-03-reveal-waiting.png`, `gma200-04-reveal.png`): holds up well. The title is big and "Count me in" and "Not this time" stack full width. **None.**
- **Name step** (`gma200-05-page-top.png`): the screen is a column of six huge name chips (Fran, Gma, Hal, Jo, Kim, Sam). "New here? Your first…" and the "Your name" box sit below the fold, under the toast "Put your name down first. Then that counts." The "Sam" chip has a gold outline, as if Sam had already been picked. GUESS on the cause: a sticky hover or focus from the spot where she tapped Count me in. A newcomer whose name isn't on the list sees a list of strangers, one of them seemingly selected, and no visible way to add herself. That is where the ten-second limit bites. Caveat: this run already had a "Gma" chip from the 360 px run, so it wasn't a pure newcomer. With five chips the box moves up about one chip and still lands under the toast's band (GUESS: rerun with fresh data). **Fragile and confusing (Major).**

### Timings
Nothing is slow in milliseconds. The tour steps take ~95 ms, the reveal 687 ms, the name step 328 ms, and her RSVP is confirmed within 563 ms at worst. The 1.35 s to first card is on a local server; real 4G on a mid-range phone will be slower (GUESS: measure with throttling). Her time is spent on taps, not on loading.

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| N1 | The walkthrough's sample ticket answers her exact question wrongly ("THE WITCH · Fri · 8:00 PM · Ava's"), while the real marquee hides the title ("THE MOVIE IS..."). A skimmer leaves with the wrong movie and the wrong house. | Major | `gma-05-tour-5.png`, `gma-01-first-screen.png` |
| N2 | At 200% text, after Count me in, the new-name box is below the fold and under the toast. Six oversized chips fill the screen and "Sam" is outlined as if selected. | Major | `gma200-05-page-top.png`. Cause of the Sam outline and the pure-newcomer layout are GUESS (rerun with fresh data) |
| N3 | "ALSO PLANNED / Friday, October 23 … at Sam's / Count me in" sits right under her ticket. It's a second Friday with the same button she just used, so a double RSVP is likely. | Major | `gma-09-page-full.png` (below the ticket), `gma-12-day-panel.png` |
| N4 | "You're in ✓" is drawn as a button. A tap to make sure may un-count her without asking. | Major if confirmed | GUESS: tap it once on the state in `gma-08-ticket.png` |
| N5 | Five tour cards stand between the link and the answer, so 5 of the 8 taps to her goal are tour. It's a generic carousel and card 3 runs six lines. | Minor | `gma-01` … `gma-05` |
| N6 | The tour's samples look like live controls: "Ava" with "That's me", and "Fri" with "I'm free that evening", which is her goal as a decoy button. | Minor | `gma-02-tour-2.png`, `gma-03-tour-3.png`. Whether a tap is dead is GUESS |
| N7 | After Count me in, the toast "Put your name down first. Then that counts." is cryptic and leaves her unsure whether she's in. The page jumps mid-scroll and the toast hides a second Count me in. | Minor | `gma-07-name-form.png` |
| N8 | Toasts park over what she's acting on. The stale "Welcome, Gma…" covers "I'm free that evening" and the shelf titles, and the next toast hides the button's new state. | Minor | `gma-12-day-panel.png`, `gma-10-shelf.png`, `gma-11-after-vote.png`, `gma-13-free-marked.png`. Toast lifetime vs human pace is GUESS |
| N9 | "Watch in Stremio" (and "Stremio" on every shelf card) is unexplained jargon, and "Watch" contradicts "at Hal's". | Minor | `gma-08-ticket.png`, `gma-10-shelf.png` |
| N10 | At 200%, the tour body is sliced mid-line by the footer, the samples vanish, the header runs to three lines and the sheet hides the marquee. | Minor | `gma200-01-first-screen.png`, `gma200-02-tour-2.png`. Whether the text scrolls is GUESS |
| N11 | The face-down card is a generic maroon "?" card back. Only the border bulbs move; the card she must tap never does. | Minor (taste) | `frames/gma-reveal-wait-0000ms` … `1194ms` (only the bulbs differ, 0000–0396 vs 0597–0794) |
| N12 | The payoff lands soft and jumpy: the poster is a low-res placeholder when "Alien" appears at 768 ms and turns crisp at 1110 ms (edge measure 274 → 865). The stack drops ~15 CSS px on the tap and jumps ~22 px up on landing. | Polish | `frames/gma-reveal-turn-0000ms`, `0768ms`, `1110ms` |
| N13 | "MOST WANTED" is on 4 of 7 cards. Her single thumbs-up strips it from three other films and resizes Jaws's poster. | Polish | `gma-10-shelf.png` → `gma-11-after-vote.png` |

**Protect this:** the landed reveal and the ticket. "Friday's feature / Alien / Friday 8 PM at Hal's / Count me in" leads to "ADMIT ONE … GUEST Gma" and "Welcome, Gma. You're in for Friday." It answers both of her questions in big, plain words, survives 200% text, and keeps her Count me in through the name detour.
