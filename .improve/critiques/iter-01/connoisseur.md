# Connoisseur critique (iter-01): Dana

The lens: I plan every group outing on Partiful, and I love the moment the house lights go down. I judged only from the listed evidence in `.improve/evidence/iter-01/` (run-s1-1 frames and screens, plus run-s2 `jo-01` and `jo-02`) and the timing table in the brief. Anything I say about Partiful beyond common knowledge is marked **GUESS**.

Seed caveat, not a finding: the shelf gives the pitch "The shark still holds up" to Alien and Forrest Gump as well as Jaws (`gma-09-shelf.png`). That is seed data, so I ignored it.

---

## 1. The signature moment, frame by frame

The sources are `run-s1-1/frames/jo-reveal-*.png` (412 px) and `gma-reveal-*.png` (360 px). Seed 2 (`run-s2/jo-01-reveal-landed.png`, Jaws) lands on the same layout.

| t | What is on screen | Verdict |
|---|---|---|
| **0 ms** (`jo-reveal-0000ms`, `gma-reveal-0000ms`) | A gold "The movie is…" caption sits over a maroon card with a gold "?", already tilted in perspective. Behind a thin scrim the page stays readable: "Add to calendar", "You're in", "4 coming: Gma, Hal, Jo, Sam", "Popcorn · Hal". On Gma's screen the gold caption runs into the ghosted "AT 8:00 PM · AT HAL'S" from the marquee behind it. | **generic**. A maroon "?" card would work for any quiz or trivia app. The lights are only half down. |
| **214–278 ms** (`gma-reveal-0214ms`, `jo-reveal-0278ms`) | The card is already mid-turn with the poster showing. The mystery lasted less than 278 ms (Jo) and less than 214 ms (Gma). | **forgettable**. There is no drumroll. The answer arrives before you know you're waiting. |
| **544–839 ms** (`jo-reveal-0544ms`, `-0839ms`) | The poster faces you square-on with no title, no motion and no button. The two frames are effectively identical. | **slow**. The only pause in the sequence comes after the answer is known, so it is dead air rather than suspense. |
| **~1100 ms** (`jo-reveal-1148ms`, `gma-reveal-1098ms`) | The title appears in the display serif, then "Friday 8 PM at Hal's", then a button labelled **"OK"**. As they mount, the caption and poster jump up about 30 CSS px (caption y≈540 in `-0839ms` vs y≈470 in `-1148ms`, at display scale). Behind, the marquee still reads "THE MOVIE IS…" (`jo-01-reveal-landed`). | **generic**. "OK" is the most generic word in UI. The brief promises **See my ticket**, but neither seed ships it. |
| **Tap OK → ticket: 53 ms; news sheet: +4 ms** (`jo-02-ticket.png`, both seeds) | The page scrolls to the ADMIT ONE ticket. Within 4 ms a scrim and the "SINCE YOU LAST LOOKED · 1 OF 9" sheet slide over it. The ticket stays dimmed with its lower half (GUEST, RUNNING, the stub) under the sheet (`jo-03-news-1`). | **forgettable**. The payoff is buried the instant it lands. |

**Pacing summary:** from card to answer takes about 1.1 s, and about 0.5 s of that is a static poster after the reveal. A cinema works the other way round: seconds of darkness and suspense, then the image. Here you get a fraction of a second of "?" and then waiting for a button.

**What's missing compared with a cinema's lights-down:**
- **No real darkness.** The page stays readable under the scrim. A cinema goes black before anything happens.
- **The marquee sits it out.** The bulb marquee is the best thing on the site (`jo-13` top, `gma-07`). During the reveal it stays dimmed and still says "THE MOVIE IS…", then silently swaps to the title after OK. Bulbs chasing, letters slotting in and the house lights fading would make this moment belong only to Weberplex. With the name removed, the current version fails the generic test.
- **No "why" and no people.** There is no line like "3 of the 4 coming thumbed it", "the reel broke a tie" or "Jo put it on the shelf", and the faces of who's coming never appear. The brief's own question, "what are we watching, and why?", gets only the "what".
- **No real next beat.** A guest should get "See my ticket" with the ticket torn or stamped with their name. A non-guest (Gma) should get "Count me in" at the moment of peak interest. Instead both get "OK", which closes the modal.
- **Sound or haptic:** **GUESS**, because frames can't show it. A soft vibration when the card lands would be what a phone can offer in place of a projector starting up.

**Partiful comparison:** Partiful's invite leads with the event, the host and guest faces, and the RSVP lives on the same screen as the reveal of "what is this". Its RSVP has a celebratory response (**GUESS** on the exact animation). Weberplex's reveal has neither the faces nor the action.

