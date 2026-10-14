# Iteration 4 critique: Dana, the connoisseur

I plan every outing on Partiful and I go to the cinema for the moment the lights go down. I judged only from `.improve/evidence/iter-04/`: the three contact sheets, the `run-s1-1/frames/` stills, the named `run-s1-1` screenshots, the three `run-s2` screenshots and the timings table. Frame times are in ms from the tap (`turn-`) or from the start of capture (`wait-`). Paths are relative to `run-s1-1/` unless they say otherwise.

Verdict words for each step: **generic, slow, confusing, fragile, forgettable**, or **none**.

---

## Part 1: The reveal, frame by frame

### Beat 0: arriving (open link to card on screen: 1341 ms median)
- I have no frame from those 1.3 s. **GUESS:** I don't know whether Jo sees a blank screen, the page, or a fade. A capture from link-open to `wait-0000` would settle it.
- By `jo-reveal-wait-0000ms` the screen is already black. **The lights are down before Jo arrives.** In a cinema the dimming is the moment: a lit room going dark, the talk dropping off. Here the screen is simply dark when she gets there, and she never sees it dim. Verdict: **forgettable**.

### Beat 1: the wait (`jo-reveal-wait-0000` to `-1075`, `gma-reveal-wait-0000` to `-1190`)
- On screen: "The movie is…" in gold, a maroon card with a gold "?", a ring of bulbs, and "TAP TO TURN IT OVER" in small spaced capitals. The lower ~40% of the screen is empty black.
- The only motion is a two-phase bulb chase. Every other bulb is lit, and the pattern swaps roughly once a second (wait-0000/0246 are identical, wait-0460/0674/0874 are identical, then back). The card doesn't breathe, tilt or glow, so nothing on screen builds tension.
- It doesn't tell me which night, who's coming, or that four of us voted. The "?" card is a playing-card trope, not a cinema one. Verdict: **generic**. The chase is charming, but it's the only thing working.

### Beat 2: the turn (`jo-reveal-turn-0000` to `-0574`)
- 0 ms: the card starts to tilt and the "tap" caption disappears.
- 136 ms: the card is edge-on. **The bulb frame behind it is empty and black**, so it reads as a card spinning in front of a picture frame rather than the frame's own contents turning.
- 268 ms: the poster is already legible, at an angle, and the card's edge overhangs the bulb frame.
- 415 ms: the card is nearly flat. 574 ms: fully flat and sharp. The heading still says "The movie is…".
- The poster is readable at about a quarter of a second. That's the speed of an ordinary UI flip, not a ceremony. Nothing holds, nothing slows down, and no beat of silence comes before the image. A cinema gives you seconds of dark before the first frame. Verdict: **forgettable**, because the payoff is spent before Jo has registered it.

### Beat 3: the landing (`jo-reveal-turn-0719`, `gma-reveal-turn-0751`)
- At 719 ms the heading **swaps** from "The movie is…" to "Friday's feature". "Alien" appears *under* the poster in gold, followed by "Friday 8 PM at Hal's" and one button. Tap to title and buttons is 699 ms (timing table).
- The line that held the screen for over a second, "The movie is…", is never finished. It's thrown away and replaced by a different phrase, while the title turns up somewhere else. The ellipsis should resolve into "Alien" in that same spot. Verdict: **generic**.
- `jo-01-reveal-landed.png`: "Friday's feature / Alien / Friday 8 PM at Hal's / See my ticket". **No people on the screen**: no host face, no "4 coming", nobody who voted for it, and no reason it won. The shelf knows the reason (Alien, 4 thumbs-ups from F G H S, `jo-13-page-full`). Partiful's whole emotional payload is faces on the invite. This reveal is solitary. Verdict: **generic**.
- For Kim and Gma (`kim-01`, `gma-06`) the same landing offers "Count me in / Not this time". This is the best idea in the product: the reveal is also the one-tap RSVP.

### Beat 4: after the landing (`jo-reveal-turn-0884` to `-1548`)
- At 884, 1215 and 1387 ms the bulbs are full on. At 1051 and 1548 ms they're fully off (the whole ring goes dark). After the chase during the wait, the landed state **strobes**. A cinema marquee doesn't blink on and off; it chases. A full on/off blink around the poster you're trying to look at reads as a hazard light.
- **GUESS:** whether it ever stops. The last frame (1548 ms) is still blinking. A capture at 5 s and 15 s would confirm.
- At 884 ms the poster lettering ("A L I E N") is still soft and only sharpens at 1051 ms, so the image goes out of focus for a moment as it lands. Polish.

