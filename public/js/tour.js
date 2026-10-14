// "How it works": a short card tour shown on a guest's first visit and from
// the How it works link. Each card carries a small, inert example built from
// the site's own styles.
import { THUMB } from './ui.js';

const STEPS = [
  {
    title: 'Welcome to the Weberplex',
    body: 'Movie night, decided together. Here is how it works in five quick steps.',
    demo: `<div class="marquee tour-mini"><div class="board"><p class="kicker">Coming soon</p><h1>Weberplex</h1><p class="sub">Pick a night · Pick a picture</p></div></div>`,
  },
  {
    title: 'Put your name down',
    body: 'Type your name once. This phone remembers you, and it is how your picks and votes count.',
    demo: `<div class="tour-row"><span class="field tour-field">Sam</span><span class="btn btn-bulb">That's me</span></div>`,
  },
  {
    title: 'Mark the evenings you are free',
    body: 'Tap every evening on the calendar that works for you. Anyone can host: pick a day, choose a start time and tap I can host. That puts a movie night on the calendar.',
    demo: `<div class="cal tour-cal">
      <span class="day"><span class="d-dow">THU</span><span class="d-num">16</span></span>
      <span class="day on lead"><span class="d-dow">FRI</span><span class="d-num">17</span><span class="d-meta">3<span class="d-host">⌂</span></span></span>
      <span class="day on"><span class="d-dow">SAT</span><span class="d-num">18</span><span class="d-meta">2</span></span>
      <span class="day"><span class="d-dow">SUN</span><span class="d-num">19</span></span>
    </div>
    <div class="offer-strip tour-strip"><span>Fri 17 · Jo is hosting at 8:00 PM</span><span class="mini on">You’re free ✓</span></div>`,
  },
  {
    title: 'Add movies to the shelf',
    body: 'The shelf keeps every movie anyone adds, and it only grows. Search, or browse Trending, New this year and For you. Add a line on why you picked it if you like.',
    demo: `<div class="strip tour-strip-film">
      <div class="frame tour-poster" style="background:#3a2a4a">Hereditary</div>
      <div class="frame tour-poster" style="background:#24414a">REC</div>
      <div class="frame tour-poster" style="background:#4a3324">Nosferatu</div>
      <div class="frame tour-poster" style="background:#2b3a26">Host</div>
      <div class="frame">+</div>
    </div>`,
  },
  {
    title: 'Thumbs-up what you would watch',
    body: 'Vote for as many as you like; your thumbs carry over from night to night. Mark the ones you have seen so everyone can spot what is new to the group.',
    demo: `<div class="tour-row"><span class="vote on">${THUMB}<span class="n">4</span></span><span class="mini on">Seen ✓</span>
      <span class="tag-chip" data-tag="Foreign">Foreign</span><span class="mini">Trailer</span></div>`,
  },
  {
    title: 'The movie picks itself',
    body: 'A day before each night, it locks the movie the people coming want most (the reel breaks ties). Hosts can set a theme, and everyone coming gets one veto. You get a ticket and a calendar invite, call snacks, and rate it after the credits.',
    demo: `<div class="ticket tour-ticket"><div class="ticket-main"><p class="admit">ADMIT ONE</p><h3>The Witch</h3>
      <dl><dt>When</dt><dd>Fri, Oct 17 · 8:00 PM</dd><dt>Where</dt><dd>Jo's</dd></dl></div>
      <div class="ticket-stub"><span>No. 004213</span></div></div>`,
  },
];

let open = null;

export function openTour({ onDone } = {}) {
  if (open) return;
  let i = 0;
  const prevFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tourTitle');
  document.body.append(overlay);
  open = overlay;

  const close = () => {
    overlay.remove();
    open = null;
    document.removeEventListener('keydown', onKey);
    prevFocus?.focus?.();
    onDone?.();
  };
  const paint = () => {
    const s = STEPS[i];
    const last = i === STEPS.length - 1;
    overlay.innerHTML = `
      <div class="tour-card">
        <div class="tour-top">
          <span class="label">How it works · ${i + 1} of ${STEPS.length}</span>
          <button class="linkish" type="button" data-tour="skip">Skip</button>
        </div>
        <div class="tour-demo" aria-hidden="true" inert>${s.demo}</div>
        <h2 id="tourTitle">${s.title}</h2>
        <p>${s.body}</p>
        <div class="tour-dots" aria-hidden="true">${STEPS.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="row tour-nav">
          ${i ? '<button class="btn btn-ghost" type="button" data-tour="back">Back</button>' : ''}
          <button class="btn btn-bulb" type="button" data-tour="${last ? 'done' : 'next'}">${last ? "Let's go" : 'Next'}</button>
        </div>
      </div>`;
    overlay.querySelector(`[data-tour="${last ? 'done' : 'next'}"]`).focus();
  };
  overlay.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    const a = b.dataset.tour;
    if (a === 'next') { i += 1; paint(); }
    if (a === 'back') { i -= 1; paint(); }
    if (a === 'skip' || a === 'done') close();
  });
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowRight' && i < STEPS.length - 1) { i += 1; paint(); }
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
