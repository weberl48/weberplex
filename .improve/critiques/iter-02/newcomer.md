# Newcomer critique, iteration 2: Gma

Persona: Gma, in her 70s. She taps a link in the family group text on a mid-range Android with large system text. It's her first visit. She won't read instructions and gives up after about ten seconds of confusion. What she wants: **say she's free Friday, and find out what movie it is.**

Inputs used: `evidence/iter-02/run-s1-1/gma-*.png`, `gma200-*.png`, `frames/gma-reveal-*.png`, `evidence/iter-02/gma-reveal-contact.png`, the Gma sections of `transcript.md`, and the timing table. Coordinates below are in the 900 px-wide display frame of each screenshot.

Path she was driven through (transcript): 5 walkthrough cards, the reveal (wait, then turn), OK, the page, a thumbs-up on the shelf, the name form, the calendar day, Count me in, and the ticket.

---

## Step 1: Open the link. Walkthrough card 1 of 5 (`gma-01-first-screen.png`, 1359 ms)

What she sees: a gold "Welcome to the Weberplex" sheet over a dimmed marquee. The marquee reads "THE MOVIE IS... / FRIDAY, OCTOBER 16 / AT 8:00 PM · AT HAL'S / Starts in 2 days".

- **Good:** the date, time and host are readable behind the sheet straight away. Half her question ("when") is answered in the first second.
- **Confusing:** the other half is teased and withheld: "THE MOVIE IS...". Her goal is the title, and the page plays a game with it.
- **Generic:** the sheet is a standard onboarding carousel (dots, Skip, Next). Remove the sample marquee and any app could have it.
- **Slow (GUESS):** 1359 ms on a local server. On a real phone network this is probably 2 to 4 s of blank. A throttled "Fast 3G" run would confirm.

## Steps 2 to 5: Walkthrough cards 2 to 5 (`gma-02` to `gma-05`, about 96 ms per Next)

She won't read them. She'll tap the big amber "Next" four more times, because it never moves.

- **Slow:** five cards come before anything she came for. Each one carries 3 to 6 lines of prose. Card 3 (`gma-03`) is a paragraph that names three different buttons: "I'm free that evening, or Count me in when someone's already hosting… pick a start time and tap I can host." That's a manual, and she doesn't read manuals.
- **Confusing:** on card 5 (`gma-05`), the first concrete movie title she sees is a sample ticket: "ADMIT ONE / THE WITCH / WHEN Fri · 8:00 PM". That is the same day and time as the real night, and the marquee behind still says "THE MOVIE IS...". The "SAMPLE" tag is a small grey label in the corner. If she stops here she leaves thinking it's The Witch. The reveal two taps later corrects her.
- **Confusing:** card 5 promises "Then you turn the card over, and your ticket appears." For her it doesn't: the turned card ends in "OK" (`gma-06`).
- **Forgettable/inconsistent:** card 4's sample (`gma-04`) shows controls floating with no movie attached: "👍 4", "Seen ✓", "Trailer", and an orphan "FOREIGN" tag. The real shelf card (`gma-09`) has "Seen it", "Stremio" and "Plot", and no "Trailer". So the tour teaches buttons that don't exist.
- **Fragile (polish):** the sheet's top edge jumps from card to card. In display px it sits at about y745 on card 1, y1067 on card 2, y517 on card 3 and y818 on card 4. Her eye has to find the heading again after every tap.

## Step 6: The reveal waits for her (`frames/gma-reveal-wait-*`, contact sheet)

What she sees: the house goes dark. "The movie is..." sits over a red card with a "?" and the words "TAP TO TURN IT OVER".

- **Clear:** she'll tap. The instruction is plain and right under the card.
- **Flat (polish, taste):** the frames from 0000 to 1150 ms are pixel-identical except for one bulb-chase step at 0755 ms. The card never moves or invites her. The words do all the work.

## Step 7: She turns it (`frames/gma-reveal-turn-*`, `gma-06-reveal-landed.png`, 1061 ms tap to title)

