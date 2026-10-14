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

        # Subscribe: the calendar section's panel has an Apple link and a Google link
        # with a Copy button; the page also carries a static link-preview card.
        ctx['sam'].grant_permissions(['clipboard-read', 'clipboard-write'])
        expect(sam.locator('#subPanel')).to_be_hidden()
        sam.click('[data-action="subscribe"]')
        expect(sam.locator('#subPanel')).to_be_visible()
        expect(sam.locator('[data-action="subscribe"]')).to_have_attribute('aria-expanded', 'true')
        expect(sam.locator('#subApple')).to_have_attribute('href', re.compile(r'^webcal://[^/]+/calendar\.ics$'))
        expect(sam.locator('#subUrl')).to_have_value(re.compile(r'^https://[^/]+/calendar\.ics$'))
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

        # Calendar: Jo marks a day free and volunteers to host it.
        cell = jo.locator('#calendar .day').nth(2)
        day = cell.get_attribute('data-day')
        cell.click()
        expect(jo.locator(f'#calendar .day.on[data-day="{day}"]')).to_have_count(1)
        jo.select_option('#hostTime', '20:00')
        jo.click('#dayDetail [data-action="host"]')
        expect(jo.locator('#board')).to_contain_text("Movie night at Jo's")
        expect(sam.locator('#next')).to_contain_text("At Jo's")
        sam.click('#next [data-action="free"]')  # Count me in
        expect(sam.locator('#next')).to_contain_text('Sam')
        expect(sam.locator('#next .leaders')).to_contain_text(alien)
        expect(sam.locator('#next .host-tools')).to_have_count(0)  # only the host gets tools
        expect(jo.locator('#next .host-tools')).to_have_count(1)
        shot(sam, '01-guest-planned')

        # Seen marks and the filter.
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
        expect(sam.locator('#news')).to_be_visible(timeout=10000)
        expect(sam.locator('#newsList')).to_contain_text('new movie')
        expect(sam.locator('#newsList')).to_contain_text('thumbs-up')
        expect(card(sam, paddington).locator('.new-chip')).to_have_count(1)
        expect(card(sam, jaws).locator('.vote-new')).to_have_text('+1')
        shot(sam, '02-guest-news')
        sam.click('#news [data-action="news-seen"]')
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

        # Name switching keeps working.
        sam.click('[data-action=switch]')
        expect(sam.locator('#whoami')).to_be_empty()

        # A first-time visitor gets the walkthrough once.
        newbie = browser.new_context(viewport=PHONE).new_page()
        newbie.on('pageerror', lambda e: errors.append(f'newbie: {e}'))
        newbie.goto(f'{SITE}/?emu')
        tour = newbie.locator('.tour-overlay')
        expect(tour).to_be_visible(timeout=10000)
        shot(newbie, '05-tour')
        for _ in range(5):
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
