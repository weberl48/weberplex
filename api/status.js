// GET /api/status — the one endpoint Home Assistant polls. It runs the clock
// first, so HA's poll is also what locks movies on time.
import { buildStatus } from '../lib/status.js';
import { tick } from '../lib/tick.js';
import { firebaseConfig, SITE_URL } from '../public/js/config.js';

export default async function handler(req, res) {
  const where = { base: 'https://firestore.googleapis.com/v1', projectId: firebaseConfig.projectId, apiKey: firebaseConfig.apiKey };
  try {
    await tick(where).catch((e) => console.error('tick failed', e));
    const status = await buildStatus({ ...where, siteUrl: SITE_URL });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json(status);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ state: 'error', error: String(e.message || e) });
  }
}