What she sees: the Alien poster in a bulb frame, "Alien", "Friday 8 PM at Hal's", and **OK**.

- **Good:** this is the first time her question is answered: what, when, where, in one look.
- **Can't judge the turn (GUESS):** the turn frames at 0000, 0219 and 0435 ms are pixel-identical, all already showing the poster. The turn itself isn't in the evidence. If the 1061 ms between tap and title is a visible flip, that's fine. If it's a frozen card, she taps again. A frame captured at about 300 ms after the tap would settle it.
- **Generic and a dead end (Major, taste):** the peak moment ends in a bare "OK", the most generic button there is. She has just learned it's Friday at Hal's and she wants to say "I'm coming". The screen gives her nowhere to say it. The one thing she came to do is pushed back two screens, below a name form.

## Step 8: The page after OK (`gma-07-page-top.png`, `gma-08-page-full.png`)

What she sees: the marquee now reads "NOW BOOKING / ALIEN / FRIDAY, OCTOBER 16…". This is lovely. Under it is a full-screen card: "Put your name on the guest list / On the list already? Tap your name." with chips for Fran, Hal, Jo, Kim and Sam, then "New here?" and a "Your name" box with "That's me". The "Up next" heading only peeks in at the bottom edge.

- **Confusing (Major):** in plain English, "Put your name on the guest list" means "say you're coming". She'll type "Gma", tap "That's me", get the toast "Welcome, Gma." and believe she's coming Friday. She isn't. After naming herself, `gma-11` shows "3 coming: H J S Hal, Jo, Sam". Naming herself registers who she is, not that she's attending. The saving grace is that the "Count me in" button appears right under it once the card collapses (`gma-11`, y985). Whether she taps it or puts the phone down feeling done is a coin flip.
- **Confusing:** the first thing asked of a newcomer is to pick from five strangers' names. If she taps "Hal" because she's "going to Hal's", nothing stops her from becoming Hal.
- **Slow:** her action ("Count me in", under Up next) is below the first screen.
- **Confusing:** further down the page (`gma-08`) are two Fridays with identical amber "Count me in" buttons. Up next is "Friday, October 16 at 8:00 PM · at Hal's". Also planned is "Friday, October 23 at 8:00 PM · at Sam's · 2 in" ("2 in" is jargon). The day panel below the calendar has a third "Count me in", for Oct 16 again. Three identical buttons for two Fridays, and she said "Friday".
- **Jargon:** "Watch in Stremio" is a large outlined button right under Count me in, and every shelf card has a "Stremio" chip. "Subscribe" sits beside the calendar. To her, "Subscribe" sounds like paying for something, and "Stremio" is a word she has never heard. GUESS: either one sends her out of the site.
- **Long:** the page is 15,990 px tall at 1080 px wide, about 6.7 phone screens. Most of it (shelf, Watched, Stats) is for regulars.

## Step 9: The shelf and her first thumbs-up (`gma-09-shelf.png`, then `gma-10-name-form.png`, 47 ms)

She taps the Alien thumbs-up (`gma-09`, at about x145, y1000).

- **Fragile (Major):** the page jumps her back up to the name card. In `gma-10`, the **Kim** chip sits at about x90–297, y935–1040, right under where her finger was. It's the only chip with an amber outline, consistent with a hover or press state carrying over from her tap. Her thumbs-up "didn't do anything" from where she sits, so she taps again, lands on Kim, and from then on every thumbs-up and "I'm in" goes under Kim's name. GUESS on the second tap. To confirm: as a signed-out user, double-tap the Alien thumbs-up about 300 ms apart on a 360 px phone and check whose name the session takes.
- **Confusing:** the toast "Put your name down first. Then that counts." covers the Up next "Count me in" and the date. "That" is vague. Did her thumbs-up save or not?
- **Forgettable/inconsistent:** all four cards on screen wear a "MOST WANTED" banner, and all four are tied at 3 (Alien, Jaws, Parasite, Grand Budapest Hotel). A label on every card tells her nothing. (The stats list confirms the four-way tie in `gma-08`.)

