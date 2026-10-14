# Newcomer critique: Gma, iteration 05 (run-s1-1)

Persona: Gma, in her 70s, a mid-range Android phone with the system text size turned up. She taps the link in the family group text. She never reads instructions and gives up after about ten seconds of confusion. Her goal is to say she's free Friday and find out what movie they're watching.

Inputs: the curtain frames, gma-01 to gma-13, the reveal frames, gma200-01 to gma200-05, the Gma lines of transcript.md, and the timing table. I opened nothing else.

## Verdict

She makes it. Her path is Skip (or Next five times), tap the card, then "Alien / Friday 8 PM at Hal's", then Count me in, type "Gma", That's me. That gives her a ticket with "GUEST Gma" and the toast "Welcome, Gma. You're in for Friday." Both goals are met in about ten taps.

Four things get in the way:
- The tour charges a five-card toll before the answer.
- The name step leads with other people's names. At large text, her own name box is off the screen.
- "You're in ✓" looks like a button she could tap.
- A second "Count me in" for a different Friday sits right under her ticket.

## Walkthrough

### 0. The curtain (gma-curtain-0000ms to 1550ms; open link to first card 1348 ms)
For about the first half second she sees only red curtain (frames 0000 and 0300). It parts by 1050 ms, and the tour card is already up behind it. It's on theme and short. **None.** The 1.35 s is fine on a ten-second patience budget. It is not generic: no other scheduling app opens on a velvet curtain.

### 1. The first screen and the tour (gma-01 to gma-05; about 91 ms per Next)
- **gma-01:** two marquees, both reading "NOW BOOKING". The real one ("THE MOVIE IS... / FRIDAY, OCTOBER 16 / AT 8:00 PM · AT HAL'S / Starts in 2 days") is dimmed. The fake one, tagged "SAMPLE" and reading "WEBERPLEX / PICK A NIGHT · PICK A PICTURE", is the bright one. The thing she came for is the dim one. "SAMPLE" means nothing to her. **Confusing.**
- **gma-02 to gma-04:** each card has a full-size, full-color mock control:
  - a name box with "Ava" and a "That's me" button
  - a gold "I'm free that evening" button
  - thumbs, "Seen ✓" and "Trailer" pills

  They look live. She'll tap them before she taps Next. (GUESS: they're probably inert. Confirm by tapping one.)
- **The copy:** card 3 has six lines with three verbs and a hosting aside ("…or Count me in when someone's already hosting… Anyone can host: pick a start time and tap I can host."). Card 4 mentions "the shelf" and "carry over from night to night". Card 5 mentions "the movie locks", "one veto", "a tie spins the reel" and "turn the card over". She'll read none of it. She'll hammer Next or hit Skip. **Generic, confusing.** A five-dot carousel with Skip, Back and Next is the most interchangeable screen in the product.
- **Card 5 contradicts the next screen.** It says "A day before, the movie locks". The marquee says "Starts in 2 days", and the next screen already reveals "Friday's feature: Alien". **Confusing.**

### 2. The reveal (reveal-wait 0 to 1167 ms, then reveal-turn 0 to 1515 ms; tap to title 684 ms)
- **Wait 0000 to 0463:** after "Let's go", the plain page is fully lit for about half a second. It has the guest-list box, "Your name" and "That's me", the very thing card 2 just told her to fill in. At 0693 the page dims and the card fades in. In that frame the two titles overlap ("THE MOVIE IS..." over "The movie is..."). A quick tap on "Your name" in that window gets swallowed or yanked away (GUESS). **Fragile.**
- **Wait 1167:** a maroon card with a "?" and "TAP TO TURN IT OVER". It's obvious, and she'll tap it. The card back itself is a blank maroon slab, which looks like a quiz app, not a cinema. **Generic (taste).**
- **Turn 0146 to 0622:** a clean flip to the Alien poster, framed in bulbs. Good.
- **Turn 0789 to 1515:** the title "Alien" lands while the bulbs around the poster go dark. They stay dark until gma-06, where they're lit again. The big beat lands into a dim frame. **Flat (taste), small.**
- **gma-06:** "Friday's feature / Alien / Friday 8 PM at Hal's / 3 coming: Hal, Jo and Sam / 2 of the 3 coming thumbed it up / [Count me in] [Not this time]". This is the best screen in the product. It answers her question and asks the next one in plain words. **None.**

