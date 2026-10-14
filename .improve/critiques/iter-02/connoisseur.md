# Connoisseur critique, iter-02 (Dana)

Persona: I plan every group outing on Partiful, and I go to the cinema for the moment the house lights go down. I judged only from `.improve/evidence/iter-02/` (run-s1-1 frames and screens, the three contact sheets, run-s2 Jo/Kim reveal and ticket) and the timing table in the brief. Pixel claims come from diffing the frames in that folder.

Verdict words per step: **generic, slow, confusing, fragile, forgettable**, or **none**.

---

## 1. The signature moment, frame by frame

### 1a. The open: link to reveal card, 1401 ms median (worst 1438)
- I can't see what is on screen during those 1.4 s. The first captured frame (`jo-reveal-wait-0000ms`) is already fully dark, with the card centered. Any lights-down from a lit page to the dark house, or a blank wait, falls outside the evidence. **GUESS.** To confirm, capture frames from the moment the link opens.
- Verdict: unknown (not captured).

### 1b. The wait: `*-reveal-wait-0000ms` to `-1127ms` (Jo), `-1150ms` (Gma), `-1140ms` (Kim)
- What's there: the gold display line "The movie is…", a maroon card with one gold "?", a silver bezel inside a ring of marquee bulbs, and "TAP TO TURN IT OVER" in small tracked caps.
- Motion: the only motion is the bulbs alternating. Diffs show 55,632 px change between wait-0257 and 0481, and between 0701 and 0912, with zero change in between. That is one blink about every 440 ms. Gma's and Kim's frames show the same thing. Nothing else moves. There is no build-up: the card doesn't breathe, and there is no dimming, no curtain, no projector flicker, no countdown.
- The card back is generic: a flat maroon field with a single "?" glyph. It has no Weberplex mark, no texture, and no ticket or film motif. It could be the back of any trivia app's card.
- Waiting for the tap is the right call: it hands the drumroll to the viewer, and it's the best decision in the flow.
- Verdict: **generic**. The anticipation is real but thin.

### 1c. The turn: tap to title and buttons, 1045 ms median (worst 1072)
- The turn itself is **not in the evidence**. `jo-reveal-turn-0000ms` already shows the finished state: poster, "Alien", "Friday 8 PM at Hal's", and the button. It is pixel-identical to `turn-0223ms`, `turn-0431ms` and `jo-01-reveal-landed.png`, and the same holds for Gma and Kim. Either the turn finishes before the first frame or the frames start after it. I can't judge whether that second is a theatrical flip, a cross-fade or a dead pause. **GUESS.** To confirm, capture 30–50 ms frames from 0 to 1045 ms after the tap.
- Back and front don't read as one object. The back has a silver bezel and roughly 13 large, crisp bulbs per long edge. The front has no bezel and roughly twice as many smaller, blurred bulbs, and the whole card sits about 14 device px higher (compare wait-1127 with turn-0000). Without seeing the motion, the before and after look like a swap, not a card being turned over.

### 1d. The payoff: `*-reveal-turn-*`, `jo-01`, `kim-01`, `gma-06`, and the run-s2 equivalents
- The lights stop. During the wait the bulbs blink every ~440 ms. After the turn, every capture I have is pixel-identical: three frames over 431 ms for each of the three personas, plus the landed shots, which are byte-for-byte the same in seed 1 and seed 2. The payoff state has less life than the wait. A cinema doesn't kill the marquee and stop there; something starts. (Caveat: 431 ms is just under one blink step, and the landed shot may be the same instant as turn-0000. A 2 s post-turn capture would settle it. As captured, the payoff is frozen.)
- The sentence never resolves. "The movie is…" stays above the poster, still in gold and still trailing off. The answer, "Alien", is about the same size as the question and is set in a duller cream. The gold emphasis stays on the setup instead of moving to the punchline.
- The poster carries the moment. The *Alien* key art on black with the gold bulb frame looks great, but the borrowed key art is doing that work, not anything the product adds. With a white-ground poster (Jaws or Forrest Gump, both on the shelf) it would be a bright rectangle in a dark room with nothing else happening.
- The buttons fit each person well: Jo gets "See my ticket", Kim gets "Count me in" and "Not this time", and Gma gets "OK" (see 1f).
- Verdict: **forgettable**. It's a still image, not an event.

