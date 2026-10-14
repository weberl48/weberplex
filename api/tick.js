// /api/tick: locks movies a day before showtime and files nights the morning
// after. Called by the daily cron (vercel.json) and by /api/status (so HA's
// poll drives it). Phones run the same steps themselves in the browser.
import { tick } from '../lib/tick.js';
import { firebaseConfig } from '../public/js/config.js';

export default async function handler(req, res) {
  try {
    const result = await tick({ base: 'https://firestore.googleapis.com/v1', projectId: firebaseConfig.projectId, apiKey: firebaseConfig.apiKey });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String(e.message || e) });
  }
}
