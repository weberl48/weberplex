// "Since you last looked", as cards for the walkthrough in tour.js. The cards'
// words and names come from other people, so every one is escaped here (tour.js
// takes trusted html). What changed is worked out in logic.js (sinceLastLook).
import { esc, posterImg, THUMB } from './ui.js';

// A small inert picture where it helps: the poster for a movie, name chips for
// free evenings, a theme chip, a struck title for a veto.
function demo(c) {
  // A night's changes on one card: its theme chip and any struck title together.
  if (c.kind === 'changes') return (c.theme ? `<div class="tour-row"><span class="tag-chip">${esc(c.theme)}</span></div>` : '') + (c.struck ? `<ul class="vetoes"><li><s>${esc(c.struck)}</s></li></ul>` : '');
  if (c.poster !== undefined) return `<div class="tour-row">${posterImg(c.poster, c.title || '', 'news-poster')}</div>`;
  if (c.names) return `<div class="tour-row">${c.names.slice(0, 6).map((n) => `<span class="chip">${esc(n)}</span>`).join('')}${c.names.length > 6 ? `<span class="chip">+${c.names.length - 6}</span>` : ''}</div>`;
  if (c.theme) return `<div class="tour-row"><span class="tag-chip">${esc(c.theme)}</span></div>`;
  if (c.struck) return `<ul class="vetoes"><li><s>${esc(c.struck)}</s></li></ul>`;
  if (c.kind === 'votes') return `<div class="tour-row"><span class="vote on">${THUMB}</span></div>`;
  return '';
}

// The last card also lists whatever didn't get a card of its own, like the
// back page of a printed program.
const program = (rest) => (rest?.length
  ? `<ul class="program-list">${rest.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
  : '');

// New movies come with a real thumbs-up for each, right on the card.
const thumbs = (ids, voted) => (ids?.length
  ? `<div class="row news-votes">${ids.map(({ id, title }) => {
    const on = voted.has(id);
    return `<button class="vote${on ? ' on' : ''}" type="button" data-action="vote" data-id="${esc(id)}" aria-pressed="${on}" aria-label="I'd watch ${esc(title)}">${THUMB}<span>${esc(title)}</span></button>`;
  }).join('')}</div>`
  : '');

// A headline reads as a sentence in the body face; a movie it names keeps the
// marquee letters ("The Descent is filed under Watched").
const headline = (c) => {
  const t = esc(c.text);
  const name = c.title && esc(c.title);
  return name && t.includes(name) ? t.replace(name, `<span class="news-name">${name}</span>`) : t;
};
// Cards about a night: what changed, or a new one.
const NIGHT_KINDS = new Set(['changes', 'night', 'moved', 'theme', 'veto']);

// `voted`: the movies this person has already thumbed up. `rsvp(day)`: a
// Count me in for a night they're not on the list for ('' otherwise). With
// five or more headlines, the first card is a playbill: every headline at
// once, read and done in one tap, or walked through one by one.
export function newsSteps(cards, { voted = new Set(), since = '', rsvp = () => '' } = {}) {
  const steps = cards.map((c) => ({
    title: headline(c), body: esc(c.detail), demo: demo(c), target: c.target,
    after: thumbs(c.ids, voted) + (NIGHT_KINDS.has(c.kind) && c.day ? rsvp(c.day) : '') + program(c.rest),
  }));
  const rest = cards.at(-1)?.rest || [];
  if (cards.length + rest.length < 5) return steps;
  // The program lists the cards as they'll come (a night's changes on one line),
  // then whatever the last card only counts.
  return [{
    title: `What’s new since ${esc(since)}`,
    body: 'Here’s the program. Walk through it, or call it read.',
    after: program([...cards.map((c) => c.text), ...rest]),
    nextText: 'Walk me through', doneHere: true,
  }, ...steps];
}
