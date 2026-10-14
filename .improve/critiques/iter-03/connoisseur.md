# Iter-03 critique: Dana, the connoisseur

**Persona.** I plan every group outing on Partiful and I love the moment a cinema's house lights go down.
**Inputs used.** Only the paths listed in the brief: the reveal frames and contact sheets for jo, gma and kim; the run-s1-1 screenshots for jo, kim, gma and hal; run-s2's jo-01, jo-02 and gma-06; and the timings table. Pixel measurements were taken from those PNGs. The device pixel ratio is 2.626 at 412 px, and px means CSS px unless noted.

**Verdict.** The poster is a real payoff. Everything around it is thin. The "lights-down" takes 0.4 seconds and is a card flip. The landed screen doesn't say why this movie won or who's coming. **See my ticket** cuts in 47 ms to a dashboard, where the ticket sits under a news banner. A cinema would never cut from the feature to the lobby noticeboard.

---

## 1. The signature moment, frame by frame

### Face down, before any tap (`*-reveal-wait-*`, 0 to 1.2 s)
- The screen shows "The movie is…", a flat maroon card with one gold "?", the bulb ring, and "TAP TO TURN IT OVER". About 20% of the screen above and 35% below is empty black (`jo-reveal-wait-0000ms`).
- **The only motion is the bulb chase.** A pixel diff of `jo-reveal-wait-0269ms` against `jo-reveal-wait-0479ms` changes only the bulb ring. The card face is identical in every wait frame for jo, gma and kim. The card never breathes, peeks or catches the light, so the anticipation rests on a caption.
- The screen is pitch black from the first frame. No frame shows the "house" going dark: there is no dim from the cream marquee page and no transition into the room. **GUESS** whether anything dims during the 1370 ms load. Frames of the load would confirm it.
- **Good:** nothing spoils the pick. Gma's marquee reads "NOW BOOKING / THE MOVIE IS…" until she turns the card herself (`gma-01-first-screen`).

### The turn (`jo-reveal-turn-*`; gma and kim match within about 20 ms)
| t (ms) | what's on screen |
|---|---|
| 0 | The card is already tilting. The flip starts instantly on the tap, with no beat between touch and turn. |
| 141 | The card is edge-on, and its "?" has squashed into a "!". That reads like a typo rather than a joke. |
| 273 | The poster face swings in, in perspective. |
| 420–576 | The poster is flat under "The movie is…", and nothing else happens for about 300 ms. |
| 728 | Several changes land in one frame. The heading **hard-swaps** to "Friday's feature". "Alien", "Friday 8 PM at Hal's" and the button appear. The glow halo switches on. **The poster and heading jump up about 22 px**: the heading's top row moves from 565 to 508 device px between `turn-0576ms` and `turn-0728ms`. |
| 908–1570 | The bulbs chase and the halo holds. |

- **Pacing:** tap to title takes 698 ms (median; worst 702). The turn itself is about 0.4 s. A house-lights fade takes seconds, then the curtain moves, then a logo card. Here the whole "show" is shorter than a camera-shutter animation.
- **Generic:** a 3D card flip is the stock reveal of memory games and tarot apps. The vocabulary exists, with marquee bulbs and "Friday's feature" (a nod to "Feature Presentation"). But the motion is borrowed from a different genre.
- **No escalation:** the 300 ms hold at 420–576 ms is empty. The bulbs don't brighten into it, the poster doesn't settle, and the title doesn't fade in. It is a pause, not a beat.
- The jump at 728 ms happens at the worst moment. The eye is on the poster when it lurches up 22 px as the text arrives, which reads as a reflow rather than choreography.
- **GUESS:** there is no sound or haptic at the flip. No frame can show either, but Android browsers can vibrate on a tap, so a device recording would confirm.

### Landed (`jo-01-reveal-landed`, `kim-01-reveal-landed`, `gma-06-reveal-landed`)
- **Strong:** a full-height Alien poster in a lit bulb frame on black, with the title in the display face. This is the best screen in the product.
- **It doesn't say why.** The landed screen has only the heading, the poster, "Alien", "Friday 8 PM at Hal's" and one or two buttons.
  - The shelf shows Alien, Jaws, Parasite and Grand Budapest **all at 3 thumbs-ups**, all tagged "MOST WANTED" (`gma-10-shelf`).
  - The tour promises "a tie spins the reel" (`gma-05-tour-5`).
  - No frame shows a reel, a runner-up, or a line like "3 of you wanted it".
  - The drama the system actually produced is thrown away. **GUESS** whether this lock was a tie among the people coming at lock time. The lock-time guest list would confirm it.
