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

from playwright.sync_api import expect, sync_playwright

SITE = 'http://localhost:5173'
EMU = 'http://127.0.0.1:8181'
PROJECT = 'speakeasy-picture-show'
DOCS = f'/v1/projects/{PROJECT}/databases/(default)/documents'
KEY = 'e2e-host-key-0123456789abcdef'
SHOTS = Path(sys.argv[1] if len(sys.argv) > 1 else 'e2e-shots')
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {'width': 390, 'height': 844}


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
    if page.locator('.tour-overlay').count():
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
    expect(page.locator('#pickMsg')).to_contain_text('Added', timeout=10000)
    return title


def card(page, title):
    return page.locator('#shelf .card', has=page.locator('h3', has_text=title)).first

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
    skip_tour(page)
    page.evaluate("""() => {
      const box = document.createElement('div');
      box.id = 'fbox';
      document.body.append(box);
      window.paintBox = async (html) => (await import('/js/ui.js')).paint(box, html);
    }""")
    veto = '<button type="button" data-action="veto" data-id="m">%s</button>'
    opens = {
        'reveal': ("""import('/js/reveal.js').then((m) => m.revealMovie({ title: 'The Man Who Would Be King', poster: '' }, { when: 'Fri 8 PM', place: "Jo's" }))""", '.reveal-overlay .reveal-actions'),
        'reel': ("""import('/js/reel.js').then((m) => { const ms = [{ title: 'A', poster: '' }, { title: 'B', poster: '' }]; return m.spinReel(ms, ms[1], { title: '2-way tie. The reel decides…', done: 'Nice' }); })""", '.reel-overlay'),
    }
    for name, (open_js, overlay) in opens.items():
        page.evaluate('(h) => paintBox(h)', veto % 'Veto')
        page.focus('#fbox [data-action="veto"]')
        page.evaluate(f'() => {{ {open_js}; }}')
        if name == 'reveal':
            page.click('.reveal-card')  # the card waits face down until it's turned
        expect(page.locator(f'{overlay} button').first).to_be_visible()
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
    skip_tour(page)
    expect(page.locator('#past .past-row .d', has_text=LONG)).to_have_count(1, timeout=10000)
    expect(page.locator('#rateBox .review .who span:first-child', has_text=LONG)).to_have_count(1)
    over = page.evaluate(wide)
    assert over <= 0, f'guest page is {over}px too wide'
    shot(page, '07-long-name-guest')
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
    expect(page.locator('#toast')).to_contain_text('in for', timeout=10000)
    assert json.loads(emu('GET', f'{DOCS}/free/{day}__nia', owner=True)).get('fields'), 'Nia is on the list'
    page.context.close()
    # Out of the way of the checks that follow (they open a reveal of their own).
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
    hal.select_option(f'#next #next-time-{day}', '21:00')
    hal.click(f'#next [data-action="night-time"]')
    expect(hal.locator('#toast')).to_contain_text('Moved to', timeout=10000)
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
    shot(wren, '02b-guest-news-veto')
    wren.click('[data-tour="next"]')
    expect(walk.locator('#tourTitle')).to_contain_text('Hal is bringing Candy')
    wren.click('[data-tour="done"]')
    expect(walk).to_have_count(0)
    expect(wren.locator('#news')).to_be_hidden()
    wren.wait_for_timeout(1500)
    wren.reload()
    expect(wren.locator('#whoami')).to_contain_text('Wren', timeout=10000)
    wren.wait_for_timeout(2000)
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
    wren.keyboard.press('Escape')
    expect(wren.locator('#news')).to_be_hidden()
    assert wren.evaluate('document.activeElement && document.activeElement !== document.body'), 'focus kept after the bar hides'
    wren.context.close()


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
        expect(jo.locator('#pickMsg')).to_contain_text('Added', timeout=10000)
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
        expect(jo.locator('#board')).not_to_contain_text("Movie night at Jo's")
        jo.click('#dayDetail [data-action="host-slip"]')
        jo.click('#dayDetail [data-action="host"]')
        expect(jo.locator('#board')).to_contain_text("Movie night at Jo's")
        expect(sam.locator('#next')).to_contain_text("At Jo's")
        sam.click('#next [data-action="free"]')  # Count me in
        expect(sam.locator('#next')).to_contain_text('Sam')
        expect(sam.locator('#next .leaders')).to_contain_text(alien)
        expect(sam.locator('#next .host-tools')).to_have_count(0)  # only the host gets tools
        expect(jo.locator('#next .host-tools')).to_have_count(1)
        shot(sam, '01-guest-planned')

        # Seen marks (right under the poster) and the filter.
        card(sam, jaws).locator('[data-action="seen"]').click()
        expect(card(sam, jaws)).to_contain_text('Seen by Sam')
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
            if 'thumbs-up' in titles[-1]:
                break
            sam.click('[data-tour="next"]')
        assert any('new movie' in t for t in titles) and 'thumbs-up' in titles[-1], titles
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

        # The host locks the movie: the favorite of the people coming.
        lock = jo.locator('#next [data-action="lock-now"]')
        lock.click()
        lock.click()
        # Alien and Jaws are tied among the people coming: the reel settles it,
        # and plays once on each phone.
        expect(sam.locator('.reel-overlay button')).to_be_visible(timeout=15000)
        sam.locator('.reel-overlay button').click()
        expect(sam.locator('#next .ticket')).to_contain_text('ADMIT ONE', timeout=10000)
        expect(sam.locator('#next .ticket h3')).not_to_have_text('The movie is…')  # face up once the reel has played
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
        # The host's tools sit in Up next and in the day panel: each Change time
        # button saves the menu beside it, not the first one on the page.
        expect(jo.locator('#dayDetail .host-tools select[id^="dd-time-"]')).to_have_count(1)
        jo.select_option(f'#dayDetail #dd-time-{day2}', '21:00')
        jo.click('#dayDetail [data-action="night-time"]')
        expect(jo.locator('#next h3').first).to_contain_text(re.compile(r'9:00\sPM'), timeout=10000)
        expect(jo.locator('#toast')).to_contain_text('Moved to')  # the write has landed, not just the local echo
        jo.select_option(f'#dayDetail #dd-time-{day2}', '20:00')
        jo.click('#dayDetail [data-action="night-time"]')
        expect(jo.locator('#next h3').first).to_contain_text(re.compile(r'8:00\sPM'), timeout=10000)
        sam.click('#next [data-action="free"]')  # Count me in
        expect(sam.locator('#next .dd-line').first).to_contain_text('Sam')
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
        expect(sam.locator('#next .leaders li')).to_have_count(3)  # Paddington, the other finalist, Jo's trending pick

        # The snack chips share an action and a day: the one you tapped keeps focus when the
        # list repaints, not the first chip.
        sam.click('#next [data-action="quick-snack"][data-item="Candy"]')
        expect(sam.locator('#next .snack')).to_contain_text('Candy')
        expect(sam.locator('#next [data-action="quick-snack"][data-item="Candy"]')).to_be_focused()

        # Sam vetoes Paddington (it would have tied with the other finalist): struck
        # through for everyone, one veto each, and only its owner can undo it.
        def veto_button(page, action):
            return page.locator('#next .leaders li', has_text=paddington).locator(f'[data-action="{action}"]')
        veto_button(sam, 'veto').click()
        expect(sam.locator('#next .vetoes')).to_contain_text('vetoed by Sam')
        expect(sam.locator('#next')).to_be_focused()  # the Veto button became "Undo veto" (a new key): focus stays in the card
        expect(sam.locator('#next .vetoes s')).to_have_text(paddington)
        expect(sam.locator('#next .leaders')).not_to_contain_text(paddington)
        expect(sam.locator('#next [data-action="veto"]')).to_have_count(0)  # one veto each
        expect(sam.locator('#next [data-action="unveto"]')).to_have_count(1)
        expect(jo.locator('#next .vetoes')).to_contain_text('vetoed by Sam')
        expect(jo.locator('#next [data-action="veto"]')).to_have_count(2)  # Jo has not used a veto yet
        expect(jo.locator('#next [data-action="unveto"]')).to_have_count(0)  # Sam's is Sam's to undo
        expect(jo.locator('#next .veto-note')).to_have_text('one veto each')  # said beside the Vetoes, while you still have yours
        expect(sam.locator('#next .veto-note')).to_have_count(0)
        shot(sam, '04c-guest-veto')
        sam.click('#next [data-action="unveto"]')
        expect(sam.locator('#next .vetoes')).to_have_count(0)
        expect(sam.locator('#next [data-action="veto"]')).to_have_count(3)
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
        shot(sam, '04d-reveal')
        sam.keyboard.press('Tab')  # focus stays inside the dialog
        expect(sam.locator('.reveal-actions button')).to_be_focused()
        expect(sam.locator('.reveal-actions button')).to_have_text('See my ticket')  # Sam is coming
        sam.click('.reveal-actions button')
        expect(sam.locator('.reveal-overlay')).to_have_count(0)
        expect(sam.locator('#next .ticket h3')).to_contain_text(loser, ignore_case=True)
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
        # Someone new gets the walkthrough first; the reveal waits for it to close, and
        # until it has played the marquee keeps the movie face down.
        fresh = browser.new_context(viewport=PHONE).new_page()
        fresh.on('pageerror', lambda e: errors.append(f'fresh: {e}'))
        fresh.goto(f'{SITE}/?emu')
        expect(fresh.locator('.tour-overlay')).to_be_visible(timeout=10000)
        expect(fresh.locator('#board h1')).to_have_text('The movie is…', timeout=10000)
        fresh.wait_for_timeout(1500)
        expect(fresh.locator('.reveal-overlay')).to_have_count(0)
        fresh.click('[data-tour="skip"]')
        expect(fresh.locator('.reveal-overlay')).to_be_visible(timeout=10000)
        expect(fresh.locator('#board h1')).to_have_text('The movie is…')  # still face down behind the card
        fresh.keyboard.press('Escape')
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
        expect(sam.locator('.tour-overlay')).to_be_visible(timeout=10000)  # a new person gets the walkthrough first
        sam.click('[data-tour="skip"]')
        sam.wait_for_timeout(1500)
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
        expect(tour.locator('[aria-live]')).to_have_text('How it works, 1 of 5: Welcome to the Weberplex')
        newbie.click('[data-tour="next"]')
        newbie.click('[data-tour="next"]')
        expect(tour.locator('.tour-demo .d-num')).to_have_text(['Thu', 'Fri', 'Sat', 'Sun'])  # weekdays, not dates
        expect(tour.locator('[aria-live]')).to_contain_text('3 of 5')
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
        news_cards_checks(browser, errors)
        honest_sending_checks(browser, errors)
        reveal_invite_checks(browser, errors)
        overlay_checks(browser, errors)
        owner_gate_checks(browser, errors)
        long_name_checks(browser, errors)
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
