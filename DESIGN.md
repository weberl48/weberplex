---
name: Weberplex
description: A neighborhood picture house on a phone. One lit marquee, house lights down below.
colors:
  bulb: "#ffc76e"
  bulb-hi: "#ffd590"
  bulb-soft: "rgba(255, 199, 110, 0.16)"
  bulb-filament: "#fff3d1"
  foreign-ink: "#f0a9b8"
  curtain: "#7d1b35"
  curtain-hi: "#9c2747"
  board: "#fbf3e2"
  board-ink: "#1b0f0c"
  ticket: "#f1dbc6"
  ticket-ink: "#2c1712"
  ticket-label: "#7a4a3e"
  admit-red: "#8c2440"
  stripe-cream: "#e8e0d6"
  marquee-body: "#3a0f1d"
  projection-black: "#050203"
  go: "#93d9ad"
  bad: "#ff8f80"
  velvet: "#140a0f"
  velvet-2: "#1e1117"
  velvet-3: "#2a1720"
  rule: "#3b2530"
  rule-strong: "#7a5f6b"
  screen: "#f3e9dc"
  dim: "#bba69c"
  faint: "#9a8389"
typography:
  display:
    fontFamily: "Limelight, Georgia, serif"
    fontSize: "clamp(1.75rem, 7vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.03em"
  headline:
    fontFamily: "Limelight, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "0.02em"
  title:
    fontFamily: "Limelight, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  prompt:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.18em"
    fontVariation: "'wdth' 75"
  numeral:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
    fontFeature: "'tnum' 1"
rounded:
  print: "2px"
  stamp: "3px"
  board: "4px"
  md: "6px"
  window: "8px"
  frame: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "16px"
  section: "40px"
components:
  button-primary:
    backgroundColor: "{colors.curtain}"
    textColor: "#fff3e6"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.curtain-hi}"
  button-bulb:
    backgroundColor: "{colors.bulb}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-bulb-hover:
    backgroundColor: "{colors.bulb-hi}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.screen}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.velvet-2}"
  button-small:
    padding: "0 14px"
    height: "40px"
    typography: "{typography.body-small}"
  button-rsvp-in:
    backgroundColor: "transparent"
    textColor: "{colors.go}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  field:
    backgroundColor: "{colors.velvet-3}"
    textColor: "{colors.screen}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "46px"
  chip:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.screen}"
    typography: "{typography.body-small}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  chip-on:
    backgroundColor: "{colors.ticket}"
    textColor: "{colors.ticket-ink}"
  host-slip:
    backgroundColor: "{colors.ticket}"
    textColor: "{colors.ticket-ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  guest-chip:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.screen}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 16px 0 6px"
    height: "44px"
  vote:
    backgroundColor: "{colors.velvet-3}"
    textColor: "{colors.screen}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  vote-on:
    backgroundColor: "{colors.bulb}"
    textColor: "{colors.board-ink}"
  mini:
    backgroundColor: "transparent"
    textColor: "{colors.dim}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "36px"
  mini-on:
    backgroundColor: "{colors.go}"
    textColor: "{colors.board-ink}"
  movie-card:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.screen}"
    rounded: "{rounded.md}"
    padding: "10px"
  pick-card:
    backgroundColor: "{colors.velvet-3}"
    textColor: "{colors.screen}"
    rounded: "{rounded.md}"
    padding: "10px"
  stat-board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.board}"
    padding: "12px 14px"
  day-panel:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.screen}"
    rounded: "{rounded.md}"
    padding: "14px"
  letter-board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    typography: "{typography.display}"
    rounded: "{rounded.board}"
    padding: "18px 16px 16px"
  ticket:
    backgroundColor: "{colors.ticket}"
    textColor: "{colors.ticket-ink}"
    rounded: "{rounded.md}"
    padding: "18px 18px 16px"
  calendar-day:
    backgroundColor: "{colors.velvet-2}"
    textColor: "{colors.screen}"
    rounded: "{rounded.md}"
    padding: "4px 2px"
  calendar-day-free:
    backgroundColor: "rgba(147, 217, 173, 0.16)"
    textColor: "{colors.screen}"
  theme-chip:
    backgroundColor: "{colors.bulb}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  toast:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: Weberplex

## Overview

**Creative North Star: "House Lights Down"**

