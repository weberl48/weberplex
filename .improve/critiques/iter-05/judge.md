# Weberplex: independent judge verdict (2026-10-14)

## What I ran

Everything ran locally: the site on `localhost:5180/?emu` and the emulator on `127.0.0.1:8181`. I used headless Playwright with Android phone contexts at 360, 393 and 412 px, plus 180 px at DPR 4 to stand in for a 360 px phone at 200% system text. I also tried a text-only variant: 360 px with Chrome's default font set to 32 px. The timezone was America/New_York.

**Seed** (`seed.py`):
- 12 people:
  - Lucas (owner), Chelsea, Gma, Hal, Jo, Kim, Sam, Fran, Uncle Rob, Mia, Dev.
  - Tess is new and was not seeded.
  - Each has a `lastSeen` between 1 and 6 days ago.
- 26 real Cinemeta movies, about 80 thumbs-ups and some seen marks:
  - 12 house picks from the Spooky Season list.
  - 14 guest adds with pitches.
- 3 watched nights with reviews. The most recent one (Jaws at Hal's, Oct 10) is only partly rated.
- Jo hosts Friday Oct 16 at 7:30 PM, with 6 people coming and 2 snacks.
- Free marks are spread over the next 4 weeks, and the season title is "Spooky Season".

**Scenario, roughly one week:**
- **Tess's first contact.** Walkthrough, name, Count me in, free evenings, thumbs-ups, and adding Coraline with a pitch.
- **Gma comes back after 5 days at big text.** She works through "Since you last looked", counts herself in and checks the calendar and shelf.
- **Planning.** Uncle Rob hosts Halloween (Horror theme). Dev vetoes, and Mia thumbs-ups and calls snacks.
- **Thursday evening.** I faked the browser clock so the lock was due:
  - Jo's phone locks Friday's night.
  - Gma (200%), Sam (not coming), a brand-new phone ("Aunt Bea") and Tess (backs out) each get the reveal.
- **A tie.** Rob's phone locks Halloween and the reel plays.
- **Ratings.** Chelsea rates Jaws. Fran rates a Tuesday night that the clock filed as watched in real time.
- **Owner console.** Wrong password, then the test key, then season title, house pick, two-tap Remove and Shield.
- **Edge cases:**
  - "Grandma" typed when "Gma" exists.
  - Dropping out of a night.
  - Adding a movie that's already on the shelf.
  - The Google Calendar link and the Subscribe link.
  - Opening with the database unreachable, and tapping while offline.
  - Day-of states.
- **Probes:** load time, storage, link preview and read counts.

Scripts are `s*.py` and `probe_*.py`, the log is `notes.log`, and screenshots are in `shots/`.

**Not exercised:**
- `/api/tick`, Home Assistant, Vercel, the live `/calendar.ics` and how Google Messages actually renders a preview.
- Production latency.
- Filing the Friday night as watched. The rules use server time, so I tested that path on a Tuesday night instead.
- The Android back gesture was simulated with `history.back()`.

## 1. The best moment: the reveal

When you open the link after the movie locks, the house lights go down. A burgundy card with a "?" sits in a ring of bulbs: **"The movie is…  TAP TO TURN IT OVER"**.

One tap flips it to the poster. The bulbs light, and the heading turns into **"Friday's feature"**. Under it you get:
- **Knives Out**
- *Friday 7:30 PM at Jo's*
- *8 coming: you, Chelsea, Dev, Gma, Kim and 3 more*
- *5 of the 8 coming thumbed it up*
- **See my ticket**

That button drops you on an **ADMIT ONE / KNIVES OUT** ticket with your name as GUEST, a ticket number, the runtime, Add to calendar, the trailer and Stremio.

**Measurements:**
- For returning people the overlay was up **1.37–1.38 s** after navigation (Gma, Sam and Tess in `notes.log`).
- The title lands **650 ms** after the tap (frame `s5jo-c2-turn650.png`).
- **Spoiler control.** Until someone has seen the reveal, the marquee reads "THE MOVIE IS…" and so does their ticket (`s5jo-grid1.png`, `s5tess-b1-upnext.png`). Backing out keeps it face down, with **Reveal the movie** in Up next.

**It holds for every kind of person I tried:**
- **At 200% text** it reads well (`s5gma-grid.png`).
- **Someone not coming** gets **Count me in / Not this time**, and the tap counts them in (`s5sam-*`).
- **A brand-new phone** goes skip tour → reveal → Count me in → name → "Welcome, Aunt Bea. You're in for Friday." → their own ticket (`s5bea-grid.png`).
- **Ties** get a slot-machine reel that lands on the winner (`s8rob-grid.png`).

**Next to the reference:** Partiful has nothing like this. It sends the invite and the RSVP and stops there. This version borrows the best part of a real cinema (lights down, the feature card, a ticket stub in your name) and adds something a cinema can't: *why this movie, in your group's own numbers.* It holds up, and for this crowd it is the more memorable moment. Evidence: `s5jo-c5-turn2600.png`, `s5jo-grid2.png`, `s5gma-grid.png`, `s5bea-grid.png`.

## 2. The two-sentence brag

> "Knives Out at Jo's, Friday 7:30! The site turned the lights down, flipped a card over and handed me a ticket with my name on it, and it even said 5 of the 8 of us coming had thumbed it up."

No hedging needed; that is exactly what happened on screen.

## 3. Problems

**Blocker: none found.**
Every core flow completed without an error or a dead end:
- First visit, naming, Count me in, free evenings, thumbs-ups and adding a movie.
- Hosting, vetoes, snacks, the lock, the reveal and the reel.
- Rating, the owner console, and opening offline or with the database unreachable.

**Major: none found.**

### Minor

1. **Backing out of a reveal before you've given a name burns your reveal for good.**
   - **What happens.** A phone with no name yet opens after the lock, and the reveal comes up right after the tour. You press back ("not now"), then tap your name. Your people doc now records the reveal as seen. Next visit the marquee reads **KNIVES OUT** and the news says "Locked for Friday: Knives Out", and the reveal never plays.
   - **Evidence (repro in `probe_carry.py`).** Kim's `reels` went from `None` to `['r:2026-10-16.tt8946378']` without the card being turned (`carry-grid.png`). A second, accidental repro happened with Hal: Escape on a signed-out reveal, then tapping his name (`probe_storage.py`). His next visit had no reveal and the marquee read "KNIVES OUT" (`s5hal` in `notes.log`).
   - **Cause.** In `public/js/app.js`, `play()` adds the key to `S.reelsSeen` when the reveal *starts*, and `join()` copies every signed-out key onto the person you then pick. That breaks the README's own rule that a reveal closed before the card turns "plays again next visit".
   - **Why Minor and not Blocker.** It writes a false "seen" mark onto that person's record, but no thumbs-up, RSVP or review is touched. Its reach is limited to new phones, first-timers and "Not you?".

2. **News cards name a second locked night's movie before its reveal or reel has played.**
   - Chelsea is coming to Halloween and has seen neither reveal (`reels: None`). Her playbill says "Friday's movie is locked" but also **"Locked for Saturday: Hereditary"** (`spoil2-01-news.png`). When Halloween becomes Up next, her tie reel is already spoiled.
   - This needs two nights locked at once: back-to-back nights, or a host using **Lock the movie now**. I reached it by locking Halloween early.

3. **The group-text link preview gives the movie away (taste).**
   - Once a night locks, the preview reads `og:title "Knives Out · Fri Oct 16, 7:30 PM at Jo's"` and uses the poster as `og:image`. I confirmed this by running `lib/preview.js` against the emulator (`preview_emu.mjs`).
   - Anyone who reposts the link after the lock ("movie night Friday! weberplex…") spoils the reveal for the whole thread, and the group text is the product's front door.
   - GUESS: that Google Messages shows the title and image. Confirm by sending a post-lock link in a test thread.

4. **At 200% big text the page scrolls sideways.**
   - At 180 CSS px the page is 188 px wide. The marquee's Courier ticker ("Leading: Knives Out or Barbarian or…") and the Up next card, including the "You're in" button, run past the right edge (`probe_overflow`, `s2z-02-after-news.png`, `s2z-grid2.png`).
   - Text-only scaling at 360 px showed no overflow.
   - GUESS: which of the two modes these phones' Chrome uses. Confirm on Gma's phone.

5. **On the phone that does the locking, the news cards come first.**
   - Jo's phone opened the "Since you last looked" sheet at 1.49 s. The reveal only appeared (2.06 s) after the sheet was dismissed.
   - On Rob's phone the tie reel waited behind a 4-card news sheet for 20 s until the sheet was dismissed (`notes.log`, `s5jo` and first `s8rob` run).
   - The README says the reveal plays before the news. This only happens when a phone beats the server tick to the lock.

6. **The browser stores more than the name.**
   - `localStorage` holds only `ps.me`. But the Firebase SDK creates an IndexedDB database called `firebase-heartbeat-database` (`probe_storage`).
   - It's invisible to users, but it breaks the stated hard limit.

7. **The read budget will tighten as the shelf grows** (GUESS on the projection).
   - Every page load reads all nights, movies, votes, seen marks and people, plus recent free marks and snacks/reviews. That is **about 200 reads per load today** (5 nights, 29 movies, 78 votes, 16 seen, 13 people, 42 free marks, 18 snacks/reviews).
   - Projection: with a year's growth (~180 movies, ~700 votes), that becomes ~1,500 reads per load. Thirty loads a day plus the Home Assistant poll (48 a day, reading every vote while a night is planned) would approach 50k a day.
   - Confirm with the Firebase usage console over time.

8. **The page is very long at big text.**
   - 53.7 screens at 180 px, with the shelf alone about 38 screens; 13 screens at 412 px (`probe_len`).
   - The jump links, sort and filters soften this.

### Polish

- **"Not sent yet" on a healthy connection.**
  - It appeared after a burst of four thumbs-ups and an add, then cleared (`s1b-grid.png`, frames 4–5).
  - Each emulator commit takes ~650–700 ms (`probe_fs`), so this is likely the environment. GUESS whether it happens on real 4G.
  - A real offline tap behaved well: "Not sent yet" at 5.5 s, "Sent." at 9.8 s after reconnecting, and the vote landed (`s10`).
- **The reveal heading is clipped at 200%.** "Friday's feature" loses its top edge (`s5gma-c5-top.png`).
- **The curtain overlaps the tie reel.** The load curtain is still parting over the first frame of the reel (`s8rob-a0-wait.png`).
- **Times are written two ways.** The reel says "Saturday 7 PM"; everywhere else says "7:00 PM".
- **The rating box shows up mid-movie.** "How was Knives Out?" appears 40 minutes into a 131-minute film (`s11-grid.png`, 8:10 PM).

### Checked and found good

- "Is that you, Gma?" when someone types "Grandma".
- Dropping out takes a second tap ("Tap again: can't make it") and reverts by itself.
- A duplicate movie gets "already on the shelf (added by Uncle Rob). Give it a thumbs-up instead."
- The Google Calendar link has the correct UTC times (23:30Z start).
- The owner's Remove needs "Tap to confirm", and a wrong password gets a clear message.
- With the database unreachable, the page says "Can't reach the box office yet…" instead of showing an empty house.
- Tess went from tapping the link to being counted in for Friday in about 12 s of skimming.

## 4. Am I genuinely impressed? **Yes.**

The specific moment is the reveal (`s5jo-c5-turn2600.png`): lights down, a face-down card in chasing bulbs, a flip to "Friday's feature", why it won in the group's own numbers, then an ADMIT ONE ticket with your name. It worked the same at 200% text, for people not coming yet, for a brand-new phone, and as a reel for ties. That is well beyond what I expect from a group-planning site.

I found no Blocker or Major. The real risks are all to that same moment, on edge paths:
- the back-out-then-name bug (Minor 1), which is the first thing I'd fix;
- the second locked night named in the news (Minor 2);
- the group-text preview (Minor 3).