### 3. The name step (gma-07; Count me in to form in 41 ms)
The heading is "Put your name on the guest list", then "On the list already? Tap your name.", then five big pills: Fran, Hal, Jo, Kim, Sam. Her own box ("New here? … Your name / That's me") comes after the other people. She's looking for "where do I say yes", and the biggest targets are strangers' names.

If a pill is a no-questions sign-in, then a mis-tap on "Hal" makes her Hal on this phone, and her yes and thumbs-ups land under his name (GUESS). Below the form, the Alien card still shows a gold "Count me in", which makes her wonder whether the first one worked. **Confusing, fragile.** The line "One step left: your name, and you're on the list." is good and should stay.

### 4. The ticket (gma-08; name to ticket 843 ms)
"ADMIT ONE / ALIEN / WHEN Friday, October 16 at 8:00 PM / WHERE Hal's / GUEST Gma". The toast reads "Welcome, Gma. You're in for Friday." Both goals are done, and it's unmistakably this product. In gma-08 the ticket is still greyish because it's mid-animation; it's cream in gma-09.

Then the hazards stack up right under it:
- **"You're in ✓"** is drawn as an outlined button the same size as "Add to calendar". Gma taps things to make sure. If it's a toggle, one "just checking" tap un-counts her (GUESS). **Fragile.**
- **"Watch in Stremio"** is a full-size button under the ticket of a movie she's watching at Hal's house. Does she need to install something? **Confusing.**
- **"ALSO PLANNED: Friday, October 23 … at Sam's … [Count me in]".** Her goal is "free Friday", and here is another Friday with the same gold-outlined button, one thumb-scroll down. A reassurance tap signs her up for the 23rd. **Confusing.**

### 5. The rest of the page (gma-09, about 6.7 screens)
The rest of the page is the calendar, the day panel, a seven-movie shelf with four pills per card ("3 / Seen it / Stremio / Plot"), Watched and Stats. Nothing below the ticket is for her. That's fine as long as the top stays this good. The shelf and the calendar are a stock movie grid and a stock month grid. **Generic, forgettable**, but harmless to her goal.

### 6. The shelf thumbs-up (gma-10 to gma-11; 79 ms)
Alien's thumbs pill goes from 3 to 4, turns gold, and a "G" joins the avatars. It's fast and visible, but there are no words. Alien is already Friday's movie, yet its card has no "Showing Friday" badge, while The Grand Budapest Hotel wears "LEADING OCT 23". She'll believe she just voted for Friday. **Forgettable / misleading**, minor.

### 7. A free evening (gma-12 to gma-13; day tap 46 ms, then confirmation 712 ms)
- **gma-12:** tapping Sunday 18 opens the day panel at the very bottom edge. The view doesn't scroll to it. The old toast "Welcome, Gma. You're in for Friday." still covers the lower half of the gold "I'm free that evening" button. The helper line "Free that evening puts you on the list if someone…" is cut off. The same toast also covered the shelf's "LEADING OCT 23" ribbon in gma-10 and gma-11.
- **gma-13:** a new toast, "You're free Sunday. If someone hosts, you're on the list.", sits on top of the button she just pressed. She can't see it change. The wording of the toast is good. Where it sits is not. **Fragile.**

