// GET /api/status — the one endpoint Home Assistant polls.
import { buildStatus } from '../lib/status.js';
import { firebaseConfig, SITE_URL } from '../public/js/config.js';

export default async function handler(req, res) {
  try {
    const status = await buildStatus({
      base: 'https://firestore.googleapis.com/v1',
      projectId: firebaseConfig.projectId,
      apiKey: firebaseConfig.apiKey,
      siteUrl: SITE_URL,
    });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json(status);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ state: 'error', error: String(e.message || e) });
  }
}
