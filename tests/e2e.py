"""End-to-end run of a whole movie night against the Firestore emulator.

Run: npm run test:e2e   (wraps this in the emulator; serves public/ itself
on :5173 unless something is already listening there).
Screenshots go to the first argument, default ./e2e-shots.
"""
import functools
import http.server
import json
import sys
import threading
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

SITE = 'http://localhost:5173'
EMU = 'http://127.0.0.1:8181'
PROJECT = 'speakeasy-picture-show'
KEY = 'e2e-host-key-0123456789abcdef'
SHOTS = Path(sys.argv[1] if len(sys.argv) > 1 else 'e2e-shots')
SHOTS.mkdir(parents=True, exist_ok=True)
PHONE = {'width': 390, 'height': 844}


def emu(method, path, body=None):
    req = urllib.request.Request(f'{EMU}{path}', method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json'})
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
    emu('POST', f'/v1/projects/{PROJECT}/databases/(default)/documents/config?documentId=host',
        {'fields': {'key': {'stringValue': KEY}}})


def local_input(dt):
    return dt.strftime('%Y-%m-%dT%H:%M')


def shot(page, name):
    page.screenshot(path=str(SHOTS / f'{name}.png'), full_page=True)


def join(page, name):
    page.goto(f'{SITE}/?emu')
    expect(page.locator('#pass')).to_be_visible()
    page.fill('#passName', name)
    page.click('#passForm button[type=submit]')
    expect(page.locator('#whoami')).to_contain_text(name)


def search(page, term):
    page.fill('#q', term)
    page.press('#q', 'Enter')
    return page.locator(f'#results[data-q="{term}"]')


def pick(page, term, expect_msg='Added'):
    first = search(page, term).locator('.result').first
    expect(first).to_be_visible(timeout=10000)
    title = first.locator('.t').inner_text()
    first.click()
    expect(page.locator('#pickMsg')).to_contain_text(expect_msg, timeout=10000)
    return title


def main():
    ensure_site()
    reset()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        host_ctx = browser.new_context(viewport={'width': 900, 'height': 1000})
        sam_ctx = browser.new_context(viewport=PHONE, accept_downloads=True)
        jo_ctx = browser.new_context(viewport=PHONE)
        host, sam, jo = host_ctx.new_page(), sam_ctx.new_page(), jo_ctx.new_page()
        missing = set()
        for name, page in (('host', host), ('sam', sam), ('jo', jo)):
            page.on('console', lambda m, n=name: m.type == 'error' and 'Failed to load resource' not in m.text
                    and errors.append(f'{n}: {m.text}'))
            page.on('pageerror', lambda e, n=name: errors.append(f'{n}: {e}'))
            page.on('response', lambda r: r.status >= 400 and missing.add(f'{r.status} {r.url}'))

        # Dark house before anything is booked.
        sam.goto(f'{SITE}/?emu')
        expect(sam.locator('#board')).to_contain_text('No show booked')
        shot(sam, '01-guest-dark')

        # Host books a night with one past and one future date.
        host.goto(f'{SITE}/host.html?emu#k={KEY}')
        expect(host.locator('#newSec')).to_be_visible()
        assert 'k=' not in host.url, 'host key should be scrubbed from the URL'
        host.fill('#newTitle', 'Spooky Season')
        past = datetime.now() - timedelta(hours=2)
        future = (datetime.now() + timedelta(days=3)).replace(hour=20, minute=0, second=0, microsecond=0)
        host.locator('#newDates input').first.fill(local_input(future))
        host.click('#addNewDate')
        host.locator('#newDates input').nth(1).fill(local_input(past))
        host.locator('#newDates select').nth(1).select_option('Ferger')
        host.click('#newForm button[type=submit]')
        expect(host.locator('#nightSec')).to_be_visible()
        expect(host.locator('#dateList .date-item')).to_have_count(2)

        # Host adds a tagged house pick from the console.
        host.click('#houseTags [data-house-tag="Rewatch"]')
        host.fill('#houseQ', 'the descent')
        host.click('#houseForm button[type=submit]')
        house_first = host.locator('#houseResults .result').first
        expect(house_first).to_be_visible(timeout=10000)
        house_first.click()
        expect(host.locator('#houseMsg')).to_contain_text('as a house pick', timeout=10000)

        # Guests sign in and RSVP.
        join(sam, 'Sam')
        expect(sam.locator('#board')).to_contain_text('Spooky Season')
        sam.locator('.showtime').nth(0).click()
        sam.locator('.showtime').nth(1).click()
        expect(sam.locator('.showtime.on')).to_have_count(2)
        join(jo, 'Jo')
        jo.locator('.showtime').nth(1).click()  # the future night (dates sort by time)
        expect(jo.locator('.showtime').nth(1)).to_contain_text('2 in')
        expect(jo.locator('.showtime').nth(1)).to_contain_text('Most people')
        expect(jo.locator('.showtime').nth(0)).to_contain_text("at Ferger's")  # the past night, sorted first

        # Five picks, then the sixth is refused.
        titles = [pick(sam, t) for t in ('dune part two', 'alien', 'jaws', 'paddington', 'heat')]
        expect(sam.locator('#picksLeft')).to_have_text('0 of 5 left')
        expect(sam.locator('#strip .frame img')).to_have_count(5)
        pick(sam, 'the thing', expect_msg='used all 5 picks')
        shot(sam, '02-guest-five-picks')

        # Duplicate is caught with a pointer to the existing card.
        taken = search(jo, 'jaws').locator('.result.taken').first
        expect(taken).to_be_visible(timeout=10000)
        taken.click()
        expect(jo.locator('#pickMsg')).to_contain_text('already on the ballot')
        jo_title = pick(jo, 'ratatouille')

        # The house pick shows its tag, doesn't use anyone's five, and filters.
        house_card = sam.locator('.card', has_text='House pick')
        expect(house_card).to_have_count(1)
        expect(house_card.locator('.tag-chip')).to_have_text('Rewatch')
        sam.click('#shelfChips [data-tag="Rewatch"]')
        expect(sam.locator('#ballot .card')).to_have_count(1)
        sam.click('#shelfChips [data-tag="Guest picks"]')
        expect(sam.locator('#ballot .card')).to_have_count(6)
        sam.click('#shelfChips [data-tag="All"]')
        expect(sam.locator('#ballot .card')).to_have_count(7)

        # Every card links to Stremio.
        href = sam.locator('.card', has_text=titles[0]).locator('a', has_text='Stremio').get_attribute('href')
        assert href.startswith('https://web.stremio.com/#/detail/movie/tt'), href

        # Browse tabs: Trending fills a poster grid; Jo adds one from it.
        jo.click('#browseTabs [data-tab="trending"]')
        tile_add = jo.locator('#browseGrid .tile:not(.taken) .add').first
        expect(tile_add).to_be_visible(timeout=15000)
        tile_add.click()
        expect(jo.locator('#pickMsg')).to_contain_text('Added', timeout=10000)
        expect(jo.locator('#picksLeft')).to_have_text('3 of 5 left')
        # For you explains its picks (Sam has five picks to learn from).
        sam.click('#browseTabs [data-tab="foryou"]')
        expect(sam.locator('#browseGrid .tile-why').first).to_be_visible(timeout=20000)
        expect(sam.locator('#browseNote')).to_contain_text('what you picked')
        shot(sam, '03c-guest-for-you')
        sam.click('#browseTabs [data-tab="search"]')

        # Votes: one each -> tie at the top.
        sam.locator('.card', has_text=titles[0]).locator('.vote').click()
        jo.locator('.card', has_text=jo_title).locator('.vote').click()
        expect(sam.locator('.card.lead')).to_have_count(2)
        expect(sam.locator('#board')).to_contain_text('2-way tie')
        # Sam removes a pick and gets the slot back.
        sam.locator('.card', has_text=titles[4]).locator('[data-action=unpick]').click()
        expect(sam.locator('#picksLeft')).to_have_text('1 of 5 left')

        # Snacks.
        sam.click('[data-action=quick-snack][data-item=Popcorn]')
        jo.fill('#snackItem', 'Root beer')
        jo.click('#snackForm button[type=submit]')
        expect(sam.locator('#snacks .snack')).to_have_count(2)
        shot(sam, '03-guest-ballot')
        shot(jo, '03b-guest-jo')

        # Host sends a ballot movie to the Shield (HA watches control/shield).
        host.locator('#lockMovies [data-shield]').first.click()
        expect(host.locator('#toast')).to_contain_text('Sent', timeout=10000)
        ctl = json.loads(emu('GET', f'/v1/projects/{PROJECT}/databases/(default)/documents/control/shield'))
        assert ctl['fields']['imdb']['stringValue'].startswith('tt'), ctl

        # Host: tie hint, spin the reel, lock on the future night.
        expect(host.locator('#spinHint')).to_contain_text('tied')
        host.click('#spinBtn')
        use = host.locator('.reel-overlay button')
        expect(use).to_be_visible(timeout=10000)
        shot(host, '04-host-reel')
        winner = host.locator('.reel-result').inner_text().removeprefix("It's ").rstrip('.')
        use.click()
        host.locator('#lockDates input').nth(1).check()
        shot(host, '05-host-lock')
        host.click('#lockBtn')
        expect(host.locator('#lockedCard')).to_be_visible()

        # Guests see the booking, ticket and calendar file.
        expect(sam.locator('#board')).to_contain_text('now booking')
        expect(sam.locator('#board h1')).to_have_text(winner.upper(), ignore_case=True)
        expect(sam.locator('.ticket')).to_contain_text('ADMIT ONE')
        expect(sam.locator('#lineup .guest')).to_have_count(2)
        with sam.expect_download() as dl:
            sam.click('[data-action=ics]')
        ics = Path(dl.value.path()).read_text()
        assert 'BEGIN:VEVENT' in ics and 'DTSTART:' in ics and winner.split(':')[0] in ics, ics
        shot(sam, '06-guest-ticket')

        # Reopen, then lock on the night that already started.
        host.click('#reopenBtn')
        host.click('#reopenBtn')
        expect(host.locator('#lockCard')).to_be_visible()
        expect(sam.locator('#ballotSec')).to_be_visible()
        host.locator('#lockDates input').nth(0).check()
        host.click('#lockBtn')
        expect(sam.locator('#board')).to_contain_text('Now showing')
        expect(sam.locator('#board')).to_contain_text("at Ferger's")
        expect(sam.locator('.ticket')).to_contain_text("Ferger's")
        expect(sam.locator('#reviewSec')).to_be_visible()

        # Reviews.
        sam.click('#stars [data-star="4"]')
        sam.fill('#reviewLine', 'The sound in the basement is unreal')
        sam.click('#reviewForm button[type=submit]')
        jo.click('#stars [data-star="5"]')
        jo.click('#reviewForm button[type=submit]')
        expect(sam.locator('#reviews .review')).to_have_count(2)
        expect(sam.locator('#reviewAvg')).to_contain_text('4.5')
        shot(sam, '07-guest-showing')

        # We watched it -> dark house, past screenings with stars.
        host.click('#finishBtn')
        host.click('#finishBtn')
        expect(host.locator('#newSec')).to_be_visible()
        expect(sam.locator('#board')).to_contain_text('No show booked')
        expect(sam.locator('#past .past-row')).to_have_count(1)
        expect(sam.locator('#past')).to_contain_text('4.5')
        shot(sam, '08-guest-past')

        # Name switching keeps working.
        sam.click('[data-action=switch]')
        expect(sam.locator('#whoami')).to_be_empty()

        browser.close()
    # Poster CDNs 404 for some titles; the page shows a text tile instead.
    own = [m for m in missing if SITE in m]
    if missing:
        print('MISSING RESOURCES:\n' + '\n'.join(sorted(missing)))
    if own:
        errors.append(f'site files missing: {own}')
    if errors:
        print('CONSOLE ERRORS:\n' + '\n'.join(errors))
        sys.exit(1)
    print(f'E2E PASS — screenshots in {SHOTS}')


if __name__ == '__main__':
    main()