Weberplex is a neighborhood picture house on a phone. At the top, one lit marquee holds the night: the season title, the movie or the host's house, when it starts, and how long until it does. Below it the house lights are down. The page is a deep velvet auditorium where everything is warm, quiet and easy to read, and light falls only where someone has a choice to make or where something is winning.

The page is a single program column built for an Android phone at 360 to 412 px, and desktop is the same column, centered. Posters carry the real color. The chrome stays velvet, oxblood and amber, so after the marquee the brightest things on screen are the movies.

The theme reaches everywhere, but the light stays in one place. Every component borrows a cinema material: letter-board paper, admit-one stock, stamp lettering, perforated stubs, concession stripes, the guest list, the box-office window. Brightness, glow and motion belong to the marquee and the two event moments (the reel and the reveal). As of 2026-10-14 the confirmed direction is to keep pushing that material into everyday components without adding light. The letter-board stats, the guest-list name tags, the hosting slip, the "If it locked now" card and the box-office day panel are the first of it. Shelf cards stay plain velvet by the user's choice (2026-10-14): poster on top, everything about the movie right under it. Buttons, fields and filter chips are still plain. The rejected look is generic dark-mode SaaS: gray cards, blue links, a dashboard that could be any product.

**Key Characteristics:**
- One lit, animated marquee per page; everything else is lit only by state.
- Every dark is velvet-tinted and every light is warm paper. There are no neutral grays.
- Amber marks what's yours, what's leading, or the main call in each block.
- Art-deco marquee letters name things, a condensed grotesk does the labels, and typewriter numerals count.
- Printed props (letter board, ticket, hosting slip) for the moments that matter.
- 2:3 posters everywhere, always the most colorful thing below the marquee.
- A movie stays face down until its reveal has played for you.

## Colors

A warm three-light theater: velvet dark, an oxblood curtain, amber bulbs, and paper for anything you'd hold in your hand.

### Primary
- **Marquee Bulb** (bulb): the accent. It's used for section and overlay headings, the wordmark, active chips and votes, your own face dot, the lead card's outline and "Most wanted" ribbon, the theme chip, countdowns and tallies, links, the focus ring, and the main call in each block (the bulb button).
- **Hot Filament** (bulb-hi): hover on bulb buttons only.
- **Bulb Haze** (bulb-soft): the soft focus ring around fields and the flash that points at the name form.
- **Filament** (bulb-filament): the white-hot center of each marquee bulb. Nowhere else.

### Secondary
- **Curtain Oxblood** (curtain): the fill for committing taps: closing out a night ("We watched it", posting a review) and putting a hosted night on the marquee. Also the reveal card's cover, kicker lettering on the letter board, and the red in the concession-stripe ribbon on snacks.
- **Lit Curtain** (curtain-hi): hover on curtain buttons and the outline of the Foreign tag, whose lettering is **Foreign Ink** (foreign-ink).
- **Marquee Body** (marquee-body): the plush frame around the letter board that the bulbs sit on.

### Tertiary
- **Letter Board** (board) with **Board Ink** (board-ink): the marquee's lit sign face and the toast. Board ink is also the text color on every amber fill.
- **Admit-One Paper** (ticket) with **Ticket Ink** (ticket-ink): the ticket, the hosting slip, and a chosen filter or tab. **Ticket Label** (ticket-label) is the brown of field names, small print and button edges on that stock. **Admit Red** (admit-red) is the stamp ink for "ADMIT ONE" and "NOW BOOKING", on paper only.
- **Concession Green** (go): good news only. Evenings you're free, You're in ✓, Seen ✓, the "new" chip and dot, and success messages.
- **Spilled Soda** (bad): failures and the strike-through on a vetoed movie. It never marks time, absence or anything a person "should" do.
- **Projection Black** (projection-black): the reel window and the back of the reveal card, the only place darker than the house.

### Neutral
- **House Velvet** (velvet): the page itself. The faint oxblood curtain pleats at the edges of desktop screens (900px and up) are drawn from it; phones get plain velvet.
- **Raised Velvet** (velvet-2): panels, cards, chips, the news bar, overlay cards.
- **Plush Velvet** (velvet-3): fields, vote pills, poster placeholders, hover fills.
- **Aisle Rule** (rule): dividers, panel and card edges, and the dashed edges of empty states.
- **Aisle Edge** (rule-strong): the 1px edge of anything you tap (chips, pills, ghost buttons, fields, the day panel), at 3:1 or better against every velvet so a control is findable by its edge.
- **Projector Light** (screen): body text and titles.
- **Dimmed Light** (dim): hints, meta lines, secondary text.
- **Back-Row Light** (faint): labels, placeholders, day-of-week letters, "added by" lines. At least 4.8:1 on every velvet.

