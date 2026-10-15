// Small DOM helpers shared by the guest page and the host console.
import { initials } from './logic.js';

export const $ = (sel, root = document) => root.querySelector(sel);

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);

export const THUMB = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M2 21h3V9H2v12Zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2Z"/></svg>';
// A house (a movie night on the calendar) and a check (you're in), in the same
// solid style as the thumb.
export const HOUSE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3L12 3Z"/></svg>';
export const CHECK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="m9.5 16.6-4.6-4.6-1.8 1.8 6.4 6.4L21 8.7l-1.8-1.8-9.7 9.7Z"/></svg>';
export const STAR = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9L12 2.6Z"/></svg>';

// Initials in circles. To a screen reader the row is one image named in full
// ("Jo, Sam"), not bare letters; `named: false` hides it when the names are
// written out right beside it anyway.
export function faces(people, meKey, max = 5, { named = true } = {}) {
  if (!people?.length) return '';
  const shown = people.slice(0, max).map((p) =>
    `<span class="face${p.nameKey === meKey ? ' me' : ''}" title="${esc(p.name)}" aria-hidden="true">${esc(initials(p.name))}</span>`).join('');
  const more = people.length > max ? `<span class="face" title="${people.length - max} more" aria-hidden="true">+${people.length - max}</span>` : '';
  const a11y = named ? `role="img" aria-label="${esc(people.map((p) => p.name).join(', '))}"` : 'aria-hidden="true"';
  return `<span class="faces" ${a11y}>${shown}${more}</span>`;
}

// The poster CDN 404s for some titles; swap a broken image for a text tile.
window.posterFail = (img) => {
  const tile = document.createElement('span');
  tile.className = 'noimg';
  tile.textContent = img.alt;
  img.replaceWith(tile);
};

// `eager` for posters that must be there the moment they show (the reel spins
// them past inside a clipped window, where lazy loading never starts them).
export function posterImg(url, alt, cls = '', eager = false) {
  return url
    ? `<img src="${esc(url)}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" onerror="posterFail(this)"${cls ? ` class="${cls}"` : ''}>`
    : `<span class="noimg">${esc(alt)}</span>`;
}

export function saveLocal(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* private mode: the page still works, it just forgets */ }
}
// Older versions kept settings in the browser; they live in the database now.
// Only ps.me (who you are on this phone) stays.
export function dropLegacyLocal() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('ps.') && k !== 'ps.me') localStorage.removeItem(k); } catch { /* private mode */ }
}
export function loadLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

// A routine confirmation fades by itself; something that went wrong stays
// until it's tapped away (or 12 s), so it can actually be read.
let toastTimer;
// `stay`: it stays until tapped or replaced (for "Not sent yet").
export function toast(message, bad = false, { stay = false } = {}) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('bad', bad);
  el.classList.add('show');
  el.onclick = () => el.classList.remove('show');
  clearTimeout(toastTimer);
  if (!stay) toastTimer = setTimeout(() => el.classList.remove('show'), bad ? 12000 : 2600);
}

// Android's back gesture closes whatever overlay is on top instead of
// leaving the site. Each overlay adds a history entry when it opens; closing
// it any other way takes the entry back out (that pop is skipped here). A new
// entry is never pushed while such a back is still on its way: the browser
// would land that back on the wrong entry, so the push waits for it.
const backStack = [];
let skipPops = 0;
let waiting = [];
window.addEventListener('popstate', () => {
  if (skipPops) {
    skipPops -= 1;
    if (!skipPops) { const go = waiting; waiting = []; go.forEach((f) => f()); }
    return;
  }
  backStack.pop()?.close();
});
export function backCloses(close) {
  const entry = { close, pushed: false };
  backStack.push(entry);
  const push = () => { if (backStack.includes(entry)) { history.pushState({ overlay: true }, ''); entry.pushed = true; } };
  if (skipPops) waiting.push(push); else push();
  return () => {
    const i = backStack.indexOf(entry);
    if (i < 0) return; // already closed by back
    backStack.splice(i, 1);
    if (!entry.pushed) return; // its entry was never added
    skipPops += 1;
    history.back();
  };
}

