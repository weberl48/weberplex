"""End-to-end run of the whole site against the Firestore emulator: the shelf,
the calendar, volunteering to host, locking, watching and rating.

Run: npm run test:e2e   (wraps this in the emulator; serves public/ itself
on :5173 unless something is already listening there).
Screenshots go to the first argument, default ./e2e-shots.
"""
import functools
import http.server
import json
import re
import struct
import sys
import threading
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from playwright.sync_api import expect, sync_playwright

# One phone's tap reaches another phone's screen through the emulator: on a busy machine that can take
# longer than the 5 s default, so every check that names no timeout of its own gets 15 s.
expect.set_options(timeout=15000)

SITE = 'http://localhost:5173'
EMU = 'http://127.0.0.1:8181'
PROJECT = 'speakeasy-picture-show'
DOCS = f'/v1/projects/{PROJECT}/databases/(default)/documents'
KEY = 'e2e-host-key-0123456789abcdef'
SHOTS = Path(sys.argv[1] if len(sys.argv) > 1 else 'e2e-shots')
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {'width': 390, 'height': 844}

# The film strip (the jump links) sticks to the top of the screen: "at the top"
# means just under it, or under the screen's edge once it has scrolled away.
UNDER_STRIP = """(sel) => { const s = document.querySelector('.program').getBoundingClientRect();
  const cut = s.top <= 1 ? Math.max(0, s.bottom) : 0; return document.querySelector(sel).getBoundingClientRect().top - cut; }"""


def emu(method, path, body=None, owner=False):
    headers = {'Content-Type': 'application/json'}
    if owner:
        headers['Authorization'] = 'Bearer owner'  # emulator admin: skips the rules
    req = urllib.request.Request(f'{EMU}{path}', method=method,
                                 data=json.dumps(body).encode() if body is not None else None, headers=headers)
    with urllib.request.urlopen(req) as r:
        return r.read()


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def ensure_site():
    try:
        urllib.request.urlopen(SITE, timeout=1)
        return
    except OSError:
        pass
    public = Path(__file__).resolve().parent.parent / 'public'
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 5173), functools.partial(QuietHandler, directory=str(public)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()


def reset():
    emu('DELETE', f'/emulator/v1/projects/{PROJECT}/databases/(default)/documents')
    emu('POST', f'{DOCS}/config?documentId=host', {'fields': {'key': {'stringValue': KEY}}})


def shot(page, name):
    page.screenshot(path=str(SHOTS / f'{name}.png'), full_page=True)


def skip_tour(page):
    """Skip How it works. It rises once the curtain has opened, so give it a moment."""
    try:
        page.locator('.tour-overlay').wait_for(timeout=6000)
    except Exception:
        return
    page.click('[data-tour="skip"]')


def skip_cards(page):
    """Dismiss the "Since you last looked" cards if they opened (they wait for the data, so give them a moment)."""
    try:
        page.locator('.tour-overlay').wait_for(timeout=2500)
    except Exception:
        return
    page.click('[data-tour="skip"]')


def join(page, name):
    page.goto(f'{SITE}/?emu')
    skip_tour(page)
    expect(page.locator('#pass')).to_be_visible()
    page.fill('#passName', name)
    page.click('#passForm button[type=submit]')
    expect(page.locator('#whoami')).to_contain_text(name)


def open_add(page):
    if not page.locator('#addBox').evaluate('el => el.open'):
        page.click('#addBox > summary')


def add_by_search(page, term, pitch=''):
    open_add(page)
    page.click('#browseTabs [data-tab="search"]')
    if pitch:
        page.fill('#pitch', pitch)
    page.fill('#q', term)
    page.press('#q', 'Enter')
    first = page.locator(f'#results[data-q="{term}"] .result:not(.taken)').first
    expect(first).to_be_visible(timeout=10000)
    title = first.locator('.t').inner_text()
    first.click()
    expect(page.locator('#pickMsg')).to_contain_text('Added', timeout=30000)
    return title


def card(page, title):
    return page.locator('#shelf .card', has=page.locator('h3', has_text=title)).first


def row(page, title):
    """A row of tonight's ballot in Up next, by its exact title."""
    return page.locator('#next .ballot-row', has=page.locator('.ballot-title b', has_text=re.compile(f'^{re.escape(title)}$'))).first

# ---- UI behaviour checks -----------------------------------------------------------
# Small, direct checks of how the page treats a repaint, a landscape phone, the owner
# password and a 24-character name. They run after the main flow, on fresh pages.
LONG = 'W' * 24  # the longest name there is, with nowhere to break


def tracked(browser, errors, label, **opts):
    page = browser.new_context(**opts).new_page()
    page.on('pageerror', lambda e: errors.append(f'{label}: {e}'))
    return page


def fields(obj):
    """Plain Python values as Firestore REST fields (for seeding through the emulator's admin door)."""
    def val(x):
        if isinstance(x, bool):
            return {'booleanValue': x}
        if isinstance(x, datetime):
            return {'timestampValue': x.isoformat().replace('+00:00', 'Z')}
        if isinstance(x, list):
            return {'arrayValue': {'values': [val(i) for i in x]}}
        if isinstance(x, dict):
            return {'mapValue': {'fields': fields(x)}}
        if isinstance(x, int):
            return {'integerValue': str(x)}
        return {'stringValue': x}
    return {k: val(v) for k, v in obj.items()}


def paint_checks(page):
    """paint(): untouched controls follow the new html, edited ones and the focused one stay,
    keyed chips keep focus, and a vanished control hands focus to its container."""
    page.goto(f'{SITE}/?emu')
    skip_tour(page)
    skip_cards(page)
    r = page.evaluate("""async () => {
      const { paint } = await import('/js/ui.js');
      const el = document.createElement('div');
      document.body.append(el);
      const menu = (v) => `<select id="t"><option value="">None</option><option value="a"${v === 'a' ? ' selected' : ''}>A</option><option value="b"${v === 'b' ? ' selected' : ''}>B</option></select>`;
      const t = () => el.querySelector('#t'), i = () => el.querySelector('#i');
      const out = {};
      paint(el, menu('a') + '<input id="i" value="x"><textarea id="n"></textarea>');
      paint(el, menu('b') + '<input id="i" value="y"><textarea id="n"></textarea>');
      out.followed = [t().value, i().value];            // nobody touched them: the new html wins
      t().value = 'a'; i().value = 'typed'; el.querySelector('#n').value = 'note';
      paint(el, menu('b') + '<input id="i" value="z"><textarea id="n"></textarea> ');
      out.kept = [t().value, i().value, el.querySelector('#n').value];  // edited: kept
      i().focus();
      i().value = 'z';                                   // back to its painted value, but focused
      paint(el, menu('b') + '<input id="i" value="w"><textarea id="n"></textarea>  ');
      out.focused = [document.activeElement.id, i().value];

      const chips = (extra) => '<div>' + ['Popcorn', 'Candy', 'Drinks'].map((x) => `<button type="button" data-action="quick-snack" data-day="d" data-item="${x}">${x}</button>`).join('')
        + ['Fran', 'Jo'].map((x) => `<button type="button" data-action="join" data-name="${x}">${x}</button>`).join('') + '</div>' + extra;
      paint(el, chips(''));
      el.querySelector('[data-item="Candy"]').focus();
      paint(el, chips('<p>1</p>'));
      out.chip = document.activeElement.dataset.item;
      el.querySelector('[data-name="Jo"]').focus();
      paint(el, chips('<p>2</p>'));
      out.name = document.activeElement.dataset.name;

      paint(el, '<button type="button" data-action="veto" data-id="m">Veto</button>');
      el.querySelector('[data-action="veto"]').focus();
      paint(el, '<button type="button" data-action="unveto" data-id="m">Undo veto</button>');
      out.gone = [document.activeElement === el, el.getAttribute('tabindex')];
      el.remove();
      return out;
    }""")
    assert r['followed'] == ['b', 'y'], r
    assert r['kept'] == ['a', 'typed', 'note'], r
    assert r['focused'] == ['i', 'z'], r
    assert r['chip'] == 'Candy' and r['name'] == 'Jo', r
    assert r['gone'] == [True, '-1'], r


def overlay_checks(browser, errors):
    """The reveal and the reel on a landscape phone: the OK button is in reach, and focus
    goes back to the control that had it even when a repaint replaced that control."""
    page = tracked(browser, errors, 'landscape', viewport={'width': 844, 'height': 390}, reduced_motion='reduce')
    page.goto(f'{SITE}/?emu')
    expect(page.locator('.curtain')).to_be_hidden()  # reduced motion: no curtain at all
    skip_tour(page)
    page.evaluate("""() => {
      const box = document.createElement('div');
      box.id = 'fbox';
      document.body.append(box);
      window.paintBox = async (html) => (await import('/js/ui.js')).paint(box, html);
    }""")
    veto = '<button type="button" data-action="veto" data-id="m">%s</button>'
    opens = {
        'reveal': ("""import('/js/reveal.js').then((m) => m.revealMovie({ title: 'The Man Who Would Be King', poster: '' }, { when: 'Fri 8 PM', place: "Jo's", people: '5 coming: you, Gma, Hal, Jo and Sam', why: 'Hal, Jo and you thumbed it up' }))""", '.reveal-overlay .reveal-actions'),
        'reel': ("""import('/js/reel.js').then((m) => { const ms = [{ title: 'A', poster: '' }, { title: 'B', poster: '' }]; return m.spinReel(ms, ms[1], { title: '2-way tie. The reel decides…', invite: true, when: 'Fri 8 PM', place: "Jo's", people: '5 coming: you, Gma, Hal, Jo and Sam', why: 'Won the reel over A' }); })""", '.reel-overlay'),
    }
    for name, (open_js, overlay) in opens.items():
        page.evaluate('(h) => paintBox(h)', veto % 'Veto')
        page.focus('#fbox [data-action="veto"]')
        page.evaluate(f'() => {{ {open_js}; }}')
        if name == 'reveal':
            page.click('.reveal-card')  # the card waits face down until it's turned
        expect(page.locator(f'{overlay} button').first).to_be_visible()
        if name == 'reel':  # a tie lands like the reveal: the title finishes the heading, the people, what it beat, the same endings
            expect(page.locator('.reel-overlay h2')).to_have_text('2-way tie. The reel decides…')
            expect(page.locator('.reel-overlay .reveal-why')).to_have_text('Won the reel over A')
            expect(page.locator('.reel-overlay .reel-result')).to_have_text('B')
            expect(page.locator('.reel-overlay .reveal-who')).to_have_text('5 coming: you, Gma, Hal, Jo and Sam')
            expect(page.locator('.reel-overlay .reveal-actions button')).to_have_text(['Count me in', 'Not this time'])
        fits = page.evaluate('(s) => { const o = document.querySelector(s).closest(".reveal-overlay, .reel-overlay"); return o.scrollHeight <= o.clientHeight; }', overlay)
        assert fits, f'{name} overlay is taller than a landscape phone'
        shot(page, f'06-landscape-{name}')
        # A repaint under the overlay replaces the Veto button (same key, new node).
        page.evaluate('(h) => paintBox(h)', veto % 'Undo veto')
        page.click(f'{overlay} button', timeout=3000)  # in reach without scrolling the page
        expect(page.locator('.reveal-overlay, .reel-overlay')).to_have_count(0)
        expect(page.locator('#fbox [data-action="veto"]')).to_be_focused()
    # A title too long for the screen: the content is taller than the overlay, and the overlay
    # scrolls so the OK button still comes into reach.
    page.evaluate("""() => { import('/js/reveal.js').then((m) => m.revealMovie({ title: 'The Incredibly Long and Winding Title of a Movie That Nobody Could Fit on a Phone Held Sideways '.repeat(4), poster: '' }, { when: 'Fri 8 PM', place: "Jo's" })); }""")
    page.click('.reveal-card')
    expect(page.locator('.reveal-actions button')).to_be_visible()
    assert page.evaluate("() => { const o = document.querySelector('.reveal-overlay'); return o.scrollHeight > o.clientHeight + 100; }")
    page.click('.reveal-actions button', timeout=3000)
    expect(page.locator('.reveal-overlay')).to_have_count(0)
    page.context.close()


def owner_gate_checks(browser, errors):
    """A wrong password never shows the owner sections, typed or from #k=, and the page says it is checking."""
    for how in ('typed', 'link'):
        page = tracked(browser, errors, f'gate-{how}')
        page.add_init_script("""
          window.__seen = { leaked: false, msgs: [] };
          new MutationObserver(() => {
            const sec = document.getElementById('seasonSec');
            if (sec && !sec.hidden) window.__seen.leaked = true;
            const m = document.getElementById('keyMsg')?.textContent;
            if (m && !window.__seen.msgs.includes(m)) window.__seen.msgs.push(m);
          }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });""")
        if how == 'typed':
            page.goto(f'{SITE}/host.html?emu')
            expect(page.locator('#keySec')).to_be_visible(timeout=10000)
            page.fill('#keyInput', 'not-the-password-123')
            page.click('#keyForm button[type=submit]')
        else:
            page.goto(f'{SITE}/host.html?emu#k=not-the-password-123')
        expect(page.locator('#keyMsg')).to_contain_text('didn’t open the booth', timeout=10000)
        expect(page.locator('#keySec')).to_be_visible()
        seen = page.evaluate('window.__seen')
        assert not seen['leaked'], f'{how}: owner sections showed before the password was checked'
        assert 'Checking…' in seen['msgs'], (how, seen)
        page.context.close()


def owner_guard_checks(browser, errors):
    """Two taps in the same breath do one write: a house pick stays added, a password change stays changed."""
    page = tracked(browser, errors, 'guard', viewport={'width': 900, 'height': 1000})
    page.goto(f'{SITE}/host.html?emu#k={KEY}')
    expect(page.locator('#seasonSec')).to_be_visible(timeout=10000)
    page.fill('#houseQ', 'blade runner')
    page.click('#houseForm button[type=submit]')
    expect(page.locator('#houseResults .result:not(.taken)').first).to_be_visible(timeout=10000)
    page.evaluate("() => { const b = document.querySelector('#houseResults .result:not(.taken)'); b.click(); b.click(); }")
    expect(page.locator('#houseMsg')).to_contain_text('as a house pick', timeout=15000)
    page.wait_for_timeout(1500)
    expect(page.locator('#houseMsg')).to_contain_text('as a house pick')  # not "refused" from the second tap
    expect(page.locator('#houseMsg')).to_have_class(re.compile(r'\bgood\b'))
    page.fill('#pwInput', 'e2e-new-password-1')
    page.evaluate("() => { const f = document.getElementById('pwForm'); f.requestSubmit(); f.requestSubmit(); }")
    expect(page.locator('#pwMsg')).to_contain_text('Password changed', timeout=10000)
    page.wait_for_timeout(1500)
    expect(page.locator('#pwMsg')).to_contain_text('Password changed')  # the second tap didn't use the old password
    expect(page.locator('#pwMsg')).to_have_class(re.compile(r'\bgood\b'))
    page.context.close()


def long_name_checks(browser, errors):
    """A 24-character name with no spaces never widens the page at phone width."""
    now = datetime.now(timezone.utc)
    key = LONG.lower()
    day = (now - timedelta(days=2)).strftime('%Y-%m-%d')
    movie = {'imdbId': 'tt9990001', 'title': 'Long Name Movie', 'year': '2001', 'poster': '', 'runtime': '', 'rating': '',
             'genres': [], 'trailer': '', 'description': ''}
    emu('PATCH', f'{DOCS}/movies/tt9990002', {'fields': fields({
        **movie, 'imdbId': 'tt9990002', 'title': LONG, 'poster': f'{SITE}/img/og.png', 'pitch': '', 'shelf': [], 'by': key, 'byName': LONG, 'at': now})}, owner=True)
    emu('PATCH', f'{DOCS}/nights/{day}', {'fields': fields({
        'day': day, 'startsAt': now - timedelta(days=2), 'host': LONG, 'hostKey': key, 'status': 'done', 'createdAt': now,
        'lockedMovieId': 'tt9990001', 'lockedMovie': movie, 'lockedTie': [], 'lockedAt': now, 'finishedAt': now,
        'theme': '', 'vetoes': {}})}, owner=True)
    emu('PATCH', f'{DOCS}/nights/{day}/reviews/{key}', {'fields': fields({
        'stars': 4, 'line': '', 'nameKey': key, 'name': LONG, 'at': now})}, owner=True)
    wide = 'document.documentElement.scrollWidth - document.documentElement.clientWidth'
    page = tracked(browser, errors, 'long-guest', viewport=PHONE)
    page.goto(f'{SITE}/?emu')
    # The curtain on every load: closed, it takes the taps while the page loads; it parts once
    # the page is ready (never later than 2.5 s) and is gone about 1.3 s after that.
    closed = page.evaluate("(() => { const c = document.querySelector('.curtain'); return c && !c.classList.contains('open') ? getComputedStyle(c).pointerEvents : 'already open'; })()")
    assert closed in ('auto', 'already open'), closed
    expect(page.locator('.curtain')).to_have_count(0, timeout=4500)
    # It's for arriving: a reload (or a trip back from Stremio) doesn't play it again.
    page.reload(wait_until='commit')
    page.wait_for_selector('body')
    assert page.locator('.curtain').count() == 0, 'no curtain on a reload'
    skip_tour(page)
    expect(page.locator('#past .past-row .d', has_text=LONG)).to_have_count(1, timeout=10000)
    expect(page.locator('#rateBox .review .who span:first-child', has_text=LONG)).to_have_count(1)
    over = page.evaluate(wide)
    assert over <= 0, f'guest page is {over}px too wide'
    shot(page, '07-long-name-guest')
    page.context.close()
    # Someone who wasn't there reads the review but isn't asked to rate the night.
    emu('PATCH', f'{DOCS}/people/noor', {'fields': fields({'name': 'Noor', 'at': now, 'toured': True, 'lastSeen': now})}, owner=True)
    page = as_person(browser, errors, 'noor', 'Noor')
    page.goto(f'{SITE}/?emu')
    expect(page.locator('#rateBox .review .who span:first-child', has_text=LONG)).to_have_count(1, timeout=10000)
    expect(page.locator('#rateBox [data-star]')).to_have_count(0)
    page.context.close()
    page = tracked(browser, errors, 'long-owner', viewport=PHONE)
    page.goto(f'{SITE}/host.html?emu#k={KEY}')
    expect(page.locator('#shelfList .pick-opt', has_text=LONG)).to_have_count(1, timeout=10000)
    over = page.evaluate(wide)
    assert over <= 0, f'owner console is {over}px too wide'
    page.context.close()


def as_person(browser, errors, label, name):
    """A phone that is already signed in as `name` (like a returning guest)."""
    ctx = browser.new_context(viewport=PHONE)
    ctx.add_init_script("try { localStorage.setItem('ps.me', JSON.stringify({ name: '%s', nameKey: '%s' })); } catch (e) {}"
                        % (name, name.lower()))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'{label}: {e}'))
    return page


