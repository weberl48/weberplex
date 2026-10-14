// "Since you last looked", as cards for the walkthrough in tour.js. The cards'
// words and names come from other people, so every one is escaped here (tour.js
// takes trusted html). What changed is worked out in logic.js (sinceLastLook).
import { esc, posterImg, THUMB } from './ui.js';

// A small inert picture where it helps: the poster for a movie, name chips for
// free evenings, a theme chip, a struck title for a veto.
function demo(c) {
  if (c.poster !== undefined) return `<div class="tour-row">${posterImg(c.poster, c.title || '', 'news-poster')}</div>`;
  if (c.names) return `<div class="tour-row">${c.names.slice(0, 6).map((n) => `<span class="chip">${esc(n)}</span>`).join('')}${c.names.length > 6 ? `<span class="chip">+${c.names.length - 6}</span>` : ''}</div>`;
  if (c.theme) return `<div class="tour-row"><span class="tag-chip">${esc(c.theme)}</span></div>`;
  if (c.struck) return `<ul class="vetoes"><li><s>${esc(c.struck)}</s></li></ul>`;
  if (c.kind === 'votes') return `<div class="tour-row"><span class="vote on">${THUMB}</span></div>`;
  return '';
}

export const newsSteps = (cards) => cards.map((c) => ({
  title: esc(c.text), body: esc(c.detail), demo: demo(c), target: c.target,
}));
