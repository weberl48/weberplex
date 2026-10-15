# Newcomer critique, iter-07: Gma

Who: in her 70s, taps a link in the family group text on a mid-range Android with big system text. She has never seen the site, doesn't read instructions, and gives up after about ten seconds of confusion. She wants two things: to say she's free Friday, and to find out what movie it is.

Sources: only the files listed in the brief: run-s1-1 screenshots, the `frames/gma-*` sequences, the two contact sheets, the Gma lines in `transcript.md`, and the timings table. Frame-to-frame differences were measured on the PNG/JPG frames themselves.

Bottom line: she gets both answers and is counted in within about five taps. Nothing dead-ends. The trouble starts after the reveal. The name step undercuts the "Count me in" she just pressed. Toasts then land on top of whatever she needs to see or press next. And the page keeps offering more "Count me in" and "free" buttons after she's already in.

---

## Step by step

### 0. Opening the link (frames `gma-open-*`, contact sheet)
- **71 ms**: a plain white screen (`gma-open-0071ms.jpg`) on a site that is otherwise near-black. At night this is a flash in her face.
- **578 to 1419 ms**: a closed red curtain with no words on it: no "Weberplex", no "Hal invited you", nothing. Five frames in a row (578, 937, 1103, 1268, 1419) show no visible change; the frame-to-frame difference stays below threshold. For about 0.85 s it looks frozen.
- **1586 to 2534 ms**: the curtain parts and the card shows through the gap. The card is fully in view at **2640 ms** (median). The valance is gone by 3017 ms.
- She'll wait 2.6 s, so this isn't a give-up point on its own. But this was a **local server**, so on her phone's mobile data the frozen-curtain stretch will be longer (GUESS; a throttled-network run would confirm). And the first 2.6 s tell her nothing about what this is or who sent it.
- Verdict: **slow** (Minor). Generic? No. The curtain is unmistakably this product.

### 1. First screen: the face-down card (`gma-01-first-screen.png`, `gma-reveal-wait-*`)
- She sees "The movie is..." over a maroon card with a big **?**, "WEBERPLEX" at the top, and "FRIDAY 8 PM / AT HAL'S" at the bottom. Under the card, in spaced capitals: "TAP TO TURN IT OVER". The bottom ~40% of the screen is empty black.
- While the card waits, the only motion is the bulbs chasing around the frame. The `gma-reveal-wait` frames at 404 and 618 ms differ from 0 ms only inside the bulb ring; 199, 833 and 1032 ms are identical to 0 ms. The card itself never nudges or invites a tap.
- Risk: a woman who doesn't read instructions can take "The movie is... ?" to mean **not decided yet**. She already has "Friday 8 PM at Hal's" from the card, so she might close the tab with half her answer. This is a GUESS about her behaviour. A five-second test with a non-user who's told "find out what movie it is" would confirm or kill it. Most people do tap the only object on screen.
- Verdict: **confusing** (Minor, behaviour GUESS). Generic? No.

### 2. The turn (`gma-reveal-turn-*`, contact sheet)
- The tap gives a clean flip. The card is edge-on at 149 ms, the poster is showing at 285 ms, and the gold "Alien" title arrives at 761 ms (measured: 684 ms from tap to title). "Friday 8 PM at Hal's" fades in by 1102 ms, the "H J S, 3 coming" line by 1265 ms, and "Hal and Sam thumbed it up" by 1449 ms.
- **No buttons at 1449 ms.** She has had the answer for 0.7 s and has nothing to press for at least another ~0.8 s. That's mild, but the moment she's ready to say yes is the moment the screen has nothing to offer.
- Verdict: none to **slow** (Polish). Generic? No. This is the signature moment, and it lands.

### 3. Reveal landed (`gma-02-reveal-landed.png`)
- Poster in a bulb frame, "Alien", "Friday 8 PM at Hal's", "H J S  3 coming: Hal, Jo and Sam", "Hal and Sam thumbed it up", then **Count me in** (filled) and **Not this time** (outlined).
- This is the best screen in the session. Both of her questions are answered and the action matches her intent in her own words.
- Verdict: none. Generic? No.

