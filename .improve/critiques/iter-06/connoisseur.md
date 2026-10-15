# Connoisseur critique, iter-06 (Dana)

I plan everything on Partiful, and the moment I care about in a cinema is when the house lights go down. Here's how this one compares.

Evidence folder: `.improve/evidence/iter-06/`. Frame timestamps are ms after the tap, as in the file names. Screenshots are 412 px (Jo, Kim, Hal) and 360 px (Gma).

---

## 1. The signature moment, frame by frame (Jo, a regular whose reveal is due)

### Opening the link: curtain, but no lights-down
| frame | what's on screen |
|---|---|
| `jo-open-0014ms` | A **pure white screen**. On a dark cinema site, the first thing I see is a flash of white, which is the opposite of lights-down. (Gma gets the same at `gma-open-0079ms`.) |
| `jo-open-0606ms` → `1364ms` | A fully lit red curtain, completely still, for ~0.75 s. Nothing dims. It's a loading screen dressed as a curtain. |
| `jo-open-1514ms` → `2131ms` | The curtain parts. It looks good. |
| `jo-open-2447ms` → `3013ms` | The valance leaves. What it reveals is **a face-down card that says "TAP TO TURN IT OVER."** |

Timings: the card was ready at **1299 ms** and the curtain finished at **2599 ms**. So 1.3 s of ceremony goes to revealing… a thing you still have to reveal. A cinema curtain opens on the picture. Here it opens on a second curtain. And the tour tells newcomers *"Then the house lights go down on everyone's phone"* (`gma-04-tour-4`), but no frame ever dims. We go from white to a fully lit curtain to a fully lit marquee.

### The wait (before the tap)
`jo-reveal-wait-0000ms` … `1043ms`: a flat maroon rectangle with a gold "?", inside a ring of bulbs that barely chase. Nothing in the waiting state builds: no date, no "4 of you are coming Friday", no sound of a projector starting up. The card takes up ~58% of the width, and **the bottom ~37% of the screen is empty black** under "TAP TO TURN IT OVER". → **generic**.

### The turn
- `turn-0138ms`: the back is edge-on, with the "?" squashed.
- `turn-0271ms`: the poster is already showing mid-rotation.
- `turn-0416ms`: the card is flat. The whole flip takes **~270–400 ms**. It's the flip from a memory card game. There's no hold and no beat of suspense, and it's over before you've finished tapping. → **generic**.
- `turn-0718ms`: "Alien" fades in at about half brightness. It's full at 882 ms (tap to title: **684 ms**).
- `turn-1048ms`: "Friday 8 PM at Hal's" appears, and **every bulb goes dark at once**.
- `turn-1216/1383ms`: the bulbs come back on and the faces ("G H J S · 4 coming: you, Gma, Hal and Sam") appear.
- `turn-1551ms`: the bulbs are dark again and "Gma, Hal and Sam thumbed it up" appears.
- `jo-01-reveal-landed`: the bulbs are lit and **See my ticket** shows.

That staggered build after the flip is the best thing in the product: poster, then title, then when and where, then who's coming, then why. The bulbs are the problem. The only "lights down" in the whole sequence happens *after* the picture is already up, and it reads as a blink or flicker, not a hush. The order is backwards.

### The payoff: See my ticket → ticket (47 ms)
`jo-02-ticket.png` (and the same in `kim-02`, `run-s2/jo-02`): it's a hard cut. The page lands with the **"Up next" heading sliced in half** at the top edge. The ticket is a static beige card with "ADMIT ONE · ALIEN · WHEN / WHERE / GUEST Jo / RUNNING 1979 · 117 min · No. 237982". **The poster that just made the moment is gone.** Right under it come Add to calendar, You're in, Download the invite, Watch in Stremio, 4 coming, CONCESSIONS, four snack pills, an "I'll bring…" field, ALSO PLANNED, and The calendar. The ceremony ends and you're in the dashboard straight away. A ticket should feel like something you were handed. This one feels like a section of a page. → **forgettable**.

