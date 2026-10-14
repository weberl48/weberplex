# Newcomer critique: Gma (iter-01, run-s1-1)

Persona: in her 70s, opens the link from the family group text on a mid-range Android phone with large system text. She has never seen the site, won't read instructions, and quits after about 10 seconds of confusion. Goal: say she's free Friday and find out what movie they're watching.

Inputs used: `run-s1-1/gma-*.png`, `frames/gma-reveal-*.png`, `gma-reveal-contact.png`, `gma200-*.png`, the Gma sections of `transcript.md`, and the timing table from the brief. Nothing else was opened.

Bottom line: she does finish. The scripted session ends with her name on a ticket. But the tour gives her a confident wrong answer before the real one arrives, and the steps after the reveal pile up small "did that work?" moments. The product is strongest when it simply shows her the answer (the marquee, the ticket) and weakest when it teaches.

---

## Walkthrough

### 0. Opening the link: 1347 ms to the first card (local)
Locally this is fine. On her phone's mobile network it will be slower (**GUESS**: confirm by repeating the run with 4G throttling). What she gets after the wait is a tutorial, not the answer. Verdict: none locally.

### 1. First screen (`gma-01-first-screen.png`): confusing, slow
The top of the screen is the dimmed real marquee: "NOW BOOKING / THE MOVIE IS... / FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S". She gets the when and where, but the "what" is an ellipsis. A sheet covers the bottom 60% of the screen: "HOW IT WORKS · 1 OF 5". Inside it is a second, fully lit marquee: "NOW BOOKING / WEBERPLEX / PICK A NIGHT · PICK A PICTURE". So there are two "NOW BOOKING" signs, and the fake one looks more real than the real one. The big filled button is **Next**. **Skip** is the quiet outlined one, so she taps Next.
Generic test: the marquee passes. The sheet's frame (dots, Skip, Back/Next) is a stock onboarding carousel.

### 2. Tour card 2 (`gma-02-tour-2.png`): confusing
The card shows a text box already filled with "Sam" and a yellow "That's me" button. She isn't Sam. It looks exactly like the real form she'll meet later ("Your name" plus "That's me" in `gma-07-page-top.png`), and the real form shows dimly through behind the sheet. The likely move is to tap the fake box and try to type in it. Whether anything happens is a **GUESS**.

### 3. Tour card 3 (`gma-03-tour-3.png`): confusing, fragile
"Friday, October 16 / Jo and Sam are free. / **I'm free that evening**". This is her whole goal, shown as a big yellow button on the real date, and it's a picture. If she taps it and nothing happens, she'll either be lost or think she's done and leave (**GUESS**: tap it to confirm it's inert and silent). The example's numbers also contradict the real calendar. The example shows Fri 16 as "2" and Sat 17 as "3" with a house icon. The real calendar shows Fri 16 as "3" with the house and Sat 17 as "1" (`gma-08-page-full.png`). The card teaches the words "I'm free that evening", but on the locked night the real button says "Count me in".

### 4. Tour card 4 (`gma-04-tour-4.png`): forgettable
Five lines of text she won't read ("Everyone adds movies to the shelf… they carry over from night to night…"). The example buttons (thumbs-up 4, "Seen ✓", "Trailer", "FOREIGN") aren't attached to any movie. The real cards say "Plot" and "Stremio", never "Trailer" (`gma-09-shelf.png`). She taps Next.

### 5. Tour card 5 (`gma-05-tour-5.png`): confusing, the worst screen in the session
The real marquee at the top still says "THE MOVIE IS... FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S". Directly under it sits an example ticket: "ADMIT ONE / **THE WITCH** / WHEN Fri, Oct 16 · 8:00 PM / WHERE **Jo's**". It has the same date and time, a film title, and a different house. To someone scanning for "what movie", that ticket is the answer. Her 10 seconds run out about here: about 1.3 s to load plus four Next taps with a glance at each (**GUESS** on reading time). If she closes the page now, she tells the family it's The Witch at Jo's. The copy around it makes things worse: "the movie locks", "one veto", "a tie spins the reel".

### 6. The reveal (frames `gma-reveal-0000ms` → `1723ms`, `gma-06-reveal-landed.png`): generic (taste)
It starts 44 ms after "Let's go".
- 0 ms: "The movie is..." over a flat maroon card with a single "?".
- 214 ms: the card is edge-on and the poster is showing.
- 780 ms: the poster lies flat.
- 1098 ms: "The Grand Budapest Hotel / Friday 8 PM at Hal's / OK" has landed. The 1401 and 1723 ms frames are identical.

