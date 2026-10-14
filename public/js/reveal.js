// The reveal: a card flips over to the poster when the movie has been locked.
// Shown once per person (app.js decides when). Same manners as the reel:
// focus moves in, Tab stays inside, Esc closes, focus goes back, and
// reduced-motion skips the flip.
import { posterImg, keyOf } from './ui.js';

const bigPoster = (url) => (url || '').replace('/poster/small/', '/poster/medium/');

export function revealMovie(movie, { when = '', place = '' } = {}) {
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
        <div class="reveal-stage">
          <div class="reveal-card">
            <div class="reveal-face reveal-cover" aria-hidden="true"><span>?</span></div>
            <div class="reveal-face reveal-poster">${posterImg(bigPoster(movie.poster), movie.title)}</div>
          </div>
        </div>
        <p class="reveal-title" aria-live="polite"></p>
        <p class="reveal-when"></p>
        <div class="row" style="justify-content:center"><button class="btn btn-bulb" type="button" hidden>OK</button></div>
      </div>`;
    const prev = document.activeElement;
    const prevKey = prev ? keyOf(prev) : null; // a repaint under the overlay can replace prev
    overlay.tabIndex = -1;
    document.body.append(overlay);
    overlay.focus();
    const card = overlay.querySelector('.reveal-card');
    const okBtn = overlay.querySelector('button');
    const finish = () => {
      if (!okBtn.hidden) return;
      card.classList.add('flipped');
      overlay.querySelector('.reveal-title').textContent = movie.title;
      overlay.querySelector('.reveal-when').textContent = [when, place && `at ${place}`].filter(Boolean).join(' ');
      okBtn.hidden = false;
      okBtn.focus();
    };
    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      (prev?.isConnected ? prev : prevKey && document.querySelector(prevKey))?.focus?.();
      resolve(movie);
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); finish(); close(); }
      if (e.key === 'Tab') { e.preventDefault(); (okBtn.hidden ? overlay : okBtn).focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    okBtn.addEventListener('click', close);
    if (reduce) { finish(); return; }
    // Let the face-down card paint first, then turn it over.
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('flipped')));
    card.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 2500); // a hidden tab never fires transitionend
  });
}
