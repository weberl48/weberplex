"""The golden scenario: one realistic stretch of Weberplex, driven the way the
group uses it, against the local Firestore emulator only.

Run:  PYTHONIOENCODING=utf-8 python .improve/scenario.py <out-dir> [seed]

It resets the emulator, seeds one deterministic group (seed picks the movies,
thumbs and theme), then drives three phones:

  1. Gma, a newcomer: opens the link cold on a 360 px phone, walks the tour,
     sees the reveal, thumbs-up a movie (which asks her name), and says she's
     coming to Friday's night. Her first screens again at 200% text.
  2. Jo, a regular: comes back a day later; the reveal of the locked night
     (the signature moment, captured as timed frames), her ticket, then the
     "since you last looked" cards.
  3. Hal, a host: hosts an open evening from the hosting slip.

Every step is screenshotted and timed (timings.json); page errors and console
errors go to console.json; captions to transcript.md. Math.random is seeded in
the page so tie reels are comparable across runs.

What this can't observe: real Android Chrome and TalkBack, Google Messages'
link preview, the hand-off to Google Calendar, real network latency to
Firestore, the daily cron and Home Assistant.
"""
import base64
import functools
import http.server
import json
import random
import sys
import threading
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright

SITE = 'http://localhost:5173'
EMU = 'http://127.0.0.1:8181'
PROJECT = 'speakeasy-picture-show'
DOCS = f'/v1/projects/{PROJECT}/databases/(default)/documents'
KEY = 'loop-host-key-0123456789abcdef'
TZ = ZoneInfo('America/New_York')
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '.improve/evidence/scratch')
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 1
OUT.mkdir(parents=True, exist_ok=True)

POOL = [  # real films (Cinemeta posters), with genres; the seed picks the shelf
    ('tt0073195', 'Jaws', '1975', '124 min', '8.1', ['Adventure', 'Thriller']),
    ('tt0078748', 'Alien', '1979', '117 min', '8.5', ['Horror', 'Sci-Fi']),
    ('tt2278388', 'The Grand Budapest Hotel', '2014', '99 min', '8.1', ['Comedy', 'Drama']),
    ('tt1109624', 'Paddington', '2014', '95 min', '7.3', ['Comedy', 'Family']),
    ('tt0083658', 'Blade Runner', '1982', '117 min', '8.1', ['Drama', 'Sci-Fi']),
    ('tt6751668', 'Parasite', '2019', '132 min', '8.5', ['Drama', 'Thriller']),
    ('tt0435761', 'Toy Story 3', '2010', '103 min', '8.3', ['Animation', 'Comedy']),
    ('tt0109830', 'Forrest Gump', '1994', '142 min', '8.8', ['Drama', 'Romance']),
    ('tt0245429', 'Spirited Away', '2001', '125 min', '8.6', ['Animation', 'Fantasy']),
    ('tt1375666', 'Inception', '2010', '148 min', '8.8', ['Action', 'Sci-Fi']),
]
PEOPLE = [('jo', 'Jo'), ('sam', 'Sam'), ('kim', 'Kim'), ('fran', 'Fran'), ('hal', 'Hal')]
PITCHES = ['Best on a big screen', 'Trust me on this one', 'Perfect for a cold night', '']  # none name a movie: any can land on any card