def ballot_checks(browser, errors):
    """Tonight's ballot on four phones. Cal hosts a Ballot-themed night (so only the seven movies seeded here
    can be picked) and Ana and Ben are coming; Eve is not, yet. Seven movies, thumbs from the people coming
    rank them: the top five make the ballot, with Ballot One unseen-by-nobody (Ben has seen it). Votes (one
    each, moved in one tap, undone), a write-in (added, swapped, taken back), a vote that beats thumbs,
    Eve counting in, voting and dropping out (her vote and write-in leave with her), and the lock: the vote
    winner, with the tally on the locked card and in the reveal. Then a second night with no votes, where the
    most-thumbed movie wins. Everything seeded here is taken out again at the end."""
    now = datetime.now(timezone.utc)
    day = (now + timedelta(days=9)).strftime('%Y-%m-%d')
    day2 = (now + timedelta(days=10)).strftime('%Y-%m-%d')
    stamp = now - timedelta(days=3)
    keys = ['ana', 'ben', 'cal', 'eve']
    ids = [f'tt999100{i}' for i in range(1, 8)]
    titles = ['Ballot One', 'Ballot Two', 'Ballot Three', 'Ballot Four', 'Ballot Five', 'Ballot Six', 'Ballot Seven']
    thumbs = {0: ['ana', 'ben', 'cal'], 1: ['ana', 'ben'], 2: ['cal'], 3: ['ana'], 4: ['ben']}  # Six and Seven have none
    docs = []

    def seed(path, data):
        docs.append(path)
        emu('PATCH', f'{DOCS}/{path}', {'fields': fields(data)}, owner=True)

    for k in keys:
        # (Last looked an hour from now: nothing counts as news, so no cards open over the taps below.)
        seed(f'people/{k}', {'name': k.title(), 'at': now, 'toured': True, 'lastSeen': now + timedelta(hours=1)})
    for i, (mid, title) in enumerate(zip(ids, titles)):
        seed(f'movies/{mid}', {'imdbId': mid, 'title': title, 'year': '2001', 'poster': '', 'runtime': '100 min', 'rating': '', 'genres': ['Ballot'],
                               'trailer': '', 'description': '', 'pitch': '', 'shelf': [], 'by': 'cal', 'byName': 'Cal', 'at': stamp})
        for k in thumbs.get(i, []):
            seed(f'votes/{mid}__{k}', {'movie': mid, 'title': title, 'nameKey': k, 'name': k.title(), 'at': stamp})
    seed(f'seen/{ids[0]}__ben', {'movie': ids[0], 'nameKey': 'ben', 'name': 'Ben', 'at': stamp})

    def night(d, offset):
        for k in ('ana', 'ben', 'cal'):
            seed(f'free/{d}__{k}', {'day': d, 'nameKey': k, 'name': k.title(), 'at': stamp})
        seed(f'nights/{d}', {'day': d, 'startsAt': now + timedelta(days=offset), 'host': 'Cal', 'hostKey': 'cal', 'status': 'planned',
                             'createdAt': now - timedelta(days=2), 'theme': 'Ballot', 'vetoes': {}, 'ballotVotes': {}, 'writeIns': {}, 'lockedTie': []})
    night(day, 9)

    pages = {k: as_person(browser, errors, k, k.title()) for k in keys}
    ana, ben, cal, eve = (pages[k] for k in keys)
    for page in pages.values():
        page.goto(f'{SITE}/?emu')
    for page in (ana, ben, cal):
        expect(page.locator('#next .ballot-row')).to_have_count(5, timeout=20000)

    # The ballot: thumbs from the people coming rank it (a tie at one thumb falls to title), the top five.
    order = lambda page: page.locator('#next .ballot-row .ballot-title b').all_inner_texts()
    assert order(ana) == ['Ballot One', 'Ballot Two', 'Ballot Five', 'Ballot Four', 'Ballot Three'], order(ana)
    expect(ana.locator('#next .ballot-row').first.locator('.ballot-title .v')).to_contain_text('3')
    expect(ana.locator('#next .ballot-tag', has_text='Nobody coming has seen it')).to_have_count(4)  # Ben has seen One
    expect(row(ana, titles[0])).not_to_contain_text('Nobody coming has seen it')
    expect(ana.locator('#next .ballot-row', has_text='No votes yet')).to_have_count(5)
    expect(ana.locator('#next .ballot-votes').first).to_have_text('No votes yet')
    shot(ana, '03b-ballot')
    # Everything about the ballot reads right at phone width.
    over = ana.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    assert over <= 0, f'ballot page is {over}px too wide'

    # Eve is not coming yet: she sees the ballot but can't vote or write in, and is told how.
    expect(eve.locator('#next .ballot-row')).to_have_count(5, timeout=20000)
    expect(eve.locator('#next [data-action="ballot-vote"]')).to_have_count(0)
    expect(eve.locator('#next .writein')).to_have_count(0)
    expect(eve.locator('#next .night-card')).to_contain_text('Count yourself in to vote, veto a movie and call a snack')

    # Ana votes for Two, then moves it to Four: one vote each, moved in one tap.
    row(ana, titles[1]).locator('[data-action="ballot-vote"]').click()
    expect(ana.locator('#toast')).to_contain_text(f'Voted for {titles[1]}', timeout=10000)
    expect(row(ana, titles[1])).to_contain_text('1 vote: you')
    expect(row(ana, titles[1]).locator('[data-action="ballot-vote"]')).to_have_attribute('aria-pressed', 'true')
    expect(row(ben, titles[1])).to_contain_text('1 vote: Ana', timeout=10000)
    row(ana, titles[3]).locator('[data-action="ballot-vote"]').click()
    expect(ana.locator('#toast')).to_contain_text(f'Moved your vote to {titles[3]}', timeout=10000)
    expect(row(ana, titles[1])).to_contain_text('No votes yet')
    expect(row(ana, titles[3])).to_contain_text('1 vote: you')
    expect(ana.locator('#next [data-action="ballot-vote"][aria-pressed="true"]')).to_have_count(1)
    expect(row(ben, titles[3])).to_contain_text('1 vote: Ana', timeout=10000)
    # Tapping your own vote again takes it back (and Ana can vote again after).
    row(ana, titles[3]).locator('[data-action="ballot-vote"]').click()
    expect(ana.locator('#toast')).to_contain_text('Vote taken back', timeout=10000)
    expect(row(ana, titles[3])).to_contain_text('No votes yet')
    row(ana, titles[3]).locator('[data-action="ballot-vote"]').click()
    expect(row(ana, titles[3])).to_contain_text('1 vote: you', timeout=10000)
    # Ben votes for Four too, Cal for Two: Four leads 2-1 with one thumb against Two's two. Votes beat thumbs.
    row(ben, titles[3]).locator('[data-action="ballot-vote"]').click()
    expect(ben.locator('#toast')).to_contain_text(f'Voted for {titles[3]}', timeout=10000)
    row(cal, titles[1]).locator('[data-action="ballot-vote"]').click()
    expect(cal.locator('#toast')).to_contain_text(f'Voted for {titles[1]}', timeout=10000)
    expect(row(cal, titles[3])).to_contain_text('2 votes: Ana and Ben', timeout=10000)
    expect(row(ana, titles[3])).to_contain_text('2 votes: you and Ben')
    expect(row(ana, titles[1])).to_contain_text('1 vote: Cal', timeout=10000)
    expect(ana.locator('#next .pick-now')).to_contain_text(titles[3])
    expect(ana.locator('#next .pick-now')).to_contain_text('Leading the vote with 2 votes')
    expect(ana.locator('#board')).to_contain_text(f'Leading: {titles[3]}')
    shot(cal, '03c-ballot-votes')

    # A write-in: Ana searches the shelf for Six (off the ballot: no thumbs), puts it on, swaps it for
    # Seven, and takes it back. Everyone sees whose pick it is.
    ana.click('#next [data-action="writein-open"]')
    expect(ana.locator('#writeInQ')).to_be_focused()
    ana.fill('#writeInQ', 'six')
    expect(ana.locator('#next .writein-list li')).to_have_count(1)
    expect(ana.locator('#writeInQ')).to_be_focused()  # typing keeps the field, even as the list repaints
    ana.locator('#next .writein-list [data-action="writein"]').click()
    expect(ana.locator('#toast')).to_contain_text(f'Put {titles[5]} on the ballot', timeout=10000)
    expect(ana.locator('#next .ballot-row')).to_have_count(6)
    expect(row(ana, titles[5])).to_contain_text('Your pick')
    expect(row(ben, titles[5])).to_contain_text('Ana’s pick', timeout=10000)
    expect(row(ben, titles[5])).to_contain_text('No votes yet')
    expect(ana.locator('#next .writein')).to_contain_text(f'Your pick: {titles[5]}')
    expect(ana.locator('#writeInQ')).to_have_count(0)  # the search closed itself
    ana.click('#next [data-action="writein-open"]')
    ana.fill('#writeInQ', 'seven')
    ana.locator('#next .writein-list [data-action="writein"]').click()
    expect(ana.locator('#toast')).to_contain_text(f'Swapped your pick for {titles[6]}', timeout=10000)
    expect(row(ben, titles[6])).to_contain_text('Ana’s pick', timeout=10000)
    expect(ben.locator('#next .ballot-row .ballot-title b', has_text=titles[5])).to_have_count(0)  # Six dropped off with the swap
    expect(ben.locator('#next .ballot-row')).to_have_count(6)
    shot(ben, '03d-ballot-writein')
    ana.click('#next [data-action="writein-undo"]')
    expect(ana.locator('#toast')).to_contain_text('Took your pick off the ballot', timeout=10000)
    expect(ben.locator('#next .ballot-row')).to_have_count(5, timeout=10000)
    # A vote keeps a movie on the ballot even after its write-in goes: Ben votes for Seven's search result
    # and it stays when the write-in is gone; then he takes it back.
    ben.click('#next [data-action="writein-open"]')
    ben.fill('#writeInQ', 'seven')
    ben.locator('#next .writein-list [data-action="writein"]').click()
    expect(row(cal, titles[6])).to_contain_text('Ben’s pick', timeout=10000)
    row(ben, titles[6]).locator('[data-action="ballot-vote"]').click()  # moves his vote from Four to Seven
    expect(row(ben, titles[6])).to_contain_text('1 vote: you', timeout=10000)
    ben.click('#next [data-action="writein-undo"]')
    expect(row(cal, titles[6])).not_to_contain_text('Ben’s pick', timeout=10000)
    expect(row(cal, titles[6])).to_contain_text('1 vote: Ben')  # still on: it holds a vote
    row(ben, titles[6]).locator('[data-action="ballot-vote"]').click()  # back off Seven...
    expect(ben.locator('#toast')).to_contain_text('Vote taken back', timeout=10000)  # (sent: the next tap is a new one)
    expect(ben.locator('#next .ballot-row')).to_have_count(5, timeout=10000)
    row(ben, titles[3]).locator('[data-action="ballot-vote"]').click()  # ...and onto Four again
    expect(row(cal, titles[3])).to_contain_text('2 votes: Ana and Ben', timeout=10000)

    # Eve counts in, votes for Three and writes in Six; then she drops out (a second tap): her vote and
    # her write-in leave with her, on everyone's phone.
    eve.click('#next [data-action="free"]')
    expect(eve.locator('#next [data-action="ballot-vote"]').first).to_be_visible(timeout=10000)
    row(eve, titles[2]).locator('[data-action="ballot-vote"]').click()
    expect(row(ben, titles[2])).to_contain_text('1 vote: Eve', timeout=10000)
    eve.click('#next [data-action="writein-open"]')
    eve.fill('#writeInQ', 'six')
    eve.locator('#next .writein-list [data-action="writein"]').click()
    expect(row(ben, titles[5])).to_contain_text('Eve’s pick', timeout=10000)
    drop = eve.locator('#next .rsvp-row [data-action="free"]')
    drop.click()
    expect(drop).to_have_text('Tap again: can’t make it')
    drop.click()
    expect(eve.locator('#toast')).to_contain_text('off the list', timeout=10000)
    expect(row(ben, titles[2])).to_contain_text('No votes yet', timeout=10000)
    expect(ben.locator('#next .ballot-row .ballot-title b', has_text=titles[5])).to_have_count(0, timeout=10000)
    expect(eve.locator('#next [data-action="ballot-vote"]')).to_have_count(0)
    night1 = json.loads(emu('GET', f'{DOCS}/nights/{day}', owner=True))['fields']
    assert set(night1['ballotVotes']['mapValue']['fields']) == {'ana', 'ben', 'cal'}, night1['ballotVotes']
    assert not night1['writeIns']['mapValue'].get('fields'), night1['writeIns']

    # The host locks it: Four wins the vote 2-1 over Two, though Two has more thumbs. The reveal says so,
    # and so does the locked card, once the card is face up.
    lock = cal.locator('#next [data-action="lock-now"]')
    lock.click()
    lock.click()
    for page in (ana, ben, cal):
        expect(page.locator('.reveal-overlay')).to_be_visible(timeout=15000)
    expect(ana.locator('#next .decided')).to_have_count(0)  # face down: nothing names the movie yet
    ana.locator('.reveal-card').click(timeout=15000)
    expect(ana.locator('.reveal-title')).to_have_text(titles[3], timeout=10000)
    expect(ana.locator('.reveal-why')).to_contain_text('won the vote, 2–1')
    ana.keyboard.press('Escape')
    expect(ana.locator('#next .decided')).to_have_text(f'{titles[3]} won the vote, 2–1')
    shot(ana, '03e-ballot-locked')
    lv = json.loads(emu('GET', f'{DOCS}/nights/{day}', owner=True))['fields']['lockedVotes']['mapValue']['fields']
    assert (lv[ids[3]]['integerValue'], lv[ids[1]]['integerValue'], lv[ids[0]]['integerValue']) == ('2', '1', '0'), lv

    # Without votes the most-thumbed wins. The first night is watched; a second one has no votes at all.
    cal.keyboard.press('Escape')  # Cal's reveal of the first night: not now
    emu('PATCH', f'{DOCS}/nights/{day}?updateMask.fieldPaths=status&updateMask.fieldPaths=finishedAt',
        {'fields': {'status': {'stringValue': 'done'}, 'finishedAt': {'timestampValue': now.isoformat().replace('+00:00', 'Z')}}}, owner=True)
    night(day2, 10)
    expect(cal.locator('#next .ballot-row').first).to_be_visible(timeout=15000)
    expect(cal.locator('#next .ballot-row .ballot-title b', has_text=titles[3])).to_have_count(0)  # Four was watched
    expect(cal.locator('#next .pick-now')).to_contain_text(titles[0])
    expect(cal.locator('#next .pick-now')).to_contain_text('No votes yet')
    lock = cal.locator('#next [data-action="lock-now"]')
    lock.click()
    lock.click()
    expect(cal.locator('.reveal-overlay')).to_be_visible(timeout=15000)
    cal.locator('.reveal-card').click(timeout=15000)
    expect(cal.locator('.reveal-title')).to_have_text(titles[0], timeout=10000)
    cal.keyboard.press('Escape')
    expect(cal.locator('#next .decided')).to_have_text('No votes, so the most-thumbed pick won')
    n2 = json.loads(emu('GET', f'{DOCS}/nights/{day2}', owner=True))['fields']
    assert n2['lockedMovieId']['stringValue'] == ids[0], n2['lockedMovieId']
    assert all(v['integerValue'] == '0' for v in n2['lockedVotes']['mapValue']['fields'].values()), n2['lockedVotes']

    for page in pages.values():
        page.context.close()
    # Out of the way of the checks that follow.
    for path in [f'nights/{day}', f'nights/{day2}'] + docs:
        try:
            emu('DELETE', f'{DOCS}/{path}', owner=True)
        except Exception:
            pass


