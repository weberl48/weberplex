# "Since you last looked" as a walkthrough, complete and kept complete (2026-10-14)

The banner becomes step-through cards in the same style as **How it works**
(`public/js/tour.js`), covers every kind of change people make, and a guard
test keeps it that way as the site grows. Shared constraints from
`2026-10-13-loop-stats-fun.md` still apply (no new deps, nothing new in
browser storage, logic in `logic.js`, writes in `actions.js`, rules are the
backend, Spark read budget: **no new collections or listeners**).

## What counts as news (things *other* people did since your last look)

Already covered (keep): someone is hosting a new night · a movie locked · new
movies on the shelf · new thumbs-ups · people marked free evenings.

New:
1. **Cancelled** — a night went `cancelled` (its `finishedAt` is fresh):
   "Jo's Friday movie night is off".
2. **Filed as watched** — a night went `done` (fresh `finishedAt`):
   "Alien is filed under Watched. Rate it." → target `#watchedSec`.
3. **Snacks and reviews** on the nights the page already follows
   (`S.nightSub`: the next night + recent done ones): "Sam is bringing nachos
   on Friday", "Jo rated Alien ★★★★". Pass the subs into `sinceLastLook`.
4. **Theme set/changed/cleared** — new night field `themeAt` (server time of
   the last theme change): "Friday is a Foreign night now" / "Friday's theme
   was cleared".
5. **Vetoes** — new night map `vetoAt` (`nameKey → server time`), written in
   the same field-path update as `vetoes.<key>` (and deleted with it):
   "Sam vetoed Jaws for Friday".
6. **Time moved** — new night field `movedAt`: "Friday's night now starts at 9:00 PM".

Items are grouped sensibly (all thumbs in one card, all free marks in one,
night-specific changes for the same night may share a card) and capped at
8 cards; anything beyond becomes "…and N more things" on the last card.

## Rules
- `newNight`: allow optional `themeAt`, `movedAt` (absent/null) and
  `vetoAt` (`{}`); hosting with a theme doesn't need `themeAt` (the "is
  hosting" card mentions the theme).
- time change: `changed.hasOnly(['startsAt', 'movedAt'])`, and if `movedAt`
  is written it equals `request.time`.
- theme change: `changed.hasOnly(['theme', 'themeAt'])`, `themeAt == request.time` when written.
- veto: `changed.hasOnly(['vetoes', 'vetoAt'])`; the same single key is the
  only one that may change in `vetoAt`; when set it equals `request.time`,
  when the veto is cleared its `vetoAt` entry is cleared too.
- Old night docs (none of these fields) keep working everywhere (`.get()`).

## The walkthrough
- Generalise `tour.js` so the card overlay takes a list of steps (title,
  body, optional inert demo html, optional "Show me" target) plus a label
  ("How it works" / "Since you last looked"). How it works keeps its exact
  copy and behaviour (and its e2e).
- On load, once the data is ready and there are news items, the activity
  walkthrough opens by itself — once per visit, never on top of How it works
  or a reel/reveal (it waits; the reveal waits for it). Each card: a headline,
  a line of detail, a small visual where it helps (poster for a lock / new
  movie / watched, name chips for free marks, a theme chip, a struck title for
  a veto), and **Show me**, which closes the cards and scrolls to the section.
- Last card: **Got it** marks everything seen (`savePrefs({ lastSeen: true })`,
  as the banner's Got it does today). Skip/Esc also count as seen.
- The `#news` section stays as a slim bar: "N updates since Tue · Walk me
  through · Got it" so the cards can be reopened. Same a11y as the tour
  (dialog, focus in, Tab trapped, Esc, focus restored, reduced motion).

## Keeping it complete (the guard)
- `logic.js` exports `NEWS_KINDS` (every kind `sinceLastLook` can produce).
- `tests/news.test.mjs` (pure, no emulator):
  - every key of `makeActions(fakeDb, fakeF)` must be classified in the test
    as either **announced** (→ the news kind it produces) or **quiet** (with a
    one-line reason, e.g. `savePrefs: personal settings`, `checkHostKey:
    owner check, no change`). An unclassified action fails with a message
    telling the next developer to add a news kind or mark it quiet.
  - every announced kind has a fixture proving `sinceLastLook` produces it,
    and every `NEWS_KINDS` entry is produced by some fixture.
  - server-side writes (`lib/tick.js`: lock, done) map to `locked` / `watched`.
- README: a short "Since you last looked" paragraph stating the rule: any new
  kind of change must show up here or be marked quiet in `tests/news.test.mjs`.
