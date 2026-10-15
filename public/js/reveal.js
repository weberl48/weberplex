// The reveal: the movie, face down on a card, once it has been locked. The
// house goes dark and the card waits in a ring of chasing bulbs until you turn
// it over (a tap, Enter or Space); then the poster, the title and where you go
// next. Shown once per person (app.js decides when). Same manners as the reel:
// focus moves in, Tab stays inside, Esc closes, focus goes back, and
// reduced-motion turns it without the spin.
import { esc, posterImg, keyOf, backCloses } from './ui.js';

const bigPoster = (url) => (url || '').replace('/poster/small/', '/poster/medium/');

// `doneText` names where the last button goes ("See my ticket" for someone
// coming). `invite`: someone not coming yet gets Count me in / Not this time.
// Resolves { movie, seen, rsvp }: `seen` is false when back closed it before
// the card turned (it plays again next visit); `rsvp` is true for Count me in.
// It lands as a sentence: "The movie is…" finished by the title, then when and
// where, `people` ("4 coming: you, Gma, Hal and Sam", with `faces`) and `why`
// ("Hal, Jo and you thumbed it up"), one after another. `atOnce`: the house is
// already dark (the curtain opens onto it), so no fade.
export function revealMovie(movie, { when = '', place = '', doneText = 'OK', invite = false, people = '', faces = '', why = '', atOnce = false } = {}) {
  return new Promise((resolve) => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlay = document.createElement('div');
    overlay.className = `reveal-overlay${atOnce ? ' at-once' : ''}`;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Your movie night');
    overlay.innerHTML = `
      <div class="reveal-box">
        <h2>The movie is…</h2>
        <div class="reveal-stage waiting">
          <button class="reveal-card" type="button" aria-label="Turn the card over">
            <span class="reveal-face reveal-cover" aria-hidden="true">
              <span class="rc-house">Weberplex</span><span class="rc-q">?</span>
              <span class="rc-night">${esc(when)}${place ? `<br>at ${esc(place)}` : ''}</span>
            </span>
            <span class="reveal-face reveal-poster">${posterImg(bigPoster(movie.poster), movie.title, '', true)}</span>
          </button>
        </div>
        <p class="reveal-hint" aria-hidden="true">Tap to turn it over</p>
        <p class="reveal-title" aria-hidden="true"></p>
        <p class="reveal-when" aria-hidden="true"></p>
        <p class="reveal-who" aria-hidden="true"></p>
        <p class="reveal-why" aria-hidden="true"></p>
        <p class="sr-only" aria-live="polite"></p>
        <div class="row reveal-actions" hidden>${invite
          ? '<button class="btn btn-bulb" type="button" data-r="in">Count me in</button><button class="btn btn-ghost" type="button" data-r="ok">Not this time</button>'
          : `<button class="btn btn-bulb" type="button" data-r="ok">${esc(doneText)}</button>`}</div>
      </div>`;
    const prev = document.activeElement;
    const prevKey = prev ? keyOf(prev) : null; // a repaint under the overlay can replace prev
    document.body.append(overlay);
    const stage = overlay.querySelector('.reveal-stage');
    const card = overlay.querySelector('.reveal-card');
    const actions = overlay.querySelector('.reveal-actions');
    const buttons = [...actions.querySelectorAll('button')];
    const $in = (sel) => overlay.querySelector(sel);
    card.focus();
    let turned = false;
    const finish = () => {
      if (!actions.hidden) return;
      card.classList.add('flipped');
      // The house lights it up: the bulbs flash and hold lit, the title lands,
      // and the lines under it arrive one after another (site.css).
      stage.classList.add('landed');
      overlay.classList.add('landed');
      const whenText = [when, place && `at ${place}`].filter(Boolean).join(' ');
      $in('.reveal-title').textContent = movie.title;
      $in('.reveal-when').textContent = whenText;
      $in('.reveal-who').innerHTML = people ? `${faces}<span>${esc(people)}</span>` : '';
      $in('.reveal-why').textContent = why;
      // A screen reader hears the whole landing at once.
      $in('[aria-live]').textContent = [`The movie is ${movie.title}.`, whenText && `${whenText}.`, people && `${people}.`, why && `${why[0].toUpperCase()}${why.slice(1)}.`].filter(Boolean).join(' ');
      actions.hidden = false;
      buttons[0].focus();
    };
    const turn = () => {
      if (turned) return;
      turned = true;
      stage.classList.remove('waiting');
      overlay.classList.add('turning'); // the house narrows to a spotlight; the card comes forward
      $in('.reveal-hint').hidden = true;
      card.setAttribute('tabindex', '-1');
      if (reduce) { finish(); return; }
      card.classList.add('flipped');
      // The poster has settled by about 600 ms (the turn eases out): the title
      // lands then, not when the transition formally ends at 1 s.
      setTimeout(finish, 650);
    };
    const close = (seen = true, rsvp = false) => {
      if (!overlay.isConnected || overlay.classList.contains('closing')) return;
      release();
      // The house lights come up over a moment while the page (and a ticket
      // printing in) shows through, rather than a cut.
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), reduce ? 0 : 380);
      document.removeEventListener('keydown', onKey, true);
      (prev?.isConnected ? prev : prevKey && document.querySelector(prevKey))?.focus?.();
      resolve({ movie, seen, rsvp });
    };
    // Seen once it's been turned (a tap means they wanted to look).
    const release = backCloses(() => close(turned));
    function onKey(e) {
      // Esc is "not now", like back: face down, it stays face down for next visit.
      if (e.key === 'Escape') { e.preventDefault(); close(turned); }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (actions.hidden) { card.focus(); return; }
        const at = buttons.indexOf(document.activeElement);
        buttons[(at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    card.addEventListener('click', turn);
    actions.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) close(true, b.dataset.r === 'in');
    });
  });
}