def emu(method, path, body=None):
    req = urllib.request.Request(f'{EMU}{path}', method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', 'Authorization': 'Bearer owner'})
    with urllib.request.urlopen(req) as r:
        return r.read()


def fields(obj):
    def val(x):
        if x is None:
            return {'nullValue': None}
        if isinstance(x, bool):
            return {'booleanValue': x}
        if isinstance(x, datetime):
            return {'timestampValue': x.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')}
        if isinstance(x, list):
            return {'arrayValue': {'values': [val(i) for i in x]}}
        if isinstance(x, dict):
            return {'mapValue': {'fields': fields(x)}}
        if isinstance(x, int):
            return {'integerValue': str(x)}
        return {'stringValue': str(x)}
    return {k: val(v) for k, v in obj.items()}


def put(path, obj):
    emu('PATCH', f'{DOCS}/{path}', {'fields': fields(obj)})


def day_at(days, hour=20):
    d = datetime.now(TZ).replace(hour=hour, minute=0, second=0, microsecond=0) + timedelta(days=days)
    return d.strftime('%Y-%m-%d'), d


def seed_group(rng):
    emu('DELETE', f'/emulator/v1/projects/{PROJECT}/databases/(default)/documents')
    emu('POST', f'{DOCS}/config?documentId=host', {'fields': {'key': {'stringValue': KEY}}})
    now = datetime.now(timezone.utc)
    week = now - timedelta(days=7)
    yesterday = now - timedelta(days=1)
    for key, name in PEOPLE:
        put(f'people/{key}', {'name': name, 'at': week, 'toured': True, 'lastSeen': yesterday if key == 'jo' else now})
    picks = rng.sample(POOL, 8)
    voted = set()
    shelf, past = picks[:7], picks[7]
    for i, (imdb, title, year, runtime, rating, genres) in enumerate(shelf):
        by_key, by_name = PEOPLE[i % len(PEOPLE)]
        put(f'movies/{imdb}', {
            'imdbId': imdb, 'title': title, 'year': year, 'runtime': runtime, 'rating': rating, 'genres': genres,
            'poster': f'https://images.metahub.space/poster/small/{imdb}/img', 'trailer': '',
            'description': f'{title} ({year}). A film the group keeps talking about.',
            'pitch': rng.choice(PITCHES), 'shelf': ['Foreign'] if imdb in ('tt6751668', 'tt0245429') else [],
            'by': by_key, 'byName': by_name, 'at': yesterday + timedelta(hours=2) if i == 6 else week})
        for key, name in PEOPLE:
            if rng.random() < 0.45:
                voted.add((imdb, key))
                put(f'votes/{imdb}__{key}', {'movie': imdb, 'title': title, 'nameKey': key, 'name': name, 'at': week})
            if rng.random() < 0.2:
                put(f'seen/{imdb}__{key}', {'movie': imdb, 'nameKey': key, 'name': name, 'at': week})
    # Friday-ish: a night two days out, hosted by Hal and already locked, to the
    # movie the pick rule gives: most thumbs from the people coming (first on ties).
    lday, lstart = day_at(2)
    coming = {'hal', 'jo', 'sam'}
    lmovie = max(shelf, key=lambda m: sum(1 for k in coming if (m[0], k) in voted))
    for key, name in (('hal', 'Hal'), ('jo', 'Jo'), ('sam', 'Sam')):
        put(f'free/{lday}__{key}', {'day': lday, 'nameKey': key, 'name': name, 'at': week})
    put(f'nights/{lday}', {
        'day': lday, 'startsAt': lstart, 'host': 'Hal', 'hostKey': 'hal', 'status': 'locked', 'createdAt': week,
        'theme': '', 'vetoes': {}, 'lockedTie': [], 'lockedMovieId': lmovie[0], 'lockedAt': now - timedelta(hours=3),
        'lockedMovie': {'imdbId': lmovie[0], 'title': lmovie[1], 'year': lmovie[2], 'poster': f'https://images.metahub.space/poster/small/{lmovie[0]}/img',
                        'runtime': lmovie[3], 'rating': lmovie[4], 'genres': lmovie[5], 'trailer': ''}})
    put(f'nights/{lday}/snacks/hal', {'item': 'Popcorn', 'nameKey': 'hal', 'name': 'Hal', 'at': yesterday + timedelta(hours=3)})
    # A planned night nine days out, hosted by Sam, maybe themed; created after Jo last looked.
    pday, pstart = day_at(9)
    theme = rng.choice(['Drama', 'Comedy', ''])
    put(f'free/{pday}__sam', {'day': pday, 'nameKey': 'sam', 'name': 'Sam', 'at': yesterday + timedelta(hours=4)})
    put(f'free/{pday}__kim', {'day': pday, 'nameKey': 'kim', 'name': 'Kim', 'at': yesterday + timedelta(hours=5)})
    put(f'nights/{pday}', {
        'day': pday, 'startsAt': pstart, 'host': 'Sam', 'hostKey': 'sam', 'status': 'planned', 'createdAt': yesterday + timedelta(hours=4),
        'theme': theme, 'themeAt': yesterday + timedelta(hours=4) if theme else None, 'vetoes': {}, 'lockedTie': [],
        'lockedMovieId': None, 'lockedMovie': None, 'lockedAt': None, 'finishedAt': None})
    # A night watched last week, with reviews; Jo was there and hasn't rated it.
    wday, wstart = day_at(-6)
    put(f'free/{wday}__jo', {'day': wday, 'nameKey': 'jo', 'name': 'Jo', 'at': week - timedelta(days=2)})
    put(f'free/{wday}__fran', {'day': wday, 'nameKey': 'fran', 'name': 'Fran', 'at': week - timedelta(days=2)})
    put(f'nights/{wday}', {
        'day': wday, 'startsAt': wstart, 'host': 'Fran', 'hostKey': 'fran', 'status': 'done', 'createdAt': week - timedelta(days=3),
        'theme': '', 'vetoes': {}, 'lockedTie': [], 'lockedMovieId': past[0], 'lockedAt': week - timedelta(days=1),
        'finishedAt': yesterday + timedelta(hours=1),
        'lockedMovie': {'imdbId': past[0], 'title': past[1], 'year': past[2], 'poster': f'https://images.metahub.space/poster/small/{past[0]}/img',
                        'runtime': past[3], 'rating': past[4], 'genres': past[5], 'trailer': ''}})
    put(f'nights/{wday}/reviews/fran', {'stars': 4, 'line': 'Loved it, the ending got me.', 'nameKey': 'fran', 'name': 'Fran', 'at': yesterday + timedelta(hours=6)})
    # A few free evenings around the calendar.
    for d, key, name in ((3, 'kim', 'Kim'), (4, 'fran', 'Fran'), (4, 'jo', 'Jo'), (11, 'hal', 'Hal')):
        k, _ = day_at(d)
        put(f'free/{k}__{key}', {'day': k, 'nameKey': key, 'name': name, 'at': yesterday + timedelta(hours=7)})
    return {'locked_day': lday, 'locked_title': lmovie[1], 'planned_day': pday, 'theme': theme, 'watched': past[1]}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def ensure_site():
    try:
        urllib.request.urlopen(SITE, timeout=1)
        return
    except OSError:
        pass
    public = Path(__file__).resolve().parent.parent / 'public'
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 5173), functools.partial(Quiet, directory=str(public)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()


SEEDED_RANDOM = """(() => { let a = %d >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();"""

timings, transcript, console = [], [], []


# Page-side marks (ms since navigation): when the reveal or reel mounts, when How it works
# rises, and when the load curtain is gone.
MARKS = """(() => { const t = () => Math.round(performance.now()); let seen = false;
  new MutationObserver(() => {
    if (!window.__revealAt && document.querySelector('.reveal-overlay, .reel-overlay')) window.__revealAt = t();
    if (!window.__tourAt && document.querySelector('.tour-overlay')) window.__tourAt = t();
    if (document.querySelector('.curtain')) seen = true;
    else if (seen && !window.__curtainGone) window.__curtainGone = t();
  }).observe(document, { subtree: true, childList: true });
})();"""


class Phone:
    def __init__(self, browser, who, width, height, dsf, me=None):
        self.who = who
        self.ctx = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=dsf, is_mobile=True,
                                       has_touch=True, timezone_id='America/New_York', locale='en-US')
        self.ctx.add_init_script(SEEDED_RANDOM % SEED)
        self.ctx.add_init_script(MARKS)
        if me:
            self.ctx.add_init_script("localStorage.setItem('ps.me', JSON.stringify({ name: '%s', nameKey: '%s' }))" % (me, me.lower()))
        self.page = self.ctx.new_page()
        self.page.on('pageerror', lambda e: console.append({'who': who, 'type': 'pageerror', 'text': str(e)}))
        self.page.on('console', lambda m: m.type in ('error', 'warning') and console.append({'who': who, 'type': m.type, 'text': m.text}))
        self.n = 0

    def settle(self):
        """Wait out smooth scrolling and entry animations before a screenshot."""
        self.page.wait_for_function("""() => new Promise((r) => { let y = scrollY, n = 0;
          const t = () => { if (scrollY === y && ++n > 3) return r(true); if (scrollY !== y) { y = scrollY; n = 0; } requestAnimationFrame(t); }; t(); })""", timeout=5000)
        self.page.wait_for_timeout(250)

    def shot(self, name, caption, full=False):
        self.settle()
        self.n += 1
        fn = f'{self.who}-{self.n:02d}-{name}.png'
        self.page.screenshot(path=str(OUT / fn), full_page=full)
        transcript.append(f'- `{fn}`: {caption}')
        return fn

    def step(self, name, act, until):
        """Time one user-visible step: from the act to the moment `until` holds."""
        t = time.perf_counter()
        act()
        until()
        ms = round((time.perf_counter() - t) * 1000)
        timings.append({'who': self.who, 'step': name, 'ms': ms})
        return ms


def reveal(phone, prefix):
    """The signature moment: frames while the card waits, then the tap, then the turn."""
    frames(phone, f'{prefix}-wait', seconds=1.2)
    # The tap, then frames straight away so the turn itself is on film; the
    # timing is the tap to the title, measured from the page's own clock.
    phone.page.evaluate("() => { window.__tap = performance.now(); new MutationObserver((m, o) => { if (document.querySelector('.reveal-title')?.textContent) { window.__titled = performance.now(); o.disconnect(); } }).observe(document.body, { subtree: true, childList: true, characterData: true }); }")
    phone.page.click('.reveal-card')
    frames(phone, f'{prefix}-turn', seconds=1.6, every=0.05)
    phone.page.wait_for_function("() => window.__titled", timeout=5000)
    timings.append({'who': phone.who, 'step': 'turn the card to title', 'ms': round(phone.page.evaluate('window.__titled - window.__tap'))})
    transcript.append(f'- reveal buttons: {phone.page.locator(".reveal-actions button").all_text_contents()}')


def frames(phone, prefix, seconds=1.8, every=0.12):
    """Timestamped key frames of an animation (the reveal)."""
    t0 = time.perf_counter()
    out = []
    while time.perf_counter() - t0 < seconds:
        ts = round((time.perf_counter() - t0) * 1000)
        fn = f'{phone.who}-{prefix}-{ts:04d}ms.png'
        phone.page.screenshot(path=str(OUT / 'frames' / fn))
        out.append(fn)
        time.sleep(every)
    transcript.append(f'- frames `{prefix}`: {", ".join(out)}')
    return out


def film(phone, prefix, act, seconds=4.2, every=0.15):
    """Film in real time with Chrome's screencast (a screenshot is too slow for a page load):
    the frames from `act` on, at most one every `every` seconds, ms since the act in the name."""
    page = phone.page
    cdp = page.context.new_cdp_session(page)
    got = []

    def on_frame(ev):
        got.append((time.perf_counter(), ev['data']))
        cdp.send('Page.screencastFrameAck', {'sessionId': ev['sessionId']})
    cdp.on('Page.screencastFrame', on_frame)
    cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 70})
    t0 = time.perf_counter()
    act()
    while time.perf_counter() - t0 < seconds:
        page.wait_for_timeout(40)
    cdp.send('Page.stopScreencast')
    out, last = [], -10_000
    for t, data in got:
        ms = round((t - t0) * 1000)
        if ms - last < every * 1000:
            continue
        last = ms
        fn = f'{phone.who}-{prefix}-{ms:04d}ms.jpg'
        (OUT / 'frames' / fn).write_bytes(base64.b64decode(data))
        out.append(fn)
    transcript.append(f'- frames `{prefix}` (screencast, ms from the tap or the link): {", ".join(out)}')
    return out


