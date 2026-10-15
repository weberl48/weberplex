# Iteration 8: the connoisseur (Dana)

I plan every group outing on Partiful and I go to the cinema for the moment the lights go down. These are my notes on the iter-08 evidence only. Frame times are ms after the tap unless noted otherwise. Luminance figures are mean pixel values on a 0-255 scale, measured from the PNG/JPG frames.

## 1. The signature moment, frame by frame (Jo, 412 px, reveal due)

### Opening the link (`run-s1-1/frames/jo-open-*.jpg`)
| t (ms after tapping the link) | what's on screen |
|---|---|
| 0011 | Solid white (mean luminance 255). |
| 0583 to 0946 | A closed red curtain with a faint footlight glow. The two frames are identical (frame diff 0.03). |
| 1096 to 1564 | The curtain starts to part. A sliver of the card shows at the centre by 1564. |
| 1879 | "The movie is…" shows through the gap. The curtain is about half open. |
| 2180 to 2496 | Curtain almost gone. The valance pulls up. |
| 2606 (median) | Card in view: "The movie is…", the red "?" card in a bulb frame, "TAP TO TURN IT OVER". |

The curtain is real theatre and better than a spinner. The problem is what it opens on: **a second curtain.** For 2.6 s it parts onto a face-down card that still has to be tapped. In a cinema the curtain parts on the picture. Here the curtain and the card back both say "not yet", one after the other, and every time Jo opens a due reveal she goes through 2.6 s of ceremony followed by a tap. The first frame is pure white, which is a flash in a dark room right before a lights-down theme.

### Waiting (`jo-reveal-wait-*.png`)
- The screen is black (luminance 6), "The movie is…", a burgundy card with a "?", "WEBERPLEX", "FRIDAY 8 PM AT HAL'S" and "TAP TO TURN IT OVER". The bottom ~40% of the phone is empty black.
- The only motion is the bulb frame blinking on a fixed cadence (the frame region changes at 226 and 657 ms and is static in between).
- **No people.** No faces, no "Hal locked it last night", no "Sam and Gma have turned theirs over". Nothing says this is happening to a group. The card back is generic and gives no clue about the film (no year, runtime or who added it). Seed 2's reveal is pixel-identical to seed 1's (`run-s2/jo-01-reveal-landed.png` vs `run-s1-1`, diff 0.0), so I can't see any per-film personality.

### The tap (`jo-reveal-turn-*.png`, contact sheet `jo-reveal-contact.png`)
| t | frame |
|---|---|
| 0000 | Card back. Room luminance 5. |
| 0162 | Card edge-on: an empty bulb frame with a red sliver. |
| 0306 | Poster legible, skewed mid-turn. |
| 0476 | Poster flat. The bulbs are bright. |
| 0651 | "Alien" ghosting in. |
| 0829 | Title solid (timing table: tap to title 685-696 ms). The bulbs blink OFF. |
| 1015 | "Friday 8 PM at Hal's". |
| 1193 to 1383 | "4 coming: you, Gma, Hal and Sam" fades up. Bulbs ON. |
| 1567 | "Gma, Hal and Sam thumbed it up". Bulbs OFF. |
| landed (`jo-01`) | One gold **See my ticket**. |

