// Small DOM helpers shared by the guest page and the host console.
import { initials } from './logic.js';

export const $ = (sel, root = document) => root.querySelector(sel);

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);

export const THUMB = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M2 21h3V9H2v12Zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2Z"/></svg>';

export function faces(people, meKey, max = 5) {
  if (!people?.length) return '';
  const shown = people.slice(0, max).map((p) =>
    `<span class="face${p.nameKey === meKey ? ' me' : ''}" title="${esc(p.name)}">${esc(initials(p.name))}</span>`).join('');
  const more = people.length > max ? `<span class="face" title="${people.length - max} more">+${people.length - max}</span>` : '';
  return `<span class="faces">${shown}${more}</span>`;
}

// The poster CDN 404s for some titles; swap a broken image for a text tile.
window.posterFail = (img) => {
  const tile = document.createElement('span');
  tile.className = 'noimg';
  tile.textContent = img.alt;
  img.replaceWith(tile);
};

export function posterImg(url, alt, cls = '') {
  return url
    ? `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="posterFail(this)"${cls ? ` class="${cls}"` : ''}>`
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

let toastTimer;
export function toast(message, bad = false) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('bad', bad);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), bad ? 5200 : 3200);
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
  return e?.message || 'Something went wrong. Try again.';
}

// A stable key for a control, so it can be found again after a repaint.
const KEY_ATTRS = ['data-action', 'data-id', 'data-day', 'data-sort', 'data-tag', 'data-star', 'data-tab',
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
  button.dataset.label = button.textContent;
  button.textContent = label;
  setTimeout(() => {
    if (!armedUntil.has(key)) return;
    armedUntil.delete(key);
    document.querySelectorAll(key.startsWith('#') || key.startsWith('[') ? key : 'x-none').forEach((b) => { if (b.dataset.label) b.textContent = b.dataset.label; });
  }, 4000);
  return false;
}
function reapplyArmed(root) {
  for (const [key, a] of armedUntil) {
    if (a.until <= Date.now() || !(key.startsWith('#') || key.startsWith('['))) continue;
    root.querySelectorAll(key).forEach((b) => { b.dataset.label = b.textContent; b.textContent = a.label; });
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
