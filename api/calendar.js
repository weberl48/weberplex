// GET /calendar.ics (rewritten here by vercel.json): the subscribable feed of
// movie nights. The CDN holds it for 15 minutes, so a busy calendar app costs
// almost no Firestore reads.
import { buildCalendar } from '../lib/calendar.js';
import { firebaseConfig, SITE_URL } from '../public/js/config.js';

export default async function handler(req, res) {
  try {
    const ics = await buildCalendar({ base: 'https://firestore.googleapis.com/v1', projectId: firebaseConfig.projectId, apiKey: firebaseConfig.apiKey, siteUrl: SITE_URL });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.statusCode = 200;
    res.end(ics);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 502;
    res.end(`Calendar unavailable: ${String(e.message || e)}`);
  }
}