## Step 10: She types her name (`gma-11-after-name.png`, 378 ms to confirm)

- **Good:** fast. The card collapses, "Welcome, Gma." appears, and Up next with "Count me in" moves into view.
- **Forgettable:** she's left at the top. The shelf she was browsing is four screens away, and nothing shows her that her Alien thumbs-up landed.

## Step 11: She taps Friday on the calendar (`gma-12-day-panel.png`, 253 ms)

- **Confusing:** the calendar numbers ("3 🏠", "1", "2") are only explained by a legend below the grid ("you're free / 2 free that evening / movie night"). The house icon isn't in the legend at all.
- **Fragile:** the toast "Welcome, Gma. Your thumbs-up on Alien counts." sits right on the day panel's "Count me in". Only "Cou" shows, along with "Hal is host…". That's the button she needs, covered at the moment she needs it. It's also the second "Welcome, Gma." in a row. GUESS on whether the toast swallows the tap.
- **Polish:** Oct 16 was already selected in the day panel on the untouched page (`gma-08`), so tapping 16 changes nothing she can see except scroll.

## Step 12: Count me in (`gma-13-counted-in.png`, 327 ms median, **888 ms worst**)

- **Good:** "You're in for Friday." The 16 tile turns green with "4", and the line reads "4 coming: G H J S Gma, Hal, Jo, Sam" with her own amber "G" first. Clear and kind.
- **Confusing:** "You're in for Friday." Which Friday? Two are planned, and Oct 23's "Count me in" stays the brightest button on screen.
- **Fragile (GUESS):** in the worst case she waits 888 ms with no recorded intermediate state. Then the button becomes "You're in ✓" (`gma-14`), which is itself a button. If her impatient second tap lands on it and it toggles, she un-counts herself. To confirm: capture the button 200 ms after the tap, then tap "You're in ✓" once.
- **Concessions:** after she's in, a row of chips appears ("Popcorn", "Candy", "Drinks", "Pizza") plus "I'll bring…". They read like a menu. GUESS: she taps "Popcorn" hoping there'll be popcorn and signs herself up to bring it.

## Step 13: Up next once she's in (`gma-14-up-next.png`)

What she sees: "ADMIT ONE / ALIEN / WHEN Friday, October 16 at 8:00 PM / WHERE Hal's / GUEST Gma / RUNNING 1979 · 117 min", then "Add to calendar" and "You're in ✓".

- **Best screen in the product.** She'd screenshot it and send it back to the group text.
- **Polish:** "RUNNING 1979 · 117 min". A year is not a running time.
- **Confusing:** the ticket is followed by "Watch in Stremio", the concessions form, then Oct 23's amber "Count me in". The last thing on screen asks her to sign up again.

## Step 14: The same session at 200% text (`gma200-01` to `gma200-05`, 1411 ms)

- **Fragile:** walkthrough body text is cut mid-line by the footer with no sign it scrolls. Card 1 (`gma200-01`) stops at "what you'd watch." and the payoff, "and the site picks the movie", is gone. Card 2 (`gma200-02`) slices "remembers it, and" through the middle of the letters. "HOW IT WORKS · 1 OF 5" wraps to three lines.
- **Good:** the reveal holds up at 200% (`gma200-03`, `gma200-04`). The card, "Alien", "Friday 8 PM at Hal's" and a big "OK" all fit on one screen.
- **Confusing:** the page screenshot (`gma200-05`) is one column of six huge name pills (Fran, Gma, Hal, Jo, Kim, Sam). The "New here?" box is cut off at the bottom, and no movie, date or Count me in is visible. (This run already had "Gma" on the list from the first run, so a true newcomer would see five pills, but the problem is the same.)

---

## Findings

