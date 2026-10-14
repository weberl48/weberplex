# Iter-05 critique: Dana, the connoisseur

I judged only from `.improve/evidence/iter-05/` (run-s1-1, run-s2 and the contact sheets). Frame times are ms after the frame series starts.

## The signature moment, frame by frame

### Beat 0: the link opens (curtain): **slow, forgettable**
- `gma-curtain-0000` is a closed red curtain. At `0300` it is still a hairline. At `0550` the gap is about 75 px. At `0800` it's a third open, and at `1050`–`1300` it's mostly gone, with the valance still sliding away at `1550`. That's about 1.3 s.
- The curtain opens onto the wrong thing. Gma's opens onto `HOW IT WORKS · 1 OF 5` (`gma-curtain-1050`…`1550`). Jo's and Kim's open onto the ordinary page (`jo-reveal-wait-0000`, `kim-reveal-wait-0000`). About 500 ms later that page dims away for the reveal (`jo-reveal-wait-0440`→`0989`).
- A cinema does it in this order: house lights down, then curtain, then picture. Here the order is curtain, then page, then lights down, then a card. The one theatrical device is used up on page load and isn't there for the movie.
- Jo, who last looked yesterday, still gets the full curtain. Most of her 1366 ms "open link → reveal card" goes to it.

### Beat 1: lights down and the waiting card: **generic**
- The lights-down is a roughly 500 ms crossfade, not a slow dim. Mid-fade it double-exposes: `jo-reveal-wait-0715`, `kim-0688` and `gma-0693` show "The movie is…" printed over the marquee's "THE MOVIE IS…". The "?" card sits half-transparent over the ticket, and "TAP TO TURN IT OVER" overlaps the date line.
- The card back is a flat burgundy rectangle with a gold "?" (`jo-reveal-wait-0989`). That's a quiz-show mystery box. Nothing on it says cinema: no film leader, no projector beam, no curtain (the curtain is already gone).
- GUESS: the card doesn't move while it waits for the tap. Only one post-fade frame exists per person; frames at 0–3 s before the tap would confirm.

### Beat 2: the turn: fine craft, no build
- The flip is honest work: edge-on at `turn-0147` (the "?" squashes into a "!"), the poster in perspective at `0293`, flat at `0465`. That's 450 ms, starting the instant you tap.
- There's no hold, no slow-down near edge-on and no drumroll beat. A lights-down takes seconds and this takes under half of one.