### Beat 5: "See my ticket" (47 ms to ticket; `jo-02-ticket.png` is 1.5 s later)
- Jo is cut straight out of the dark stage into the page. **GUESS:** at 47 ms there's no print, tear or slide animation. Frames from the button tap would confirm.
- What she lands on, top to bottom: the marquee cut off mid-board, the nav, then a gold-bordered box reading **"8 updates since yesterday at 5:14 PM [Walk me through] [Got it]"**, then "Up next", then the ADMIT ONE ticket starting about 40% of the way down the screen. Kim gets the same: "2 updates since 5:11 PM today" sits above her ticket, with a "You're in for Friday." toast at the bottom (`kim-02-ticket.png`).
- The ticket is the trophy, and it's displayed underneath a notification chore that has the stronger border. The theatre lights come up into an inbox. Verdict: **forgettable**.
- The ticket itself is lovely: "ADMIT ONE / ALIEN / WHEN Friday, October 16 at 8:00 PM / WHERE Hal's / GUEST Jo / RUNNING 1979 · 117 min / No. 237982".

### What's missing compared with the references
1. **A lights-down.** We need to see the room go dark: the page dims to black and holds about a beat. The wait screen is already dark when it appears.
2. **Duration and a hold.** The whole thing is over in 0.7 s. A once-a-week ritual deserves around 2 s with a held beat before the image.
3. **The sentence paid off.** "The movie is…" followed by "Alien" in the same place.
4. **The audience.** Partiful would put the faces of who's coming, and a "you all wanted this" line, on the reveal itself.
5. **A finish.** The ticket should be the final frame of the dark sequence, not a section of the page under "8 updates".

### Runner-up moment: "If it locked now"
- **This panel doesn't appear in any evidence screen.** The only "what are we watching" signals are bare strings: "Hal is hosting at 8:00 PM · Leading: Jaws or Forrest Gump" (`hal-03-hosted.png`) and "Friday, October 23 at 8:00 PM · at Sam's · 2 coming · Leading: The Grand Budapest Hotel" (`jo-13-page-full.png`, `hal-04-also-planned.png`).
- Neither says *why*. On the shelf, Jaws, Parasite and Grand Budapest all have 3 thumbs-ups (`jo-13`), so "Leading: The Grand Budapest Hotel" looks arbitrary. The "LEADING OCT 23" ribbon on the shelf card is the one good touch. Verdict: **forgettable**.
- **GUESS:** whether the panel exists further down a day panel that wasn't captured. A screenshot of the Oct 23 day panel would confirm.

---

## Part 2: The rest of the session, through the same lens

### Jo, a regular, a day later
- **News bar to walkthrough** (`jo-03` to `jo-11`): **slow, forgettable.**
  - The bar says "8 updates" but the walkthrough runs "1 OF 9".
  - Card 1 already lists all eight items ("Here's the program. Walk through it, or call it read."), then cards 2 to 9 repeat them one at a time.
  - Card 2 is "Locked for Friday: Alien", seconds after Jo turned that card over herself.
  - "1 new thumbs-up on 1 movie / Alien" doesn't say whose, though the shelf shows G on that card.
  - **Nothing says "Gma is coming Friday"**, even though Jo's own ticket lists Gma among the 4 coming. That's the most Partiful-like news there is, and it's missing.
  - The art boxes are mostly empty dashed rectangles: a small thumbnail at the left (cards 2, 3, 4, 9), a lone thumbs-up (card 6), or nothing (cards 5 and 8).
  - The sheet's top edge jumps between cards (compare `jo-05-news-3` and `jo-10-news-8`).
  - Good: card 9 has a voice ("Fran gave Inception 4 stars / Loved it, the ending got me."), and card 5 is actionable ("Count me in").
- **Ticket block** (`jo-12-page-top`): **generic.** "4 coming: G H J S Gma, Hal, Jo, Sam" uses initials in near-identical dark circles, the same as everywhere else on the page. Partiful's guest list is faces. "Watch in Stremio" sits on a ticket for a night at Hal's, which is confusing for a guest who is going to Hal's.
- **Marquee:** "NOW BOOKING / ALIEN" stays up after the movie is locked and ticketed (`jo-13`, `gma-09`). "Now booking" contradicts "Locked for Friday". A real marquee would say NOW SHOWING or FRIDAY. Polish.
- **Whole page** (`jo-13-page-full`): **generic.**
  - It's 15,204 px tall, about 5,800 CSS px at 412 wide: marquee, ticket, concessions, also planned, calendar, shelf, watched and stats all in one scroll.
  - Shelf cards carry up to five buttons each (Parasite: thumbs, "Seen it", "Stremio", "Plot", "Remove").
  - The Stats board has real personality ("You and Kim agree 50% · 2 movies in common"). Keep it.