---

## 2. The rest of the session

| Step | Evidence | Verdict |
|---|---|---|
| **Gma's first screen and tour** | `gma-01`…`gma-05`: "HOW IT WORKS · 1 OF 5" covers the bottom half. Card 2 pre-fills **"Sam"**, a real guest (`gma-07` lists Sam). Card 5 shows a sample ticket, "ADMIT ONE · THE WITCH · Fri, Oct 16 · 8:00 PM · WHERE Jo's", directly under a live marquee reading "FRIDAY, OCTOBER 16 AT 8:00 PM · AT HAL'S". | **slow, confusing**. Two different movies at two houses on the same night, one screen apart. |
| **Gma's reveal** | `gma-06-reveal-landed`: the same "OK" with no way to RSVP. OK drops her onto "Put your name on the guest list". | **generic**, and a dead end for a non-guest |
| **Gma's page top** | `gma-07`: the marquee shows the title with the bulbs lit, name chips "Fran Hal Jo Kim Sam", and "New here? Your first name is fine; this phone remembers it." | none. This is the best first impression in the product, and it arrives after six screens. |
| **Gma taps a thumbs-up before naming herself** | `gma-10`: toast "Put your name down first. Then that counts." Then `gma-12`: "Welcome, Gma. Your thumbs-up on Alien counts." The intent is remembered, which is good. | none |
| **Gma's day panel after naming** | `gma-12`: the bottom half of the screen is blank and the day panel is cut off mid-card under the toast. | **fragile** (the cause may be a capture artifact; see C12) |
| **Gma counts herself in** | `gma-13`: "You're in ✓" plus a toast reading "You're in for Friday." Her ticket appears in Up next, off-screen; she only sees it after scrolling up (`gma-14`). The tour promised "Then your ticket appears." | **forgettable** |
| **Count to get counted in** | Next ×4, Let's go, OK, type a name, That's me, scroll, Count me in: about 9 actions (inferred from the screen order). On Partiful you open the invite and RSVP. | **slow** |
| **Jo's ticket** | `jo-12`/`jo-13`: ADMIT ONE, the title in Art Deco type, WHEN / WHERE / GUEST Jo / RUNNING 2014 · 99 min, a perforated stub, "No. 237982". | none. It's lovely, but it has no poster and it's static. |
| **Jo's news cards** | `jo-03`…`jo-11` (detail in C9) | **slow, forgettable** |
| **The shelf and Stats** | `gma-09`: four of seven cards wear "MOST WANTED" (a four-way tie at 3). Stats in `gma-08`: "1. Alien 3, 2. Jaws 3, 3. Parasite 3, 4. The Grand Budapest Hotel 3". `jo-13`: Alien has 4 thumbs (F G H S). | **confusing** (see C5) |
| **Hal: day panel → slip** | `hal-02`: "NOW BOOKING · MOVIE NIGHT AT HAL'S · Monday, October 19 at 8:00 PM · It goes up on the marquee for everyone…", with "Put it on the marquee" and "Not yet". 42 ms. | none. This is the best-written moment in the product. |
| **Hal confirms** | `hal-03`/`hal-04`: after 415 ms, a toast says "It's on the marquee". The marquee still shows Friday; Monday lands as a plain row under ALSO PLANNED ("· 1 in"). The toast covers the very Oct 19 cell it just created. There's no "tell the group" action. | **forgettable** |

---

## 3. Findings