def mark(phone, step, name):
    """Record a page-side mark (ms since navigation) as a timed step."""
    ms = phone.page.evaluate(f'window.{name}')
    if ms is not None:
        timings.append({'who': phone.who, 'step': step, 'ms': round(ms)})


def visible(page, sel, timeout=20000):
    return lambda: page.locator(sel).first.wait_for(state='visible', timeout=timeout)


def text_in(page, sel, text, timeout=20000):
    return lambda: page.wait_for_function(
        "([s, t]) => { const e = document.querySelector(s); return !!e && e.textContent.includes(t); }", arg=[sel, text], timeout=timeout)


def newcomer(browser, facts):
    transcript.append('\n## Gma, a newcomer (360 px phone, no name yet)')
    g = Phone(browser, 'gma', 360, 800, 3)
    p = g.page
    film(g, 'open', lambda: p.goto(f'{SITE}/?emu'))
    visible(p, '.tour-overlay')()
    mark(g, 'open link to the curtain gone', '__curtainGone')
    mark(g, 'open link to first card', '__tourAt')
    g.shot('first-screen', 'The first thing she sees: the walkthrough sheet over the marquee.')
    for i in range(4):
        g.step(f'tour next {i + 1}', lambda: p.click('[data-tour="next"]'), lambda: p.wait_for_timeout(50))
        g.shot(f'tour-{i + 2}', f'Walkthrough card {i + 2} of 5.')
    g.step('tour done to reveal', lambda: p.click('[data-tour="done"]'), visible(p, '.reveal-overlay'))
    reveal(g, 'reveal')
    g.shot('reveal-landed', 'The reveal after it lands (signed out, once per phone): its ending.')
    # Count me in, right there: the name form, then her ticket.
    g.step('count me in from the reveal to the name form', lambda: p.click('.reveal-actions [data-r="in"]'), visible(p, '#pass'))
    g.shot('name-form', 'Count me in asks her name first.')
    p.fill('#passName', 'Gma')
    g.step('name to her ticket', lambda: p.click('#passForm button[type=submit]'), visible(p, '#next .ticket'))
    p.wait_for_timeout(600)
    g.shot('ticket', 'After her name: counted in, on her ticket.')
    g.shot('page-full', 'The whole page once she is in.', full=True)
    vote = p.locator('#shelf .card .vote:not(.on)').first
    mid = vote.get_attribute('data-id')
    vote.scroll_into_view_if_needed()
    g.shot('shelf', 'The shelf, before her first thumbs-up.')
    g.step('thumbs-up counted', lambda: vote.click(), visible(p, f'#shelf .vote[data-id="{mid}"][aria-pressed="true"]'))
    g.shot('after-vote', 'Her first thumbs-up.')
    free = p.locator('#calendar .day:not(.lead):not(.on)').nth(3)
    free.scroll_into_view_if_needed()
    g.step('tap an open evening on the calendar', lambda: free.click(), visible(p, '#dayDetail [data-action="free"]'))
    g.shot('day-panel', 'An open evening in the day panel.')
    g.step('i am free that evening', lambda: p.click('#dayDetail [data-action="free"]'), text_in(p, '#toast', 'If someone hosts'))
    g.shot('free-marked', "After I'm free that evening.")
    g.ctx.close()

    transcript.append('\n## Gma at 200% text (simulated as a 206 px viewport)')
    z = Phone(browser, 'gma200', 206, 457, 4)
    z.step('open link to first card', lambda: z.page.goto(f'{SITE}/?emu'), visible(z.page, '.tour-overlay'))
    z.shot('first-screen', 'First screen at 200% text.')
    z.page.click('[data-tour="next"]')
    z.shot('tour-2', 'Walkthrough card 2 at 200%.')
    z.page.click('[data-tour="skip"]')
    try:
        z.page.locator('.reveal-overlay').wait_for(state='visible', timeout=8000)
        z.page.wait_for_timeout(800)
        z.shot('reveal-waiting', 'The reveal waiting to be turned, at 200%.')
        z.page.click('.reveal-card')
        z.page.wait_for_timeout(1500)
        z.shot('reveal', 'The reveal turned, at 200%.')
        z.page.click('.reveal-actions button')
    except Exception as e:  # recorded, so an empty console never hides a skipped step
        transcript.append(f'- (200% reveal walk failed: {e.__class__.__name__}: {str(e)[:200]})')
        console.append({'who': 'gma200', 'type': 'scenario-failure', 'text': str(e)[:500]})
    z.page.wait_for_selector('#shelf .card', timeout=20000)
    z.shot('page-top', 'The page at 200%.')
    z.ctx.close()