### Kim, who has a name but isn't coming
- Reveal to "Count me in" to a named ticket in 55 ms (`kim-02`): **none** for speed. It still inherits the "2 updates" box above the ticket (see C2).

### Gma, a newcomer on a 360 px phone
- **First screen** (`gma-01` to `gma-05`): **slow.**
  - A five-card "HOW IT WORKS · 1 OF 5" tour covers the real teaser ("NOW BOOKING / THE MOVIE IS… / FRIDAY, OCTOBER 16"), which sits dimmed behind it.
  - Card 3 is a six-line manual: "…say you are: I'm free that evening, or Count me in when someone's already hosting…".
  - Card 5 explains the trick before she sees it ("Then you turn the card over, and your ticket appears") and shows a sample ticket. Sample people "Ava" and "Ben" are strangers in a family group.
  - Partiful opens on the invite, not a tutorial.
- **Reveal** (`gma-06`): **none.** The newcomer gets the reveal before giving a name. That's right.
- **"Count me in" to name form** (`gma-07`): **confusing.**
  - Gma is thrown out of the dark stage onto the page. A cream toast scolds: "Put your name down first. Then that counts."
  - The toast covers the Up next card's own "Count me in" button.
  - The headline "Put your name on the guest list" breaks with "list" alone on line 2.
  - Partiful asks for the name inline, in a sheet, without leaving the invite.
- **Name to ticket** (344 ms median, 848 ms worst; `gma-08`): **none** for median speed. The worst case is close to a second. WHEN wraps to "Friday, October 16 at / 8:00 PM" at 360 px (Polish).
- **Toasts** (`gma-08` to `gma-12`): **fragile.**
  - "Welcome, Gma. You're in for Friday." is still on screen in the ticket, full-page, shelf, after-vote and day-panel captures.
  - In `gma-12` it covers the yellow "I'm free that evening" button.
  - Her thumbs-up on Alien (3 to 4, `gma-11`) gets no feedback of its own because the old toast is still sitting there.
  - **GUESS:** the time between captures isn't given. Timestamps on those captures would confirm how long the toast lives.
- **Free evening** (`gma-13`): **none.** Clear: "You're free Sunday. If someone hosts, you're on the list.", 18 turns green with "3", and her G joins "Fran, Gma, Jo".

### Hal, hosting
- **Day panel** (`hal-01`): **confusing (minor).** Green dots on Oct 16 and Oct 18 aren't in the legend ("you're free", "2 free that evening", "movie night").
- **Slip** (`hal-02`): **none.** "NOW BOOKING / MOVIE NIGHT AT HAL'S / Monday, October 19 at 8:00 PM / Put it on the marquee / Not yet" is the most theatrical control in the app. 44 ms.
- **Confirmation** (`hal-03`, 657 ms): **slow, fragile.**
  - At 657 ms it's about 15 times slower than every other tap, with no evidence of a pending state.
  - The payoff is a toast saying "It's on the marquee", while the night actually appears as a grey "ALSO PLANNED" row ("· 1 coming · Leading: Jaws or Forrest Gump", `hal-04`).
  - The host controls are a pile: a time dropdown *and* a separate "Change time" button, a theme dropdown, and then "Lock the movie now" next to "Cancel night" in identical outlined buttons.
  - On the locked Friday, "Unlock and re-pick" sits next to "Cancel night" (`hal-04`), so a host can un-reveal a movie everyone has already turned over. **GUESS:** whether either control asks for confirmation or re-notifies guests. A capture of each tap would confirm.

### Seed 2
- `run-s2/jo-01-reveal-landed.png` and `run-s2/gma-06-reveal-landed.png` are pixel-identical to seed 1. `run-s2/jo-02-ticket.png` differs only in the timestamp ("5:14 PM"). Same film, same night, same ticket number (No. 237982).
- So the evidence can't show whether the reveal has any per-film personality. **GUESS:** every film gets the identical "Friday's feature" treatment. A seed with a different winner would confirm.

---

## Findings