export function downloadFile(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Plain-language message for a failed Firestore write. `ctx` tailors the
// permission-denied case ('owner' for the owner console).
export function writeError(e, ctx = '') {
  if (e?.code === 'permission-denied') {
    return ctx === 'owner'
      ? 'That was refused. Check the owner key: forget it and enter it again.'
      : 'That didn’t go through. Someone may have just changed it; try again.';
  }
  if (e?.code === 'unavailable') return 'You look offline. Try again in a moment.';
  // Any other database error is library talk: say it plainly. The site's own
  // errors (no code) are written for people and pass through.
  if (e?.code) { console.warn(e); return 'That didn’t go through. Try again in a moment.'; }
  return e?.message || 'Something went wrong. Try again.';
}

// A stable key for a control, so it can be found again after a repaint.
const KEY_ATTRS = ['data-action', 'data-id', 'data-day', 'data-sort', 'data-tag', 'data-star', 'data-tab', 'data-target',
  'data-shield', 'data-remove', 'data-cancel', 'data-house-add', 'data-house-tag', 'data-item', 'data-name'];
export function keyOf(n) {
  if (n.id) return `#${CSS.escape(n.id)}`;
  const parts = KEY_ATTRS.filter((a) => n.hasAttribute(a)).map((a) => `[${a}="${CSS.escape(n.getAttribute(a))}"]`);
  return parts.length ? parts.join('') : null;
}

// Two-tap confirm for destructive buttons (no confirm() dialogs). The armed
// state lives here, not on the node, so a live repaint doesn't reset it.
const armedUntil = new Map();
export function armed(button, label = 'Tap again to confirm') {
  const key = keyOf(button) || button.textContent;
  if ((armedUntil.get(key)?.until || 0) > Date.now()) { armedUntil.delete(key); return true; }
  armedUntil.set(key, { until: Date.now() + 4000, label });
  // Every copy of the control says it (a night's "You're in" shows in Up next
  // and in the day panel). The label is kept as markup: it may carry an icon.
  document.querySelectorAll(key.startsWith('#') || key.startsWith('[') ? key : 'x-none').forEach((b) => { b.dataset.label = b.innerHTML; b.textContent = label; });
  if (!button.dataset.label) { button.dataset.label = button.innerHTML; button.textContent = label; }
  setTimeout(() => {
    if (!armedUntil.has(key)) return;
    armedUntil.delete(key);
    document.querySelectorAll(key.startsWith('#') || key.startsWith('[') ? key : 'x-none').forEach((b) => { if (b.dataset.label) { b.innerHTML = b.dataset.label; delete b.dataset.label; } });
  }, 4000);
  return false;
}
function reapplyArmed(root) {
  for (const [key, a] of armedUntil) {
    if (a.until <= Date.now() || !(key.startsWith('#') || key.startsWith('['))) continue;
    root.querySelectorAll(key).forEach((b) => { b.dataset.label = b.innerHTML; b.textContent = a.label; });
  }
}

// Did the person change this control since it was painted? A control they
// haven't touched follows the new html, so a menu that mirrors shared state
// (the host's theme or time) shows what changed on another device.
function edited(c) {
  if (c.tagName !== 'SELECT') return c.value !== c.defaultValue;
  const painted = [...c.options].find((o) => o.defaultSelected) || c.options[0];
  return c.value !== (painted?.value ?? '');
}

// Replace a container's HTML only when it changed, keeping what the person
// is doing: typed values, the focused control, the caret, armed buttons.
const lastHtml = new WeakMap();
export function paint(el, html) {
  if (!el || lastHtml.get(el) === html) return;
  lastHtml.set(el, html);
  const active = document.activeElement;
  const focused = !!active && el.contains(active);
  const focusKey = focused ? keyOf(active) : null;
  let caret = null;
  try { if (focusKey && typeof active.selectionStart === 'number') caret = [active.selectionStart, active.selectionEnd]; } catch { /* not a text field */ }
  const values = [...el.querySelectorAll('input[id], textarea[id], select[id]')]
    .filter((i) => i === active || edited(i)).map((i) => [i.id, i.value]);
  el.innerHTML = html;
  for (const [id, v] of values) {
    const n = el.querySelector(`#${CSS.escape(id)}`);
    if (n && n.value !== v && (n.tagName !== 'SELECT' || [...n.options].some((o) => o.value === v))) n.value = v;
  }
  if (focused) {
    const n = focusKey && el.querySelector(focusKey);
    if (n) {
      n.focus({ preventScroll: true });
      if (caret) try { n.setSelectionRange(...caret); } catch { /* fine */ }
    } else {
      // What had focus is gone (Veto became Undo veto): keep the place in the
      // page rather than dropping to <body>.
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  }
  reapplyArmed(el);
}