### 4. Count me in, then a form (`gma-03-name-form.png`; 34 ms)
- She pressed "Count me in", and the theatre disappears. She's dropped mid-page onto a boxed form: "Put your name on the guest list", then "Your first name is fine; this phone remembers it.", then a "Your name" field and a **That's me** button, then "One step left: your name, and you're on the list.", then "On the list already? Tap your name." over five name pills: Fran, Hal, Jo, Kim, Sam.
- Directly below, in the same view: "Up next", the Alien poster, "Friday, October 16 at 8:00 PM · at Hal's" and **another yellow "Count me in"** button, for the same night she just said yes to.
- What she'll think: "I already pressed that. Did it not work?" There are two yellow buttons on screen ("That's me" and "Count me in") and three sentences of instructions she won't read. The lower "Count me in" is the one that matches what she just did, so it's the likelier tap. The brief doesn't show where that tap goes.
- The name pills are other people's identities, one tap away. "On the list already? Tap your name." is an instruction she won't read. Whether a mis-tap makes her "Fran" with no check is a GUESS; tapping a pill once would show whether any "Are you Fran?" step exists.
- At 200% (`gma200-03-page-top.png`) the heading takes three lines, the helper text another three, and only "Fran" of the name pills is above the fold. It's readable, but it's a wall.
- Verdict: **confusing** (Major). Generic? Partly. Everything except the heading is a stock sign-up box.

### 5. Her ticket (`gma-04-ticket.png`; name to ticket 849 ms)
- This is the payoff: "ADMIT ONE / ALIEN", "WHEN Friday, October 16 at 8:00 PM", "WHERE Hal's", "GUEST Gma", and a stub "No. 206552". A toast says "Welcome, Gma. You're in for Friday." She'd show this to someone.
- Problems:
  - The WHEN value is squeezed by the poster into four lines ("Friday, / October / 16 at / 8:00 PM"), and RUNNING wraps to "1979 · 117 / min". This is on the one object she'll screenshot (Polish).
  - "You're in ✓" is drawn as an outlined button the same size as "Add to calendar". Grandmothers tap checkmarks to make sure. If that tap un-counts her, she drops out without knowing it (GUESS; tap it once to confirm).
  - **"Watch in Stremio"** is a full-size button right under her ticket. She has no idea what Stremio is, and tapping it will most likely bounce her to an app or store she doesn't have.
  - The toast is already covering "Also planned" and the outline of its "Count me in" button.
- Verdict: **confusing** for Stremio (Minor). Generic? No. The stub is distinctive.

### 6. The rest of the page (`gma-05-page-full.png`, 16,146 px tall at 3x, about 6.7 screens)
- Below the ticket she gets "CONCESSIONS" (Popcorn · Hal, with Popcorn, Candy, Drinks and Pizza pills and an "I'll bring..." field), then "ALSO PLANNED": "Friday, October 23 at 8:00 PM · at Sam's · 2 coming · Leading: The Grand Budapest Hotel" with **Count me in**. Then come the calendar, the shelf of 7 movies (each with 👍, Seen it, Stremio, Plot), Watched, Stats ("1 NIGHT WATCHED / 2 HOURS OF MOVIES / 7 MOVIES ADDED / 17 THUMBS-UPS"), Most wanted, Who you agree with, and Picks that made it.
- **Two Fridays.** The family text said "Friday". The reveal says only "FRIDAY 8 PM AT HAL'S" with no date, and the toast says "You're in for Friday." A second Friday with its own "Count me in" sits a thumb-scroll below. "Count me in" appears three times on this page for two different nights.
- **The calendar.** "When are you free? Tap a day to see who is, then say you are or host it." This sits under a ticket that already says she's in. Days carry small unlabelled counts and house icons ("4 🏠", "1", "2"), and the legend ("you're free · 2 free that evening · movie night") is below the grid, so she reads the grid before the key. Generic test: drop the deco numerals and this is any group-availability grid.
- Everything below the calendar is for regulars. For her it's forgettable, which is fine, but it means "how much more is there?" never ends.
- Verdict: **confusing** for the second Friday and free-vs-in (Minor). The calendar is **generic** (Minor).