| id | problem | severity | tag | evidence |
|---|---|---|---|---|
| C1 | The reveal moves at UI speed, with no lights-down. The screen is already black on arrival. The wait's only motion is a two-phase bulb chase. The poster is legible at 268 ms and the whole thing ends at 699 ms, with no hold or build. | Major | taste | `jo-reveal-wait-0000ms` (already dark); wait-0000 = wait-0246 and wait-0460 = wait-0874 (bulbs only); `jo-reveal-turn-0268ms` poster legible; timing "tap to title and buttons 699". What's on screen during the 1341 ms open is a **GUESS**. |
| C2 | The ticket payoff lands in clutter. "See my ticket" cuts to the page, and a gold "8 updates since yesterday at 5:14 PM [Walk me through] [Got it]" box sits above "Up next" and the ticket, which starts about 40% down. Kim's case is the same. | Major | taste | `jo-02-ticket.png`, `kim-02-ticket.png` ("2 updates since 5:11 PM today"); 47 ms to ticket. No print/tear animation is a **GUESS** (one frame only). |
| C3 | The reveal has no people and no reason. It shows only "Friday's feature / Alien / Friday 8 PM at Hal's / See my ticket": no faces, no "4 coming", nothing on why Alien won. | Major | taste | `jo-01-reveal-landed.png`; the shelf knows the reason (Alien 4 thumbs-ups, F G H S, `jo-13-page-full`). |
| C4 | The runner-up ("what are we watching, and why") is reduced to bare "Leading: …" strings with no counts or names. With three films tied at 3 thumbs-ups, the leader looks arbitrary. | Major | taste | `hal-03-hosted` "Leading: Jaws or Forrest Gump"; `jo-13`, `hal-04` "2 coming · Leading: The Grand Budapest Hotel". No "If it locked now" panel in any capture (**GUESS** that it isn't elsewhere). |
| C5 | A newcomer's "Count me in" on the reveal throws her out of the dark stage to a page form, with the toast "Put your name down first. Then that counts." covering the Up next "Count me in" button. Partiful asks inline. | Major | taste | `gma-06-reveal-landed`, `gma-07-name-form`; timing 41 ms. |
| C6 | "The movie is…" is never paid off. The heading swaps to "Friday's feature" at 719 ms, and the title appears below the poster instead of finishing the sentence. | Minor | taste | `jo-reveal-turn-0574ms` vs `-0719ms`; `gma-reveal-turn-0583ms` vs `-0751ms`. |
| C7 | After landing, the whole marquee strobes fully on and off (about every 0.3–0.5 s) around the poster, unlike the gentle chase during the wait. | Minor | taste | Bulbs bright at turn-0884/1215/1387, dark at turn-1051/1548. Whether it ever stops is a **GUESS**. |
| C8 | The news walkthrough is slow and faceless. "8 updates" becomes "1 OF 9", card 1 lists all eight and then they repeat, and "Locked for Friday: Alien" re-announces the reveal. "1 new thumbs-up on 1 movie" doesn't say whose. Nothing says "Gma is coming Friday". Art boxes are mostly empty. | Minor | taste | `jo-03-news-1` to `jo-11-news-9`; `jo-12-page-top` lists Gma among the 4 coming. |
| C9 | The newcomer gets a five-card tour before the reveal. Step 3 is a six-line manual, step 5 explains the turn and shows a sample ticket (spoiling it), and the sample people are strangers ("Ava", "Ben"). | Minor | | `gma-01-first-screen` to `gma-05-tour-5` ("HOW IT WORKS · 1 OF 5"). |
| C10 | A stale "Welcome, Gma. You're in for Friday." toast persists across five captures and covers the "I'm free that evening" button. The thumbs-up gets no feedback of its own. | Minor | | `gma-08` to `gma-12` (button covered in `gma-12-day-panel`). Toast lifetime is a **GUESS** (capture spacing unknown). |
| C11 | Hosting confirmation takes 657 ms (others about 45 ms). The "It's on the marquee" toast doesn't match a grey "Also planned" row. Host controls pile up: dropdown plus "Change time", and "Lock the movie now" or "Unlock and re-pick" next to "Cancel night" in identical style. | Minor | | `hal-03-hosted`, `hal-04-also-planned`; timing 657 ms. Confirmation dialogs are a **GUESS**. |
| C12 | People are initials in near-identical dark circles everywhere, and news card 7 uses bare name pills. That's far behind Partiful's guest list with faces. | Minor | taste | `jo-12-page-top` "4 coming: G H J S"; `gma-12` "F J"; `jo-09-news-7`. |
| C13 | Calendar dots on Oct 16 and Oct 18 aren't explained by the legend. | Minor | | `hal-01-day-panel`. |
| C14 | The flip's geometry: at 136 ms the bulb frame is empty behind an edge-on card, and at 268 ms the card overhangs the frame. The poster is soft at 884 ms. | Polish | taste | `jo-reveal-turn-0136ms`, `-0268ms`, `-0884ms`. |
| C15 | "NOW BOOKING / ALIEN" stays up after the movie is locked. WHEN wraps at 360 px. "Watch in Stremio" sits on a ticket for a night at Hal's. | Polish | | `jo-13-page-full`, `gma-09-page-full`, `gma-08-ticket` ("Friday, October 16 at / 8:00 PM"). |

No blockers.

## Protect this

The face-down "?" card in a chasing-bulb marquee that turns into the real poster, and the reveal doubling as a one-tap RSVP ("Count me in" to a named ADMIT ONE ticket in about 50 ms). That is the product.
