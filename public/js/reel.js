// "Spin the reel": a slot-machine strip of posters that lands on `winner`.
// It lands the way the reveal does: the heading stays ("3-way tie. The reel
// decides…") and the title in marquee letters finishes it, then when and where,
// who's coming and what it beat, one after another, and the same endings (See my
// ticket, or Count me in / Not this time).
import { esc, posterImg, keyOf, backCloses } from './ui.js';

// `done` names the last button; `invite` offers Count me in / Not this time
// instead; `when`, `place`, `people` (with `faces`) and `why` ("Won the reel over
// Jaws and Alien") are printed under the title.
// Resolves { movie, seen, rsvp }: `seen` is false when back (or Esc) closed it
// before it landed, so it spins again next visit.
export function spinReel(movies, winner, { title = 'Spinning the reel…', done = 'Use this one', invite = false, when = '', place = '', people = '', faces = '', why = '' } = {}) {
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
          ${seq.map((m) => `<div class="reel-item">${posterImg(m.poster, m.title, '', true)}</div>`).join('')}
        </div></div>
        <p class="reel-result" aria-hidden="true"></p>
        <p class="reveal-when" aria-hidden="true"></p>
        <p class="reveal-who" aria-hidden="true"></p>
        <p class="reveal-why" aria-hidden="true"></p>
        <p class="sr-only" aria-live="polite"></p>
        <div class="row reveal-actions" hidden>${invite
          ? '<button class="btn btn-bulb" type="button" data-r="in">Count me in</button><button class="btn btn-ghost" type="button" data-r="ok">Not this time</button>'
          : `<button class="btn btn-bulb" type="button" data-r="ok">${esc(done)}</button>`}</div>
      </div>`;
    const prev = document.activeElement;
    const prevKey = prev ? keyOf(prev) : null; // a repaint under the overlay can replace prev
    overlay.tabIndex = -1;
    document.body.append(overlay);
    overlay.focus();
    const $in = (sel) => overlay.querySelector(sel);
    const win = $in('.reel-window');
    const track = $in('.reel-track');
    const actions = $in('.reveal-actions');
    const buttons = [...actions.querySelectorAll('button')];
    const finish = () => {
      if (!actions.hidden) return;
      win.classList.add('landed');
      overlay.classList.add('landed'); // the lines arrive one after another (site.css)
      const whenText = [when, place && `at ${place}`].filter(Boolean).join(' ');
      $in('.reel-result').textContent = winner.title;
      $in('.reveal-when').textContent = whenText;
      $in('.reveal-who').innerHTML = people ? `${faces}<span>${esc(people)}</span>` : '';
      $in('.reveal-why').textContent = why;
      $in('[aria-live]').textContent = [`The reel picked ${winner.title}.`, whenText && `${whenText}.`, people && `${people}.`, why && `${why}.`].filter(Boolean).join(' ');
      actions.hidden = false;
      buttons[0].focus();
    };
    const close = (seen = true, rsvp = false) => {
      if (!overlay.isConnected) return;
      release();
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      (prev?.isConnected ? prev : prevKey && document.querySelector(prevKey))?.focus?.();
      resolve({ movie: winner, seen, rsvp });
    };
    const release = backCloses(() => close(!actions.hidden));
    function onKey(e) {
      // Esc is "not now", like back: before it lands, it spins again next visit.
      if (e.key === 'Escape') { e.preventDefault(); close(!actions.hidden); }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (actions.hidden) { overlay.focus(); return; }
        const at = buttons.indexOf(document.activeElement);
        buttons[(at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    actions.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) close(true, b.dataset.r === 'in');
    });
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
    setTimeout(finish, 4600); // a hidden tab never fires transitionend
  });
}