### Beat 3: the payoff: **forgettable** (flat)
- Everything else lands in a single frame. Between `turn-0465` and `turn-0634` the heading swaps to "Friday's feature", and the title, date, guest list, why-line and button all appear at once (tap→title 685 ms median).
- From `0822` to `1568` nothing changes except the bulb glow (Kim's bulbs go dark at `kim-turn-1547`).
- "The movie is…" never finishes its sentence. It's replaced by a different heading instead of being answered with "…Alien."
- The title "Alien" is about the same size and colour as "Friday's feature" (`jo-01-reveal-landed`), so the two compete for the eye.

### Beat 4: the why: **generic**
- The why is "3 of the 4 coming thumbed it up" in small grey type, under "4 coming: you, Gma, Hal and Sam" (`jo-01`, `run-s2/jo-01`, `kim-01`). Gma sees "2 of the 3 coming thumbed it up" (`gma-06`).
- It's a fraction: no names of who wanted it, and not a single face or avatar on the reveal. Partiful's strength is the guest list as people. This is a stat line.

### Beat 5: See my ticket: **forgettable**
- The tap→ticket time is 55 ms, which is good. But 1.5 s later (`jo-02-ticket`, `kim-02`, `run-s2/jo-02`) the "Up next" heading is sliced in half at the top edge.
- The ticket fills the top ~23% of the screen. Below it is a utility stack: "Add to calendar", "Download the invite", "Watch in Stremio", concessions, "Also planned" and the calendar.
- The ticket has no poster, so the image that carried the reveal is gone.
- It's also the same ticket that sat on the page before the reveal with "THE MOVIE IS…" in the title slot (`jo-reveal-wait-0000`). Nothing tears, stamps or prints. GUESS: no animation inside that 1.5 s; frames from the tap to 1.5 s would confirm.

### The best part of the moment
Kim (named, not coming) gets "Count me in" and "Not this time" right on the reveal. One tap and she has her ticket in 62 ms, "GUEST Kim · No. 865412", with the toast "You're in for Friday." That's Partiful-grade RSVP, and the seed-2 reveal is identical in shape, so it isn't fragile.

## The rest of the session

| step | verdict | evidence |
|---|---|---|
| Gma: 5-card tour before the reveal | **slow** | `gma-01…05`: "HOW IT WORKS · 1 OF 5" through "5 OF 5" and "Let's go". The hook "THE MOVIE IS…" sits dimmed behind it the whole time. Card 3 is ~55 words at 360 px. Card 5 spoils the reveal: "Then you turn the card over, and your ticket appears." |
| Gma: Count me in → name form | **confusing** | `gma-07`: the cinematic reveal drops to a plain form. A second "Count me in" sits right under "That's me", in a poster-less "Up next / Alien" box. |
| Gma: name → ticket | **slow** | 843 ms, 15–20× slower than every other tap in the flow. The toast "Welcome, Gma. You're in for Friday." is good copy. |
| Gma: ticket | GUESS | In `gma-08` the ticket is a muted taupe, not Jo's cream (`jo-12`). Either it's mid-fade or it looks voided; a frame 3 s later would settle which. |
| Gma: shelf vote | none | `gma-11`: 3→4 and her "G" joins the avatars. Clear. |
| Gma: free evening | fragile (toasts) | `gma-13`: "You're free Sunday. If someone hosts, you're on the list." is honest. But the welcome toast is still up in `gma-10`, `gma-11` and `gma-12`, where it sits over "I'm free that evening". |
| Jo: since you last looked | **slow** | `jo-03`: card 1 already lists all 8 updates ("Here's the program. Walk through it, or call it read."). Eight more cards follow, each with Skip, Back, Show me and Next. Card 2 re-announces "Locked for Friday: Alien" seconds after the reveal. Card 6 says "1 new thumbs-up on 1 movie" without saying who. |
| Hal: I can host → slip | none | `hal-02`: "NOW BOOKING · MOVIE NIGHT AT HAL'S · Put it on the marquee / Not yet". This is the most charming screen in the app. |
| Hal: Put it on the marquee | **slow, forgettable** | 995 ms (worst 1044). The slip collapses into five equal-weight controls (`hal-03`), with "Cancel night" styled like everything else. The night then appears as a grey row under ALSO PLANNED (`hal-04`), not on a marquee. |

## Findings

| id | problem | severity | tag | evidence |
|---|---|---|---|---|
| C1 | The curtain is used on page load, not on the movie. It opens onto a tutorial (Gma) or a page that dims away ~500 ms later (Jo, Kim), and returning Jo still pays ~1.3 s for it. The order is the reverse of a cinema's (lights down, curtain, picture). | Major | taste | `gma-curtain-0000…1550`; `jo-reveal-wait-0000→0989`; `kim-reveal-wait-0000→1009`; open→reveal card 1366 ms |
| C2 | The tap→payoff has no build. It's a 450 ms flip, then everything (heading swap, title, date, list, why, button) lands in one frame, followed by 900 ms of nothing. "The movie is…" is replaced, never completed. The card back is a generic "?" mystery box. | Major | taste | contact sheet `jo-reveal-turn-0465→0634`, `0822…1568` static; `jo-reveal-wait-0989` |
| C3 | The why is a grey fraction: "3 of the 4 coming thumbed it up". It names no one who wanted it and puts zero faces or avatars on the reveal, which is behind Partiful's people-first guest list. | Major | taste | `jo-01`, `run-s2/jo-01`, `kim-01`; `gma-06` "2 of the 3 coming thumbed it up" |
| C4 | A newcomer must click through 5 tutorial cards before seeing the reveal, with the "THE MOVIE IS…" hook dimmed behind them. Card 5 spoils the card-turn. Partiful puts the invite first. | Major | taste | `gma-01…gma-05` ("1 OF 5"…"Let's go"); card 5 copy |
| C5 | After "Count me in" on the reveal, Gma lands on a plain form with a second "Count me in" just below, and the poster is gone. Name→ticket takes 843 ms. GUESS: no progress feedback during those 843 ms; a frame at +300 ms would confirm. | Minor | — | `gma-07`; timing table |
| C6 | "See my ticket" lands mid-page: the "Up next" heading is clipped, the ticket has no poster, and the utility stack takes 3/4 of the screen. It's the same ticket that sat on the page pre-reveal. GUESS: no tear or stamp animation. | Minor | taste | `jo-02`, `kim-02`, `run-s2/jo-02`; `jo-reveal-wait-0000` |
| C7 | "Since you last looked" is a 9-card walkthrough for 8 updates already listed on card 1. It repeats the reveal (card 2) and has anonymous items ("1 new thumbs-up on 1 movie"). | Minor | — | `jo-03`, `jo-04`, `jo-08` |
| C8 | Toasts linger and cover controls: the welcome toast spans 4 screens and sits over "I'm free that evening". Kim's and Hal's toasts cover the calendar and shelf. | Minor | — | `gma-08`, `gma-10`, `gma-11`, `gma-12`; `kim-02`; `hal-03`, `hal-04` |
| C9 | "Put it on the marquee" takes ~1 s, then the slip turns into a five-button control panel. The night shows up as a grey "Also planned" row, not on a marquee. | Minor | taste | 995/1044 ms; `hal-03`, `hal-04`; marquee in `jo-12` holds only Friday |
| C10 | The runner-up ("If it locked now") isn't a moment: those words appear on no captured screen. The live answer is "Leading: …" at the tail of a dot-run line, and a tie shows as "Jaws or Forrest Gump" with no why. | Minor | taste | `gma-08`, `jo-02`, `hal-03`; good counterexample: "LEADING OCT 23" poster ribbon in `gma-10` |
| C11 | GUESS: "Unlock and re-pick" on a night everyone has already seen revealed could un-reveal "Friday's feature" and void tickets. Confirm by tapping it as Hal, then reloading as Jo. | Minor | — | `hal-04` (button exists; effect not captured) |
| C12 | Visual: the lights-down crossfade double-exposes two "The movie is…" headings. News-card media is a small thumbnail floating in a mostly empty dashed box. In `jo-09` the name chips' text hugs the top of the pills. The bar says "8 updates" while the sheet says "1 OF 9". | Polish | — | `jo-reveal-wait-0715`, `kim-0688`, `gma-0693`; `jo-04`, `jo-05`, `jo-06`, `jo-08`, `jo-11`; `jo-09`; `jo-03` |
| C13 | Filler and unexplained marks: Alien and Jaws carry the identical quote "“Best on a big screen”", and green dots on Oct 16 and 18 aren't in the calendar legend. | Polish | — | `gma-10`; `hal-01` |

## Protect this
The marquee vocabulary that carries the whole session must stay: the bulb-framed "Friday's feature" poster, the admit-one ticket with your name and number, one-tap "Count me in / Not this time" right on the reveal (62 ms to a ticket), and Hal's "NOW BOOKING · MOVIE NIGHT AT HAL'S · Put it on the marquee" slip.
