// Link previews for group texts. Chat apps' link-preview bots read a page's
// Open Graph tags; this builds a tiny page of them from the next night, so a
// pasted weberplex link shows "Dune · Fri Oct 17, 8 PM at Jo's" with the
// poster. vercel.json sends only those bots here; people always get the
// static page, so a broken preview can't break the site.
import { buildStatus } from './status.js';
import { placeLabel } from '../public/js/logic.js';

export const CARD_PATH = '/img/og.png';
const TAGLINE = 'Mark your evenings. Host a night. Vote on what we watch next.';

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);

// "Fri Oct 17, 8 PM" (":30" only when it isn't on the hour), in New York.
function when(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.month} ${p.day}, ${p.minute === '00' ? p.hour : `${p.hour}:${p.minute}`} ${p.dayPeriod}`;
}

function page({ title, description, image }, siteUrl) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(`${siteUrl}/`)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
</head>
<body>
<p><a href="${esc(`${siteUrl}/`)}">${esc(title)}</a></p>
</body>
</html>
`;
}

// The page for no planned night (and for when the database can't be read).
export const genericPreview = (siteUrl = '') => page({ title: 'Weberplex', description: TAGLINE, image: `${siteUrl}${CARD_PATH}` }, siteUrl);

export async function buildPreview({ base, projectId, apiKey, siteUrl = '', fetchImpl = fetch, now = new Date() }) {
  const s = await buildStatus({ base, projectId, apiKey, siteUrl, fetchImpl, now });
  const card = `${siteUrl}${CARD_PATH}`;
  if (s.state === 'none') return genericPreview(siteUrl);
  const at = `${when(new Date(s.starts_at))} at ${placeLabel(s.host)}`;
  const coming = s.attendee_count ? `${s.attendee_count} coming so far.` : 'Be the first to count yourself in.';
  if (s.state === 'locked') {
    return page({
      title: `${s.movie_title || 'Movie night'} · ${at}`,
      description: `${coming} Open the page to count yourself in.`,
      image: s.movie_poster || card,
    }, siteUrl);
  }
  return page({ title: `Movie night ${at}`, description: `${coming} Thumbs-up what you'd watch.`, image: card }, siteUrl);
}
