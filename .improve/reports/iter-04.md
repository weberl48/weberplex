# Iteration 4 (2026-10-14)

The next open night stays alive while the nearest is locked, and taps stay honest in more places. The face-down movie is scrubbed from the crown and the news, and only people who were there rate a night. The design review rose to 31/40. The critics found that a failed name step can still say "Sent.", and that the reveal and the reel still land without people.

## What changed (commits on improve-loop)
- **4616f02 The next open night stays visible, and every tap stays honest.**
  - The crown and the "Leading" ribbon follow the next planned night.
  - Also planned rows and the day panel show what's leading.
  - No news line names a face-down movie.
  - Also planned has a ghost Count me in.
  - The name step gets a busy guard and the watchdog.
  - Toasts dock at the top over an open sheet and let taps through.
  - Back or Esc on the news means later.
  - Got it in the bar keeps focus in the page.
- **faf2b0d First contact.** The sample ticket stays face down. Free marks load from a week back, so only the people who were there are asked to rate a night.

## The Draft
Evidence is in `.improve/evidence/iter-04/`.

Timings are flat against iteration 3:

| Step | Median |
|---|---|
| Open the site | 1338 ms |
| Tap to title | 681–699 ms |
| Gma: name to ticket | 344 ms (worst 848) |
| Host | 657 ms |

The shelf crown now reads "Leading Oct 19" on the next planned night's pick, not on the locked movie. All three Pivot changes met their criteria.

## The Harsh Critique
- **Design review (impeccable): 31/40**, up from 30. Error recovery scored 4.
- **Detector:** sanctioned findings only.
- **Blockers:** none.

| rank | id | problem | severity |
|---|---|---|---|
| 1 | P-072 | A failed name step can flip the note to "Sent."; one latch silences later warnings | Major |
| 2 | P-036 | A phone can lock from stale data (the transaction re-checks only status) | Major |
| 3 | P-074 | Esc on the face-down card turns it and files it as seen; back still raises the news | Major |
| 4 | P-075 | Face-down leaks via Stats picks and Most wanted | Major |
| 5 | P-073 | No lights-down or build in the reveal | Major (taste) |
| 6 | P-066 | No people or reason on the landed reveal; ticket lands under the news box | Major (taste) |
| 7 | P-061 | The tie reel ends flat ("It's Jaws." + "Nice") | Major (taste) |
| 8 | P-076 | At 200%, Count me in lands on a name form with the field hidden | Major |

What each critic said to protect:
- **Newcomer:** "one tap … answers both of Gma's questions on one screen, and Count me in survives the name detour to become a ticket."
- **Connoisseur:** "the face-down '?' card in a chasing-bulb marquee … with the reveal doubling as a one-tap RSVP."
- **Operator:** "every guest write goes through one once()/sending() path that confirms only on the server's ack … O1 and O2 are the two places that path leaks."

## The Pivot (iteration 5)
1. **Honest to the end** (P-072, P-036). A failure never says "Sent."; the note returns for each outage; the lock re-checks vetoes and theme in the transaction and waits for fresh data after the tab wakes.
2. **The reveal and the reel land with people** (P-073, P-066, P-074, P-061). Lights dim in; the reveal shows who's coming and why the movie won; Esc and back keep it face down and hold the news; the ticket comes to the top; a tie lands like the reveal.
3. **Face down stays face down, and a clean name step at big text** (P-075, P-076, P-047). Stats count only watched nights; the name form scrolls to its heading with the field showing; name chips ignore taps for 700 ms after the form appears.

## Health
- **Tests:** unit 35, emulator 41, e2e PASS (5 new checks).
- **Live:** shipping this iteration.
- **Next:** iteration 5 is the checkpoint, so a fresh judge runs after its critique.
