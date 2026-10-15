// The screening room: a movie's trailer, played on the house screen instead of
// in another app. The house lights go down, the curtain parts on a screen in a
// gilt frame with the title on a marquee strip above it, and the projector
// starts as it opens (YouTube's privacy-enhanced player). Back, Esc or Close
// ends the show and focus goes back where it was. With reduced motion the
// lights and the curtain don't move: the picture is simply there.
import { esc, keyOf, backCloses } from './ui.js';

const embed = (id) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

export function playTrailer({ id, title = '', year = '' }) {
  return new Promise((resolve) => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlay = document.createElement('div');
    overlay.className = 'screen-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Trailer: ${title}`);
    overlay.innerHTML = `
      <div class="screen-room">
        <p class="screen-marquee"><span class="screen-now">Now showing</span><span class="screen-title">${esc(title)}${year ? ` <span class="screen-year">(${esc(year)})</span>` : ''}</span></p>
        <div class="screen-frame">
          <div class="screen-picture"></div>
          <div class="screen-curtain" aria-hidden="true"><span></span><span></span></div>
        </div>
        <div class="row screen-actions">
          <button class="btn btn-ghost" type="button" data-r="close">Close</button>
          <a class="linkish" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener">Won’t play? Open it on YouTube</a>
        </div>
      </div>
      <div class="screen-seats" aria-hidden="true"></div>`;
    const prev = document.activeElement;
    const prevKey = prev ? keyOf(prev) : null; // a repaint under the overlay can replace prev
    document.body.append(overlay);
    const close = overlay.querySelector('[data-r="close"]');
    close.focus();
    // The projector starts as the curtain opens (the tap that opened the room
    // still counts as the go-ahead for sound).
    const roll = setTimeout(() => {
      overlay.querySelector('.screen-picture').innerHTML = `<iframe src="${embed(id)}" title="Trailer: ${esc(title)}"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      overlay.classList.add('rolling');
    }, reduce ? 0 : 700);
    const end = () => {
      if (!overlay.isConnected) return;
      clearTimeout(roll);
      release();
      overlay.remove(); // the picture goes with it: the sound stops
      document.removeEventListener('keydown', onKey, true);
      (prev?.isConnected ? prev : prevKey && document.querySelector(prevKey))?.focus?.();
      resolve();
    };
    const release = backCloses(end);
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); end(); }
      if (e.key === 'Tab') {
        // Focus stays in the room: Close, the picture, the YouTube link.
        const stops = [...overlay.querySelectorAll('button, iframe, a')];
        const at = stops.indexOf(document.activeElement);
        e.preventDefault();
        stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    close.addEventListener('click', end);
  });
}