def regular(browser, facts):
    transcript.append('\n## Jo, a regular, a day later (412 px phone, signed in)')
    j = Phone(browser, 'jo', 412, 915, 2.625, me='Jo')
    p = j.page
    film(j, 'open', lambda: p.goto(f'{SITE}/?emu'))
    visible(p, '.reveal-overlay')()
    mark(j, 'open link to reveal', '__revealAt')
    mark(j, 'open link to the card in view (curtain gone)', '__curtainGone')
    reveal(j, 'reveal')
    j.shot('reveal-landed', 'The reveal of the locked night, landed.')
    j.step('see my ticket', lambda: p.click('.reveal-actions button'), visible(p, '#next .ticket'))
    p.wait_for_timeout(1500)
    j.shot('ticket', 'See my ticket: the ticket in Up next, 1.5 s later.')
    if p.locator('#news:not([hidden])').count():
        p.click('#news [data-action="news-walk"]')
    try:
        j.step('news cards open', lambda: None, visible(p, '.tour-overlay', timeout=12000))
        label = p.locator('.tour-top .label').text_content()
        total = int(label.split(' of ')[-1])
        for i in range(total):
            j.shot(f'news-{i + 1}', f'Since you last looked, card {i + 1} of {total}.')
            if i < total - 1:
                p.click('[data-tour="next"]')
                p.wait_for_timeout(120)
        j.step('news got it', lambda: p.click('[data-tour="done"]'), lambda: p.locator('.tour-overlay').wait_for(state='detached'))
    except Exception as e:
        transcript.append(f'- (no news cards: {e.__class__.__name__})')
        console.append({'who': 'jo', 'type': 'scenario-failure', 'text': f'news walk: {str(e)[:500]}'})
    j.shot('page-top', 'Jo\'s page after the cards.')
    j.shot('page-full', 'Jo\'s whole page.', full=True)
    j.ctx.close()