def honest_sending_checks(browser, errors):
    """A connection that's up but carrying nothing (no 'offline' event): a thumbs-up says
    "Not sent yet" instead of pretending, and "Sent." once the server has it."""
    now = datetime.now(timezone.utc)
    emu('PATCH', f'{DOCS}/people/lia', {'fields': fields({'name': 'Lia', 'at': now, 'toured': True, 'lastSeen': now})}, owner=True)
    page = as_person(browser, errors, 'lia', 'Lia')
    page.goto(f'{SITE}/?emu')
    skip_cards(page)
    page.context.route('**/google.firestore.v1.Firestore/Write/**', lambda r: r.abort())  # nothing gets through
    vote = page.locator('#shelf .card .vote:not(.on)').first
    movie = vote.get_attribute('data-id')
    vote.click()
    expect(page.locator('#toast')).to_contain_text('Not sent yet', timeout=8000)
    assert page.evaluate('navigator.onLine'), 'the browser still thinks it is online'
    # With the note up, a walkthrough's buttons still take the tap (the note moves out of the way).
    page.click('.topbar [data-action="tour"]')
    page.click('[data-tour="next"]', timeout=3000)
    expect(page.locator('.tour-top .label')).to_contain_text('2 of 4')
    page.click('[data-tour="skip"]')
    page.context.unroute('**/google.firestore.v1.Firestore/Write/**')  # the SDK retries and resends
    expect(page.locator('#toast')).to_contain_text('Sent.', timeout=20000)
    assert json.loads(emu('GET', f'{DOCS}/votes/{movie}__lia', owner=True)).get('fields'), 'the vote reached the server'
    page.context.close()

    # Dropping out reads the night before it writes: the note still comes.
    night = next(d for d in json.loads(emu('GET', f'{DOCS}/nights?pageSize=50', owner=True)).get('documents', [])
                 if d['fields']['status']['stringValue'] == 'planned')
    day = night['name'].rsplit('/', 1)[-1]
    emu('PATCH', f'{DOCS}/free/{day}__lia', {'fields': fields({'day': day, 'nameKey': 'lia', 'name': 'Lia', 'at': now})}, owner=True)
    page = as_person(browser, errors, 'lia2', 'Lia')
    page.goto(f'{SITE}/?emu')
    skip_cards(page)
    rsvp = page.locator(f'#next [data-action="free"][data-day="{day}"]')
    expect(rsvp).to_have_attribute('aria-pressed', 'true', timeout=10000)
    page.context.route('**/google.firestore.v1.Firestore/Write/**', lambda r: r.abort())
    rsvp.click()
    rsvp.click()  # dropping out takes a second tap
    expect(page.locator('#toast')).to_contain_text('Not sent yet', timeout=10000)
    page.context.unroute('**/google.firestore.v1.Firestore/Write/**')
    expect(page.locator('#toast')).to_contain_text('off the list', timeout=20000)
    page.context.close()

    # The name step too: unsent, it says so, and a second tap doesn't send it twice.
    ctx = browser.new_context(viewport=PHONE)
    page = ctx.new_page()
    page.goto(f'{SITE}/?emu')
    skip_tour(page)
    for _ in range(3):  # a reveal this phone hasn't seen may come first
        if page.locator('.reveal-overlay').count():
            page.keyboard.press('Escape')
        page.wait_for_timeout(400)
    ctx.route('**/google.firestore.v1.Firestore/Write/**', lambda r: r.abort())
    page.fill('#passName', 'Ulrike')
    page.click('#passForm button[type=submit]')
    page.click('#passForm button[type=submit]')
    expect(page.locator('#toast')).to_contain_text(re.compile('Still sending|Not sent yet'), timeout=8000)
    expect(page.locator('#toast')).to_contain_text('Not sent yet', timeout=8000)
    ctx.unroute('**/google.firestore.v1.Firestore/Write/**')
    expect(page.locator('#whoami')).to_contain_text('Ulrike', timeout=20000)
    ctx.close()

    # Unreachable altogether, a name can't go through: it says so, and never says 'Sent.'.
    ctx = browser.new_context(viewport=PHONE)
    page = ctx.new_page()
    page.goto(f'{SITE}/?emu')
    skip_tour(page)
    for _ in range(3):
        if page.locator('.reveal-overlay').count():
            page.keyboard.press('Escape')
        page.wait_for_timeout(400)
    ctx.route('**/google.firestore.v1.Firestore/**', lambda r: r.abort())
    page.fill('#passName', 'Vesna')
    page.click('#passForm button[type=submit]')
    expect(page.locator('#passMsg')).to_be_visible(timeout=30000)  # the error, under the field
    page.wait_for_timeout(500)
    assert 'Sent.' not in page.locator('#toast').inner_text(), 'a failed name never says Sent.'
    ctx.close()

    # Opening with the box office unreachable says so, instead of an empty house.
    page = as_person(browser, errors, 'lia3', 'Lia')
    page.context.route('**/google.firestore.v1.Firestore/Listen/**', lambda r: r.abort())
    page.goto(f'{SITE}/?emu')
    expect(page.locator('#board')).to_contain_text('reach the box office', timeout=15000)
    expect(page.locator('#next')).not_to_contain_text('Nobody is hosting yet')
    page.context.close()


def reveal_invite_checks(browser, errors):
    """Someone with a name who isn't coming yet: the reveal waits face down, then ends on
    Count me in, which puts them on the list and lands them on their ticket."""
    now = datetime.now(timezone.utc)
    day = (now + timedelta(days=1)).strftime('%Y-%m-%d')
    emu('PATCH', f'{DOCS}/people/nia', {'fields': fields({'name': 'Nia', 'at': now, 'toured': True, 'lastSeen': now})}, owner=True)
    emu('PATCH', f'{DOCS}/movies/tt0073195', {'fields': fields({
        'imdbId': 'tt0073195', 'title': 'Jaws', 'year': '1975', 'poster': '', 'runtime': '124 min', 'rating': '', 'genres': ['Thriller'],
        'trailer': '', 'description': '', 'pitch': '', 'shelf': [], 'by': 'hal', 'byName': 'Hal', 'at': now})}, owner=True)
    emu('PATCH', f'{DOCS}/nights/{day}', {'fields': fields({
        'day': day, 'startsAt': now + timedelta(days=1), 'host': 'Hal', 'hostKey': 'hal', 'status': 'locked', 'createdAt': now,
        'theme': '', 'vetoes': {}, 'lockedTie': [], 'lockedMovieId': 'tt0073195', 'lockedAt': now,
        'lockedMovie': {'imdbId': 'tt0073195', 'title': 'Jaws', 'year': '1975', 'poster': '', 'runtime': '124 min', 'rating': '', 'genres': ['Thriller'], 'trailer': ''}})}, owner=True)
    page = as_person(browser, errors, 'nia', 'Nia')
    page.goto(f'{SITE}/?emu')
    expect(page.locator('.reveal-overlay')).to_be_visible(timeout=15000)
    page.click('.reveal-card')
    expect(page.locator('.reveal-title')).to_have_text('Jaws', timeout=10000)
    expect(page.locator('.reveal-actions button')).to_have_text(['Count me in', 'Not this time'])
    page.click('.reveal-actions [data-r="in"]')
    expect(page.locator('#next .ticket')).to_be_focused(timeout=10000)
    expect(page.locator('#next .ticket.printed')).to_have_count(1)  # it prints in, top first
    expect(page.locator('#toast')).to_contain_text('in for', timeout=10000)
    # The toast drops in at the top, never over the buttons under the thumb.
    toast_box = page.locator('#toast').bounding_box()
    assert toast_box and toast_box['y'] < 80, toast_box
    page.wait_for_timeout(900)  # the scroll to the ticket settles under its heading
    top = page.evaluate(UNDER_STRIP, '#nextSec h2')
    assert 0 <= top <= 40, top
    assert json.loads(emu('GET', f'{DOCS}/free/{day}__nia', owner=True)).get('fields'), 'Nia is on the list'
    page.context.close()
    # Out of the way of the checks that follow (they open a reveal of their own).
    emu('PATCH', f'{DOCS}/nights/{day}?updateMask.fieldPaths=status', {'fields': {'status': {'stringValue': 'cancelled'}}}, owner=True)


