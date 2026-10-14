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

// The demos are stamped SAMPLE and use no real dates or names from the group,
// so nobody mistakes the sample ticket for the real Friday night.
const dayCell = (name, cls = '', meta = '') => `<span class="day${cls}"><span class="d-dow"></span><span class="d-num">${name}</span>${meta ? `<span class="d-meta">${meta}</span>` : ''}</span>`;

const STEPS = [
  {
    title: 'Welcome to the Weberplex',
    body: 'Movie night, decided together. Say when you’re free, thumbs-up what you’d watch, and the site picks the movie.',
    demo: `<div class="marquee tour-mini"><div class="board"><p class="kicker">Now booking</p><h1>Weberplex</h1><p class="sub">Pick a night · Pick a picture</p></div></div>`,
  },
  {
    title: 'Put your name down',
    body: 'Type your first name once. This phone remembers it, and your thumbs-ups and free evenings count under it.',
    demo: `<div class="tour-row"><span class="field tour-field">Ava</span><span class="btn btn-bulb">That's me</span></div>`,
  },
  {
    title: 'Say when you’re free',
    body: 'Tap a day on the calendar to see who’s free, then say you are: I’m free that evening, or Count me in when someone’s already hosting. Either way, you’re on the list. Anyone can host: pick a start time and tap I can host.',
    demo: `<div class="cal tour-cal">
      ${dayCell('Thu')}${dayCell('Fri', ' on sel', '2')}${dayCell('Sat', ' lead', `3<span class="d-host">${HOUSE}</span>`)}${dayCell('Sun')}
    </div>
    <div class="day-detail tour-window"><div class="dd-head"><h3>Friday</h3></div>
      <p class="dd-line">Ava and Ben are free.</p>
      <span class="btn btn-bulb btn-rsvp">I’m free that evening</span></div>`,
  },
  {
    title: 'Thumbs-up what you’d watch',
    body: 'Everyone adds movies to the shelf. Thumbs-up as many as you like; they carry over from night to night. Mark the ones you’ve seen so everyone can spot what’s new to the group.',
    demo: `<div class="tour-row"><span class="vote on">${THUMB}<span class="n">4</span></span><span class="mini on">Seen ${CHECK}</span>
      <span class="mini">Trailer</span><span class="tag-chip" data-tag="Foreign">Foreign</span></div>`,
  },
  {
    title: 'The movie picks itself',
    body: 'A day before, the movie locks: the one the people coming want most. Everyone coming gets one veto, and a tie spins the reel. Then you turn the card over, and your ticket appears.',
    demo: `<div class="ticket tour-ticket"><div class="ticket-main"><p class="admit">ADMIT ONE</p><h3>The Witch</h3>
      <dl><dt>When</dt><dd>Fri · 8:00&nbsp;PM</dd><dt>Where</dt><dd>Ava's</dd></dl></div>
      <div class="ticket-stub"><span>No. 004213</span></div></div>`,
  },
];

let open = null;

// onDone({ how, target, at }): how is 'done' (last card), 'skip' (Skip or Esc)
// or 'show' (Show me); `at` is the card it closed on, so a deck can reopen
// there (`start`). `cls` styles the cards for another deck ('news').
export function openTour({ onDone, steps = STEPS, label = 'How it works', doneText = "Let's go", start = 0, cls = '' } = {}) {
  if (open || !steps.length) return;
  let i = Math.max(0, Math.min(steps.length - 1, start));
  const prevFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tourTitle');
  // A screen reader hears each card as it comes: the card itself is rebuilt,
  // so the announcement lives outside it.
  overlay.innerHTML = '<p class="sr-only" aria-live="polite"></p><div class="tour-slot"></div>';
  const live = overlay.querySelector('[aria-live]');
  const slot = overlay.querySelector('.tour-slot');
  const sample = steps === STEPS; // How it works: its demos are samples
  document.body.append(overlay);
  open = overlay;

  const close = (how = 'skip', target = '') => {
    release();
    overlay.remove();
    open = null;
    document.removeEventListener('keydown', onKey);
    prevFocus?.focus?.({ preventScroll: how === 'show' });
    onDone?.({ how, target, at: i });
  };
  const release = backCloses(() => close('skip')); // back = Skip
  const paint = () => {
    const s = steps[i];
    const last = i === steps.length - 1;
    slot.innerHTML = `
      <div class="tour-card${cls ? ` ${cls}` : ''}">
        <div class="tour-top">
          <span class="label">${label} · ${i + 1} of ${steps.length}</span>
          <button class="btn btn-ghost btn-small" type="button" data-tour="skip">Skip</button>
        </div>
        ${s.demo ? `<div class="tour-demo${sample ? ' sample' : ''}" aria-hidden="true" inert>${s.demo}</div>` : ''}
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
    // Focus the way forward without scrolling to it: a long card opens at its top.
    overlay.querySelector(`[data-tour="${last ? 'done' : 'next'}"]`).focus({ preventScroll: true });
    overlay.querySelector('.tour-card').scrollTop = 0;
    live.textContent = `${label}, ${i + 1} of ${steps.length}: ${overlay.querySelector('#tourTitle').textContent}`;
  };
  overlay.addEventListener('click', (e) => {
    // A real control on a card (a thumbs-up on a new movie) does its work
    // through the page; the card isn't repainted, so it shows the new state itself.
    // One that's done once it's done (Count me in) says so after the page has
    // handled the tap, and stays put.
    const t = e.target.closest('[data-action][aria-pressed]');
    if (t?.dataset.done) {
      setTimeout(() => {
        t.innerHTML = `${t.dataset.done} ${CHECK}`;
        t.removeAttribute('data-action');
        t.setAttribute('aria-pressed', 'true');
        t.classList.replace('btn-bulb', 'btn-ghost');
        t.classList.add('on');
      }, 0);
    } else if (t) { const on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', String(on)); t.classList.toggle('on', on); }
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
