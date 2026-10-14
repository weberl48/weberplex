// "Spin the reel": a slot-machine strip of posters that lands on `winner`.
import { esc, posterImg } from './ui.js';

export function spinReel(movies, winner, { title = 'Spinning the reel…', done = 'Use this one' } = {}) {
  return new Promise((resolve) => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seq = [];
    while (seq.length < 24) seq.push(...movies);
    seq.push(winner);
    const overlay = document.createElement('div');
    overlay.className = 'reel-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Spin the reel');
    overlay.innerHTML = `
      <div class="reel-box">
        <h2>${esc(title)}</h2>
        <div class="reel-window"><div class="reel-track">
          ${seq.map((m) => `<div class="reel-item">${posterImg(m.poster, m.title)}</div>`).join('')}
        </div></div>
        <p class="reel-result" aria-live="polite"></p>
        <div class="row" style="justify-content:center"><button class="btn btn-bulb" type="button" hidden>${esc(done)}</button></div>
      </div>`;
    document.body.append(overlay);
    const win = overlay.querySelector('.reel-window');
    const track = overlay.querySelector('.reel-track');
    const result = overlay.querySelector('.reel-result');
    const okBtn = overlay.querySelector('button');
    const finish = () => {
      result.textContent = `It's ${winner.title}.`;
      okBtn.hidden = false;
      okBtn.focus();
    };
    okBtn.addEventListener('click', () => { overlay.remove(); resolve(winner); });
    // Step by the window's inner height and size every tile to match, or the
    // border width accumulates and the reel stops between two posters.
    const h = win.clientHeight;
    track.querySelectorAll('.reel-item').forEach((el) => { el.style.height = `${h}px`; });
    const end = -(seq.length - 1) * h;
    if (reduce) { track.style.transform = `translateY(${end}px)`; finish(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      track.style.transition = 'transform 3.8s cubic-bezier(.12,.72,.14,1)';
      track.style.transform = `translateY(${end}px)`;
    }));
    track.addEventListener('transitionend', finish, { once: true });
  });
}