def reveal_ending_checks(browser, errors):
    """A visitor with no name ends the reveal on Count me in too: it asks the name, then lands
    on their ticket. Someone who backs out of the face-down card gets news that never names it."""
    now = datetime.now(timezone.utc)
    day = (now + timedelta(days=2)).strftime('%Y-%m-%d')
    emu('PATCH', f'{DOCS}/nights/{day}', {'fields': fields({
        'day': day, 'startsAt': now + timedelta(days=2), 'host': 'Hal', 'hostKey': 'hal', 'status': 'locked', 'createdAt': now - timedelta(hours=3),
        'theme': '', 'vetoes': {}, 'lockedTie': [], 'lockedMovieId': 'tt0073195', 'lockedAt': now - timedelta(minutes=30),
        'lockedMovie': {'imdbId': 'tt0073195', 'title': 'Jaws', 'year': '1975', 'poster': '', 'runtime': '124 min', 'rating': '', 'genres': ['Thriller'], 'trailer': ''}})}, owner=True)
    ctx = browser.new_context(viewport=PHONE)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'pia: {e}'))
    page.goto(f'{SITE}/?emu')
    skip_tour(page)
    expect(page.locator('.reveal-overlay')).to_be_visible(timeout=15000)
    page.click('.reveal-card')
    expect(page.locator('.reveal-title')).to_have_text('Jaws', timeout=10000)  # the title finishes 'The movie is…'
    expect(page.locator('.reveal-overlay h2')).to_have_text('The movie is…')
    expect(page.locator('.reveal-actions button')).to_have_text(['Count me in', 'Not this time'])
    page.click('.reveal-actions [data-r="in"]')
    expect(page.locator('#pass')).to_be_visible(timeout=10000)
    # A second tap as the form arrives lands on no one's name.
    page.evaluate("document.querySelector('#passChips button').click()")
    # The form says why it's there inside itself (no toast over the field), and
    # comes to the top of the screen, heading first, with the field in view.
    expect(page.locator('#passMsg')).to_have_text('One step left: your name, and you’re on the list.')
    # One thing to do: the night's own Count me in steps aside until the name is in.
    expect(page.locator(f'#next [data-action="free"][data-day="{day}"]')).to_have_count(0)
    expect(page.locator('#next')).to_contain_text('Your name first, just above.')
    page.wait_for_timeout(1200)
    expect(page.locator('#pass')).to_be_visible()
    expect(page.locator('#toast')).not_to_contain_text('Welcome')
    box = page.evaluate("() => ({ field: document.querySelector('#passName').getBoundingClientRect().bottom, h: innerHeight })")
    box['top'] = page.evaluate(UNDER_STRIP, '#pass')
    assert 0 <= box['top'] <= 30 and box['field'] <= box['h'], box
    page.fill('#passName', 'Quentin')  # (not like any name on the list, or it asks 'Is that you?')
    page.click('#passForm button[type=submit]')
    expect(page.locator('#next .ticket')).to_be_focused(timeout=15000)
    assert json.loads(emu('GET', f'{DOCS}/free/{day}__quentin', owner=True)).get('fields'), 'Quentin is on the list'
    ctx.close()

    # Signed out, Esc on the face-down card ('not now'), then a name: the reveal isn't carried
    # onto the name as seen, so the next visit doesn't spoil it; it waits behind its card back in Up next.
    try:
        emu('DELETE', f'{DOCS}/people/xavier', owner=True)  # a fresh person, even on a rerun
    except Exception:
        pass
    ctx = browser.new_context(viewport=PHONE)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'xavier: {e}'))
    page.goto(f'{SITE}/?emu')
    skip_tour(page)
    expect(page.locator('.reveal-overlay')).to_be_visible(timeout=15000)
    page.keyboard.press('Escape')
    expect(page.locator('.reveal-overlay')).to_have_count(0)
    page.fill('#passName', 'Xavier')
    page.click('#passForm button[type=submit]')
    expect(page.locator('#whoami')).to_contain_text('Xavier', timeout=10000)
    page.wait_for_timeout(1500)
    doc = json.loads(emu('GET', f'{DOCS}/people/xavier', owner=True)).get('fields', {})
    reels = [v['stringValue'] for v in doc.get('reels', {}).get('arrayValue', {}).get('values', [])]
    assert not any(r.endswith('tt0073195') for r in reels), reels
    expect(page.locator('#board h1')).to_have_text('The movie is…')
    expect(page.locator('#next [data-action="reveal-now"]')).to_be_visible()
    ctx.close()

    # A second locked night further out stays face down too (its reveal plays once it's next).
    later = (now + timedelta(days=4)).strftime('%Y-%m-%d')
    emu('PATCH', f'{DOCS}/nights/{later}', {'fields': fields({
        'day': later, 'startsAt': now + timedelta(days=4), 'host': 'Sam', 'hostKey': 'sam', 'status': 'locked', 'createdAt': now - timedelta(hours=3),
        'theme': '', 'vetoes': {}, 'lockedTie': [], 'lockedMovieId': 'tt9990077', 'lockedAt': now - timedelta(minutes=20),
        'lockedMovie': {'imdbId': 'tt9990077', 'title': 'Overlook Hotel Night', 'year': '1980', 'poster': '', 'runtime': '146 min', 'rating': '', 'genres': ['Horror'], 'trailer': ''}})}, owner=True)

    # Ola last looked before the lock, and backs out of the face-down card.
    emu('PATCH', f'{DOCS}/people/ola', {'fields': fields({'name': 'Ola', 'at': now - timedelta(days=3), 'toured': True,
                                                          'lastSeen': now - timedelta(hours=2)})}, owner=True)
    page = as_person(browser, errors, 'ola', 'Ola')
    page.goto(f'{SITE}/?emu')
    expect(page.locator('.reveal-overlay')).to_be_visible(timeout=15000)
    page.go_back()  # Android back before it turns
    expect(page.locator('.reveal-overlay')).to_have_count(0)
    page.wait_for_timeout(1500)
    walk = page.locator('.tour-overlay')
    expect(walk).to_have_count(0)  # 'not now' means no sheet rises in its place
    page.click('#news [data-action="news-walk"]')  # the bar has it
    expect(walk).to_be_visible(timeout=10000)
    texts = []
    for _ in range(12):
        texts.append(walk.inner_text())
        nxt = walk.locator('[data-tour="next"]')
        if not nxt.count():
            break
        nxt.click()
    # (Jaws is also new on the shelf, which is fine: the lock is what must stay face down.)
    assert not any(re.search(r'Locked for .*Jaws', t) for t in texts), 'no news card names a face-down movie'
    assert not any('Overlook Hotel Night' in t for t in texts), 'nor a later locked night'
    assert any('movie is locked' in t for t in texts), texts
    # The shelf's crown follows the next night still open to the pick, never the face-down movie.
    skip_cards(page)
    expect(page.locator('#shelf .card.lead', has=page.locator('h3', has_text='Jaws'))).to_have_count(0)
    expect(page.locator('#shelf .ribbon').first).to_contain_text(re.compile(r'Leading|Tied'))
    page.context.close()
    for d in (day, later):
        emu('PATCH', f'{DOCS}/nights/{d}?updateMask.fieldPaths=status', {'fields': {'status': {'stringValue': 'cancelled'}}}, owner=True)


def trailer_checks(browser, errors):
    """A trailer plays here, in the screening room: the title on its marquee, YouTube's
    privacy-enhanced player on the screen, and Esc or Android back ends the show with focus
    back on the Trailer button. (The player is stubbed: the suite doesn't call YouTube.)"""
    now = datetime.now(timezone.utc)
    emu('PATCH', f'{DOCS}/movies/tt9990099', {'fields': fields({'imdbId': 'tt9990099', 'title': 'Screening Room Test', 'year': '1999', 'poster': '',
        'runtime': '', 'rating': '', 'genres': [], 'trailer': 'abcDEF12345', 'description': '', 'pitch': '', 'shelf': [], 'by': 'hal', 'byName': 'Hal', 'at': now})}, owner=True)
    page = as_person(browser, errors, 'jo', 'Jo')
    page.context.route('**/www.youtube-nocookie.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<p>the trailer plays here</p>'))
    page.goto(f'{SITE}/?emu')
    expect(page.locator('#shelf .card').first).to_be_visible(timeout=15000)
    page.wait_for_timeout(3000)
    for _ in range(3):  # any reveal, reel or news waits for later
        if page.locator('.reveal-overlay, .reel-overlay').count():
            page.keyboard.press('Escape')
        page.wait_for_timeout(400)
    skip_cards(page)
    btn = page.locator('#shelf .card', has=page.locator('h3', has_text='Screening Room Test')).locator('[data-action="trailer"]')
    btn.click()
    room = page.locator('.screen-overlay')
    expect(room).to_be_visible()
    expect(room.locator('.screen-title')).to_contain_text('Screening Room Test')
    expect(room.locator('iframe')).to_have_attribute('src', re.compile(r'^https://www\.youtube-nocookie\.com/embed/abcDEF12345\?autoplay=1'), timeout=5000)
    expect(room.locator('a[href^="https://www.youtube.com/watch?v=abcDEF12345"]')).to_have_count(1)  # if it won't play here
    page.keyboard.press('Escape')
    expect(room).to_have_count(0)
    expect(btn).to_be_focused()
    btn.click()
    expect(room).to_be_visible()
    page.go_back()  # Android back ends the show too, without leaving the site
    expect(room).to_have_count(0)
    assert page.url.startswith(SITE), page.url
    page.context.close()


def stale_lock_checks(browser, errors):
    """A phone whose lists are only its own copy (the live connection dropped, as on a tab that
    has just woken up) doesn't lock a night from them; once the server's word is back, it does.
    The night is due only on this phone, whose clock is moved past the deadline."""
    now = datetime.now(timezone.utc)
    starts = now + timedelta(hours=30)
    day = starts.astimezone(ZoneInfo('America/New_York')).strftime('%Y-%m-%d')
    emu('PATCH', f'{DOCS}/people/vic', {'fields': fields({'name': 'Vic', 'at': now - timedelta(days=3), 'toured': True, 'lastSeen': now})}, owner=True)
    emu('PATCH', f'{DOCS}/nights/{day}', {'fields': fields({
        'day': day, 'startsAt': starts, 'host': 'Hal', 'hostKey': 'hal', 'status': 'planned', 'createdAt': now - timedelta(days=2),
        'theme': '', 'vetoes': {}, 'lockedTie': []})}, owner=True)
    status = lambda: json.loads(emu('GET', f'{DOCS}/nights/{day}', owner=True))['fields']['status']['stringValue']
    page = as_person(browser, errors, 'vic', 'Vic')
    page.add_init_script("""(() => { window.__off = 0; const D = Date;
      class Moved extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + window.__off); } static now() { return D.now() + window.__off; } }
      window.Date = Moved; })();""")
    page.goto(f'{SITE}/?emu')
    expect(page.locator('#shelf .card').first).to_be_visible(timeout=15000)
    # The connection drops (the lists become this phone's own copy), then comes back with the
    # live lists still quiet: what a tab sees in the moments after it wakes up.
    cdp = page.context.new_cdp_session(page)
    cdp.send('Network.enable')
    net = lambda off: cdp.send('Network.emulateNetworkConditions', {'offline': off, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
    net(True)
    page.wait_for_timeout(5000)
    block = lambda r: r.abort()
    page.context.route('**/google.firestore.v1.Firestore/Listen/**', block)
    net(False)
    page.evaluate('window.__off = 8 * 3600e3')  # past the deadline, on this phone only
    page.wait_for_timeout(35000)  # the clock's next pass
    assert status() == 'planned', 'no lock from a cached copy'
    page.context.unroute('**/google.firestore.v1.Firestore/Listen/**', block)
    for _ in range(40):  # the server's word is back: now it locks
        if status() == 'locked':
            break
        page.wait_for_timeout(1000)
    assert status() == 'locked', status()
    page.context.close()
    # Past the deadline, the host still has Unlock and re-pick (until showtime, as the rules allow).
    hal = as_person(browser, errors, 'hal', 'Hal')
    hal.add_init_script("""(() => { const off = 8 * 3600e3, D = Date;
      class Moved extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
      window.Date = Moved; })();""")
    hal.goto(f'{SITE}/?emu')
    expect(hal.locator('#shelf .card').first).to_be_visible(timeout=15000)
    hal.wait_for_timeout(3000)
    for _ in range(3):  # any reveal or reel of another night waits for later
        if hal.locator('.reveal-overlay, .reel-overlay').count():
            hal.keyboard.press('Escape')
        hal.wait_for_timeout(500)
    skip_cards(hal)
    hal.locator(f'#calendar .day[data-day="{day}"]').click()
    expect(hal.locator('#dayDetail [data-action="unlock-night"]')).to_be_visible(timeout=10000)
    hal.context.close()
    emu('PATCH', f'{DOCS}/nights/{day}?updateMask.fieldPaths=status', {'fields': {'status': {'stringValue': 'cancelled'}}}, owner=True)


def flaky_start_checks(browser, errors):
    """A phone that opens with Firestore out of reach catches up by itself once the connection is
    back, even when some of its lists are genuinely empty (no free marks, nothing seen): the server's
    'still empty' counts as loaded. Its own emulator namespace, so those lists really are empty."""
    project = 'e2e-flaky'
    docs = f'/v1/projects/{project}/databases/(default)/documents'
    now = datetime.now(timezone.utc)
    emu('DELETE', f'/emulator/v1/projects/{project}/databases/(default)/documents', owner=True)
    emu('PATCH', f'{docs}/movies/tt0000001', {'fields': fields({'imdbId': 'tt0000001', 'title': 'Flaky Feature', 'year': '1999', 'poster': '',
        'runtime': '', 'rating': '', 'genres': [], 'trailer': '', 'description': '', 'pitch': '', 'shelf': [], 'by': 'hal', 'byName': 'Hal', 'at': now})}, owner=True)
    emu('PATCH', f'{docs}/votes/tt0000001__hal', {'fields': fields({'movie': 'tt0000001', 'title': 'Flaky Feature', 'nameKey': 'hal', 'name': 'Hal', 'at': now})}, owner=True)
    config = Path('public/js/config.js').read_text(encoding='utf-8').replace(f"projectId: '{PROJECT}'", f"projectId: '{project}'")
    assert project in config
    ctx = browser.new_context(viewport=PHONE, reduced_motion='reduce')
    ctx.route('**/js/config.js', lambda r: r.fulfill(status=200, content_type='text/javascript', body=config))
    block = lambda r: r.abort()
    ctx.route('**/google.firestore.v1.Firestore/Listen/**', block)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'flaky: {e}'))
    page.goto(f'{SITE}/?emu')
    expect(page.locator('#board')).to_contain_text('reach the box office', ignore_case=True, timeout=15000)
    ctx.unroute('**/google.firestore.v1.Firestore/Listen/**', block)
    expect(page.locator('#shelf .card')).to_have_count(1, timeout=20000)  # no reload
    expect(page.locator('#board')).not_to_contain_text('reach the box office', ignore_case=True)
    ctx.close()


