// The clock the site doesn't have. Runs on HA's status poll, a daily Vercel
// cron, and whenever a guest page nudges /api/tick:
//   planned night, a day before showtime -> lock the movie
//   locked night, the morning after      -> file it as watched
// Idempotent: each write is conditional on the night not having changed.
import { makeRest, nightsWhere, eq } from './firestore-rest.js';
import { pickMovie, lockFields, lockDue, doneDue } from '../public/js/logic.js';

export async function tick({ base, projectId, apiKey, now = new Date(), fetchImpl = fetch, rand = Math.random }) {
  const R = makeRest({ base, projectId, apiKey, fetchImpl });
  const [planned, locked] = await Promise.all([nightsWhere(R, 'planned'), nightsWhere(R, 'locked')]);
  const done = [];

  const dueToLock = planned.filter((n) => lockDue(n, now));
  if (dueToLock.length) {
    const [movies, votes, finished] = await Promise.all([R.list('movies'), R.list('votes'), nightsWhere(R, 'done')]);
    const watched = new Set(finished.map((n) => n.lockedMovieId));
    for (const n of dueToLock) {
      const coming = await R.query('', { from: [{ collectionId: 'free' }], where: eq('day', n.day) });
      const pick = pickMovie({ movies, votes, watched, attendees: coming.map((f) => f.nameKey), rand });
      if (!pick) { done.push({ day: n.day, action: 'empty-shelf' }); continue; }
      await R.update(`nights/${n.day}`, lockFields(pick), { stamp: ['lockedAt'], ifUpdateTime: n.updateTime });
      watched.add(pick.movie.imdbId); // two nights in a row never get the same movie
      done.push({ day: n.day, action: 'locked', movie: pick.movie.title, basis: pick.basis, tie: pick.tie.length });
    }
  }

  for (const n of locked.filter((x) => doneDue(x, now))) {
    await R.update(`nights/${n.day}`, { status: 'done' }, { stamp: ['finishedAt'], ifUpdateTime: n.updateTime });
    done.push({ day: n.day, action: 'done' });
  }
  return { actions: done };
}