- **Pacing:** nothing happens between the tap and the turn. The card is already edge-on 162 ms after the finger lands, and the poster is readable at ~300 ms. That is the speed of a UI transition, not a reveal. The cascade afterwards (title, place, who's coming, why) is well ordered, but the moment itself, the turn, is over in a third of a second. A cinema has a beat between the dark and the first frame. This has none.
- **Lights-down:** there isn't one. The room is already black before the tap (luminance 6). After the tap it drops to about 1.4, which nobody can see. The bulb frame blinks before the tap and after the reveal at a similar on/off rhythm (the bulb strip measures about 22 when off and about 106 when lit, in both phases), so nothing builds and nothing goes down. The How it works tour promises exactly this: "Then the house lights go down on everyone's phone" (`gma-13-tour-4.png`). The trailer room does dim the house, from luminance 61 to 15 between 170 and 654 ms (`jo-trailer-*.jpg`), so a trailer gets a lights-down and the movie pick doesn't.
- **Payoff:** the landed frame is the best screen in the product. The lit poster in its bulb frame, "Alien", "Friday 8 PM at Hal's", "4 coming", "Gma, Hal and Sam thumbed it up", and one gold button. The "why" line is exactly right. The faces are not faces, though: they are four letter dots ("G H J S", about 30 px).

### The ticket (`jo-02-ticket.png`, 49 ms to the ticket)
The admit-one ticket is lovely: "ADMIT ONE / ALIEN", "GUEST Jo", a stub with "No. 237982", and the poster. But the jump is a 49 ms hard cut from the glowing black reveal into an ordinary page section. In the same viewport, under the ticket, are Add to calendar, You're in ✓, Download the invite, Watch the trailer, Watch in Stremio, CONCESSIONS, four snack chips, "I'll bring…" + Add, and an Also planned card with Count me in. The keepsake turns into a control panel within one screen. Nothing in the 1.5 s frame suggests the ticket printed, tore or slid in (whether it animates at all is a GUESS; a frame strip from the tap would settle it).

### Kim (has a name, not coming) (`kim-01`, `kim-02`)
This is the same reveal (identical turn timings, `kim-reveal-contact.png`), and it handles her well: "4 coming: Gma, Hal, Jo and Sam", then **Count me in / Not this time**. One tap gets her a ticket and "You're in for Friday." The toast sits on the ticket's top edge.

### Gma (newcomer, 360 px) (`gma-01` … `gma-04`)
Her first ever screen is the "?" card (`gma-01-first-screen.png`). There is no sign of whose night this is beyond "AT HAL'S": no group, no faces, nothing like an invite. Partiful's invite opens with the host and the guest list. She turns it over and gets "Count me in / Not this time", taps in, and drops from the glowing room into a form, "Put your name on the guest list" (`gma-03`). The form's own prompt "One step left: your name, and you're on the list." sits *below* the button. She gets her ticket 851 ms after entering her name, under a "Welcome, Gma." toast that covers her avatar in the header (`gma-04`).

### Runner-up: "If it locked now"
None of the captured screens shows the phrase "If it locked now". What does show is a grey inline clause: "· Leading: Jaws or Forrest Gump" (`hal-03-hosted.png`, `hal-04-also-planned.png`) and "Leading: The Grand Budapest Hotel" (`jo-02` Also planned), plus a "LEADING OCT 23" strip on a shelf card. None of these has a poster or a reason ("because Kim and Fran thumbed it up"). The tie is shown as "or", although the tour says "a tie spins the reel" (`gma-13`). The second signature moment reads like a footnote.

## 2. The rest of the session, briefly

| step | verdict | evidence |
|---|---|---|
| Since you last looked (Jo) | **forgettable, confusing** | The bar says "8 updates", the walkthrough says "1 OF 9" (the summary card counts). Card 1 already lists all eight items, then cards 2-9 repeat them one at a time. Card 2 "Locked for Friday: Alien" repeats the reveal she just watched. Inception appears twice (cards 3 and 9). Card 6 is a giant thumb in an empty dashed box ("1 new thumbs-up on 1 movie / Alien"). Card 7's name pills have their labels jammed against the top edge. The dimmed bar behind the modal still shows its own "Walk me through / Got it" while card 1 offers "Skip / Got it / Walk me through" (`jo-03` … `jo-11`). |
| Shelf and locked movie | **confusing** | On the shelf, Alien (Friday's locked pick) has no "Friday's picture" badge and its thumbs button still works. Grand Budapest gets "LEADING OCT 23" (`gma-06`). Gma thumbs up Alien after the lock (3 to 4, `gma-07`), and that late vote then shows up as the reason in Jo's reveal ("Gma, Hal and Sam thumbed it up", `jo-01`, against "Hal and Sam thumbed it up" in Gma's pre-vote `gma-02`) and as Jo's news card 6. |
| Shelf cards | generic | Each card has 5-6 pill buttons (thumbs, Seen it, Trailer, Stremio, Plot, Remove) plus letter dots. At 412 px the controls are taller than the title block (`jo-13`). |
| Trailer room | **good bones**, minor | The house dims, the curtains part on a gold-framed screen, and "NOW SHOWING Alien (1979)" sits above it. That is the best lights-down in the product. But the 16:9 screen fills only rows ~273-546 of 915 (`jo-trailer-1920ms.jpg`), so about 30% of a portrait phone is picture and the rest is black. "Won't play? Open it on YouTube" sits beside Close as a co-equal action, so the room apologises in advance. |
| Calendar (Gma) | none | "I'm free that evening" gives the toast "You're free Sunday. If someone hosts, you're on the list." The copy is good (`gma-09`). |
| How it works (Gma) | minor confusing | Four warm cards with sample marquee and ticket. Card 4 says "everyone coming gets a veto", but no shelf card shows a veto control (`gma-06`: thumbs, Seen it, Trailer, Stremio, Plot). The earlier toast still sits on top of the tour (`gma-10`, `gma-11`, and translucent over the header in `gma-12`). |
| Hosting (Hal) | slow-ish | The "Put it on the marquee / Not yet" slip, styled as a NOW BOOKING card ("MOVIE NIGHT AT HAL'S"), is the second-best screen (`hal-02`). The confirmation copy is clear (`hal-03`). The tap takes ~1.7-1.9 s to confirm, though the timing table flags machine noise. HOST THIS EVENING is below the fold on the day panel (`hal-01`). |
| Toasts | fragile | The same toast persists through three separate steps over shelf content ("Welcome, Gma. You're in for Friday.", `gma-06`/`07`/`08`), covers the header avatar (`gma-04`), sits over the "coming" row (`hal-04`) and lies on top of the tour modal (`gma-10`/`11`). |
| First screen at open | minor | The first captured frame is pure white (`jo-open-0011ms.jpg`, `gma-open-0081ms.jpg`, luminance 255), before the curtain at 583 ms. GUESS on how long it lasts: the 11 ms frame may predate navigation, and a 100-500 ms frame would confirm it. |

## 3. Findings

| id | problem | severity | tag | evidence |
|---|---|---|---|---|
| C1 | The curtain parts onto a second curtain. A 2.6 s open ceremony ends on a face-down "?" card that still needs a tap, so the cinema beat (curtain opens, picture) is spent on the tease instead of the payoff. | Major | taste | `jo-open-*` 0583→2606 ms; timing "open link to curtain gone" 2606 / 2614 ms; `jo-reveal-wait-0000ms` |
| C2 | No lights-down at the reveal. The room is already black before the tap (luminance 6, falling to 1.4 after) and the bulbs blink at a similar rhythm before and after, so nothing dims and nothing builds. The tour promises "the house lights go down on everyone's phone", and the trailer room does dim (luminance 61 to 15 in 0.5 s). | Major | taste | `jo-reveal-wait-*`, `jo-reveal-turn-*` luminance; `gma-13-tour-4`; `jo-trailer-0170…0654ms` |
| C3 | The turn has no beat. The card is edge-on 162 ms after the tap and the poster legible at ~300 ms, so the climax lasts about a third of a second. Haptics or sound on the turn: GUESS that there are none (screenshots can't show them; a device run would confirm). | Major | taste | `jo-reveal-turn-0162ms`, `-0306ms`; tap to title 685-696 ms |
| C4 | The reveal feels solitary. The wait screen has no people at all, and the payoff shows the group only as four ~30 px letter dots. Nothing conveys "everyone's turning theirs over tonight", which Partiful's faces-and-activity guest list does. | Major | taste | `jo-reveal-wait-0000ms` (only "FRIDAY 8 PM AT HAL'S"); `jo-01` "G H J S" |
| C5 | The runner-up "If it locked now" isn't visible anywhere captured. The live answer is a grey clause, "· Leading: Jaws or Forrest Gump", with no poster and no why, and the tie is shown as "or" despite "a tie spins the reel". | Major | taste | `hal-03`, `hal-04`, `jo-02` Also planned; `gma-13` |
| C6 | The ticket lands as a page section. A 49 ms hard cut from the reveal, then 9+ controls (calendar, invite, trailer, Stremio, snacks, "I'll bring…", Count me in) in the same viewport bury the keepsake. | Minor | taste | `jo-02-ticket.png`; ticket 49 ms |
| C7 | "Since you last looked" is a 9-step walkthrough for 8 updates. It repeats its own summary, re-announces the reveal Jo just saw, mentions Inception twice, offers duplicate Got it / Walk me through controls, and card 7's pill labels are misaligned. | Minor | | `jo-03`…`jo-11` ("1 OF 9" vs "8 updates") |
| C8 | The locked movie isn't marked on the shelf and still takes thumbs-ups. Gma's post-lock vote becomes part of Jo's reveal "why" and a news card. | Minor | | `gma-06`, `gma-07` (3→4); `gma-02` vs `jo-01`; `jo-08-news-6` |
| C9 | A newcomer's first screen is a "?" with no host, group or faces, and saying yes drops her from the glowing room into a form whose "One step left" line sits under the button. | Minor | | `gma-01`, `gma-03` |
| C10 | The trailer room's screen fills ~30% of a portrait phone, and "Won't play? Open it on YouTube" sits co-equal with Close. | Minor | taste | `jo-14-trailer.png`; `jo-trailer-1920ms` rows 273-546/915 |
| C11 | Toasts outstay their moment and cover content and modals across several steps. | Minor | | `gma-04`, `gma-06/07/08`, `gma-10/11/12`, `hal-04`, `kim-02` |
| C12 | The tour names a "veto" that no shelf control carries. | Minor | | `gma-13` vs `gma-06` |
| C13 | Hal's "Put it on the marquee" takes ~1.7-1.9 s to confirm. | Minor | | timing table (machine noise noted) |
| C14 | White first frame before the dark curtain. | Polish | | `jo-open-0011ms`, `gma-open-0081ms`; duration is a GUESS |

## Protect this
The landed reveal: the lit poster in its bulb frame, "Alien / Friday 8 PM at Hal's / 4 coming / Gma, Hal and Sam thumbed it up", one gold "See my ticket" (or "Count me in / Not this time" for someone not yet coming), then an admit-one ticket with your name on it.