def big_text_checks(browser, errors):
    """200% text on a phone (simulated as a 206 px screen): nothing runs past the edge, the
    marquee title stays bigger than the section heads, How it works keeps Back and Next on one
    row, and a thumbs-up with no name brings the name form up with its heading and field in view."""
    page = tracked(browser, errors, 'big-text', viewport={'width': 206, 'height': 457}, device_scale_factor=4,
                   is_mobile=True, has_touch=True)
    page.goto(f'{SITE}/?emu')
    tour = page.locator('.tour-overlay')
    expect(tour).to_be_visible(timeout=10000)
    page.click('[data-tour="next"]')
    tops = page.evaluate("[...document.querySelectorAll('.tour-nav .btn')].map((b) => Math.round(b.getBoundingClientRect().top))")
    assert len(tops) == 2 and tops[0] == tops[1], tops
    page.click('[data-tour="skip"]')
    if page.locator('.reveal-overlay').count():
        page.keyboard.press('Escape')
    page.wait_for_selector('#shelf .card .vote')
    m = page.evaluate("""() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: parseFloat(getComputedStyle(document.querySelector('#board h1')).fontSize),
      h2: parseFloat(getComputedStyle(document.querySelector('.section-head h2')).fontSize) })""")
    assert m['over'] <= 0 and m['h1'] > m['h2'], m
    page.locator('#shelf .card .vote').first.click()
    expect(page.locator('#pass')).to_be_visible()
    page.wait_for_timeout(1200)
    box = page.evaluate("() => ({ field: document.querySelector('#passName').getBoundingClientRect().bottom, h: innerHeight })")
    box['top'] = page.evaluate(UNDER_STRIP, '#pass')
    assert 0 <= box['top'] <= 30 and box['field'] <= box['h'], box
    page.context.close()


def locking_phone_checks(browser, errors):
    """The phone that locks a night (its clock notices the deadline as the page opens) shows its
    reveal first; the news cards wait until after it, never over it."""
    now = datetime.now(timezone.utc)
    # Due to lock only on Uma's phone, whose clock runs 8 hours ahead (the other pages still open
    # in this run would otherwise lock it first): 30 hours out, so the day-before deadline is 6 hours off.
    starts = now + timedelta(hours=30)
    day = starts.astimezone(ZoneInfo('America/New_York')).strftime('%Y-%m-%d')
    emu('PATCH', f'{DOCS}/people/uma', {'fields': fields({'name': 'Uma', 'at': now - timedelta(days=3), 'toured': True,
                                                          'lastSeen': now - timedelta(hours=2)})}, owner=True)
    emu('PATCH', f'{DOCS}/nights/{day}', {'fields': fields({
        'day': day, 'startsAt': starts, 'host': 'Hal', 'hostKey': 'hal', 'status': 'planned', 'createdAt': now - timedelta(days=2),
        'theme': '', 'vetoes': {}, 'lockedTie': []})}, owner=True)
    emu('PATCH', f'{DOCS}/free/{day}__uma', {'fields': fields({'day': day, 'nameKey': 'uma', 'name': 'Uma', 'at': now - timedelta(hours=1)})}, owner=True)
    emu('PATCH', f'{DOCS}/votes/tt0073195__hal', {'fields': fields({  # something new since Uma's last look
        'movie': 'tt0073195', 'title': 'Jaws', 'nameKey': 'hal', 'name': 'Hal', 'at': now - timedelta(hours=1)})}, owner=True)
    page = as_person(browser, errors, 'uma', 'Uma')
    page.add_init_script("""(() => { const off = 8 * 3600e3, D = Date;
      class Ahead extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
      window.Date = Ahead; })();""")
    page.add_init_script("""new MutationObserver(() => {
      if (window.__first) return;
      if (document.querySelector('.tour-overlay')) window.__first = 'news';
      else if (document.querySelector('.reveal-overlay, .reel-overlay')) window.__first = 'reveal';
    }).observe(document, { subtree: true, childList: true });""")
    # A slow lock (its first two tries fail and the SDK backs off), so the news is ready first.
    tries = []
    page.route(re.compile(r'documents:commit'), lambda r: (tries.append(1), r.abort() if len(tries) <= 2 else r.continue_()))
    page.goto(f'{SITE}/?emu')
    expect(page.locator('.reveal-overlay, .reel-overlay')).to_be_visible(timeout=30000)
    assert len(tries) >= 3, tries
    assert page.evaluate('window.__first') == 'reveal', page.evaluate('window.__first')
    page.context.close()
    emu('PATCH', f'{DOCS}/nights/{day}?updateMask.fieldPaths=status', {'fields': {'status': {'stringValue': 'cancelled'}}}, owner=True)


def news_cards_checks(browser, errors):
    """Since you last looked, from another person's real actions: Hal (hosting) moves the time,
    sets a theme, vetoes a movie and calls a snack; Wren, whose last look was just before, gets one card
    for each when the page opens, in that order. Got it marks them seen: a reload shows none."""
    now = datetime.now(timezone.utc)
    old, looked = now - timedelta(hours=2), now
    day = (now + timedelta(days=20)).strftime('%Y-%m-%d')
    for key, name in (('hal', 'Hal'), ('wren', 'Wren')):
        emu('PATCH', f'{DOCS}/people/{key}', {'fields': fields({
            'name': name, 'at': old, 'toured': True, **({'lastSeen': looked} if key == 'wren' else {})})}, owner=True)
    movie = {'year': '1999', 'poster': '', 'runtime': '', 'rating': '', 'genres': ['Drama'], 'trailer': '', 'description': '',
             'pitch': '', 'shelf': [], 'by': 'hal', 'byName': 'Hal', 'at': old}
    emu('PATCH', f'{DOCS}/movies/tt9990011', {'fields': fields({**movie, 'imdbId': 'tt9990011', 'title': 'Cards Movie'})}, owner=True)
    emu('PATCH', f'{DOCS}/votes/tt9990011__hal', {'fields': fields({
        'movie': 'tt9990011', 'title': 'Cards Movie', 'nameKey': 'hal', 'name': 'Hal', 'at': old})}, owner=True)
    emu('PATCH', f'{DOCS}/free/{day}__hal', {'fields': fields({'day': day, 'nameKey': 'hal', 'name': 'Hal', 'at': old})}, owner=True)
    emu('PATCH', f'{DOCS}/nights/{day}', {'fields': fields({
        'day': day, 'startsAt': now + timedelta(days=20), 'host': 'Hal', 'hostKey': 'hal', 'status': 'planned', 'createdAt': old,
        'lockedTie': [], 'theme': '', 'vetoes': {}})}, owner=True)

    hal = as_person(browser, errors, 'hal', 'Hal')
    hal.goto(f'{SITE}/?emu')
    skip_cards(hal)
    expect(hal.locator('#next .host-tools')).to_have_count(1, timeout=10000)
    hal.select_option(f'#next #next-time-{day}', '21:00')  # it saves when chosen, like the theme
    expect(hal.locator('#toast')).to_contain_text('Moved to', timeout=10000)
    expect(hal.locator('[data-action="night-time"]')).to_have_count(0)  # one way to save: no Change time button
    hal.select_option('#next select[data-theme-day]', 'Drama')
    expect(hal.locator('#toast')).to_contain_text('Theme: Drama', timeout=10000)
    hal.click('#next [data-action="veto"]')
    expect(hal.locator('#next .vetoes s')).to_have_text('Cards Movie', timeout=10000)
    expect(hal.locator('#toast')).to_contain_text('Vetoed', timeout=10000)  # on the server, not just echoed locally
    hal.click('#next [data-action="quick-snack"][data-item="Candy"]')
    expect(hal.locator('#next .snack')).to_contain_text('Candy', timeout=10000)
    expect(hal.locator('#toast')).to_contain_text('Noted', timeout=10000)  # closing the page mid-write would drop it
    hal.context.close()

    wren = as_person(browser, errors, 'wren', 'Wren')
    wren.goto(f'{SITE}/?emu')
    walk = wren.locator('.tour-overlay')
    expect(walk).to_be_visible(timeout=10000)
    expect(walk.locator('.tour-top .label')).to_have_text('Since you last looked · 1 of 2')
    # Lingering past the 4 s "real look" doesn't count as seen while the cards are unread.
    wren.wait_for_timeout(5000)
    wren.reload()
    expect(walk).to_be_visible(timeout=10000)
    expect(walk.locator('.tour-top .label')).to_have_text('Since you last looked · 1 of 2')
    # Wren isn't coming to Hal's night, so its three changes share one card; the snack gets its own.
    expect(walk.locator('#tourTitle')).to_contain_text(re.compile(r"Hal's \w+: now 9:00\sPM · a Drama night · Cards Movie vetoed"))
    expect(walk.locator('.tour-demo s')).to_have_text('Cards Movie')  # the struck title
    expect(walk.locator('.tour-demo .tag-chip')).to_have_text('Drama')
    expect(walk.locator('.tour-card [data-action="free"]')).to_have_text('Count me in')  # Wren isn't on that night's list
    expect(walk.locator('.btn-bulb')).to_have_count(1)  # one amber call: Count me in; Next steps back to a ghost
    shot(wren, '02b-guest-news-veto')
    wren.click('[data-tour="next"]')
    expect(walk.locator('#tourTitle')).to_contain_text('Hal is bringing Candy')
    wren.click('[data-tour="done"]')
    expect(walk).to_have_count(0)
    expect(wren.locator('#news')).to_be_hidden()
    wren.wait_for_timeout(1500)
    wren.reload()
    expect(wren.locator('#whoami')).to_contain_text('Wren', timeout=10000)
    wren.wait_for_timeout(4800)  # past the page's 4 s look: with nothing unread it saves lastSeen, so the change below can't race it
    expect(wren.locator('.tour-overlay')).to_have_count(0)
    expect(wren.locator('#news')).to_be_hidden()
    # A change made while Wren is on the page only reaches the slim bar: no cards pop up mid-visit.
    emu('PATCH', f'{DOCS}/nights/{day}?updateMask.fieldPaths=movedAt', {'fields': fields({'movedAt': datetime.now(timezone.utc)})}, owner=True)
    expect(wren.locator('#news')).to_be_visible(timeout=10000)
    expect(wren.locator('#newsCount')).to_have_text('1 update')
    assert wren.locator('.tour-overlay').count() == 0
    # Leaving with that update unread keeps it: the next visit opens with it.
    wren.wait_for_timeout(4500)
    wren.reload()
    expect(wren.locator('.tour-overlay #tourTitle')).to_contain_text('starts at', timeout=10000)
    wren.keyboard.press('Escape')  # (Android back does the same) means later: the bar keeps it
    expect(wren.locator('.tour-overlay')).to_have_count(0)
    expect(wren.locator('#newsCount')).to_have_text('1 update')
    wren.click('#news [data-action="news-seen"]')  # Got it marks it read
    expect(wren.locator('#news')).to_be_hidden()
    assert wren.evaluate('document.activeElement && document.activeElement !== document.body'), 'focus kept after the bar hides'
    wren.context.close()