- **Nobody else is on the screen.** Partiful's power is faces on the invite. This screen has no "4 coming", no initials and no host face. Who is coming first appears on the ticket page ("4 coming: G H J S", `jo-02-ticket`).
- Kim's and Gma's version, "Count me in / Not this time", is the right idea: everyone who opens the link gets the invitation (`kim-01`, `gma-06`).

### See my ticket (`jo-02-ticket`, `kim-02-ticket`; 47 ms median)
- 47 ms means there is no transition at all, just a hard cut from the dark room to the lit lobby.
- The ticket lands **mid-screen** (y 800–1195 of 2000).
- It sits under three things: a marquee **clipped in half** at the top, the nav tabs, and a news box ("8 updates since yesterday at 4:33 PM", or Kim's "2 updates since 4:33 PM today").
- It is the same "Up next" component that is always on the page. Nothing marks it as just issued: no print, tear, slide or stamp, and 1.5 s after the tap it is static.
- The poster you just revealed is gone, and the ticket is flat beige text.
- "ADMIT ONE / GUEST Jo / No. 237982" is a lovely detail, but it is buried among Add to calendar, an outlined "You're in ✓" that looks like a button, "Watch in Stremio" (for a night at Hal's?), "4 coming: G H J S" in letter discs rather than faces, and concessions.

### Against the reference
| Cinema or Partiful has | Weberplex has |
|---|---|
| House lights fade, room goes dark, then the screen | Already dark; no fade visible in any frame |
| A beat of silence, then the logo | The flip starts at 0 ms; the title arrives at 698 ms |
| The feature fills the screen | Yes: the poster is the hero (keep it) |
| Partiful: the invite shows who's going, with faces | No guests on the reveal; initials only on the ticket page |
| Partiful: the RSVP confirms in place on the invite (GUESS on the details) | Gma's "Count me in" bounces her to a form; Jo's ticket is a page scroll |
| A story: why this one | No "why", even when there's a four-way tie and a promised reel |

---

## 2. The rest of the session

| step | evidence | verdict |
|---|---|---|
| Jo: open link to reveal card | 1370 ms locally | none locally. **GUESS:** longer on a real mid-range Android on mobile data. |
| Jo: "since you last looked" | `jo-03` … `jo-11` | **slow, forgettable.** See C8. |
| Jo: page top | `jo-12`, `jofull` | **generic.** "ALIEN / Friday Oct 16 / Hal's" is stated three times above the fold (marquee, ticket, day panel). About five typefaces: display serif, deco caps, typewriter ("Starts in 2 days", "1 pick"), grotesk and condensed caps. |
| Gma: first screen | `gma-01` … `gma-05` | **slow.** A 5-card "HOW IT WORKS" tour gates the reveal, and card 5 gives away the trick. |
| Gma: reveal, then Count me in | `gma-07`, 45 ms | **confusing.** See C5. |
| Gma: name to ticket | `gma-08`, 328 ms | none for speed. The toast "Welcome, Gma. You're in for Friday." is warm, but it lingers (C10). |
| Gma: shelf vote | `gma-10` to `gma-11` | **confusing.** Four "MOST WANTED" ribbons collapse to one after a single tap. Three cards restyle and their posters change height. The top "Most wanted" is the already-booked Alien, so her vote changes nothing for Friday. |
| Gma: day panel, mark free | `gma-12`, `gma-13` | **fragile.** Toasts cover the button she's pressing. |
| Hal: I can host, then slip | `hal-02`, 41 ms | none. "NOW BOOKING / MOVIE NIGHT AT HAL'S" is the most charming small moment in the app. |
| Hal: Put it on the marquee | `hal-03`, 651 ms | **forgettable, slowish.** See C9. |
| Hal: also planned | `hal-04` | **fragile.** "Unlock and re-pick" sits on a night three people have already revealed. |
| Seed 2 | `run-s2/*` | none. Pixel-identical to seed 1 except the bulb phase and "4:36 PM", so the reveal is stable. |

---

## 3. Findings

| id | problem | severity | tag | evidence |
|---|---|---|---|---|
| C1 | The reveal is a 0.4 s stock card flip with no lights-down. There's no dim, no beat before the turn, and no escalation into the title. It sits clearly behind the cinema reference. | Major | taste | The flip starts at `jo-reveal-turn-0000ms`, the poster is flat by 420–576 ms, and tap to title is 698 ms. Every wait frame is already black with no dimming. **GUESS** that nothing dims during load or plays sound or haptic: a load recording would confirm. |
| C2 | The landed reveal has no "why" and no "who". A tie and a promised reel are thrown away, and no guest faces or count appear. | Major | taste | `jo-01`, `kim-01` and `gma-06` contain only heading, poster, title, "Friday 8 PM at Hal's" and buttons. `gma-10` shows four movies at 3 thumbs, all "MOST WANTED". `gma-05` says "a tie spins the reel". |
| C3 | **See my ticket** hard-cuts to a dashboard. The ticket sits mid-screen under a half-clipped marquee and an "N updates" box, with no issuing moment, and the poster disappears. | Major | taste | 47 ms. In `jo-02` the ticket is at y 800–1195/2000 under "8 updates since yesterday at 4:33 PM". `kim-02` has "2 updates…". |
| C4 | A newcomer must click through a 5-card tour before seeing the movie, and card 5 spoils the trick ("Then you turn the card over, and your ticket appears", with a sample "THE WITCH" ticket). | Major | taste | `gma-01` … `gma-05` ("HOW IT WORKS · 1 OF 5" … "5 OF 5"). |
| C5 | "Count me in" on the reveal doesn't count Gma in. She's bounced to a mid-page form with a scolding toast at the point of commitment. A newcomer needs about 9 taps to get a ticket. | Major | | `gma-07`: "Put your name down first. Then that counts.", 45 ms after the tap. Then the name, then 328 ms to the ticket. |
| C6 | At the payoff frame the poster and heading jump about 22 px, and the heading text hard-swaps. | Minor | taste | Heading top row at 565 device px in `jo-reveal-turn-0576ms` vs 508 in `turn-0728ms`. |
| C7 | The face-down state is static: only the bulbs toggle, and the "?" turns into "!" mid-flip. The anticipation slot is a flat maroon rectangle. | Minor | taste | A pixel diff of the wait frames changes only the bulb ring. "!" appears at `turn-0141ms`. |
| C8 | "Since you last looked" is a 9-card carousel. It re-announces the Alien Jo just saw, and the sheet top jumps 467 to 672 px between cards. Some prompts have no control. | Minor | | Banner "8 updates" vs "1 OF 9". "Locked for Friday: Alien" appears on cards 1 and 2. "Rate it while it is fresh." has no stars (`jo-10`). "Call yours too…" has no chips (`jo-09`). Inception gets two cards (`jo-10`, `jo-11`). Placeholder-style dashed boxes hold small thumbnails. |
| C9 | Hal's "Put it on the marquee" pays off with a toast. The marquee is off-screen, and the slip is replaced by four equal-weight admin buttons, with "Cancel night" next to "Lock the movie now". | Minor | taste | `hal-03`, 651 ms to the confirmation. |
| C10 | Toasts linger and cover the CTA being used. | Minor | | The same "Welcome, Gma…" toast appears in `gma-08`, `gma-10`, `gma-11` and `gma-12`. In `gma-12` it covers "I'm free that evening". In `gma-13` it covers the button just pressed. In `kim-02` it covers "I'll bring…". In `hal-03` and `hal-04` it covers the calendar. |
| C11 | "MOST WANTED" appears on 4 of 7 shelf cards, so it means nothing. One vote restyles three cards, and the badge sits on the already-booked movie. | Minor | | `gma-10` → `gma-11` |
| C12 | The runner-up moment "If it locked now" appears nowhere in the session. The "Also planned" Oct 23 card shows no movie. | Minor | | "Friday, October 23 at 8:00 PM · at Sam's · 2 in" in `jo-12`, `gma-12` and `hal-04`. **GUESS** that it exists only in the Oct 23 day panel: opening that panel would confirm. |
| C13 | A host can "Unlock and re-pick" a night everyone has already revealed, which makes the reveal retractable. | Minor | | `hal-04`. **GUESS** whether guests are told or asked to confirm: tapping it would confirm. |
| C14 | The ticket's action cluster muddies the payoff. "You're in ✓" is styled like a button, "Watch in Stremio" appears for an in-person night, and the guests are letter discs, not faces. | Polish | taste | `jo-02`, `gma-08` |
| C15 | Typography and repetition: about five typefaces, and Alien, date and host stated three times above the fold. Name pills on the news card have top-aligned labels. | Polish | taste | `jofull` top. The labels sit high in their ovals in `jo-08-news-6` ("Gma", "Kim", …). |
| C16 | The tour sample shows a "Trailer" pill, but the real cards show "Stremio / Plot". | Polish | | `gma-04` vs `gma-10` |

## Protect this
Protect two things: the face-down card in a chasing bulb marquee that turns over to a full-height poster on black, with no spoiler anywhere ("THE MOVIE IS…" stays on the marquee until you turn it yourself), and the "Count me in / Not this time" invitation that greets everyone at the reveal.