| id | problem | type | severity | evidence |
|---|---|---|---|---|
| N1 | The reveal, the signature moment, ends in a bare "OK" with no way to say "I'm coming". Her goal action is pushed two screens later, below a name form. | generic, confusing | **Major** (taste) | `gma-06` ("OK" only); `gma-07` (Count me in not on first screen) |
| N2 | A signed-out thumbs-up jumps the page to the name card and puts another person's name chip (Kim, amber-outlined) under her finger. A second tap makes her "Kim". | fragile | **Major** | `gma-09` thumbs-up at about x145, y1000; `gma-10` Kim chip at about x90–297, y935–1040, outlined. Second-tap outcome is a **GUESS**: confirm with a double-tap replay. |
| N3 | "Put your name on the guest list" reads as RSVP. Naming herself doesn't count her in, and "Welcome, Gma." feels like done. | confusing | **Major** | `gma-07` heading; `gma-11` "3 coming: Hal, Jo, Sam" after naming |
| N4 | About 7 taps (5 cards, turn, OK) before the page, then a full-screen name form before Up next. The cards are 3–6 lines of prose she won't read, in a generic carousel. | slow, generic | **Major** | transcript Gma steps; `gma-03` card text; `gma-07` |
| N5 | Card 5's sample ticket "THE WITCH · Fri · 8:00 PM" matches the real night's day and time while the marquee still says "THE MOVIE IS...". It's the first title she sees. | confusing | Minor | `gma-05` |
| N6 | Three identical "Count me in" buttons for two different Fridays. "You're in for Friday." doesn't say which. Oct 23's button stays the brightest thing under her ticket. | confusing | Minor | `gma-08`, `gma-13`, `gma-14` |
| N7 | The toast "Welcome, Gma. Your thumbs-up on Alien counts." covers the day panel's Count me in (only "Cou" visible). It's also a second welcome. | fragile | Minor | `gma-12`; tap interception is a **GUESS** |
| N8 | Jargon buttons near her path ("Watch in Stremio", "Stremio" chips, "Subscribe") look like ways off the site or into paying. | confusing | Minor | `gma-08`, `gma-14`; where they go is a **GUESS** |
| N9 | At 200% text, walkthrough body is sliced mid-line with no scroll cue ("the site picks the movie" is lost), and the page opens on a wall of name pills. | fragile | Minor | `gma200-01`, `gma200-02`, `gma200-05` |
| N10 | Card 5 promises "your ticket appears" after the turn. For a newcomer the turn ends in "OK". | confusing | Minor | `gma-05` vs `gma-06` |
| N11 | Count me in can take 888 ms, and the button then becomes a tappable "You're in ✓". An impatient double-tap may un-count her. | fragile | Minor | 888 ms worst; `gma-14`. **GUESS**: confirm by capturing the button 200 ms after the tap and tapping "You're in ✓" once. |
| N12 | The walkthrough teaches controls that don't exist ("Trailer", "Seen ✓"), plus an orphan "FOREIGN" tag. | forgettable | Polish | `gma-04` vs `gma-09` |
| N13 | "MOST WANTED" on every tied card, so it means nothing. "RUNNING 1979 · 117 min" mixes a year into a running time. | forgettable | Polish | `gma-09`, `gma-14` |
| N14 | The waiting card is static (frames identical except one bulb step at 0755 ms), and the turn itself isn't visible in the frames. | flat | Polish (taste) | `frames/gma-reveal-wait-*`, `gma-reveal-turn-0000/0219/0435` identical. Flip quality is a **GUESS**. |
| N15 | The walkthrough sheet's top edge jumps about 550 px between cards. | fragile | Polish | `gma-02` (about y1067) vs `gma-03` (about y517) |

**Protect this:** the marquee ("NOW BOOKING / ALIEN / FRIDAY, OCTOBER 16 / AT 8:00 PM · AT HAL'S / Starts in 2 days") and the ADMIT ONE ticket reading "GUEST Gma". At a glance she sees what, when, where, and that she's in, and no other product looks like it.