### 7. Shelf and her thumbs-up (`gma-06-shelf.png`, `gma-07-after-vote.png`; 73 ms)
- The thumbs-up is instant: 73 ms, the pill fills gold, the count goes 3 to 4, and a gold "G" joins F/H/S. That's clear feedback.
- "Welcome, Gma. You're in for Friday." is **still on screen** in both shots, now covering the Parasite title and the "LEADING OCT 23" banner.
- Verdict: none for the vote. The toast belongs to N1. Generic? The poster grid with 👍 counts could be any watchlist app (not a problem for her).

### 8. Saying she's free on an open evening (`gma-08-day-panel.png`, `gma-09-free-marked.png`; tap 46 ms, confirm 887 ms)
- Tapping 18 opens "Sunday, October 18": "F J  Fran, Jo", then **I'm free that evening**, then "Free that evening puts you on the list if someone hosts". In `gma-08` the welcome toast from the ticket is **still there** and covers the lower half of that button and the explanation line. The button she has to press is half hidden.
- After the tap: 887 ms median (979 worst) to confirm, on a local server. The thumbs-up confirmed in 73 ms, so this toggle is 12 times slower. A second without response is when she taps again. Whether a second tap un-marks her is a GUESS; two taps within 500 ms would show it.
- Confirmation: a new toast, "You're free Sunday. If someone hosts, you're on the list.", sits **exactly over the button whose state changed**. Only the top edge of a green outline peeks out. The real confirmation (the cell going from 2 to 3 and turning green) is up in the grid, out of her eyeline.
- The idea itself (free, but no movie unless someone hosts, plus a separate "Count me in" for hosted nights) is two concepts where she has one ("I can come").
- Verdict: **fragile** for the toast over the action (Major, N1), **slow** (Minor), **confusing** (Minor).

### 9. How it works, opened from the top bar (`gma-10` to `gma-13`; 924 ms to first card, about 94 ms per Next)
- The "You're free Sunday..." toast is drawn **above the dialog and its dimmed backdrop** on all four cards.
- Card 1, "Welcome to the Weberplex": fine, but it tells her to "Put your first name down once" after she already has.
- Card 2, "Say when you're free": "Tap a day to see who's free, then say you are: I'm free that evening, or Count me in when someone's hosting. Anyone can host: pick a time and tap I can host." The button labels run into the prose with no quotes or bold, so it reads as word salad to someone who hasn't seen those buttons. The sample paints Fri in the "you're free" style while saying "Ava and Ben are free." and still offering "I'm free that evening".
- Card 3, "Thumbs-up what you'd watch": the sample shows "Seen ✓" and "Trailer". The real cards she just scrolled show "Seen it", "Stremio" and "Plot". There's no "Trailer" anywhere.
- Card 4, "The movie picks itself": "everyone coming gets a veto; a tie spins the reel". She never saw a veto control on any card (`gma-06`/`gma-07`: 👍, Seen it, Stremio, Plot), and "spins the reel" means nothing to her.
- The sheet's top edge jumps between cards (it sits at different heights in gma-10, -11, -12 and -13). The Next button stays put, which is good.
- Verdict: **confusing** (Minor). Generic? No. The sample marquee and ticket are on-brand.

