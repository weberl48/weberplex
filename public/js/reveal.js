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
// `feature` replaces "The movie is…" once it has turned ("Friday's feature").
export function revealMovie(movie, { when = '', place = '', doneText = 'OK', invite = false, feature = '' } = {}) {
  return new Promise((resolve) => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlay = document.createElement('div');
    overlay.className = 'reveal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Your movie night');
    overlay.innerHTML = `
      <div class="reveal-box">
        <h2>The movie is…</h2>
        <div class="reveal-stage waiting">
          <button class="reveal-card" type="button" aria-label="Turn the card over">
            <span class="reveal-face reveal-cover" aria-hidden="true"><span>?</span></span>
            <span class="reveal-face reveal-poster">${posterImg(bigPoster(movie.poster), movie.title, '', true)}</span>
          </button>
        </div>
        <p class="reveal-hint" aria-hidden="true">Tap to turn it over</p>
        <p class="reveal-title" aria-live="polite"></p>
        <p class="reveal-when"></p>
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
    card.focus();
    let turned = false;
    const finish = () => {
      if (!actions.hidden) return;
      card.classList.add('flipped');
      // The house lights it up: the bulbs flash and hold lit, the heading resolves.
      stage.classList.add('landed');
      if (feature) overlay.querySelector('h2').textContent = feature;
      overlay.querySelector('.reveal-title').textContent = movie.title;
      overlay.querySelector('.reveal-when').textContent = [when, place && `at ${place}`].filter(Boolean).join(' ');
      actions.hidden = false;
      buttons[0].focus();
    };
    const turn = () => {
      if (turned) return;
      turned = true;
      stage.classList.remove('waiting');
      overlay.querySelector('.reveal-hint').hidden = true;
      card.setAttribute('tabindex', '-1');
      if (reduce) { finish(); return; }
      card.classList.add('flipped');
      // The poster has settled by about 600 ms (the turn eases out): the title
      // lands then, not when the transition formally ends at 1 s.
      setTimeout(finish, 650);
    };
    const close = (seen = true, rsvp = false) => {
      if (!overlay.isConnected) return;
      release();
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      (prev?.isConnected ? prev : prevKey && document.querySelector(prevKey))?.focus?.();
      resolve({ movie, seen, rsvp });
    };
    const release = backCloses(() => close(!actions.hidden));
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); turned = true; finish(); close(); }
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