### 8. 200% text (gma200-01 to gma200-05; first card in 1335 ms)
- **gma200-01:** the curtain valance still hides half the "Weberplex" wordmark. The body text is sliced by the footer rule at "what you'd watch.", so the payoff line ("and the site picks the movie") is hidden. The eyebrow wraps as "HOW IT / WORKS · 1 / OF 5".
- **gma200-02:** "This phone remembers it, and" is cut horizontally mid-line. Nothing hints that the card scrolls. The stacked Back and Next buttons take about a quarter of the card. **Confusing.**
- **gma200-03 and gma200-04:** the reveal holds up well at 200%: the card, the poster, the title, and stacked "Count me in" / "Not this time" buttons. But this phone doesn't know her. It says "4 coming: Gma, Hal, Jo and Sam" and still asks her to "Count me in", or offers "Not this time". **Confusing.**
- **gma200-05:** the name step at 200% is six full-width stacked pills (Fran, Gma, Hal, Jo, Kim, Sam). They fill the entire screen, and there's no "Your name" box in view. A true newcomer sees only other people's names and nowhere to type. "Kim" is outlined in gold, as if pre-selected (GUESS as to why). **Confusing, fragile.** This is where the big-text Gma gives up.

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| N1 | A five-card tour full of jargon gates the answer that's teased right above it. She skips it unread. The carousel is generic. | Major | gma-01 to gma-05: "the movie locks", "one veto", "a tie spins the reel", "carry over from night to night", "tap I can host". The real marquee is dimmed behind the "SAMPLE" one. |
| N2 | The name step leads with strangers' name pills before her own box. At 200%, six stacked pills fill the screen and the "Your name" box is off-screen. A mis-tapped pill may sign her in as someone else. | Major | gma-07 ("On the list already? Tap your name." above "New here?"); gma200-05 (pills only, "Kim" outlined gold). What a mis-tap does is a GUESS: tap "Hal" on a fresh phone and see whether it asks first. |
| N3 | "You're in ✓" is styled as a button next to "Add to calendar". A "just checking" tap may silently un-count her. | Major (GUESS) | gma-08 and gma-09 (the day panel too). Confirm by tapping it once: does it remove her without asking? |
| N4 | A second "Count me in", for "Friday, October 23 … at Sam's", sits right under her ticket. After she's tapped Count me in, the form screen still shows a gold "Count me in" on Alien. | Minor | gma-08 ("ALSO PLANNED"); gma-07 (the Alien card under the form) |
| N5 | The tour's mock controls (name box with "Ava", "That's me", "I'm free that evening", thumbs/Seen/Trailer) look live, and the "SAMPLE" marquee outshines the real one. | Minor | gma-01 to gma-04. Whether they're inert is a GUESS. |
| N6 | Tour card 5's rule ("A day before, the movie locks") is contradicted at once: the movie is revealed with "Starts in 2 days". | Minor | gma-05 vs gma-06 and the marquee in gma-01 |
| N7 | Toasts sit on the action. The old toast covers half of "I'm free that evening". The new one hides the button she just pressed. The day panel opens at the bottom edge without scrolling into view. | Minor | gma-12, gma-13; also gma-10 and gma-11 (toast over "LEADING OCT 23") |
| N8 | "Watch in Stremio" (and a "Stremio" pill on every shelf card) reads as "install something" for an in-person night at Hal's. | Minor | gma-08, gma-09 |
| N9 | At 200% the tour copy is sliced mid-line by the footer with no scroll cue, the eyebrow breaks as "WORKS · 1 / OF 5", and the curtain still covers the wordmark. | Minor | gma200-01, gma200-02 |
| N10 | A second device lists her ("4 coming: Gma, Hal, Jo and Sam") and still asks "Count me in / Not this time". | Minor | gma200-04 |
| N11 | During the lights-down gap, the name box and "That's me" are live for about 0.5 s before the reveal takes over, and the two titles overlap mid-fade. | Minor | reveal-wait 0000 to 0463 (page lit), 0693 (overlap). The swallowed tap is a GUESS. |
| N12 | The thumbs-up on Alien gives no words, and Alien has no "Showing Friday" badge while Grand Budapest has "LEADING OCT 23". She thinks she voted for Friday. | Minor | gma-10 and gma-11 (3 to 4, 79 ms) |
| N13 | The reveal's card back is a blank maroon slab with a "?", and the bulbs go dark exactly as "Alien" lands (lit again only in gma-06). The big beat lands in a dim frame. | Minor (taste) | reveal-wait 1167; reveal-turn 0789 to 1515 vs gma-06 |
| N14 | The writes that confirm her (name to ticket 843 ms, "I'm free" to confirmation 712 ms) are the slowest steps, on a local server. On cellular they'll take seconds. | Minor (GUESS) | Timing table. Confirm with a throttled run and check for a pending state on "That's me". |

## Protect this
The reveal, then "Count me in", then a ticket reading "GUEST Gma" plus "You're in for Friday." It answers both of her questions (what movie, and is she in) in plain words, on screens no other app would have.