For Gma it's big and clear, and she finally has the answer. But it contradicts the ticket she saw a second earlier (The Witch, Jo's), so now she has to work out which one is real.
On taste: a "?" card flipping over is the stock reveal of any quiz or gacha app. The marquee, which is the one thing that is unmistakably this product, sits dimmed behind the overlay in every frame and still reads "THE MOVIE IS...". The payoff happens on a generic card instead of on the sign. The overlay is also thin. At 780 ms, "AT 8:00 PM · AT HAL'S" shows through behind the heading. At 200% text, the nav labels show through behind "Friday 8 PM at Hal's" (`gma200-03-reveal.png`).

### 7. Top of the page (`gma-07-page-top.png`): mostly good, one trap
The marquee now reads "THE GRAND BUDAPEST HOTEL / FRIDAY, OCTOBER 16 / AT 8:00 PM · AT HAL'S / Starts in 2 days". This is the best screen in the product: what, when and where at a glance, and nobody else's site looks like it. Below it: "Put your name on the guest list / On the list already? Tap your name.", then chips for Fran, Hal, Jo, Kim and Sam with initial avatars, then "New here?", a "Your name" box and "That's me". "Count me in" is below the fold. The chips look like the list of who's coming, but only Hal, Jo and Sam are coming (`gma-11-after-name.png`). One stray tap on "Kim" may make her Kim (**GUESS**: is there a confirmation step?).

### 8. The shelf (`gma-09-shelf.png`, `gma-08-page-full.png`): confusing, generic
- Four of the seven cards carry a "MOST WANTED" banner (Alien, Jaws, Parasite, The Grand Budapest Hotel, all with thumbs-up 3). A banner on more than half the shelf means nothing.
- Alien and Forrest Gump both carry the note "The shark still holds up". That's a Jaws note on two films with no sharks. Fix the seed if that's where it comes from; either way it's on screen.
- Every card has four buttons ("👍 3", "Seen it", "Stremio", "Plot") plus a row of initials. "👍 3" reads as a tally, not a button. "Stremio" is a word she has never seen.

Generic test: fails. A poster grid with pill buttons could be any watchlist app.

### 9. Thumbs-up on Alien (`gma-10-name-form.png`): fine
A toast fades in at the bottom after 36 ms: "Put your name down first. Then that counts." Asking first is right; "that" is vague.

### 10. Typing her name (`gma-11-after-name.png`): confusing, fragile
The page has jumped from the shelf to the name form at the top, and she types "Gma". The caption says the thumbs-up went through (256 ms median), yet the screen still shows the old toast "Put your name down first. Then that counts." and an unchanged form with "That's me" still showing. She has just done what it asks, and it's still asking. She'll tap again or retype. Her place on the shelf is gone, and nothing takes her back to it.

### 11. Tapping Friday on the calendar (`gma-12-day-panel.png`): fragile
The confirmation from step 10 only turns up now: "Welcome, Gma. Your thumbs-up on Alien counts." It sits on top of the panel she just opened and hides "Friday, October 16" and "Hal is hosting…". The panel itself stops after "Budapest Hotel": no bottom edge and no "Count me in" button. The lower half of the screen is empty black. If her phone shows this for even a second, she has tapped her night and there is nothing to press. How long it lasts is a **GUESS**.

### 12. Count me in (`gma-13-counted-in.png`): slow
It takes 621 ms median and 934 ms worst, on a local server. The result is clear: a green "You're in ✓", her "G" avatar added to "Gma, Hal, Jo, Sam", and a "You're in for Friday." toast. But almost a second of apparent nothing on localhost means longer on her network (**GUESS**). "You're in ✓" then appears exactly where an impatient second tap lands, and it's styled as a button. Whether that second tap takes her back out is a **GUESS**.

### 13. Up next with her ticket (`gma-14-up-next.png`): the payoff
"ADMIT ONE / THE GRAND BUDAPEST HOTEL / WHEN Friday, October 16 at 8:00 PM / WHERE Hal's / GUEST Gma / RUNNING 2014 · 99 min". Her name is on a ticket, and this is the moment she'll remember. Small flaw: the toast "You're in for Friday." covers the "Count me in" for October 23, which is the other Friday on screen.

### 200% text (`gma200-01` to `gma200-04`): fragile
- Card 1: the body text is cut off by the footer line after "what you'd watch.", and "and the site picks the movie" is hidden. Nothing shows the card can scroll. The step label breaks as "HOW IT / WORKS · 1 / OF 5".
- Card 2: the line "remembers it, and" is sliced through the middle of the letters.
- Reveal: fits well; only the see-through overlay noted in step 6.
- Page top: the marquee fills the whole screen. The nav wraps to two rows, and "WATCHED" is lit amber as if she were in that section while she's at the top of the page. "Starts in 2 / days" breaks across two lines.

---

## Findings