### 10. At 200% text (`gma200-01` to `gma200-04`; 1352 ms to the animation)
- `gma200-01`: the "The movie is..." heading is **under the curtain valance**, with only the bottoms of the letters showing. "WEBERPLEX" runs into the card's inner frame on the right. "TAP TO TURN IT OVER" is big and clear.
- `gma200-02`: the reveal fits on one screen with poster, title, time, "4 coming: Gma, Hal, Jo and Sam" and both buttons. This is good.
- `gma200-04`: tour card 2 drops the sample (sensible), but the body is **cut off mid-sentence at "Anyone can host:"** behind the footer, and the "HOW IT WORKS · 2 OF 4" eyebrow wraps to three lines.
- Verdict: **fragile** (Minor).

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| N1 | Toasts outlive their moment and land on the next thing she needs. "Welcome, Gma. You're in for Friday." stays through the ticket, page, shelf and calendar, and covers half of **I'm free that evening**. "You're free Sunday..." covers the button whose state just changed, then sits above the How it works dialog on all four cards. | Major (fragile) | gma-04, gma-05, gma-06, gma-07, gma-08 (button half covered), gma-09, gma-10 to gma-13. How long a toast stays up wasn't measured separately. |
| N2 | "Count me in" doesn't count her in. It drops her onto a form with three lines of instructions ("Your first name is fine; this phone remembers it." / "One step left: your name, and you're on the list." / "On the list already? Tap your name."), five other people's name pills, and a **second yellow "Count me in" for the same night** in the same view. | Major (confusing) | gma-03; gma200-03 |
| N3 | Slow, wordless opening: a white flash at 71 ms, a closed curtain with no text and no visible change from 578 to 1419 ms, and the card in view only at 2640 ms on a local server. | Minor (slow) | gma-open-0071ms … 1419ms; timing 2640/2643. Slower on mobile data is a GUESS (throttled run). |
| N4 | The face-down "?" card can read as "movie not picked yet". The only cue is the spaced-caps "TAP TO TURN IT OVER"; the card itself never moves (only the bulbs chase) and the bottom 40% of the screen is empty. | Minor (confusing) | gma-01; gma-reveal-wait 404/618 ms differ only in the bulb ring. Her misreading is a GUESS (5-second test with a non-user). |
| N5 | Two Fridays, three "Count me in"s. The reveal and toast say only "Friday" ("FRIDAY 8 PM AT HAL'S", "You're in for Friday."), while "Also planned: Friday, October 23 … at Sam's" offers its own Count me in just below. | Minor (confusing) | gma-01, gma-02, gma-04, gma-08 |
| N6 | "Watch in Stremio" is a full-width button under her ticket, plus a "Stremio" pill on every shelf card. That brand means nothing to her and is a likely dead-end tap. | Minor (confusing) | gma-04, gma-06 |
| N7 | The calendar mixes "free" and "in": "When are you free?" sits under a ticket that says she's in. Days carry unlabelled small counts and house icons, the legend is below the grid, and "Free that evening puts you on the list if someone hosts" is a second idea next to Count me in. Without the deco digits it's a generic availability grid. | Minor (confusing, generic) | gma-05, gma-08 |
| N8 | "I'm free that evening" takes 887 ms (979 worst) to confirm, against 73 ms for a thumbs-up, on a local server. That's a full second with no answer, which invites a second tap. | Minor (slow) | timings table. Whether a double tap un-marks her is a GUESS (tap twice within 500 ms). |
| N9 | The tour teaches controls she can't find: "Trailer" (real cards say Stremio and Plot), "everyone coming gets a veto; a tie spins the reel" (no veto control on any card), and button names run into prose ("say you are: I'm free that evening, or Count me in when someone's hosting… tap I can host"). The sample Fri is styled as "you're free" while the text says "Ava and Ben are free." | Minor (confusing) | gma-11, gma-12, gma-13 vs gma-06/gma-07 |
| N10 | 200% text breaks layout: the waiting card's heading sits under the curtain valance, WEBERPLEX overflows the card frame, tour card 2's body is cut off at "Anyone can host:", and its eyebrow wraps to three lines. | Minor (fragile) | gma200-01, gma200-04 |
| N11 | "You're in ✓" looks like a button (outlined, the same size as Add to calendar). A tap meant to "make sure" may silently un-count her. | Minor | GUESS: tap it once on the ticket and once in the day panel (gma-04, gma-05) |
| N12 | Other people's names are one tap from becoming her ("On the list already? Tap your name.": Fran, Hal, Jo, Kim, Sam). No check is visible. | Minor | GUESS: tap a pill and see whether any "Are you Fran?" step appears (gma-03) |
| N13 | Count me in shows up ≥0.8 s after the title: nothing to press at 1449 ms, while the title arrived at 684 ms. | Polish (slow) | gma-reveal-turn-1449ms vs gma-02 |
| N14 | Ticket WHEN wraps to four lines ("Friday, / October / 16 at / 8:00 PM") and RUNNING to "1979 · 117 / min" because the poster takes the column. This is on the payoff object. | Polish | gma-04, gma-05 |

**Protect this:** one tap from the group text to a flipped card reading "Alien · Friday 8 PM at Hal's · 3 coming: Hal, Jo and Sam" with a big **Count me in** (gma-02, still one screen at 200% in gma200-02), and the ADMIT ONE ticket that says "GUEST Gma" (gma-04).