### 1e. The handoff: See my ticket to ticket, 57 ms (`jo-02-ticket.png`, `run-s2/jo-02-ticket.png`)
- In 57 ms the dark house is gone and Jo is on the regular page, scrolled so the marquee's top is cut off. Between her and the ticket sits the news bar: "**8 updates** since yesterday at 3:33 PM", with "Walk me through" and "Got it". The ticket starts about 40% down the screen. The first thing at eye level after the payoff is a chore.
- The ticket itself is lovely: "ADMIT ONE", "ALIEN" in the deco face, WHEN / WHERE / GUEST Jo / RUNNING 1979 · 117 min, a perforation, and "No. 237982" on the stub. But it arrives already sitting in the page, it isn't handed over. The poster that just made the moment is nowhere on the ticket. Whether the ticket animates in is a **GUESS**: I only have one frame, at 1.5 s.
- Kim (`kim-02`) gets the same page in 61 ms. Her confirmation is a toast at the very bottom ("You're in for Friday.") lying across the "I'll bring…" field, as far from her new ticket as the screen allows.
- Verdict: **generic**, and the hard cut makes it feel **forgettable**.

### 1f. The newcomer's version (Gma, 360 px): `gma-01` to `gma-06`, then to `gma-14`
- First card at 1359 ms, and it isn't the invite. It's a "HOW IT WORKS · 1 OF 5" sheet over a dimmed marquee that already reads "NOW BOOKING / THE MOVIE IS… / FRIDAY, OCTOBER 16". The hook is right there, greyed out behind a tutorial. Gma taps Next four times and then "Let's go" before she reaches the card. Tour card 3 is six lines of instructions at 360 px ("…I'm free that evening, or Count me in when someone's already hosting. Either way, you're on the list. Anyone can host: pick a start time and tap I can host.").
- Tour card 5 promises: "Then you turn the card over, and your ticket appears." She turns it over and gets "**OK**" (`gma-06`). No ticket appears.
- Her ticket only shows up at `gma-14`, after:
  1. landing on the "Put your name on the guest list" form (`gma-07`);
  2. tapping "Count me in" on Up next and being told "Put your name down first. Then that counts." (`gma-10`);
  3. naming herself;
  4. tapping Count me in again (`gma-13`).
- Before that, her "Up next" is text only ("Alien / Friday, October 16 at 8:00 PM · at Hal's / Count me in", `gma-11`). The poster she just turned over is gone.
- Verdict: **slow** (the tour gates the invite) and **confusing** (the promised ticket becomes "OK").

### 1g. Against the references
- **Cinema lights-down.** A real lights-down is a dimming you feel, then a hush, then the screen catching light. Here the room starts dark (lights-down not captured), the wait has one blinking ring, and when the picture appears the ring goes still. There is no sound, no haptic and no bloom (none visible in any frame). The anticipation and payoff beats are present, but they're backwards: the wait has more motion than the reveal.
- **Partiful.** The invite is the first screen, with cover art, title, date and a one-tap RSVP, and the guest list shows faces. Here a newcomer's first screen is a tutorial, and the guest list is initials in near-black dots ("4 coming: G H J S Gma, Hal, Jo, Sam", `jo-02`). Partiful's going-state confetti and emoji reactions are **GUESS**-level knowledge, but its avatar guest list is common knowledge, and this one is clearly flatter.

### 1h. Runner-up: "If it locked now"
- It isn't on any captured screen, including the two places it belongs:
  - Hal's freshly hosted Monday (`hal-03`). The panel goes from "Hal is hosting at 8:00 PM" straight to "Lock the movie now" and "Cancel night", then "The shelf". No movie is named.
  - Sam's Oct 23 night in "Also planned" (`jo-13`, `gma-11`, `hal-04`): "Friday, October 23 at 8:00 PM · at Sam's · 2 in / Count me in". No movie is named.
- Hal's slip (`hal-02`) says "The movie locks a day before" but doesn't tease which movie that would be today. The live answer to "what are we watching, and why?" is invisible during the session. **Partly GUESS**: it may sit in the Oct 23 day panel, which wasn't captured. To confirm, capture that panel and the Monday panel scrolled fully.

---

## 2. The rest of the session, briefly