| id | Problem | Severity | Tag | Evidence |
|---|---|---|---|---|
| C1 | The reveal's payoff button reads **"OK"**, not "See my ticket". It dismisses instead of advancing. For a non-guest it offers no "Count me in" at the moment of peak interest. | Major | taste | `jo-reveal-1148ms`, `-1741ms`, `jo-01-reveal-landed`, `gma-06-reveal-landed`, `run-s2/jo-01-reveal-landed`: label "OK". `gma-05` promises "Then your ticket appears." |
| C2 | The admit-one ticket never really lands. For Jo, 4 ms after the tap a scrim and the "1 OF 9" news sheet cover it, leaving it dimmed with the bottom half hidden. For Gma, it appears off-screen and her only feedback is a toast. | Major | taste | `jo-02-ticket` (both seeds), `jo-03-news-1`; timing "news cards open 4 ms after the ticket"; `gma-13` (toast "You're in for Friday."), `gma-14` |
| C3 | There is no anticipation. The "?" is on screen for less than 278 ms (Jo) or 214 ms (Gma). The only pause, about 0.5 s, comes after the answer: a static poster with no title. It plays as a card flip, not a lights-down. | Major | taste | `jo-reveal-0000→0278ms`, `gma-reveal-0000→0214ms`; `jo-reveal-0544ms` ≈ `-0839ms`; title at `-1148ms` |
| C4 | The lights don't go down and the marquee sits the reveal out. The page stays readable under the scrim, the marquee stays dimmed on "THE MOVIE IS…", and the moment is a maroon "?" card plus a modal that any quiz app could ship. It fails the generic test. | Major | taste | `jo-reveal-0000ms` ("Add to calendar", "4 coming…", "Popcorn · Hal" readable); `gma-reveal-0000ms` (caption runs into ghosted "AT HAL'S"); `jo-01-reveal-landed` (marquee still "THE MOVIE IS…") |
| C5 | The reveal never says **why**, and in seed 1 the page's own numbers argue against the pick. The shelf says "each night shows the favorite of the people coming". At lock time the people coming were Hal, Jo and Sam. Budapest's thumbs (F K S) include one of them; Alien (F H S) and Jaws (H J K) include two each. Stats ranks Budapest 4th of a four-way tie. The news card says only "Locked for FRI". Vetoes, an early host lock or the seed could explain this, but nothing on screen does. The tour's "A day before, the movie locks" also sits beside a Friday that is already locked with "Starts in 2 days". | Major | | `gma-07` ("3 coming: Hal, Jo, Sam"), `gma-09`, Stats in `gma-08`, `jo-13` shelf (Alien 4: F G H S), `jo-04-news-2`, `gma-05`. Inference: the initials row lists the thumbs (supported by `gma-12` "Your thumbs-up on Alien counts" and G appearing on Alien in `jo-13`). |
| C6 | A newcomer gets a 5-card lecture before the invite, and the tour contradicts the real night: a sample ticket for THE WITCH at Jo's on Fri Oct 16 sits under a live marquee for Fri Oct 16 at Hal's, and the name field is pre-filled "Sam". It takes about 9 actions to be counted in. This is Major because every newcomer's first session is the only one that decides whether they come back. | Major | | `gma-01`…`gma-05`, `gma-06`, `gma-07`, `gma-13`. The action count is inferred from the screen order. |
| C7 | Hosting ends in a toast that claims "It's on the marquee" (it isn't; the night lands as a plain ALSO PLANNED row), with no way to send it to the group text, which is the core Partiful loop. | Minor | taste | `hal-03-hosted`, `hal-04-also-planned`. **GUESS** that no share control exists anywhere; confirm by checking the full hosted page for a share or "text the group" control. |
| C8 | "Lock the movie now" sits next to "Cancel night" with no preview of what it would lock. The runner-up signature moment, "If it locked now", does not appear once in these inputs, Oct 23 included. | Minor | | `hal-03-hosted`, `hal-04`, `gma-11` (ALSO PLANNED rows). **GUESS** that it shows elsewhere; confirm with a run where the next night is unlocked. |
| C9 | The news sheet is a 9-step slideshow that repeats the reveal. A banner reading "8 updates" with "Walk me through / Got it" sits behind a "1 OF 9" sheet with the same two buttons. Card 2 re-announces "Locked for FRI: The Grand Budapest Hotel". Cards 8 and 9 are both Inception. Thumbnails float in empty dashed boxes. "1 new thumbs-up on 1 movie" doesn't say who. Name pills have their text pressed against the top edge. | Minor | | `jo-03`, `jo-04`, `jo-05`, `jo-07`, `jo-08`, `jo-10`, `jo-11` |
| C10 | The reveal stack jumps about 30 CSS px at the payoff instant, as the title and button mount. | Polish | | `jo-reveal-0839ms` vs `-1148ms`; `gma-reveal-0780ms` vs `-1098ms` |
| C11 | Toasts cover the thing they confirm: the new Oct 19 cell, the Oct 23 "Count me in", and the line "Hal is hosting…". | Minor | | `hal-04`, `gma-14`, `gma-12` |
| C12 | After naming, half of Gma's screen renders blank and the day panel is cut off mid-card. | Minor | | `gma-12-day-panel`. **GUESS** on the cause (render vs capture); confirm with the same frame in another run or a screen recording. |

---

## 4. Protect this

The cinema vocabulary built into the UI must survive every fix: the bulb marquee, the admit-one ticket stub, Hal's "Now booking · Put it on the marquee" slip, and copy like "Concessions" and "Here's the program. Walk through it, or call it read." The fix for the reveal is to put that marquee and ticket into it, not to replace them.