| id | problem | severity | evidence |
|---|---|---|---|
| N1 | Tour card 5's example ticket, "THE WITCH · Fri, Oct 16 · 8:00 PM · Jo's", sits under the real "THE MOVIE IS... FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S". Same date and time, wrong film, wrong house. A newcomer scanning for "what movie" gets a confident wrong answer. The real answer then contradicts it a second later. | **Major** (confusing). Close to a blocker for the "what movie" goal. | `gma-05-tour-5.png` vs `gma-06-reveal-landed.png`. That her patience runs out on this card is a GUESS (1.3 s load + 4 taps). |
| N2 | The answer she came for is held back. The marquee reads "THE MOVIE IS..." behind a 5-card tour. The filled button is Next, while Skip is outlined and secondary, so she taps five times through cards she won't read before the title appears. | **Major** (slow, confusing) | `gma-01`–`gma-05`: marquee shows "THE MOVIE IS..."; the title first appears in `gma-06`/`gma-07`. |
| N3 | The tour's examples look exactly like real controls and use real dates. "Sam" + "That's me" (card 2). "Friday, October 16 / I'm free that evening" (card 3) is her goal as a fake button. Card 3's counts contradict the real calendar (example Fri 16 "2", Sat 17 "3 + house"; real Fri 16 "3 + house", Sat 17 "1"). Card 1 stacks a lit example marquee under the dimmed real one. The words it teaches ("I'm free that evening", "Trailer") aren't the page's words ("Count me in", "Plot", "Stremio"). | **Major** (confusing) | `gma-01`–`gma-04` vs `gma-07`, `gma-08`, `gma-09`. Whether tapping an example does nothing silently is a GUESS: tap card 3's button to confirm. |
| N4 | The reveal is a stock "?" card flip in a pop-up. The marquee, the product's signature, stays dimmed in every frame and keeps saying "THE MOVIE IS...". Remove the name and it's any quiz app's reveal. The overlay is thin enough for page text to show through. | **Major** (taste, generic) | `frames/gma-reveal-0000ms.png` (flat maroon card, "?"), `0214ms`, `0780ms` ("AT 8:00 PM · AT HAL'S" showing behind the heading), `1098`–`1723ms`; `gma200-03-reveal.png`. |
| N5 | After she taps Friday, the day panel stops after "Budapest Hotel" with no bottom edge and no "Count me in", the lower half of the screen is blank, and a toast covers the panel heading. | **Major** (fragile), provisional | `gma-12-day-panel.png`. How long it lasts is a GUESS: record at 60 fps on the mid-range phone. Downgrade to Polish if it clears within about 100 ms; Blocker if the button stays missing. |
| N6 | Thumbs-up before giving a name: the page jumps from the shelf to the top-of-page form and never returns. After she enters her name, the screen still says "Put your name down first. Then that counts." The confirmation ("Welcome, Gma. Your thumbs-up on Alien counts.") only lands later, on top of the calendar panel. | **Minor** (confusing) | `gma-10` → `gma-11` (old toast, unchanged form) → `gma-12`. |
| N7 | "Count me in" takes 621 ms median / 934 ms worst to confirm, on localhost. "You're in ✓" then appears exactly under a second impatient tap and is styled as a button. | **Minor** (slow). Undoing the RSVP on a double tap is a GUESS. | Timing table; `gma-13-counted-in.png`. Confirm by double-tapping with 3G throttling. |
| N8 | Shelf labels carry no meaning: "MOST WANTED" on 4 of 7 cards; "The shark still holds up" on Alien and Forrest Gump; "👍 3" reads as a count, not a button; "Stremio" on every card, plus "Watch in Stremio" right under "Count me in". | **Minor** (confusing, generic) | `gma-09-shelf.png`, `gma-08-page-full.png`, `gma-11-after-name.png`. That the shark note comes from seed data is a GUESS. |
| N9 | The name chips (Fran, Hal, Jo, Kim, Sam with initial avatars) under "Put your name on the guest list" read like the list of who's coming. Only Hal, Jo and Sam are. One stray tap may sign her in as someone else. | **Minor** (confusing). The consequence is a GUESS. | `gma-07-page-top.png` vs "3 coming: Hal, Jo, Sam" in `gma-11`. Confirm by tapping "Kim" as a newcomer. |
| N10 | At 200% text, the tour text is cut off mid-sentence by the footer line with no sign it scrolls ("what you'd watch." ends card 1; "remembers it, and" is sliced through on card 2). The step label breaks as "1 / OF 5". The nav wraps to two rows with "WATCHED" lit as active at the top of the page. | **Minor** (fragile) | `gma200-01-first-screen.png`, `gma200-02-tour-2.png`, `gma200-04-page-top.png`. |
| N11 | The final toast "You're in for Friday." covers the "Count me in" for October 23, the other Friday on screen. | **Polish** | `gma-14-up-next.png`. |

## Protect this
Once the movie is out, the marquee answers what, when and where at a glance ("THE GRAND BUDAPEST HOTEL / FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S", `gma-07`), and the ADMIT ONE ticket ends the session with "GUEST Gma" on it (`gma-14`).