def invitee(browser, facts):
    transcript.append('\n## Kim, who has a name and is not coming (412 px phone)')
    k = Phone(browser, 'kim', 412, 915, 2.625, me='Kim')
    p = k.page
    k.step('open link to reveal', lambda: p.goto(f'{SITE}/?emu'), visible(p, '.reveal-overlay'))
    reveal(k, 'reveal')
    k.shot('reveal-landed', 'The reveal for someone not coming: its ending.')
    k.step('count me in from the reveal', lambda: p.click('.reveal-actions [data-r="in"]'), visible(p, '#next .ticket'))
    p.wait_for_timeout(1200)
    k.shot('ticket', 'Count me in from the reveal: her ticket.')
    k.ctx.close()


def host(browser, facts):
    transcript.append('\n## Hal hosts an open evening, then locks it early (412 px phone)')
    h = Phone(browser, 'hal', 412, 915, 2.625, me='Hal')
    p = h.page
    p.goto(f'{SITE}/?emu')
    p.wait_for_selector('#shelf .card', timeout=20000)
    for _ in range(3):  # the reveal and cards he has seen before are not part of this walk
        if p.locator('.reveal-overlay').count():
            p.keyboard.press('Escape')
        if p.locator('.tour-overlay').count():
            p.click('[data-tour="skip"]')
        p.wait_for_timeout(600)
    open_day, _ = day_at(5)
    cell = p.locator(f'#calendar .day[data-day="{open_day}"]')
    cell.scroll_into_view_if_needed()
    cell.click()
    h.shot('day-panel', 'An open evening in the day panel.')
    h.step('i can host to slip', lambda: p.click('#dayDetail [data-action="host-slip"]'), visible(p, '#dayDetail .host-slip'))
    p.locator('#dayDetail').scroll_into_view_if_needed()
    h.shot('slip', 'The hosting slip.')
    h.step('put it on the marquee', lambda: p.click('#dayDetail [data-action="host"]'), text_in(p, '#toast', "It's on the marquee"))
    p.wait_for_timeout(500)
    h.shot('hosted', 'After Put it on the marquee: the toast and the day.')
    p.locator('#moreNights').scroll_into_view_if_needed()
    p.wait_for_timeout(300)
    h.shot('also-planned', 'Up next and Also planned after hosting.')
    h.ctx.close()


