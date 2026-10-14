// GET /api/preview: the Open Graph page link-preview bots get instead of the
// site (vercel.json redirects only their user-agents here). It never fails a
// share: if the database can't be read, the bots get the plain Weberplex card.
import { buildPreview, genericPreview } from '../lib/preview.js';
import { firebaseConfig, SITE_URL } from '../public/js/config.js';

export default async function handler(req, res) {
  let html;
  let cache = 's-maxage=300';
  try {
    html = await buildPreview({ base: 'https://firestore.googleapis.com/v1', projectId: firebaseConfig.projectId, apiKey: firebaseConfig.apiKey, siteUrl: SITE_URL });
  } catch (e) {
    console.error('preview failed', e);
    html = genericPreview(SITE_URL);
    cache = 'no-store';
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.statusCode = 200;
  res.end(html);
}
