// "How it works": a short card tour shown on a guest's first visit and from
// the How it works link. Each card carries a small, inert example built from
// the site's own styles. The same overlay also steps through any other list of
// cards (openTour's `steps`): "Since you last looked" uses it. A step is
// { title, body, demo?, after?, target?, nextText?, doneHere? } as trusted
// html; `after` follows the body (and may hold real controls), `target` adds a
// Show me button, `nextText` renames Next, and `doneHere` offers the done
// button on that card too. Whoever builds steps from other people's words
// must escape them.
import { THUMB, HOUSE, CHECK, backCloses } from './ui.js';

const STEPS = [
  {
    title: 'Welcome to the Weberplex',
    body: 'Movie night, decided together. Say when you’re free, thumbs-up what you’d watch, and the site picks the movie.',
    demo: `<div class="marquee tour-mini"><div class="board"><p class="kicker">Now booking</p><h1>Weberplex</h1><p class="sub">Pick a night · Pick a picture</p></div></div>`,
  },
  {
    title: 'Put your name down',
    body: 'Type your first name once. This phone remembers it, and your thumbs-ups and free evenings count under it.',
    demo: `<div class="tour-row"><span class="field tour-field">Sam</span><span class="btn btn-bulb">That's me</span></div>`,
  },
  {
    title: 'Say when you’re free',
    body: 'Tap a day on the calendar to see who’s free, then tap I’m free. Anyone can host: pick a start time and tap I can host.',
    demo: `<div class="cal tour-cal">
      <span class="day"><span class="d-dow">THU</span><span class="d-num">16</span></span>
      <span class="day on lead sel"><span class="d-dow">FRI</span><span class="d-num">17</span><span class="d-meta">3<span class="d-host">${HOUSE}</span></span></span>
      <span class="day on"><span class="d-dow">SAT</span><span class="d-num">18</span><span class="d-meta">2</span></span>
      <span class="day"><span class="d-dow">SUN</span><span class="d-num">19</span></span>
    </div>
    <div class="day-detail tour-window"><div class="dd-head"><h3>Friday, October 17</h3></div>
      <p class="dd-line"><span><b>Jo</b> is hosting at 8:00&nbsp;PM</span></p>
      <span class="btn btn-ghost btn-rsvp on">You’re in ${CHECK}</span></div>`,
  },
  {
    title: 'Thumbs-up what you’d watch',
    body: 'Everyone adds movies to the shelf. Thumbs-up as many as you like; they carry over from night to night. Tap a poster (look for the folded corner) to turn it over for the trailer, the plot and Seen it.',
    demo: `<div class="tour-row"><span class="tour-lobby"><span class="lc-ear"></span>Nosferatu</span>
      <span class="vote on">${THUMB}<span class="n">4</span></span><span class="tag-chip" data-tag="Foreign">Foreign</span></div>`,
  },
  {
    title: 'The movie picks itself',
    body: 'A day before, the movie locks: the one the people coming want most. Everyone coming gets one veto, and a tie spins the reel. Then your ticket appears.',
    demo: `<div class="ticket tour-ticket"><div class="ticket-main"><p class="admit">ADMIT ONE</p><h3>The Witch</h3>
      <dl><dt>When</dt><dd>Fri, Oct 17 · 8:00&nbsp;PM</dd><dt>Where</dt><dd>Jo's</dd></dl></div>
      <div class="ticket-stub"><span>No. 004213</span></div></div>`,
  },
];

let open = null;

// onDone({ how, target }): how is 'done' (last card), 'skip' (Skip or Esc) or 'show' (Show me).
export function openTour({ onDone, steps = STEPS, label = 'How it works', doneText = "Let's go" } = {}) {
  if (open || !steps.length) return;
  let i = 0;
  const prevFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tourTitle');
  document.body.append(overlay);
  open = overlay;

  const close = (how = 'skip', target = '') => {
    release();
    overlay.remove();
    open = null;
    document.removeEventListener('keydown', onKey);
    prevFocus?.focus?.({ preventScroll: how === 'show' });
    onDone?.({ how, target });
  };
  const release = backCloses(() => close('skip')); // back = Skip
  const paint = () => {
    const s = steps[i];
    const last = i === steps.length - 1;
    overlay.innerHTML = `
      <div class="tour-card">
        <div class="tour-top">
          <span class="label">${label} · ${i + 1} of ${steps.length}</span>
          <button class="btn btn-ghost btn-small" type="button" data-tour="skip">Skip</button>
        </div>
        ${s.demo ? `<div class="tour-demo" aria-hidden="true" inert>${s.demo}</div>` : ''}
        <h2 id="tourTitle">${s.title}</h2>
        ${s.body ? `<p>${s.body}</p>` : ''}
        ${s.after || ''}
        <div class="tour-foot">
          <div class="tour-dots" aria-hidden="true">${steps.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
          <div class="row tour-nav">
            ${i ? '<button class="btn btn-ghost" type="button" data-tour="back">Back</button>' : ''}
            ${s.target ? '<button class="btn btn-ghost" type="button" data-tour="show">Show me</button>' : ''}
            ${s.doneHere && !last ? `<button class="btn btn-ghost" type="button" data-tour="done">${doneText}</button>` : ''}
            <button class="btn btn-bulb" type="button" data-tour="${last ? 'done' : 'next'}">${last ? doneText : s.nextText || 'Next'}</button>
          </div>
        </div>
      </div>`;
    overlay.querySelector(`[data-tour="${last ? 'done' : 'next'}"]`).focus();
  };
  overlay.addEventListener('click', (e) => {
    // A real control on a card (a thumbs-up on a new movie) does its work
    // through the page; the card isn't repainted, so it shows the new state itself.
    const t = e.target.closest('[data-action][aria-pressed]');
    if (t) { const on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', String(on)); t.classList.toggle('on', on); }
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    const a = b.dataset.tour;
    if (a === 'next') { i += 1; paint(); }
    if (a === 'back') { i -= 1; paint(); }
    if (a === 'show') close('show', steps[i].target);
    if (a === 'skip' || a === 'done') close(a);
  });
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close('skip'); return; }
    if (e.key === 'ArrowRight' && i < steps.length - 1) { i += 1; paint(); }
    if (e.key === 'ArrowLeft' && i > 0) { i -= 1; paint(); }
    if (e.key === 'Tab') {
      const f = [...overlay.querySelectorAll('button')];
      const at = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  document.addEventListener('keydown', onKey);
  paint();
}
