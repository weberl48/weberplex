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

// Plain-language message for a failed Firestore write.
export function writeError(e) {
  if (e?.code === 'permission-denied') return 'That didn’t go through. The host may have just locked or changed the night.';
  if (e?.code === 'unavailable') return 'You look offline. Try again in a moment.';
  return e?.message || 'Something went wrong. Try again.';
}

// Two-tap confirm for destructive buttons (no confirm() dialogs).
export function armed(button, label = 'Tap again to confirm') {
  if (button.dataset.armed === '1') { delete button.dataset.armed; button.textContent = button.dataset.label; return true; }
  button.dataset.label = button.textContent;
  button.dataset.armed = '1';
  button.textContent = label;
  setTimeout(() => {
    if (button.dataset.armed === '1') { delete button.dataset.armed; button.textContent = button.dataset.label; }
  }, 4000);
  return false;
}
