// The server half of the site's clock (phones run the same steps when they
// notice something is due). Runs on HA's status poll and a daily Vercel cron:
//   planned night, a day before showtime -> lock the movie
//   locked night, the morning after      -> file it as watched
// Idempotent: each write is conditional on the night not having changed.
import { makeRest, nightsWhere, eq } from './firestore-rest.js';
import { pickMovie, lockFields, lockDue, doneDue, vetoedFor } from '../public/js/logic.js';

export async function tick({ base, projectId, apiKey, now = new Date(), fetchImpl = fetch, rand = Math.random }) {
  const R = makeRest({ base, projectId, apiKey, fetchImpl });
  const [planned, locked] = await Promise.all([nightsWhere(R, 'planned'), nightsWhere(R, 'locked')]);
  const done = [];

  const dueToLock = planned.filter((n) => lockDue(n, now));
  if (dueToLock.length) {
    const [movies, votes, finished] = await Promise.all([R.list('movies'), R.list('votes'), nightsWhere(R, 'done')]);
    // Leave out watched movies and anything another night has locked.
    const watched = new Set([...finished, ...locked].map((n) => n.lockedMovieId).filter(Boolean));
    for (const n of dueToLock) {
      try {
        const coming = await R.query('', { from: [{ collectionId: 'free' }], where: eq('day', n.day) });
        // The night's own vetoes and theme ride on its doc: no extra reads.
        const pick = pickMovie({ movies, votes, watched, attendees: coming.map((f) => f.nameKey), vetoed: vetoedFor(n), theme: n.theme || '', rand });
        if (!pick) { done.push({ day: n.day, action: 'empty-shelf' }); continue; }
        await R.update(`nights/${n.day}`, lockFields(pick), { stamp: ['lockedAt'], ifUpdateTime: n.updateTime });
        watched.add(pick.movie.imdbId);
        done.push({ day: n.day, action: 'locked', movie: pick.movie.title, basis: pick.basis, tie: pick.tie.length, ...(pick.themeFallback ? { themeFallback: true } : {}) });
      } catch (e) {
        done.push({ day: n.day, action: 'skipped', reason: String(e.message || e).slice(0, 120) }); // a phone got there first
      }
    }
  }

  for (const n of locked.filter((x) => doneDue(x, now))) {
    try {
      await R.update(`nights/${n.day}`, { status: 'done' }, { stamp: ['finishedAt'], ifUpdateTime: n.updateTime });
      done.push({ day: n.day, action: 'done' });
    } catch (e) {
      done.push({ day: n.day, action: 'skipped', reason: String(e.message || e).slice(0, 120) });
    }
  }
  return { actions: done };
}
