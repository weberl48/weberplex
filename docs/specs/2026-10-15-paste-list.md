# Paste a list onto the shelf (2026-10-15)

Shared constraints from `2026-10-13-loop-stats-fun.md` apply, plus the news
guard from `2026-10-14-activity-walkthrough.md`.

## What people see
- A **Paste a list** tab in "Add a movie" (`#addBox`), beside Search /
  Trending / New this year / For you / Surprise me.
- A textarea ("One movie per line. Add the year if you know it:
  It Follows (2014)") and **Find these**.
- A review list, one row per line, each showing the poster, title and year it
  matched and one of these states:
  - **Ready** — ticked by default.
  - **Already on the shelf** (added by X) — skipped.
  - **Already watched** — skipped.
  - **Listed twice** — kept once.
  - **Not found** — the line text stays editable, with **Try again**.
- Each Ready row has **Wrong movie?**, which offers the next few matches
  (up to 4) to choose from.
- A **Give them all my thumbs-up** toggle (on by default, matching how adding
  one movie works) and an **Add N movies** button. When it finishes, a toast
  says how many were added and the shelf shows them.

## How it works
- Parsing (`parseMovieList(text)` in logic.js, pure, unit-tested):
  - one entry per line, blank lines ignored;
  - strips numbering (`1.`, `1)`, `#1`), bullets (`-`, `*`, `•`) and
    surrounding quotes;
  - pulls a year from `Title (2014)`, `Title [2014]`, `Title 2014` and
    `Title - 2014` (a 4-digit 1900–2099 at the end);
  - returns `{ line, title, year|null }`, at most **50** (more → "Only the
    first 50 lines are used").
- Lookup: the same Cinemeta search the Search tab uses (`cinemeta.js`), one
  request per line with modest concurrency (about 4 at a time), choosing the
  best match by exact or near title and, when given, the year. A miss is
  **Not found**. The "Wrong movie?" alternatives are the other results of that
  same search.
- Adding: a new `addMovies(who, items, { thumbs })` in actions.js writes each
  movie doc exactly as `addMovie` does (same fields, and pitch `''`), plus the
  thumb when `thumbs` is on. It uses batches of at most 20 movies (a batch
  limit is 500 writes; keep it small), and skips anything that turned out to
  be on the shelf by then (someone else added it meanwhile).
  - **No rule changes.**
  - A partial failure reports what was and wasn't added.
- News: it's the existing `movies` kind ("Sam added 12 movies to the shelf",
  titles as today). Classify `addMovies` as announced `movies` in
  `tests/news.test.mjs`.
- Signed out: the tab says "Add your name first" (same `requireMe()` gate as
  other adds).

## Tests
- logic: `parseMovieList` shapes (numbering, bullets, years in each form,
  quotes, blank lines, the 50 cap, titles that contain numbers such as "2001:
  A Space Odyssey", "1917", "Se7en", "21 Jump Street").
- rules (emulator): `addMovies` adds several movies with and without thumbs,
  and skips one already on the shelf.
- e2e: paste 3 lines (one found, one already on the shelf, one nonsense) →
  the states are right → fix the nonsense line → Add → the shelf shows the new
  movies with your thumb. Mock Cinemeta in the e2e the way existing e2e search
  steps do (check how tests/e2e.py handles Cinemeta; if it uses the live API,
  keep the titles to well-known ones).