def paste_list_checks(browser, errors):
    """Paste a list, on a phone: four lines (a movie that's new, one already on the shelf, nonsense, and the
    new one again) read back as Ready, Already on the shelf, Not found and Listed twice; Wrong movie? swaps
    the match; the nonsense line is fixed and tried again; Add puts the new movies on the shelf under the
    person's name with her thumb. Someone with no name is asked for one at Find these, and the list carries
    on once she gives it. (Cinemeta is the live catalog here, as in the search steps above, so the titles
    are well-known ones.)"""
    now = datetime.now(timezone.utc)
    emu('PATCH', f'{DOCS}/movies/tt0084787', {'fields': fields({
        'imdbId': 'tt0084787', 'title': 'The Thing', 'year': '1982', 'poster': '', 'runtime': '', 'rating': '', 'genres': [],
        'trailer': '', 'description': '', 'pitch': '', 'shelf': [], 'by': 'hal', 'byName': 'Hal', 'at': now - timedelta(days=1)})}, owner=True)
    emu('PATCH', f'{DOCS}/people/pia', {'fields': fields({'name': 'Pia', 'at': now, 'toured': True, 'lastSeen': now})}, owner=True)
    wide = 'document.documentElement.scrollWidth - document.documentElement.clientWidth'
    page = as_person(browser, errors, 'pia', 'Pia')
    page.goto(f'{SITE}/?emu')
    expect(page.locator('#shelf .card').first).to_be_visible(timeout=15000)
    page.wait_for_timeout(3000)
    for _ in range(3):  # any reveal, reel or news the earlier checks left waits for later
        if page.locator('.reveal-overlay, .reel-overlay').count():
            page.keyboard.press('Escape')
        page.wait_for_timeout(400)
    skip_cards(page)

    open_add(page)
    page.click('#browseTabs [data-tab="paste"]')
    box = page.locator('#pasteBox')
    expect(box).to_be_visible()
    expect(box).to_contain_text('One movie per line. Add the year if you know it: It Follows (2014)')
    expect(page.locator('#pitchRow')).to_be_hidden()  # "why this one" is for a single add
    expect(page.locator('#searchRow')).to_be_hidden()
    expect(page.locator('#pasteSignIn')).to_be_hidden()  # she has a name
    expect(page.locator('#pasteActions')).to_be_hidden()
    page.fill('#pasteText', 'The Thing (1982)\n2. The Princess Bride 1987\n\nzzqxvkj\n- "the princess bride" (1987)')
    page.click('#pasteFind')
    rows = page.locator('#pasteReview .paste-row')
    expect(rows).to_have_count(4)  # the blank line is left out
    expect(page.locator('#pasteSum')).to_have_text('1 ready · 2 skipped · 1 not found', timeout=30000)
    expect(rows.nth(0)).to_contain_text('The Thing')
    expect(rows.nth(0)).to_contain_text('Already on the shelf (added by Hal)')
    expect(rows.nth(1)).to_contain_text('The Princess Bride')
    expect(rows.nth(1)).to_contain_text('1987')
    expect(rows.nth(1).locator('.paste-state')).to_have_text('Ready')
    expect(rows.nth(1).locator('input[type=checkbox]')).to_be_checked()  # ticked by default
    expect(rows.nth(2)).to_contain_text('Not found')
    expect(rows.nth(2).locator('input.field')).to_have_value('zzqxvkj')  # the line stays editable
    expect(rows.nth(3)).to_contain_text('Listed twice')
    expect(rows.nth(3).locator('input[type=checkbox]')).to_have_count(0)  # kept once: the first one is the one added
    expect(page.locator('#pasteThumbs')).to_be_checked()  # on by default, like adding one
    expect(page.locator('#pasteAdd')).to_have_text('Add 1 movie')
    over = page.evaluate(wide)
    assert over <= 0, f'the review list is {over}px too wide at phone width'
    shot(page, '08-paste-review')

    # Wrong movie? offers the other results (up to four); picking one swaps the row, and the old one stays on offer.
    ready = rows.nth(1)
    ready.locator('[data-action="paste-wrong"]').click()
    alts = ready.locator('.paste-alts .result')
    expect(alts.first).to_be_visible()
    assert 1 <= alts.count() <= 4, alts.count()
    other = alts.first.locator('.t').inner_text()
    alts.first.click()
    expect(ready.locator('.paste-title b')).to_have_text(other)
    expect(rows.nth(3)).to_contain_text('Ready')  # the repeat is no longer a repeat
    ready.locator('[data-action="paste-wrong"]').click()
    ready.locator('.paste-alts .result', has_text='The Princess Bride').first.click()
    expect(ready.locator('.paste-title b')).to_have_text('The Princess Bride')
    expect(rows.nth(3)).to_contain_text('Listed twice')

    # Fix the nonsense line and try again.
    lost = rows.nth(2)
    lost.locator('input.field').fill('Arrival (2016)')
    lost.locator('[data-action="paste-retry"]').click()
    expect(lost.locator('.paste-title b')).to_have_text('Arrival', timeout=15000)
    expect(lost.locator('.paste-state')).to_have_text('Ready')
    expect(page.locator('#pasteSum')).to_have_text('2 ready · 2 skipped')
    expect(page.locator('#pasteAdd')).to_have_text('Add 2 movies')
    lost.locator('input[type=checkbox]').uncheck()  # leave one out, and back in
    expect(page.locator('#pasteAdd')).to_have_text('Add 1 movie')
    lost.locator('input[type=checkbox]').check()
    expect(page.locator('#pasteAdd')).to_have_text('Add 2 movies')

    page.click('#pasteAdd')
    expect(page.locator('#toast')).to_contain_text('Added 2 movies to the shelf, with your thumbs-up', timeout=20000)
    expect(rows).to_have_count(0)  # the list is done with
    expect(page.locator('#pasteText')).to_have_value('')
    for title in ('The Princess Bride', 'Arrival'):
        c = card(page, title)
        expect(c).to_have_count(1, timeout=10000)
        expect(c.locator('.by')).to_contain_text('Added by you')
        expect(c.locator('[data-action="vote"]')).to_have_attribute('aria-pressed', 'true')  # her thumb is on it
        expect(c.locator('.pitch')).to_have_count(0)
    # Written as a single add writes it: her key, an empty pitch, her thumb.
    doc = json.loads(emu('GET', f'{DOCS}/movies/tt0093779'))['fields']
    assert doc['by']['stringValue'] == 'pia' and doc['pitch']['stringValue'] == '', doc
    json.loads(emu('GET', f'{DOCS}/votes/tt0093779__pia'))
    page.context.close()

    # No name yet: Find these asks for one, then carries on with the list.
    page = tracked(browser, errors, 'paste-guest', viewport=PHONE)
    page.goto(f'{SITE}/?emu')
    skip_tour(page)
    open_add(page)
    page.click('#browseTabs [data-tab="paste"]')
    expect(page.locator('#pasteSignIn')).to_contain_text('Add your name first')
    page.fill('#pasteText', 'Moonlight (2016)')
    page.click('#pasteFind')
    expect(page.locator('#pass')).to_be_visible()
    expect(page.locator('#passMsg')).to_contain_text('name first')
    expect(page.locator('#pasteReview .paste-row')).to_have_count(0)  # nothing is looked up, or written, without a name
    page.fill('#passName', 'Quinn')
    page.click('#passForm button[type=submit]')
    expect(page.locator('#whoami')).to_contain_text('Quinn')
    expect(page.locator('#pasteReview .paste-row')).to_have_count(1, timeout=15000)  # the tap that brought her there goes through
    expect(page.locator('#pasteReview .paste-row').first).to_contain_text('Moonlight', timeout=15000)
    expect(page.locator('#pasteText')).to_have_value('Moonlight (2016)')
    page.context.close()


