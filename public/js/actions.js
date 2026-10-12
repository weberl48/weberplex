// Every write the site makes. Firestore functions are injected (`F`) so the
// browser passes the CDN SDK and the rules tests pass the npm SDK — the tests
// exercise exactly these batches against firestore.rules.
import { MAX_PICKS, cleanName, nameKey, nextFreeSlot } from './logic.js';

function secureId(len = 24) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

export class PicksFullError extends Error {
  constructor() { super(`You've used all ${MAX_PICKS} picks. Remove one to add another.`); this.code = 'picks-full'; }
}
export class AlreadyPickedError extends Error {
  constructor(movie) {
    super(`${movie.title} is already on the ballot (picked by ${movie.byName}). Give it a thumbs up instead.`);
    this.code = 'already-picked';
  }
}

export function makeActions(db, F) {
  const { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, query, where } = F;
  const night = (n) => doc(db, 'nights', n);
  const sub = (n, name, id) => doc(db, 'nights', n, name, id);

  function me(name) {
    const clean = cleanName(name);
    const key = nameKey(clean);
    if (!clean || !key) throw new Error('Type a name with at least one letter or number.');
    return { name: clean, nameKey: key };
  }

  // Host writes: every batch re-stamps the night with a fresh op and creates
  // the matching hostops doc holding the key (see freshHostOp in the rules).
  function hostBatch(hostKey) {
    const batch = writeBatch(db);
    const op = secureId(24);
    batch.set(doc(db, 'hostops', op), { key: hostKey, at: serverTimestamp() });
    return { batch, op };
  }

  return {
    me,

    async join(rawName) {
      const who = me(rawName);
      const ref = doc(db, 'people', who.nameKey);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        try {
          const b = writeBatch(db);
          b.set(ref, { name: who.name, at: serverTimestamp() });
          await b.commit();
        } catch (e) {
          // Someone else registered the same name a moment ago — that's fine.
          if (!(await getDoc(ref)).exists()) throw e;
        }
        return who;
      }
      return { name: snap.data().name, nameKey: who.nameKey };
    },

    async setRsvp(nightId, dateId, who, going) {
      const ref = sub(nightId, 'rsvps', `${dateId}__${who.nameKey}`);
      const b = writeBatch(db);
      if (going) b.set(ref, { dateId, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });
      else b.delete(ref);
      await b.commit();
    },

    // `movie` is the output of movieFromMeta(). `pool` is the current movie
    // list (to explain duplicates nicely); slots are re-read so a stale page
    // can't pick a taken slot.
    async suggest(nightId, who, movie, pool = []) {
      const existing = pool.find((m) => m.imdbId === movie.imdbId);
      if (existing) throw new AlreadyPickedError(existing);
      const mine = await getDocs(query(collection(db, 'nights', nightId, 'slots'), where('by', '==', who.nameKey)));
      const slot = nextFreeSlot(mine.docs.map((d) => d.data().slot));
      if (slot == null) throw new PicksFullError();
      const b = writeBatch(db);
      b.set(sub(nightId, 'movies', movie.imdbId), {
        ...movie, by: who.nameKey, byName: who.name, slot, at: serverTimestamp(),
      });
      b.set(sub(nightId, 'slots', `${who.nameKey}__${slot}`), { movie: movie.imdbId, by: who.nameKey, slot });
      try {
        await b.commit();
      } catch (e) {
        const snap = await getDoc(sub(nightId, 'movies', movie.imdbId));
        if (snap.exists()) throw new AlreadyPickedError(snap.data());
        throw e;
      }
      return slot;
    },

    // Removes a pick, its slot and the votes on it, all in one batch.
    async unsuggest(nightId, movie, voteNameKeys = []) {
      const b = writeBatch(db);
      b.delete(sub(nightId, 'movies', movie.imdbId));
      b.delete(sub(nightId, 'slots', `${movie.by}__${movie.slot}`));
      for (const k of voteNameKeys) b.delete(sub(nightId, 'votes', `${movie.imdbId}__${k}`));
      await b.commit();
    },

    async setVote(nightId, imdbId, who, on) {
      const ref = sub(nightId, 'votes', `${imdbId}__${who.nameKey}`);
      const b = writeBatch(db);
      if (on) b.set(ref, { movie: imdbId, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });
      else b.delete(ref);
      await b.commit();
    },

    async addSnack(nightId, who, rawItem) {
      const item = String(rawItem ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!item) throw new Error('Say what you’re bringing.');
      const b = writeBatch(db);
      b.set(doc(collection(db, 'nights', nightId, 'snacks')), { item, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });
      await b.commit();
    },

    async removeSnack(nightId, snackId) {
      const b = writeBatch(db);
      b.delete(sub(nightId, 'snacks', snackId));
      await b.commit();
    },

    async review(nightId, who, stars, line = '') {
      const b = writeBatch(db);
      b.set(sub(nightId, 'reviews', who.nameKey), {
        stars: Math.max(1, Math.min(5, Math.round(stars))),
        line: String(line).trim().slice(0, 140),
        nameKey: who.nameKey, name: who.name, at: serverTimestamp(),
      });
      await b.commit();
    },

    // ---- host ---------------------------------------------------------------
    async seedHostKey(hostKey) {
      const b = writeBatch(db);
      b.set(doc(db, 'config', 'host'), { key: hostKey });
      await b.commit();
    },

    // Proves the key without changing anything visible: re-stamps the op on
    // an existing night. With no night yet there is nothing to prove against,
    // so the answer is null and creating the first night is the real check.
    async checkHostKey(hostKey, nightId) {
      if (!nightId) return null;
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), { op });
      try { await batch.commit(); return true; } catch { return false; }
    },

    async createNight(hostKey, { title = '', dates = [] }) {
      const { batch, op } = hostBatch(hostKey);
      const ref = doc(collection(db, 'nights'));
      batch.set(ref, {
        title: String(title).trim().slice(0, 60), status: 'open', op,
        createdAt: serverTimestamp(), lockedDateId: null, lockedMovieId: null,
        lockedStartsAt: null, lockedMovie: null, lockedAt: null, finishedAt: null,
      });
      for (const d of dates) batch.set(doc(collection(db, 'nights', ref.id, 'dates')), { startsAt: d });
      await batch.commit();
      return ref.id;
    },

    async renameNight(hostKey, nightId, title) {
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), { op, title: String(title).trim().slice(0, 60) });
      await batch.commit();
    },

    async addDate(hostKey, nightId, when) {
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), { op });
      batch.set(doc(collection(db, 'nights', nightId, 'dates')), { startsAt: when });
      await batch.commit();
    },

    async removeDate(hostKey, nightId, dateId, rsvpNameKeys = []) {
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), { op });
      batch.delete(sub(nightId, 'dates', dateId));
      for (const k of rsvpNameKeys) batch.delete(sub(nightId, 'rsvps', `${dateId}__${k}`));
      await batch.commit();
    },

    async removeMovie(hostKey, nightId, movie, voteNameKeys = []) {
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), { op });
      batch.delete(sub(nightId, 'movies', movie.imdbId));
      batch.delete(sub(nightId, 'slots', `${movie.by}__${movie.slot}`));
      for (const k of voteNameKeys) batch.delete(sub(nightId, 'votes', `${movie.imdbId}__${k}`));
      await batch.commit();
    },

    async lock(hostKey, nightId, date, movie) {
      const { batch, op } = hostBatch(hostKey);
      const { imdbId, title, year, poster, runtime, rating, genres, trailer } = movie;
      batch.update(night(nightId), {
        op, status: 'locked', lockedAt: serverTimestamp(),
        lockedDateId: date.id, lockedStartsAt: date.startsAt,
        lockedMovieId: imdbId,
        lockedMovie: { imdbId, title, year, poster, runtime, rating, genres, trailer },
      });
      await batch.commit();
    },

    async reopen(hostKey, nightId) {
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), {
        op, status: 'open', lockedDateId: null, lockedMovieId: null,
        lockedStartsAt: null, lockedMovie: null, lockedAt: null,
      });
      await batch.commit();
    },

    async finish(hostKey, nightId) {
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), { op, status: 'done', finishedAt: serverTimestamp() });
      await batch.commit();
    },

    async cancel(hostKey, nightId) {
      const { batch, op } = hostBatch(hostKey);
      batch.update(night(nightId), { op, status: 'cancelled', finishedAt: serverTimestamp() });
      await batch.commit();
    },
  };
}