| Step | Evidence | Verdict | Note |
|---|---|---|---|
| Jo: news bar to walkthrough | `jo-03` | **slow, confusing** | The bar says "8 updates"; the sheet says "1 OF 9". Card 1 lists all 8 as bullets, then asks "Got it / Walk me through" again, so the bar's question is asked twice. Then 8 more cards repeat each bullet. |
| Jo: news card 2 | `jo-04` | **forgettable** | "Locked for FRI: Alien" recaps the reveal Jo watched seconds ago, shrunk to a thumbnail at the left of an otherwise empty dashed box. That rerun makes the signature moment smaller. |
| Jo: news cards 3, 8, 9 | `jo-05`, `jo-10`, `jo-11` | **generic** | Same layout: a tiny poster in a mostly empty dashed box. It reads as a broken image slot. Two consecutive Inception cards repeat the same poster. |
| Jo: news card 5 | `jo-07` | **forgettable** | "1 new thumbs-up on 1 movie / Alien". It doesn't say who. A lone thumb icon sits in an empty box. |
| Jo: news card 6 | `jo-08` | **fragile** (visual) | The name pills "Gma Kim Fran Sam Hal" have their text pinned to the top edge, not centered. |
| Jo: news card 9 | `jo-11` | none | "Fran gave Inception 4 stars / Loved it, the ending got me." This is the one card with a human voice. More of this. |
| Jo: page | `jo-12`, `jo-13` | **generic** | The marquee is good. The rest is a long stack: concessions, calendar, a 7-poster shelf, Watched, Stats. "AT 8:00 PM · AT HAL'S" doubles the "AT" on every visit. The Grand Budapest card says "Added by you" and also "Seen by Jo". |
| Kim: Count me in to ticket | `kim-02`, 61 ms | none / **fragile** | Converting a no to a yes right on the reveal is great. The toast covers "I'll bring…". |
| Gma: tour | `gma-01`…`05` | **slow** | Five cards before the invite (see 1f). The "SAMPLE" marquee on card 1 is charming, but it shouldn't come first. |
| Gma: name form | `gma-07`, `gma-10` | **confusing** | "Count me in" sits live under the name form, accepts the tap, then refuses: "Put your name down first. Then that counts." |
| Gma: welcome | `gma-11`, `gma-12` | **confusing**, **fragile** | "Welcome, Gma. Your thumbs-up on Alien counts." But Alien was already locked, so counts toward what? The toast hides the day panel's "Count me in" (only "Cou" is visible). |
| Gma: shelf | `gma-09` | **generic** | Four "MOST WANTED" banners at once (Alien, Jaws, Parasite, Grand Budapest). A badge everyone has means nothing. |
| Gma: ticket | `gma-14` | none | Her own ADMIT ONE with "GUEST Gma", "No. 206552". Lovely, just eight screens late. |
| Hal: I can host to slip, 46 ms | `hal-02` | none | "NOW BOOKING / MOVIE NIGHT AT HAL'S / Put it on the marquee / Not yet" is the best copy in the product. |
| Hal: Put it on the marquee to confirmation, 727 ms | `hal-03`, `hal-04` | **generic**, **slow-ish** | After a 46 ms slip, the big moment takes 727 ms. Then the slip vanishes into admin controls ("Change time", "No theme", "Lock the movie now", "Cancel night") and a four-line toast that sits over the shelf and then over calendar dates 19 to 23. Hal never sees his night "go up on the marquee" (**GUESS**: the marquee isn't in either viewport). The panel also tells Hal "**Hal** is hosting at 8:00 PM" right above "YOU'RE HOSTING". |

---

## 3. Findings

| id | problem | severity | tag | evidence |
|---|---|---|---|---|
| C1 | The payoff has less life than the wait. The waiting card's bulbs blink every ~440 ms; after the turn every capture is frozen. "The movie is…" stays unresolved above the poster in gold, while "Alien" sits below at the same size in duller cream. The poster's key art carries the whole moment. | Major | taste | wait-0257→0481 and 0701→0912: 55,632 px change each. turn-0000/0223/0431: 0 px change, for Jo, Gma and Kim. `jo-01` is identical in s1 and s2. Caveat: the window is 431 ms; a 2 s post-turn capture would settle it. |
| C2 | "See my ticket" cuts from the dark house to a busy page in 57 ms. The ticket sits ~40% down, under "8 updates since yesterday at 3:33 PM / Walk me through / Got it". The poster doesn't carry over to the ticket. | Major | taste | `jo-02-ticket.png`, `run-s2/jo-02-ticket.png`; 57 ms. Motion is a GUESS (single frame at 1.5 s). |
| C3 | A newcomer's first screen is a 5-card tutorial over a dimmed "THE MOVIE IS…" marquee, not the invite. That's 5 taps before the reveal, plus a 6-line instruction card at 360 px. Partiful's invite is the first screen. | Major | taste | `gma-01`…`gma-05`; open to first card 1359 ms. |
| C4 | Gma's reveal ends in "OK", although tour card 5 promises "Then you turn the card over, and your ticket appears." Her ticket arrives eight screens later, after one refused Count me in ("Put your name down first. Then that counts."). | Major | taste | `gma-05`, `gma-06`, `gma-10`, `gma-14` |
| C5 | The runner-up "If it locked now" doesn't appear where people look: not on Hal's newly hosted Monday panel, not on Sam's Oct 23 "Also planned" card, not on the host slip. | Major | taste | `hal-02`, `hal-03`, `jo-13`, `gma-11`, `hal-04`. Partly GUESS: the Oct 23 day panel wasn't captured. |
| C6 | Neither the lights-down nor the turn itself is in evidence. The first wait frame is already dark, and the first turn frame is already finished. If the 1045 ms turn is a plain flip with no dim or bloom, the signature moment lags a real cinema even further. | Major if confirmed | taste | GUESS. To confirm, capture frames from link-open to card (1401 ms) and 30–50 ms frames over the 1045 ms turn. |
| C7 | The card back is generic (flat maroon, one "?", no brand or motif). Back and front frames don't match: the bezel disappears, the bulbs double in count and blur, and the card jumps up ~14 device px. It reads as a swap, not a turn. | Minor | taste | `jo-reveal-wait-1127ms` vs `jo-reveal-turn-0000ms`; same on the contact sheets |
| C8 | The news walkthrough asks twice and over-counts. The bar says "8 updates" and the sheet says "1 OF 9". Card 1 lists everything, then offers "Got it / Walk me through" again; 9 taps to re-read the list. | Minor | | `jo-03`…`jo-11` |
| C9 | The news cards re-run the reveal as a thumbnail ("Locked for FRI: Alien"), put tiny posters in mostly empty dashed boxes, and show anonymous activity ("1 new thumbs-up on 1 movie / Alien"). | Minor | taste | `jo-04`, `jo-05`, `jo-07`, `jo-10`, `jo-11` |
| C10 | The guest list is initials in near-black dots, nothing like Partiful's faces. The people, who are the point of the night, are the least visual thing on the page. | Minor | taste | "4 coming: G H J S Gma, Hal, Jo, Sam" in `jo-02`, `gma-14` |
| C11 | Toasts land on top of primary controls. | Minor | | `gma-12` (hides "Count me in"), `kim-02` (covers "I'll bring…"), `hal-03` and `hal-04` (4-line toast over the shelf and calendar 19–23) |
| C12 | The host's moment deflates. A theatrical slip becomes, after 727 ms (vs 46 ms for the slip), admin buttons plus a toast. Hal never sees his night go up. | Minor | taste | `hal-02`→`hal-03`; 727 ms. Marquee unchanged is a GUESS (not in viewport). |
| C13 | Copy warts: "AT 8:00 PM · AT HAL'S" on every marquee; "Locked for FRI"; "Hal is hosting" shown to Hal beside "YOU'RE HOSTING"; "Added by you" next to "Seen by Jo" on Jo's own card; "Your thumbs-up on Alien counts." after Alien is locked. | Polish | | `jo-12`, `jo-04`, `hal-03`, `jo-13`, `gma-12` |
| C14 | Visual polish: name pills with text pinned to the top edge; four "MOST WANTED" banners at once. | Polish | | `jo-08`, `gma-09` |

## 4. Protect this
The reveal's buttons fit each person: "See my ticket" for Jo, "Count me in / Not this time" for Kim. They land on an ADMIT ONE stub with your own name as GUEST and a serial number. Together with the card that waits for your tap, that's the soul of the product.