### What's missing compared with the references
- **Cinema:** the slow dim before anything moves, darkness as anticipation, and a curtain that opens on the *picture*. Here the house lights stay up throughout, the curtain opens on a prompt, and the dimming happens afterward as a blink.
- **Partiful (common knowledge only):** guests are faces, not letters, and after you RSVP you can see and react to who else is going. Here every person is a monogram chip (G H J S), and the reveal gives you nothing to do except "See my ticket". There's no reaction and no "I'm hyped". *Any claim beyond that about Partiful is a GUESS.*

---

## 2. The rest of the session

| step | verdict | evidence |
|---|---|---|
| Kim (not coming) reveal → Count me in → ticket | **confusing** (minor) | 52 ms, fast. But the toast says "You're in for Friday." while two Friday nights are on screen and both show "You're in ✓" (Oct 16 ticket and ALSO PLANNED Oct 23) in `kim-02-ticket`. |
| Jo, "since you last looked" | **slow, generic** | The bar says "8 updates" and the sheet says "1 OF 9". Card 2, "Locked for Friday: Alien", re-announces what she just watched get revealed. Inception shows up twice (cards 3 and 9). Card 6, "1 new thumbs-up on 1 movie / Alien", doesn't say who. 140 px posters are stranded top-left in empty 760 px dashed boxes (`jo-04`, `jo-05`, `jo-06`, `jo-11`). The "Walk me through / Got it" buttons are duplicated in the bar behind the open sheet (`jo-03`). Card 9, "Fran gave Inception 4 stars · Loved it, the ending got me.", is the only one with a voice. |
| News card 7 | **fragile** | Name pills "Gma Kim Fran Sam Hal" have their text stuck to the top of tall ovals, not centered (`jo-09-news-7`). |
| Gma opens the link | **confusing, generic** | White (`0079ms`), then the curtain (`0623–2021ms`) opens onto **"Put your name on the guest list"** (`2171–2487ms`). Then a 4-card "HOW IT WORKS" sheet covers it (`3038ms`; **2612 ms** to the first card). The theatrical opening is spent on a sign-up form and then hidden behind homework. On Partiful, an invitee sees the event first. |
| Gma's reveal entry | **generic** | No curtain and no dimming. The card ghosts in over the form as a double exposure: "The movie is…" over the marquee's "THE MOVIE IS…", and "TAP TO TURN IT OVER" across the "That's me" button (`gma-reveal-wait-0663ms`). |
| Gma: Count me in → name form (36 ms) | **confusing** | It cuts from the cinema to the inline form. Right under the form there's another **"Count me in"** for Alien (`gma-06-name-form`). Did the first tap count? |
| Gma: name → ticket (852 ms) | **forgettable** | The ticket lands **dim and grey** (`gma-07-ticket`), next to Jo's bright beige one. It reads as disabled. *GUESS* that it's a capture taken mid-fade. To confirm, film 0–1500 ms after "That's me". |
| Toasts | **fragile** | "Welcome, Gma. You're in for Friday." is still on screen in `gma-07`, `gma-09`, `gma-10` and `gma-11`, where it **covers the "I'm free that evening" button**. Hal's toast covers the calendar in `hal-03` and `hal-04`. |
| Shelf and thumbs-up | none | The thumbs-up goes to 4 and the G chip lights up (`gma-10`). It's clear. |
| Hal: I can host → slip (40 ms) | none (good) | "NOW BOOKING / MOVIE NIGHT AT HAL'S / Put it on the marquee" (`hal-02`). This has personality. |
| Hal: Put it on the marquee → confirmation | **slow** | **1335 ms**, which is 25–35× slower than every other tap in the session (36–57 ms). The payoff is just a toast. *GUESS* on whether a pending state shows in between. |
| Hal's controls | **fragile** (GUESS) | "Lock the movie now" and "Cancel night" have the same weight as "Change time" (`hal-03`). "Unlock and re-pick" on the already-revealed Friday is one outlined button (`hal-04`). To confirm, check whether either one asks first. |
| Seed 2 | none | It's identical to seed 1: same flow, same ticket No. 237982 (`run-s2/*`). The moment is stable across seeds. |

---

## 3. Findings