### Named Rules
**The Lit Seat Rule.** Amber fills mark only three things: what's yours (your vote, your face), what's leading (the lead card's ribbon and glow), and the main call in each block. It is never a decorative panel fill, and never a default: a chosen sort, filter or tab is printed on admit-one paper instead.

**The Good News Rule.** Green means free, seen, new or done right. It is never an action color and never a warning.

**The Warm Dark Rule.** Every dark carries the velvet's oxblood tint and every light is warm paper. Neutral gray, pure black and pure white don't appear.

**The Readable Back Row Rule.** Text passes 4.5:1 on whatever it sits on, and the edge of a control passes 3:1. Quieter means a dimmer step that still passes, never a failing one.

## Typography

**Display Font:** Limelight (with Georgia, serif)
**Body Font:** Archivo, variable width 62–125 and weight 400–800 (with system-ui)
**Label/Mono Font:** Courier Prime 700 (with Courier New, ui-monospace)

**Character:** Art-deco marquee capitals name things. Archivo is the workhorse, and its condensed width does the label and stamp duty. Courier Prime is the box-office typewriter for anything counted, timed or printed on a stub.

### Hierarchy
- **Display** (Limelight 400, clamp(1.75rem, 7vw, 3rem), 1.05, uppercase, 0.03em): the movie or night on the marquee. The ticket title uses the same face at clamp(1.4rem, 5vw, 2rem).
- **Headline** (Limelight 400, 1.5rem, 1.15, 0.02em, amber): section heads ("Up next", "The shelf") and overlay heads.
- **Title** (Limelight 400, 1.1875rem, 1.2): the night card head (amber), the guest-list form, the day panel's date (projector light), and the letter-board stats (board ink, uppercase, a 34px line per stat). Movie card titles are Archivo bold at 1rem, 1.25 line height.
- **Body** (Archivo 400, 1rem, 1.5): running text. **Body small** (0.8125rem) is for hints, chips, small buttons and day detail. **Caption** (12px) is for card meta, "added by" and "seen by" lines, mini actions, plots, browse-tile notes, past-night dates and the footer. **Prompt** (Archivo 600, 1rem) is a question or heading inside a panel, in sentence case ("How was Alien?").
- **Label** (Archivo 700, 0.8125rem, width 75, 0.18em, uppercase, back-row light): short section labels like "Concessions", "Sort", "Show". Never a full sentence. The same recipe spaced wider is the marquee kicker (0.32em, oxblood) and "ADMIT ONE" (11px, 0.38em). At 11px it's ticket field names, tag stamps, the ribbon and day-of-week letters. The jump links under the marquee use it at 12px.
- **Numeral** (Courier Prime 700, 0.8125–1.1875rem, tabular): countdowns ("Movie locks in 19d 12h", "Starts in"), vote and chip counts, star scores, the ticket stub number.

### Named Rules
**The Marquee Letter Rule.** Limelight is for names and headings only, always at weight 400. It is never used for body copy, buttons, labels or anything a person has to read twice.

**The Typewriter Numbers Rule.** Anything counted, timed or stamped uses Courier Prime. Tallies that change use tabular numerals.

**The Small Print Floor Rule.** Sentences are 12px or larger; uppercase stamps and labels are 11px or larger. Nothing smaller ships.

## Layout

The page is one centered program column, 46rem at most, with 16px gutters and 4rem of room at the bottom. Sections sit 2.5rem apart, and each opens with a Limelight head on the left and a quiet aside or ghost control on the right, aligned on the baseline. The order follows the night: the marquee, a row of jump links (Up next, Calendar, Shelf, Watched, Stats), the news bar, the guest-list form, Up next, the calendar, the shelf, Watched, Stats, then the footer.

Grids are built so a phone shows the right count without breakpoints, and every column minimum is capped at the container (`min(9.5rem, 100%)`), so 200% text never pushes the page sideways. The shelf fills columns of at least 9.5rem (10.5rem from 640px), which gives two cards across at 360–412px. Browse tiles use 8.5rem. The calendar is seven equal columns with 5px gaps, and each day is slightly taller than wide. The letter-board stats are one column, then two from 640px, and stat cards auto-fit at 13rem. Spacing runs on a loose 4px rhythm: 4, 6 and 8px inside controls, 10–14px inside panels, 16px gutters.

Rows of controls wrap; they never shrink or scroll sideways. Every text container takes `overflow-wrap: anywhere` and `min-width: 0`, so a 24-character name can't widen a card or the page. On a phone, the tour and news cards rise from the bottom like a sheet, each only as tall as it needs, so their buttons sit at the same spot under the thumb and the marquee stays in view above; from 640px they center. When a card runs longer than the screen, its foot (the dots and Next) sticks to the bottom behind a perforated edge, and Skip never breaks across lines; below 300px (big text) the card drops its example and keeps the words. How it works stamps its examples SAMPLE (an outlined stamp on the dashed demo box) and gives them weekdays and made-up names, never the group's real dates or people; a screen reader hears each card's title as it comes. News headlines are sentences, so they're set in the body face at 600, with a movie's name in marquee letters; the tour's short titles stay Limelight. The reel and reveal center in a fixed scrim with 16px padding. Android's back gesture closes whichever overlay is on top. The calendar and its key share a size container (the tour's small calendar isn't in it): when it's narrower than 280px (big text), each day gives up its square and becomes a 44px-tall cell holding the date; the day-of-week and count hide (the day panel spells them out), and a night keeps its house mark as well as its gold ring, so more than color tells it from a free evening. A landscape phone (max-height 520px) gets smaller posters and tighter heads so the OK button stays on screen. Below 340px (big text) the ticket stacks: each field's label over its value, and the stub becomes a strip along the bottom behind a horizontal perforation. The marquee and ticket titles size themselves to their box (container units), so big text shrinks a word rather than splitting it. The toast spans the column (16px gutters), so a long note wraps across the screen, not half of it. The toast respects the bottom safe-area inset.

**The Wrap, Don't Shrink Rule.** At 360px, controls wrap to a new line and text breaks anywhere. Nothing scrolls sideways, and nothing drops below its touch size to fit.

## Elevation & Depth

Depth comes from tonal layers, not from lifting things up. The page is house velvet, panels are one step up in raised velvet, and fields and pills one more in plush velvet. Panels are edged with a 1px aisle rule, and anything you tap with the stronger aisle edge. Shadows here mean light: they show up where something is lit (the marquee, the letter board, the leading card, the reel window) or where something is held over the house (the ticket, an overlay card, the toast). Nothing floats at rest just to look clickable.

### Shadow Vocabulary
- **Marquee glow** (`box-shadow: 0 0 0 2px #5a1a2c inset, 0 18px 50px -20px rgba(255, 170, 80, 0.35)`): the plush frame and the warm spill below the marquee.
- **Board light** (`box-shadow: 0 0 24px rgba(255, 233, 190, 0.55), inset 0 0 22px rgba(255, 210, 140, 0.55)`): the letter board lit from inside.
- **Leader glow** (`box-shadow: 0 0 0 1px var(--bulb), 0 10px 30px -12px rgba(255, 199, 110, 0.45)`): the movie currently winning.
- **Reel glow** (`box-shadow: 0 0 40px rgba(255, 199, 110, 0.35)`): the tie-breaker window.
- **Held paper** (`box-shadow: 0 16px 40px -18px rgba(0, 0, 0, 0.8)`): the ticket.
- **Overlay card** (`box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6)`): tour cards. Reveal faces use `0 18px 40px rgba(0, 0, 0, 0.6)`. The reel's scrim is 97% house dark and the reveal's fully dark, so nothing behind them gives the movie away.
- **Toast** (`box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5)`).
- **Focus haze** (`box-shadow: 0 0 0 3px var(--bulb-soft)`): fields on focus.

**The Light, Not Lift Rule.** A shadow is either light spilling from something lit or the darkness under something held. If neither is true, the surface is flat.

## Shapes

Corners are gently squared. Panels, buttons, fields and cards use 6px, and printed things are tighter: posters 2px, the letter board 4px. Stamps are 3px: tags, the countdown and rank badges, the "new" chip, the agreement meter. Projection surfaces are 8px: the reel window, the reveal card, and the bulb layer inside the marquee. Only the marquee frame and overlay cards round to 10px. Anything you toggle or tap in a row is a full pill: chips, votes, mini actions, guest tags, the theme chip. Faces are circles that overlap by 6px.

The theater shows up in the silhouettes. The marquee frame is two layers of radial-gradient bulbs on an 18px pitch that chase each other. The letter board (the marquee and the stats) has a faint groove every 34px. The ticket has two 11px punched notches on the stub line and a dashed perforation. Snacks have a concession-stripe left edge in oxblood and **Stripe Cream** (stripe-cream). Dashed aisle-rule borders mark the empty and the provisional: empty states, tour demos, the host-tools divider, the hosting block in the day panel, the last news card's list. Posters are always 2:3.

## Components

### Buttons
Solid and theater-plain. The direction is to give them cinema material, not more light.
- **Shape:** gently squared (6px), at least 44px tall, 18px side padding, Archivo 600.
- **Primary (curtain):** an oxblood fill with warm white text, used only for committing taps: closing out a night ("We watched it", "Post" on a review) and "Put it on the marquee" on a hosting slip. Hover lifts to lit curtain.
- **Bulb:** an amber fill with board-ink text, used for the main call in each block ("That's me", "Count me in", "I'm free that evening", "Add to calendar", "Add a movie", Next/OK in overlays), one per block. Hover goes to hot filament.
- **Ghost:** transparent with an aisle-edge border and projector-light text, for secondary actions in a row. Hover brightens the edge to projector light.
- **RSVP:** one control wherever a night shows (Up next, Also planned, the day panel, under the ticket). Out, it's the bulb button "Count me in". In, it's a ghost button edged and lettered in concession green, "You're in" with a check icon. Dropping out takes a second tap ("Tap again: can't make it").
- **Small:** 40px tall, 14px padding, body-small text, for section-head controls (Subscribe, Walk me through, Got it, Skip) and host tools.
- **Press:** sinks 1px over 120ms. Disabled drops to 50% opacity.
- **Linkish:** an underlined amber text button with a 3px offset, for "How it works" and "Not you?" ("Not you?" asks twice). In the top bar and footer its tap area is padded out to 44px without moving the layout.

### Chips
- **Filter chip:** a raised-velvet pill with an aisle-edge border, 40px tall, body-small. Hover shows an amber border. Chosen, it's printed on admit-one paper with ticket ink at weight 600, and its count sits in Courier at 11px. The row carries a short label to its left ("Show"). Browse tabs work the same way.
- **Sort menu:** the shelf's order is a field-styled menu labeled "Sort" (Most wanted, Newest, Least seen, Shortest), not a chip row, so only the filters read as chips.
- **Guest-list tag:** the names on the name form, 44px pills with the person's initial in a face circle. A name that looks like the one being typed gets an amber edge and haze.
- **Vote pill:** plush velvet, 40px, bold, a 16px thumb icon and a tabular tally. Your vote is an amber fill. The tally bumps (scale 1.45 over 360ms) when it changes.
- **Mini action:** a transparent pill, 36px, 12px dim text, for Seen it, Trailer, Stremio, Veto, Remove and the browse tiles' Add. A done state ("Seen ✓") fills concession green.
- **Tag stamp:** 3px corners, 11px condensed uppercase, outline only. Unseen is outlined amber, Rewatch green, Foreign lit curtain, and Recent favorite is a solid amber fill.
- **Theme chip:** a solid amber pill in 11px condensed uppercase, naming the night's theme.

### Cards / Containers
- **Corner Style:** gently squared (6px), with overflow clipped so the poster bleeds to the edges.
- **Background:** raised velvet with a 1px aisle rule.
- **Shadow Strategy:** flat. Only the leading card gets the leader glow (every tied leader, when there's a tie), plus an amber ribbon across the poster's foot: "Leading Nov 3" on the next night's projected pick (a date, because a weekday alone is ambiguous weeks out), or "Most wanted".
- **Internal Padding:** 10px on movie cards, 12–14px on panels (day panel, stat cards, subscribe panel), 1.1rem on the guest-list form.
- **Reviews:** a plain list under a watched night, each review set off by an aisle rule above it, never a box inside the card.

### Inputs / Fields
- **Style:** plush-velvet fill with an aisle-edge border, 6px corners, 46px tall, 14px padding, an amber caret. Placeholders are back-row light and are examples, never the label: a field that needs explaining gets a visible label above it ("Why this one?").
- **Focus:** the border turns amber with a 3px bulb-haze ring, and no outline.
- **Error:** a message line under the field in spilled soda. Success messages are concession green.

### Navigation
A top bar, not a nav bar. The "Weberplex" wordmark (Limelight, amber, 1rem, 0.04em) sits on the left; on the right are "How it works" and who's on this phone (their initial in an amber face, their name, "Not you?"). Under the marquee, a row of jump links in 12px condensed caps (Up next, Calendar, Shelf, Watched, Stats), each 44px tall, works as the page's program and as skip links. The page is one long scroll otherwise. There are no tabs, bottom bar or hamburger. The owner console (`/host`) is a separate page in the same column and materials.

### The Movie Card
Every movie on the shelf, one side only (the user chose this over a two-sided lobby card on 2026-10-14). The 2:3 poster on top, with the "new" chip top right and, at its foot, the ribbon: "Leading Nov 3" on the next night's projected pick, or "Most wanted" when no night is planned. Under it on raised velvet: the title, meta line, tags, the pitch in italics, who added it, and who has seen it (only once someone has); then the action row pinned to the card's foot, so rows of cards line up: the vote pill, Seen it, Trailer, Stremio, Plot (which opens the plot in place and becomes "Hide plot") and Remove for your own; then the voters' faces. While a themed night is planned, the Show row gains a chip for its pool ("Fits Hal's Drama night"): the movies that night can actually pick.

### If It Locked Now (signature)
A mini lobby card at the top of a planned night's card, on plush velvet: a 76px 2:3 poster wearing the same ribbon as the shelf ("Leading Nov 3", or "Tied"), then a small label, the title at title size, and one line saying why, in people's names, naming the pool when a theme narrows it ("Hal only thumbed up vetoed or off-theme movies, so it goes to the group's favorite among Drama movies"). Its Veto sits there when the movie isn't already in the list below, with "one veto each" beside it. The marquee repeats the pick as "Leading:".

### The Hosting Slip (signature)
"I can host" (a ghost button) prints a slip on admit-one paper inside the day panel's hosting block: a stamp-red "NOW BOOKING", "Movie night at Jo's" in uppercase Limelight, the date and time (and the theme), who else is already free that evening and so on the list, when anyone is ("Kim and Sam are free, so they're all on the list"), and a line saying it goes up on the marquee for everyone. Its curtain button, "Put it on the marquee", hosts the night; "Not yet" folds it away. It casts the held-paper shadow, like the ticket.

### The Calendar Key
One line under the grid, 12px dim: a green-tinted swatch "you're free", a Courier digit "free that evening", and an amber-ringed swatch "movie night". The marks need no memorizing. At big text the key drops the digit along with the cells.

### The Letter-Board Stats (signature)
The long view, spelled out like a marquee board: one centered line per number on letter-board paper with a groove every 34px, the number in oxblood and the words in board ink, in uppercase Limelight. Unlit (no glow), because the marquee is the only lit board. Two columns from 640px.

### The Box-Office Window (signature)
The panel under the calendar for the day you tapped, with an aisle-edge border. It shows the date in Limelight with ‹ › beside it (44px, Courier arrows) to step to the evening before or after without going back to the grid, who's free, the night if there is one, and the RSVP control. On an evening without a night it shows "I'm free that evening" and a hosting block (start time, theme, I can host) behind a dashed divider.

### The Marquee (signature)
A plush oxblood frame (10px corners) ringed with chasing bulbs around a lit letter board (4px corners, faint grooves, inner glow). The board stacks a spaced oxblood kicker (the season title and status), the display line (the movie or night), an uppercase condensed subline (when and whose house, its lines balanced, the time never split from AM/PM), and a board-ink tag with the countdown in amber Courier. It's the only element that glows and animates at rest. With reduced motion the chase stops and the bulbs hold at 40%. While your reveal for a locked night hasn't played, the display line reads "The movie is…". The tour's small copy of it is still: no chase.

### The Ticket (signature)
Admit-one paper with two 11px punched notches and a dashed stub perforation. On the left: "ADMIT ONE" in spaced stamp red, the movie in Limelight, and a definition list (When, Where, Guest, Running) with condensed uppercase labels in ticket label brown. On the right, a 74px stub carries a vertical Courier serial number. It shows on a locked night you're coming to, with Add to calendar and the RSVP control underneath, then the trailer and Stremio. Face down ("The movie is…", no running time) until your reveal has played.

### The Calendar Day (signature)
A raised-velvet square on a seven-column grid. A tap shows the day in the box-office window below and marks nothing; the arrow keys move between days, and the grid is a single Tab stop. From the top: an 11px day-of-week (or month marker), the date in Limelight, and a Courier meta line with the count and a house icon when someone hosts. Free is a concession-green tint and border. The leading day gets a 2px amber ring, the selected day a projector-light outline, and fresh activity a small green dot.

### The Reel and The Reveal (event moments)
The reel is a full-screen scrim, 97% house dark: a projection-black window in a 3px amber frame with the reel glow, posters scrolling past under a fade. It lands like the reveal: the window lights with an amber ring, the heading becomes the night's feature, the winner lands in amber Limelight at display size, and when, where and who's coming print under it, with the reveal's endings. The reveal is the house lights going down: the page fades to full dark over 0.9s, then the card comes up out of the dark. A 2:3 card, oxblood with an amber Limelight question mark, waits face down in a ring of bulbs that chase like the marquee's, over "Tap to turn it over" in amber condensed caps; nothing turns by itself. A tap (or Enter or Space) turns it over 1s (`cubic-bezier(.3, .7, .2, 1)`) to the poster; then the house lights it up: the bulbs flash four times and hold lit with the reel glow, the heading resolves from "The movie is…" to "Friday's feature", and the title lands in amber Limelight at display size, with when and where under it, then who's coming and why it won in dim body text ("4 coming: you, Hal, Jo, Sam · 3 of the 4 coming thumbed it up"). It ends on See my ticket for someone coming and on Count me in / Not this time for anyone who isn't (with no name yet, Count me in asks for one, then lands on the ticket). It waits until every list has loaded (so it knows whether you're coming), plays once per person after How it works, and the news cards don't open over the ticket that follows it: See my ticket brings the ticket to the top of the screen, where it prints in (a short drop and fade). Back or Esc before the card turns is "not now": it stays face down and the news waits in its bar. Their posters load eagerly so the reel never spins past blanks. With reduced motion the bulbs hold still and the card turns without the spin.

### Toast
Letter-board paper with board ink, 6px corners, rising 20px into place over 180ms above the bottom safe area. Errors switch it to spilled soda.

## Do's and Don'ts

### Do:
- **Do** keep the marquee the only thing that animates at rest, and the only thing that glows apart from the leader glow on the movie currently winning. Reduced motion stops the chase and holds the bulbs at 40% opacity.
- **Do** give everyday components a cinema material (paper stock, stamp lettering, perforation, slips, letter boards, concession stripes) instead of more light. That's the confirmed direction as of 2026-10-14.
- **Do** reserve amber fills for what's yours, what's leading, and the main call in each block.
- **Do** keep main buttons at least 44px tall, chips and votes 40px, and in-card pills at least 36px, and judge everything at 360 and 412px first, then at 200% text.
- **Do** keep a locked movie face down everywhere on the page until that person's reveal has played.
- **Do** draw icons as solid SVG in the thumb's style (thumb, house, check, the rating stars); never a Unicode glyph or emoji. A ★ inside running text ("★ 8.4", a review's score) is typography, not an icon, and stays.
- **Do** keep posters at 2:3 and let them be the most colorful thing below the marquee.
- **Do** set numbers, countdowns and stub print in Courier Prime with tabular numerals.
- **Do** use velvet tonal steps and the 1px aisle rule for structure before reaching for a shadow.

### Don't:
- **Don't** let it look like generic dark-mode SaaS: gray cards, blue links, a dashboard that could be any product.
- **Don't** add a glowing or animated element at rest beyond the marquee and the leader glow. The reel and reveal glow only while they play.
- **Don't** use neutral gray, pure black or pure white. Every dark is velvet-tinted and every light is warm paper.
- **Don't** set body copy, buttons or labels in Limelight.
- **Don't** use green for actions, or spilled soda for anything but failures and the veto strike-through.
- **Don't** let a long name or title widen a card or the page. Wrap it.
- **Don't** set a full sentence in the uppercase label style; sentences use the prompt or hint styles.
- **Don't** put a thick accent stripe on a rounded panel; edge it with the aisle edge instead. The snack rows' concession stripe is the one exception: a printed pattern, not an accent color.