def main():
    ensure_site()
    reset()
    errors, missing = [], set()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = {}
        for name, vp in (('owner', {'width': 900, 'height': 1000}), ('sam', PHONE), ('jo', PHONE)):
            ctx[name] = browser.new_context(viewport=vp, accept_downloads=True)
        owner, sam, jo = (ctx[n].new_page() for n in ('owner', 'sam', 'jo'))
        for name, page in (('owner', owner), ('sam', sam), ('jo', jo)):
            page.on('console', lambda m, n=name: m.type == 'error' and 'Failed to load resource' not in m.text
                    and errors.append(f'{n}: {m.text}'))
            page.on('pageerror', lambda e, n=name: errors.append(f'{n}: {e}'))
            page.on('response', lambda r: r.status >= 400 and missing.add(f'{r.status} {r.url}'))

        # Owner: season title and a tagged house pick.
        owner.goto(f'{SITE}/host.html?emu#k={KEY}')
        expect(owner.locator('#seasonSec')).to_be_visible(timeout=10000)
        assert 'k=' not in owner.url
        owner.fill('#seasonInput', 'Spooky Season')
        owner.click('#seasonForm button[type=submit]')
        owner.click('#houseTags [data-house-tag="Foreign"]')
        owner.fill('#houseQ', 'the descent')
        owner.click('#houseForm button[type=submit]')
        expect(owner.locator('#houseResults .result').first).to_be_visible(timeout=10000)
        owner.locator('#houseResults .result').first.click()
        expect(owner.locator('#houseMsg')).to_contain_text('as a house pick', timeout=10000)
        house_title = owner.locator('#shelfList .pick-opt span').first.inner_text().split(' · ')[0]

        # Sam: empty calendar, the shelf, adding movies.
        join(sam, 'Sam')
        expect(sam.locator('#board')).to_contain_text('No night planned')
        expect(sam.locator('#board')).to_contain_text('Spooky Season')
        expect(sam.locator('#shelf .card')).to_have_count(1)
        expect(sam.locator('#shelf .card').first).to_contain_text('House pick')

        # Subscribe: the calendar section's panel leads with Google's subscribe link
        # (everyone is on Android, which ignores webcal://) and has the https link
        # with a Copy button; the page also carries a static link-preview card.
        ctx['sam'].grant_permissions(['clipboard-read', 'clipboard-write'])
        expect(sam.locator('#subPanel')).to_be_hidden()
        sam.click('[data-action="subscribe"]')
        expect(sam.locator('#subPanel')).to_be_visible()
        expect(sam.locator('[data-action="subscribe"]')).to_have_attribute('aria-expanded', 'true')
        expect(sam.locator('#subGoogle')).to_have_attribute('href', re.compile(r'^https://calendar\.google\.com/calendar/render\?cid=webcal%3A%2F%2F[^%]+%2Fcalendar\.ics$'))
        expect(sam.locator('#subGoogle')).to_have_attribute('target', '_blank')
        expect(sam.locator('#subUrl')).to_have_value(re.compile(r'^https://[^/]+/calendar\.ics$'))
        sam.click('#subPanel .fineprint > summary')  # the copy-the-link route sits under "Didn't work?"
        sam.click('#subPanel [data-action="copy-feed"]')
        expect(sam.locator('#toast')).to_contain_text('Link copied')
        assert sam.evaluate('navigator.clipboard.readText()') == sam.input_value('#subUrl')
        shot(sam, '00-subscribe')
        sam.click('[data-action="subscribe"]')
        expect(sam.locator('#subPanel')).to_be_hidden()
        og = sam.locator('meta[property="og:image"]').get_attribute('content')
        assert og.endswith('/img/og.png') and sam.locator('meta[name="twitter:card"]').get_attribute('content') == 'summary_large_image', og
        png = urllib.request.urlopen(f'{SITE}/img/og.png').read()
        assert png[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', png[16:24]) == (1200, 630)

        alien = add_by_search(sam, 'alien')
        jaws = add_by_search(sam, 'jaws', pitch='The shark still holds up')
        expect(card(sam, jaws)).to_contain_text('The shark still holds up')
        expect(card(sam, alien).locator('.vote .n')).to_have_text('1')  # adding gives your thumb

        # Jo: adds from Trending, thumbs Alien.
        join(jo, 'Jo')
        open_add(jo)
        jo.click('#browseTabs [data-tab="trending"]')
        tile = jo.locator('#browseGrid .tile:not(.taken) .add').first
        expect(tile).to_be_visible(timeout=15000)
        tile.click()
        expect(jo.locator('#pickMsg')).to_contain_text('Added', timeout=30000)
        card(jo, alien).locator('.vote').click()
        expect(card(sam, alien).locator('.vote .n')).to_have_text('2')

        # Stats: most wanted leads with Alien; Sam has only two thumbs so far, so
        # the taste match shows its empty state.
        expect(sam.locator('#statsSec')).to_be_visible()
        expect(sam.locator('#topWanted li').first).to_contain_text(alien)
        expect(sam.locator('#tasteBox')).to_contain_text('Thumbs-up a few movies to see who you agree with')

        # Calendar: a tap on a day only shows it below; Jo says she's free there and
        # volunteers to host it.
        cell = jo.locator('#calendar .day').nth(2)
        day = cell.get_attribute('data-day')
        cell.click()
        expect(jo.locator(f'#calendar .day.sel[data-day="{day}"]')).to_have_count(1)
        expect(jo.locator(f'#calendar .day.on[data-day="{day}"]')).to_have_count(0)  # looking marks nothing
        jo.click('#dayDetail [data-action="free"]')
        expect(jo.locator(f'#calendar .day.on[data-day="{day}"]')).to_have_count(1)
        # Arrow keys move the day (and the panel) without marking anything either.
        cell.focus()
        jo.keyboard.press('ArrowRight')
        expect(jo.locator('#calendar .day.sel')).to_have_attribute('data-day', jo.locator('#calendar .day').nth(3).get_attribute('data-day'))
        jo.keyboard.press('ArrowLeft')
        expect(jo.locator(f'#calendar .day.sel[data-day="{day}"]')).to_be_focused()
        # The panel's own arrows step through the evenings too, and keep focus on themselves.
        jo.click('#dayDetail [data-action="day-step"][data-target="1"]')
        expect(jo.locator('#calendar .day.sel')).to_have_attribute('data-day', jo.locator('#calendar .day').nth(3).get_attribute('data-day'))
        expect(jo.locator('#dayDetail [data-action="day-step"][data-target="1"]')).to_be_focused()
        jo.click('#dayDetail [data-action="day-step"][data-target="-1"]')
        expect(jo.locator(f'#calendar .day.sel[data-day="{day}"]')).to_have_count(1)
        jo.select_option('#hostTime', '20:00')
        # Hosting is printed on a slip first; "Not yet" backs out, and nothing is written.
        jo.click('#dayDetail [data-action="host-slip"]')
        expect(jo.locator('#dayDetail .host-slip')).to_contain_text("Movie night at Jo's")
        expect(jo.locator('#dayDetail [data-action="host"]')).to_be_focused()
        jo.click('#dayDetail [data-action="host-cancel"]')
        expect(jo.locator('#dayDetail .host-slip')).to_have_count(0)
        expect(jo.locator('#board')).not_to_contain_text("Movie night at your place")
        jo.click('#dayDetail [data-action="host-slip"]')
        jo.click('#dayDetail [data-action="host"]')
        expect(jo.locator('#board')).to_contain_text("Movie night at your place")  # the host's own night, in their words
        expect(sam.locator('#next')).to_contain_text("At Jo's")
        sam.click('#next [data-action="free"]')  # Count me in
        expect(sam.locator('#next')).to_contain_text('coming: ')
        expect(sam.locator('#next .dd-line', has_text='coming: ')).to_contain_text('you')  # Sam is "you" on his own phone
        expect(sam.locator('#next .ballot')).to_contain_text(alien)
        expect(sam.locator('#next .host-tools')).to_have_count(0)  # only the host gets tools
        expect(jo.locator('#next .host-tools')).to_have_count(1)
        shot(sam, '01-guest-planned')

        # Seen marks (right under the poster) and the filter.
        card(sam, jaws).locator('[data-action="seen"]').click()
        expect(card(sam, jaws)).to_contain_text('Seen by you')  # in Sam's own words
        sam.click('#shelfChips [data-tag="Unseen by me"]')
        expect(card(sam, jaws)).to_have_count(0)
        sam.click('#shelfChips [data-tag="All"]')

        # Since you last looked.
        sam.wait_for_timeout(4500)
        sam.goto('about:blank')
        card(jo, jaws).locator('.vote').click()
        paddington = add_by_search(jo, 'paddington')
        sam.goto(f'{SITE}/?emu')
        # The news opens by itself as cards. Whether Jo's night is news too depends on when Sam's
        # last look was saved (leaving a page races its write), so count the cards instead of
        # assuming: the new movie, then the thumbs (and maybe the night before them).
        walk = sam.locator('.tour-overlay')
        label = walk.locator('.tour-top .label')
        expect(walk).to_be_visible(timeout=10000)
        expect(label).to_have_text(re.compile(r'^Since you last looked · 1 of [2-4]$'))
        total = int(re.search(r'of (\d+)', label.text_content()).group(1))
        titles = []
        for _ in range(total):
            titles.append(walk.locator('#tourTitle').inner_text())
            if 'new movie' in titles[-1]:
                assert paddington in titles[-1], titles
                expect(walk.locator('.tour-demo .news-poster, .tour-demo .noimg')).to_have_count(1)  # the poster
                shot(sam, '02-guest-news')
            if 'thumbed up' in titles[-1]:
                break
            sam.click('[data-tour="next"]')
        assert any('new movie' in t for t in titles) and 'thumbed up' in titles[-1], titles  # who thumbed up what, in names
        # Show me closes the cards and scrolls to the shelf; the slim bar stays.
        sam.click('[data-tour="show"]')
        expect(walk).to_have_count(0)
        sam.wait_for_function("() => { const r = document.querySelector('#shelfSec').getBoundingClientRect(); return r.top > -20 && r.top < 250; }")
        expect(sam.locator('#news')).to_be_visible()
        expect(sam.locator('#newsCount')).to_have_text(f'{total} updates')
        expect(card(sam, paddington).locator('.new-chip')).to_have_count(1)
        expect(card(sam, jaws).locator('.vote-new')).to_have_text('+1')
        # Walk me through reopens them where Show me left off; Got it on the last card marks everything seen.
        sam.click('#news [data-action="news-walk"]')
        pos = len(titles)
        expect(label).to_have_text(f'Since you last looked · {pos} of {total}')
        for _ in range(total - pos):
            sam.click('[data-tour="next"]')
        expect(walk.locator('[data-tour="done"]')).to_have_text('Got it')
        sam.click('[data-tour="done"]')
        expect(walk).to_have_count(0)
        expect(sam.locator('#news')).to_be_hidden()
        expect(card(sam, paddington).locator('.new-chip')).to_have_count(0)
        sam.wait_for_timeout(1500)  # the lastSeen write lands
        sam.reload()
        expect(sam.locator('#whoami')).to_contain_text('Sam', timeout=10000)
        sam.wait_for_timeout(2000)
        expect(sam.locator('.tour-overlay')).to_have_count(0)  # nothing new: no cards
        expect(sam.locator('#news')).to_be_hidden()

        # Tonight's ballot: all five movies on the shelf are on it, thumbs from the people coming
        # first (Alien and Jaws have both of theirs), and nobody coming has seen Alien.
        expect(sam.locator('#next .ballot-row')).to_have_count(5)
        expect(sam.locator('#next .ballot-row').first.locator('.ballot-title .v')).to_contain_text('2')
        expect(row(sam, alien)).to_contain_text('Nobody coming has seen it')
        expect(row(sam, jaws)).not_to_contain_text('Nobody coming has seen it')  # Sam has
        expect(row(sam, alien)).to_contain_text('No votes yet')
        # Sam votes for Alien and moves the vote to Jaws and back (one vote each, one write each);
        # Jo sees it land and votes for Jaws: one vote apiece.
        row(sam, alien).locator('[data-action="ballot-vote"]').click()
        expect(sam.locator('#toast')).to_contain_text(f'Voted for {alien}', timeout=10000)
        expect(row(sam, alien).locator('[data-action="ballot-vote"]')).to_have_attribute('aria-pressed', 'true')
        expect(row(sam, alien)).to_contain_text('1 vote: you')
        expect(row(jo, alien)).to_contain_text('1 vote: Sam', timeout=10000)
        row(sam, jaws).locator('[data-action="ballot-vote"]').click()
        expect(sam.locator('#toast')).to_contain_text(f'Moved your vote to {jaws}', timeout=10000)
        expect(row(sam, alien)).to_contain_text('No votes yet')
        expect(row(sam, jaws)).to_contain_text('1 vote: you')
        expect(sam.locator('#next [data-action="ballot-vote"][aria-pressed="true"]')).to_have_count(1)  # one vote each
        expect(row(jo, jaws)).to_contain_text('1 vote: Sam', timeout=10000)
        row(sam, alien).locator('[data-action="ballot-vote"]').click()
        expect(row(sam, alien)).to_contain_text('1 vote: you', timeout=10000)
        row(jo, jaws).locator('[data-action="ballot-vote"]').click()
        expect(jo.locator('#toast')).to_contain_text(f'Voted for {jaws}', timeout=10000)
        expect(row(sam, jaws)).to_contain_text('1 vote: Jo', timeout=10000)
        shot(sam, '03a-guest-ballot')

        # The host locks the movie: one vote each, so it's a tie on the ballot.
        lock = jo.locator('#next [data-action="lock-now"]')
        lock.click()
        lock.click()
        # Alien and Jaws are tied on votes: the reel settles it,
        # and plays once on each phone.
        expect(sam.locator('.reel-overlay button')).to_be_visible(timeout=15000)
        expect(sam.locator('.reel-overlay .reveal-why')).to_contain_text('Won the reel over')
        expect(sam.locator('.reel-overlay .reveal-who')).to_contain_text('coming: you')
        sam.locator('.reel-overlay button').click()
        expect(sam.locator('#next .ticket')).to_contain_text('ADMIT ONE', timeout=10000)
        expect(sam.locator('#next .ticket h3')).not_to_have_text('The movie is…')  # face up once the reel has played
        expect(sam.locator('#next .decided')).to_contain_text('Tied 1–1, the reel picked')  # how it was decided, once it is face up
        expect(sam.locator('.reveal-overlay')).to_have_count(0)  # a tie lock gets the reel, not the reveal
        shown = sam.locator('#next .ticket h3').inner_text().lower()  # uppercased by CSS
        winner = next((t for t in (alien, jaws) if t.lower() == shown), None)
        assert winner, shown
        expect(jo.locator('.reel-overlay button')).to_be_visible(timeout=15000)
        jo.locator('.reel-overlay button').click()
        with sam.expect_download() as dl:
            sam.click('[data-action="ics"]')
        assert 'BEGIN:VEVENT' in Path(dl.value.path()).read_text()
        shot(sam, '03-guest-ticket')

        # Owner sends it to the Shield.
        owner.reload()  # nothing saved: a reload locks the console again
        expect(owner.locator('#keySec')).to_be_visible(timeout=10000)
        owner.fill('#keyInput', KEY)
        owner.click('#keyForm button[type=submit]')
        expect(owner.locator('#nightsList [data-shield]')).to_have_count(1, timeout=10000)
        owner.locator('#nightsList [data-shield]').click()
        expect(owner.locator('#toast')).to_contain_text('Sent', timeout=10000)
        ctl = json.loads(emu('GET', f'{DOCS}/control/shield'))
        assert ctl['fields']['imdb']['stringValue'].startswith('tt'), ctl

        # Showtime passes: the host files it, it leaves the shelf, people rate it.
        started = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace('+00:00', 'Z')
        emu('PATCH', f'{DOCS}/nights/{day}?updateMask.fieldPaths=startsAt',
            {'fields': {'startsAt': {'timestampValue': started}}}, owner=True)
        finish = jo.locator('#next [data-action="finish-night"]')
        expect(finish).to_be_visible(timeout=10000)
        finish.click()
        finish.click()
        expect(sam.locator('#watchedSec')).to_be_visible(timeout=10000)
        expect(sam.locator('#past')).to_contain_text(winner)
        expect(card(sam, winner)).to_have_count(0)
        sam.click('#rateBox [data-star="4"]')
        sam.click('#rateBox [data-action="review"]')
        expect(sam.locator('#past')).to_contain_text('4', timeout=10000)
        expect(sam.locator('#hostsLine')).to_contain_text('Jo 1')
        shot(sam, '04-guest-watched')

        # Stats after the night: the recap counts it, the board credits whoever added
        # the winner (Sam added both finalists), and a third thumb gives Sam a match
        # with Jo: Sam {alien, jaws, paddington} against Jo's four, 3 of 4 movies.
        expect(sam.locator('#statTiles')).to_contain_text('Night watched')
        expect(sam.locator('#pickBoard li').first).to_contain_text('Sam (you)')
        card(sam, paddington).locator('.vote').click()
        expect(sam.locator('#tasteBox')).to_contain_text('You and Jo agree 75%')
        shot(sam, '04b-guest-stats')

        # A more fun pick. Jo hosts a second night with a theme (the house pick is the
        # only "Foreign" movie, and nobody has thumbed it).
        cell2 = jo.locator('#calendar .day').nth(4)
        day2 = cell2.get_attribute('data-day')
        cell2.click()
        expect(jo.locator(f'#calendar .day.sel[data-day="{day2}"]')).to_have_count(1)
        expect(jo.locator('#hostTheme option', has_text='Foreign')).to_have_count(1)
        jo.select_option('#hostTheme', 'Foreign')
        jo.click('#dayDetail [data-action="host-slip"]')
        expect(jo.locator('#dayDetail .host-slip')).to_contain_text('Foreign night')  # the slip prints what you picked
        shot(jo, '04b2-host-form-theme')
        jo.click('#dayDetail [data-action="host"]')
        expect(jo.locator(f'#calendar .day.on[data-day="{day2}"]')).to_have_count(1)  # hosting counts you in
        expect(jo.locator('#next .theme-chip')).to_have_text('Foreign')
        expect(jo.locator('#board')).to_contain_text('Theme: Foreign')
        expect(sam.locator('#next .theme-chip')).to_have_text('Foreign')
        shot(jo, '04b3-host-themed-night')
        # The host's tools sit in Up next and in the day panel: each time menu
        # saves itself when chosen. The host reads "You're hosting", not their own name.
        expect(jo.locator('#dayDetail')).to_contain_text('You’re hosting')
        expect(jo.locator('#dayDetail .host-tools select[id^="dd-time-"]')).to_have_count(1)
        jo.select_option(f'#dayDetail #dd-time-{day2}', '21:00')
        expect(jo.locator('#next h3').first).to_contain_text(re.compile(r'9:00\sPM'), timeout=10000)
        expect(jo.locator('#toast')).to_contain_text('Moved to')  # the write has landed, not just the local echo
        jo.select_option(f'#dayDetail #dd-time-{day2}', '20:00')
        expect(jo.locator('#next h3').first).to_contain_text(re.compile(r'8:00\sPM'), timeout=10000)
        sam.click('#next [data-action="free"]')  # Count me in
        expect(sam.locator('#next .dd-line').first).to_contain_text('you')  # Sam reads "you", first
        # The theme narrows "what the people coming want" to movies that fit it; their
        # thumbs are all on other movies, and the page says so rather than "no thumbs".
        # In their names: "You and Jo only thumbed up vetoed or off-theme movies…"
        expect(sam.locator('#next .night-card')).to_contain_text('You and Jo only thumbed up vetoed or off-theme movies')
        # ...and it still says what would win: the only Foreign movie, on the board too.
        expect(sam.locator('#next .pick-now')).to_contain_text(house_title)
        expect(sam.locator('#board')).to_contain_text(f'Leading: {house_title}')
        # The reason names the pool the theme leaves, and the shelf can show just that pool.
        expect(sam.locator('#next .pick-now')).to_contain_text('Foreign movie')
        fits = sam.locator('#shelfChips [data-tag^="Fits "]')
        expect(fits).to_have_text("Fits Jo's Foreign night")
        fits.click()
        expect(sam.locator('#shelf .card')).to_have_count(1)
        expect(sam.locator('#shelf .card h3')).to_have_text(house_title)
        sam.click('#shelfChips [data-tag="All"]')
        # The host clears the theme from the host tools; it clears on Sam's phone too.
        # Arrowing through the menu quickly lands on the last choice, not an earlier one.
        jo.select_option('#next select[data-theme-day]', '')
        jo.select_option('#next select[data-theme-day]', 'Foreign')
        jo.select_option('#next select[data-theme-day]', '')
        jo.wait_for_timeout(1000)
        expect(jo.locator('#next .theme-chip')).to_have_count(0)
        expect(sam.locator('#next .theme-chip')).to_have_count(0)
        expect(sam.locator('#next .ballot-row')).to_have_count(4)  # the other finalist, Paddington, Jo's trending pick, and the house pick: all four are on it

        # The snack chips share an action and a day: the one you tapped keeps focus when the
        # list repaints, not the first chip.
        sam.click('#next [data-action="quick-snack"][data-item="Candy"]')
        expect(sam.locator('#next .snack')).to_contain_text('Candy')
        expect(sam.locator('#next [data-action="quick-snack"][data-item="Candy"]')).to_be_focused()

        # Sam vetoes Paddington (it would have tied with the other finalist): struck
        # through for everyone, one veto each, and only its owner can undo it.
        def veto_button(page, action):
            return row(page, paddington).locator(f'[data-action="{action}"]')
        veto_button(sam, 'veto').click()
        expect(sam.locator('#next .vetoes')).to_contain_text('vetoed by Sam')
        expect(sam.locator('#next')).to_be_focused()  # the Veto button became "Undo veto" (a new key): focus stays in the card
        expect(sam.locator('#next .vetoes s')).to_have_text(paddington)
        expect(sam.locator('#next .ballot')).not_to_contain_text(paddington)  # a vetoed movie is off the ballot
        expect(sam.locator('#next [data-action="veto"]')).to_have_count(0)  # one veto each
        expect(sam.locator('#next [data-action="unveto"]')).to_have_count(1)
        expect(jo.locator('#next .vetoes')).to_contain_text('vetoed by Sam')
        expect(jo.locator('#next [data-action="veto"]')).to_have_count(3)  # Jo has not used a veto yet
        expect(jo.locator('#next [data-action="unveto"]')).to_have_count(0)  # Sam's is Sam's to undo
        expect(jo.locator('#next .veto-note')).to_have_text('one veto each')  # said beside the Vetoes, while you still have yours
        expect(sam.locator('#next .veto-note')).to_have_count(0)
        shot(sam, '04c-guest-veto')
        sam.click('#next [data-action="unveto"]')
        expect(sam.locator('#next .vetoes')).to_have_count(0)
        expect(sam.locator('#next [data-action="veto"]')).to_have_count(4)
        expect(sam.locator('#toast')).to_contain_text('Veto taken back')  # the write landed, not just the local echo
        veto_button(sam, 'veto').click()
        expect(sam.locator('#next .vetoes')).to_contain_text('vetoed by Sam')
        expect(sam.locator('#toast')).to_contain_text('Vetoed')  # on the server before Jo locks, or the lock can tie

        # Locking honours the veto: the other finalist wins outright (no tie, so no
        # reel) and the reveal flips the poster for each person, once.
        loser = jaws if winner == alien else alien
        lock = jo.locator('#next [data-action="lock-now"]')
        lock.click()
        lock.click()
        expect(sam.locator('.reveal-overlay')).to_be_visible(timeout=15000)
        expect(sam.locator('.reel-overlay')).to_have_count(0)
        sam.wait_for_timeout(1500)
        expect(sam.locator('.reveal-stage.waiting')).to_have_count(1)  # still face down: nothing turns by itself
        expect(sam.locator('.reveal-title')).to_have_text('')
        expect(sam.locator('.reveal-card')).to_be_focused()
        sam.keyboard.press('Enter')  # Enter turns it, like a tap
        expect(sam.locator('.reveal-title')).to_have_text(loser, timeout=10000)
        expect(sam.locator('.reveal-when')).to_contain_text("8 PM at Jo's")
        # The tap narrowed the house to a spotlight and brought the card forward.
        grown = sam.evaluate("(() => { const s = document.querySelector('.reveal-stage'); return s.getBoundingClientRect().width / s.offsetWidth; })()")
        assert grown > 1.05 and sam.locator('.reveal-overlay.turning').count() == 1, grown
        expect(sam.locator('.reveal-who')).to_contain_text('coming: you')  # who's coming, with faces
        expect(sam.locator('.reveal-who .face')).not_to_have_count(0)
        # Why it won, by name, not a fraction.
        expect(sam.locator('.reveal-why')).to_contain_text('thumbed it up')
        assert not re.search(r'\d+ of the \d+', sam.locator('.reveal-why').inner_text()), sam.locator('.reveal-why').inner_text()
        shot(sam, '04d-reveal')
        sam.keyboard.press('Tab')  # focus stays inside the dialog
        expect(sam.locator('.reveal-actions button')).to_be_focused()
        expect(sam.locator('.reveal-actions button')).to_have_text('See my ticket')  # Sam is coming
        sam.click('.reveal-actions button')
        expect(sam.locator('.reveal-overlay')).to_have_count(0)
        expect(sam.locator('#next .ticket h3')).to_contain_text(loser, ignore_case=True)
        # On the shelf the booked movie says so (its thumbs aren't passed over).
        expect(card(sam, loser).locator('.ribbon.booked')).to_contain_text('Booked')
        expect(sam.locator('#next .ticket')).to_be_focused()  # the reveal hands over to the ticket
        sam.wait_for_timeout(1500)
        expect(sam.locator('.tour-overlay')).to_have_count(0)  # and no news cards over it
        expect(jo.locator('.reveal-overlay')).to_be_visible(timeout=15000)
        jo.locator('.reveal-card').click(timeout=15000)  # turn it over
        expect(jo.locator('.reveal-title')).to_have_text(loser, timeout=10000)
        jo.keyboard.press('Escape')
        expect(jo.locator('.reveal-overlay')).to_have_count(0)
        # Seen is remembered on the person: a reload doesn't flip the card again.
        sam.reload()
        expect(sam.locator('#board h1')).to_contain_text(loser, ignore_case=True, timeout=10000)
        sam.wait_for_timeout(1500)
        expect(sam.locator('.reveal-overlay')).to_have_count(0)
        skip_cards(sam)  # Sam never pressed Got it, so the unread news opens again
        reels = [v['stringValue'] for v in json.loads(emu('GET', f'{DOCS}/people/sam'))['fields']['reels']['arrayValue']['values']]
        assert any(r.startswith(f'r:{day2}.') for r in reels), reels
        # Someone new with a movie waiting gets the show first: no walkthrough before it (How
        # it works is a tap away, and doesn't open over what follows). Until it has played,
        # the marquee keeps the movie face down.
        fresh = browser.new_context(viewport=PHONE).new_page()
        fresh.on('pageerror', lambda e: errors.append(f'fresh: {e}'))
        fresh.goto(f'{SITE}/?emu')
        expect(fresh.locator('.reveal-overlay')).to_be_visible(timeout=10000)
        expect(fresh.locator('#board h1')).to_have_text('The movie is…', timeout=10000)
        expect(fresh.locator('.tour-overlay')).to_have_count(0)
        expect(fresh.locator('#board h1')).to_have_text('The movie is…')  # still face down behind the card
        fresh.keyboard.press('Escape')  # Esc before it turns is 'not now': it stays face down
        expect(fresh.locator('.reveal-overlay')).to_have_count(0)
        expect(fresh.locator('#board h1')).to_have_text('The movie is…')
        # Stats don't give it away either: a booked movie isn't "Most wanted".
        expect(fresh.locator('#topWanted')).not_to_contain_text(loser, ignore_case=True)
        # The card back on the night is how you turn it over now: no extra amber button beside it.
        expect(fresh.locator('#next .ticket-back[data-action="reveal-now"]')).to_be_visible()
        expect(fresh.locator('#next .reveal-again')).to_have_count(0)
        # ...beside the night's title (the card floats its art; it isn't a grid)...
        tops = fresh.evaluate("[document.querySelector('#next .night-face .ticket-art').getBoundingClientRect().top, document.querySelector('#next .night-face h3').getBoundingClientRect().top]")
        assert abs(tops[0] - tops[1]) < 40, tops
        # ...and the face-down movie is off the shelf until it's turned over.
        expect(fresh.locator('#shelf .card h3', has_text=re.compile(f'^{re.escape(loser)}$', re.I))).to_have_count(0)
        fresh.click('#next [data-action="reveal-now"]')  # the card back: tap to turn it over
        fresh.click('.reveal-card')
        fresh.keyboard.press('Escape')  # once it has turned, Esc just closes it
        expect(fresh.locator('.reveal-overlay')).to_have_count(0)
        expect(fresh.locator('#board h1')).to_contain_text(loser, ignore_case=True)
        # A thumbs-up tapped before giving a name goes through once the name is in.
        card(fresh, paddington).locator('.vote').click()
        expect(fresh.locator('#pass')).to_be_visible()
        expect(card(fresh, paddington).locator('.vote')).to_have_attribute('aria-pressed', 'false')
        # What a visitor watched before giving a name counts as theirs: no second
        # reveal once they join, and it is saved on their person doc.
        fresh.fill('#passName', 'Fran')
        fresh.click('#passForm button[type=submit]')
        expect(fresh.locator('#whoami')).to_contain_text('Fran')
        expect(card(fresh, paddington).locator('.vote')).to_have_attribute('aria-pressed', 'true', timeout=10000)
        expect(fresh.locator('#toast')).to_contain_text('Your thumbs-up on')
        fresh.wait_for_timeout(1500)
        # Back where they tapped: the pressed thumb is on screen, not 2,000 px below.
        box = card(fresh, paddington).locator('.vote').bounding_box()
        vh = fresh.viewport_size['height']
        assert box and 0 <= box['y'] and box['y'] + box['height'] <= vh, (box, vh)
        expect(fresh.locator('.reveal-overlay')).to_have_count(0)
        reels = [v['stringValue'] for v in json.loads(emu('GET', f'{DOCS}/people/fran'))['fields']['reels']['arrayValue']['values']]
        assert any(r.startswith(f'r:{day2}.') for r in reels), reels

        # Unlock and re-pick with the theme back on: the theme beats thumbs, and the
        # new movie gets its own reveal.
        unlock = jo.locator('#next [data-action="unlock-night"]')
        unlock.click()
        unlock.click()
        expect(jo.locator('#next [data-action="lock-now"]')).to_be_visible(timeout=10000)
        expect(jo.locator('#next .vetoes')).to_contain_text(paddington)  # vetoes survive an unlock
        jo.select_option('#next select[data-theme-day]', 'Foreign')
        expect(jo.locator('#next .theme-chip')).to_have_text('Foreign')
        lock = jo.locator('#next [data-action="lock-now"]')
        lock.click()
        lock.click()
        sam.locator('.reveal-card').click(timeout=15000)
        expect(sam.locator('.reveal-title')).to_have_text(house_title, timeout=15000)
        sam.click('.reveal-actions button')
        expect(sam.locator('#next .ticket h3')).to_contain_text(house_title, ignore_case=True)
        expect(sam.locator('#next')).to_contain_text('Theme')
        # "Not you?" on Sam's phone (it asks twice): the next person on it still gets the
        # reveal Sam just saw (signed out, until they give a name); once they do it is
        # theirs: not played again, and saved on their person doc.
        sam.click('[data-action=switch]')
        expect(sam.locator('[data-action=switch]')).to_have_text('Tap again to switch')
        expect(sam.locator('#whoami')).to_contain_text('Sam')  # one tap doesn't drop anyone
        sam.click('[data-action=switch]')
        expect(sam.locator('.reveal-overlay')).to_be_visible(timeout=10000)
        sam.locator('.reveal-card').click(timeout=15000)  # turn it over
        expect(sam.locator('.reveal-title')).to_have_text(house_title)
        sam.keyboard.press('Escape')
        expect(sam.locator('.reveal-overlay')).to_have_count(0)
        sam.fill('#passName', 'Kim')
        sam.click('#passForm button[type=submit]')
        expect(sam.locator('#whoami')).to_contain_text('Kim')
        sam.wait_for_timeout(1500)
        expect(sam.locator('.tour-overlay')).to_have_count(0)  # this visit had its show: How it works waits for a tap
        expect(sam.locator('.reveal-overlay')).to_have_count(0)
        reels = [v['stringValue'] for v in json.loads(emu('GET', f'{DOCS}/people/kim'))['fields']['reels']['arrayValue']['values']]
        assert any(r.startswith(f'r:{day2}.') for r in reels), reels
        jo.locator('.reveal-card').click(timeout=15000)  # turn it over
        expect(jo.locator('.reveal-title')).to_have_text(house_title, timeout=15000)
        jo.keyboard.press('Escape')

        # That night is watched too.
        emu('PATCH', f'{DOCS}/nights/{day2}?updateMask.fieldPaths=startsAt',
            {'fields': {'startsAt': {'timestampValue': started}}}, owner=True)
        finish = jo.locator('#next [data-action="finish-night"]')
        expect(finish).to_be_visible(timeout=10000)
        finish.click()
        finish.click()
        expect(sam.locator('#past')).to_contain_text(house_title, timeout=10000)
        expect(sam.locator('#statTiles')).to_contain_text('Nights watched')

        # Name switching keeps working; the taste match belongs to a signed-in person.
        sam.click('[data-action=switch]')
        sam.click('[data-action=switch]')
        expect(sam.locator('#whoami')).to_be_empty()
        expect(sam.locator('#tasteCard')).to_be_hidden()
        expect(sam.locator('#topWanted li').first).to_be_visible()

        # A first-time visitor gets the walkthrough once.
        newbie = browser.new_context(viewport=PHONE).new_page()
        newbie.on('pageerror', lambda e: errors.append(f'newbie: {e}'))
        newbie.goto(f'{SITE}/?emu')
        tour = newbie.locator('.tour-overlay')
        expect(tour).to_be_visible(timeout=10000)
        shot(newbie, '05-tour')
        # Its demos are stamped samples with no real dates, and each card is announced.
        expect(tour.locator('.tour-demo.sample')).to_have_count(1)
        expect(tour.locator('[aria-live]')).to_have_text('How it works, 1 of 4: Welcome to the Weberplex')
        newbie.click('[data-tour="next"]')
        expect(tour.locator('.tour-demo .d-num')).to_have_text(['Thu', 'Fri', 'Sat', 'Sun'])  # weekdays, not dates
        expect(tour.locator('[aria-live]')).to_contain_text('2 of 4')
        newbie.click('[data-tour="next"]')
        newbie.click('[data-tour="next"]')
        newbie.click('[data-tour="done"]')
        expect(tour).to_have_count(0)
        newbie.fill('#passName', 'Newbie')
        newbie.click('#passForm button[type=submit]')
        expect(newbie.locator('#whoami')).to_contain_text('Newbie')
        newbie.wait_for_timeout(1500)
        newbie.reload()
        newbie.wait_for_timeout(1500)
        expect(tour).to_have_count(0)
        # The browser holds only the name; the rest is on people/newbie.
        keys = newbie.evaluate('Object.keys(localStorage)')
        assert keys == ['ps.me'], keys
        person = json.loads(emu('GET', f'{DOCS}/people/newbie'))['fields']
        assert person['toured']['booleanValue'] is True, person
        # Same name on another phone (already signed in there): the database
        # knows Newbie has seen the walkthrough, so it stays closed.
        octx = browser.new_context(viewport=PHONE)
        octx.add_init_script("""try { localStorage.setItem('ps.me', JSON.stringify({ name: 'Newbie', nameKey: 'newbie' })); } catch (e) {}""")
        other = octx.new_page()
        other.goto(f'{SITE}/?emu')
        expect(other.locator('#whoami')).to_contain_text('Newbie', timeout=10000)
        other.wait_for_timeout(2000)
        expect(other.locator('.tour-overlay')).to_have_count(0)
        newbie.locator('.topbar [data-action="tour"]').click()
        expect(tour).to_be_visible()
        newbie.keyboard.press('Escape')
        expect(tour).to_have_count(0)
        # Android's back gesture closes the card on top instead of leaving the site.
        newbie.locator('.topbar [data-action="tour"]').click()
        expect(tour).to_be_visible()
        newbie.go_back()
        expect(tour).to_have_count(0)
        assert newbie.url.startswith(SITE), newbie.url
        expect(newbie.locator('#whoami')).to_contain_text('Newbie')

        paint_checks(newbie)
        ballot_checks(browser, errors)
        news_cards_checks(browser, errors)
        honest_sending_checks(browser, errors)
        reveal_invite_checks(browser, errors)
        reveal_ending_checks(browser, errors)
        locking_phone_checks(browser, errors)
        big_text_checks(browser, errors)
        flaky_start_checks(browser, errors)
        stale_lock_checks(browser, errors)
        trailer_checks(browser, errors)
        overlay_checks(browser, errors)
        owner_gate_checks(browser, errors)
        long_name_checks(browser, errors)
        paste_list_checks(browser, errors)
        owner_guard_checks(browser, errors)  # last: it changes the owner password
        browser.close()

    own = [m for m in missing if SITE in m]
    if own:
        errors.append(f'site files missing: {own}')
    if errors:
        print('ERRORS:\n' + '\n'.join(errors))
        sys.exit(1)
    print(f'E2E PASS — screenshots in {SHOTS} (house pick: {house_title})')


if __name__ == '__main__':
    main()