def main():
    ensure_site()
    rng = random.Random(SEED)
    facts = seed_group(rng)
    (OUT / 'frames').mkdir(exist_ok=True)
    started = time.perf_counter()
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for part in (newcomer, regular, invitee, host):
            try:
                part(browser, facts)
            except Exception as e:
                transcript.append(f'\n**FAILED in {part.__name__}: {e.__class__.__name__}: {str(e)[:300]}**')
                console.append({'who': part.__name__, 'type': 'scenario-failure', 'text': str(e)[:500]})
        browser.close()
    (OUT / 'timings.json').write_text(json.dumps({'seed': SEED, 'facts': facts, 'total_ms': round((time.perf_counter() - started) * 1000),
                                                   'steps': timings}, indent=1), encoding='utf-8')
    (OUT / 'console.json').write_text(json.dumps(console, indent=1), encoding='utf-8')
    (OUT / 'transcript.md').write_text(f'# Scenario run, seed {SEED}\n\nFacts: {json.dumps(facts)}\n' + '\n'.join(transcript) + '\n', encoding='utf-8')
    fails = [c for c in console if c['type'] in ('pageerror', 'scenario-failure')]
    print(f'scenario seed {SEED}: {len(timings)} timed steps, {len(fails)} failures, out {OUT}')
    for f in fails:
        print('  FAIL', f['who'], f['text'][:200])


if __name__ == '__main__':
    main()