| id | problem | severity | tag | evidence |
|---|---|---|---|---|
| C1 | There's no lights-down. It goes from a white flash to a fully lit, still curtain, and the curtain opens on a face-down "TAP TO TURN IT OVER" card, so you get a second curtain instead of the picture. The bulbs only go dark *after* the poster is up, as a blink. The tour promises "the house lights go down" and nothing ever dims. | Major | taste | `jo-open-0014ms` (white), `0606–1364ms` (static lit curtain), `2131/3013ms` (card prompt). Timings 1299 → 2599 ms. `jo-reveal-turn-1048ms`/`1551ms` bulbs dark, `1383ms` lit. `gma-04-tour-4` copy |
| C2 | The card back and the flip are generic: a flat maroon rectangle with a "?", flipped like a memory card in ~270–400 ms with no hold. The waiting state has no context ("Friday at Hal's", who's coming), and ~37% of the screen sits empty below the card. | Major | taste | `jo-reveal-wait-0000ms`, `jo-reveal-turn-0138/0271/0416ms` |
| C3 | The payoff ticket is a hard cut (47 ms) to a static, poster-less beige card. The scroll slices "Up next" in half, and the ticket is immediately buried under calendar, Stremio, concessions and an input field. | Major | taste | `jo-02-ticket`, `kim-02-ticket`, `run-s2/jo-02-ticket` |
| C4 | The newcomer's curtain opens on a sign-up form, then a 4-card tour covers it. The reveal only comes after the tour and ghosts in as a double exposure over the form. The event isn't the first thing a newcomer sees. | Major | taste | `gma-open-2171/2487/3038ms`, `gma-01…04`, `gma-reveal-wait-0663ms`. 2612 ms to the first tour card |
| C5 | After "Count me in" on the reveal, Gma lands on the name form with a second "Count me in" for the same movie right below it. | Minor | | `gma-06-name-form` |
| C6 | "Since you last looked" is padded and robotic: "8 updates" vs "1 OF 9", it re-announces the reveal she just saw, Inception appears twice, "1 new thumbs-up on 1 movie" doesn't say who, posters are stranded in empty dashed boxes, and the buttons are duplicated behind the sheet. | Minor | | `jo-03…jo-11` |
| C7 | Name pills have their text pinned to the top, not centered. | Minor | | `jo-09-news-7` |
| C8 | Toasts linger across actions and cover controls, including the primary "I'm free that evening" button. | Minor | | `gma-07/09/10/11`, `hal-03/04`, `kim-02` |
| C9 | "You're in for Friday." is ambiguous with two Friday nights on screen, both marked "You're in ✓". | Minor | | `kim-02-ticket` |
| C10 | Guests are letters, never faces (G H J S) on the reveal, ticket, shelf and day panel. That's the opposite of Partiful's face-first guest list. The reveal also gives you no way to react. | Minor | taste | `jo-01-reveal-landed`, `jo-02-ticket`, `gma-10-after-vote` |
| C11 | "Put it on the marquee" takes 1.3 s with only a toast as the payoff. | Minor | | timing 1335 ms vs 36–57 ms for other taps. Pending state is a GUESS |
| C12 | The newcomer's ticket lands dim and grey, so it reads as disabled. | Minor | | `gma-07-ticket` vs `jo-02-ticket`. **GUESS**: may be a mid-fade capture. Confirm with frames 0–1500 ms after "That's me" |
| C13 | Destructive host actions ("Unlock and re-pick" on a revealed night, "Cancel night", "Lock the movie now") have the same weight as "Change time". | Minor | | `hal-03`, `hal-04`. **GUESS** on whether a confirm step exists |
| C14 | "RUNNING 1979 · 117 min" puts the year under RUNNING. "NOW BOOKING" is shown for a show that's already locked. | Polish | | `jo-02-ticket`, `jo-12-page-top` |

**Protect this:** the build after the flip. Poster, then "Alien", then "Friday 8 PM at Hal's", then who's coming, then "Gma, Hal and Sam thumbed it up" (`jo-reveal-turn-0718→1551ms`). Also protect the spoiler-safe marquee that reads "THE MOVIE IS…" until you've turned the card yourself (`gma-reveal-wait-0000ms`).
